"""Turn the parsed script into a frame-accurate render timeline + SRT + YouTube chapters.

Durations come from the real voice files when they exist in remotion/public/audio/voice/,
otherwise from tts_manifest.json, otherwise from a calibrated characters-per-second estimate.

usage: build_timeline.py <episode_dir> <remotion_dir>
"""
import json, os, re, subprocess, sys

EP, RM = sys.argv[1], sys.argv[2]
FPS = 24
MIN_TOTAL = 30 * 60 + 5          # at least 30:05
OUTRO_MIN = 150                   # lullaby + ambient after the last word
TITLE_S, CHAPTER_S, INTRO_S = 7.0, 6.0, 3.0
CUT_CLIP_MAX, CUT_CARD_S = 8.0, 5.0
SCENE_IDS = ["s01_hypnos_cave", "s02_kyllene_dawn", "s03_pieria_sunset", "s04_alpheus_dawn",
             "s05_apollo_tracks", "s06_cradle_innocent", "s07_olympus_clouds", "s08_lyre_river",
             "s09_moonlit_cradle"]

events = json.load(open(os.path.join(EP, "timeline.json")))
manifest = json.load(open(os.path.join(EP, "tts_manifest.json")))
voice_dir = os.path.join(RM, "public", "audio", "voice")
clip_dir = os.path.join(RM, "public", "clips")


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip()
    return float(out)


def estimate(e):
    chars = len(e["display"])
    cps = 11.0 if e["chapter"] == 8 else 12.8
    return max(1.3, chars / cps + 0.6 * e["tts"].count("[long pause]") + 0.25)


def gap_after(e, nxt):
    ch = e["chapter"]
    if ch >= 8:
        return 1.6
    if ch == 7:
        return 1.0
    if nxt is not None and nxt.get("type") == "speech" and nxt["speaker"] != e["speaker"]:
        return 0.4
    return 0.6


items, cursor, voice_real = [], INTRO_S, 0
speech = [e for e in events if e["type"] == "speech"]
for idx, e in enumerate(events):
    nxt = events[idx + 1] if idx + 1 < len(events) else None
    t = e["type"]
    if t == "chapter":
        items.append({"type": "chapter", "n": e["n"], "title": e["title"], "start": cursor, "dur": CHAPTER_S})
        cursor += CHAPTER_S
    elif t == "title":
        items.append({"type": "title", "text": e["text"], "start": cursor, "dur": TITLE_S})
        cursor += TITLE_S
    elif t == "scene":
        items.append({"type": "scene", "id": e["id"], "start": max(0.0, cursor - 1.0)})
    elif t == "cut":
        clip = os.path.join(clip_dir, e["id"] + ".mp4")
        has = os.path.exists(clip)
        dur = min(CUT_CLIP_MAX, probe(clip)) if has else CUT_CARD_S
        items.append({"type": "cut", "id": e["id"], "start": cursor + 0.2, "dur": dur, "clip": has})
        cursor += dur + 0.6
    elif t == "speech":
        f = os.path.join(voice_dir, e["file"])
        if os.path.exists(f):
            dur, src = probe(f), "file"
            voice_real += 1
        elif "dur" in manifest["segments"].get(str(e["seg"]), {}):
            dur, src = manifest["segments"][str(e["seg"])]["dur"], "manifest"
        else:
            dur, src = estimate(e), "estimate"
        items.append({"type": "speech", "seg": e["seg"], "speaker": e["speaker"], "file": e["file"],
                      "has_file": os.path.exists(f), "start": cursor, "dur": dur, "src": src,
                      "chapter": e["chapter"], "display": e["display"], "tts": e["tts"]})
        cursor += dur + gap_after(e, nxt)

speech_end = cursor
total = max(MIN_TOTAL, speech_end + OUTRO_MIN)
items.append({"type": "outro", "start": speech_end + 1.0, "dur": total - speech_end - 1.0})

# scene end times
scenes = [i for i in items if i["type"] == "scene"]
for a, b in zip(scenes, scenes[1:] + [None]):
    a["end"] = b["start"] if b else total
for s in scenes:
    clip = os.path.join(clip_dir, s["id"] + ".mp4")
    s["clip"] = os.path.exists(clip)

f = lambda s: int(round(s * FPS))
for i in items:
    i["from"] = f(i["start"])
    if "dur" in i:
        i["frames"] = max(1, f(i["dur"]))
    if "end" in i:
        i["endFrame"] = f(i["end"])
render = {"fps": FPS, "durationInFrames": f(total), "speechEnd": f(speech_end), "items": items}
os.makedirs(os.path.join(RM, "src", "data"), exist_ok=True)
json.dump(render, open(os.path.join(RM, "src", "data", "render.json"), "w"), indent=1)


# ---------- SRT ----------
def ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def chunks(tts):
    """Split TTS text into caption chunks, weighting [pause] tags as time."""
    parts = re.split(r"(\[[^\]]*\])", tts)
    words, out, cur, w = [], [], "", 0.0
    for p in parts:
        if p.startswith("["):
            tag = p.lower()
            pause = 18 if "long pause" in tag else 9 if "pause" in tag else 0
            if pause and cur.strip():
                out.append([cur.strip(), w + pause]); cur, w = "", 0.0
            elif pause and out:
                out[-1][1] += pause
            continue
        for sent in re.split(r"(?<=[.!?])\s+", p):
            for word in sent.split():
                if len(cur) + len(word) + 1 > 84 and cur:
                    out.append([cur.strip(), w]); cur, w = "", 0.0
                cur += word + " "; w += len(word) + 1
            if cur.strip() and re.search(r"[.!?\"]$", cur.strip()) and len(cur) > 40:
                out.append([cur.strip(), w]); cur, w = "", 0.0
    if cur.strip():
        out.append([cur.strip(), w])
    return out


def wrap(text):
    if len(text) <= 42:
        return text
    words, line1 = text.split(), ""
    for i, wd in enumerate(words):
        if len(line1) + len(wd) + 1 > max(42, len(text) // 2 + 4):
            return line1.strip() + "\n" + " ".join(words[i:])
        line1 += wd + " "
    return text


srt, n = [], 1
for i in items:
    if i["type"] != "speech":
        continue
    cs = chunks(i["tts"])
    tot = sum(w for _, w in cs) or 1
    t0 = i["start"]
    for text, w in cs:
        d = i["dur"] * w / tot
        label = "HYPNOS: " if i["speaker"] == "hypnos" else ""
        srt.append(f"{n}\n{ts(t0)} --> {ts(t0 + max(0.8, d) - 0.05)}\n{wrap(label + text)}\n")
        n += 1; t0 += d
open(os.path.join(EP, "subtitles.en.srt"), "w").write("\n".join(srt))

# ---------- YouTube chapters ----------
def mmss(sec):
    sec = int(sec); return f"{sec // 60}:{sec % 60:02d}"
lines = ["0:00 Welcome to the Cave of Sleep"]
for i in items:
    if i["type"] == "chapter" and i["n"] > 1:
        lines.append(f"{mmss(i['start'])} {i['title']}")
lines.append(f"{mmss(speech_end)} Lullaby and quiet night (sleep)")
open(os.path.join(EP, "youtube_chapters.txt"), "w").write("\n".join(lines) + "\n")

print(f"speech segments: {len(speech)} (real audio files: {voice_real})")
print(f"speech ends at {mmss(speech_end)}  total {mmss(total)}  frames {f(total)}")
print("\n".join(lines))
