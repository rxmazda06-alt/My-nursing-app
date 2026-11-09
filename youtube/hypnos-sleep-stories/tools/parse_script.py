"""Parse script.txt into an ordered timeline of events (JSON)."""
import json, re, sys

src, out = sys.argv[1], sys.argv[2]
events, chapter, scene, seg = [], None, None, 0
for raw in open(src, encoding="utf-8"):
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    if line.startswith("@CHAPTER"):
        num, title = line[len("@CHAPTER"):].split("|", 1)
        chapter = int(num.strip())
        events.append({"type": "chapter", "n": chapter, "title": title.strip()})
    elif line.startswith("@TITLE"):
        events.append({"type": "title", "text": line[len("@TITLE"):].strip()})
    elif line.startswith("@SCENE"):
        scene = line.split()[1]
        events.append({"type": "scene", "id": scene})
    elif line.startswith("@CUT"):
        events.append({"type": "cut", "id": line.split()[1]})
    elif line[:2] in ("N:", "H:"):
        seg += 1
        tts = line[2:].strip()
        display = re.sub(r"\[[^\]]*\]\s*", "", tts).strip()
        events.append({"type": "speech", "seg": seg, "speaker": "narrator" if line[0] == "N" else "hypnos",
                       "tts": tts, "display": display, "chapter": chapter, "scene": scene,
                       "file": f"seg{seg:03d}_{'n' if line[0]=='N' else 'h'}.mp3"})
    else:
        raise SystemExit(f"Unparsed line: {line[:60]}")
json.dump(events, open(out, "w"), indent=1, ensure_ascii=False)
sp = [e for e in events if e["type"] == "speech"]
words = sum(len(e["display"].split()) for e in sp)
for who in ("narrator", "hypnos"):
    s = [e for e in sp if e["speaker"] == who]
    print(who, "segments:", len(s), "chars(tts):", sum(len(e["tts"]) for e in s))
print("total segments", len(sp), "words", words, "est minutes @140wpm", round(words / 140, 1))
print("max tts chars in one segment", max(len(e["tts"]) for e in sp))
