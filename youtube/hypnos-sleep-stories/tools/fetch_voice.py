"""Download take-1 voice files using signatures recorded in sigs.txt (gen expires signature).
usage: fetch_voice.py <episode_dir> <remotion_dir>"""
import json, os, subprocess, sys
EP, RM = sys.argv[1], sys.argv[2]
WS = "44221fdc91ac41b193093557eafeefd6"
m = json.load(open(os.path.join(EP, "tts_manifest.json")))
ev = {e["seg"]: e for e in json.load(open(os.path.join(EP, "timeline.json"))) if e["type"] == "speech"}
sigs = {}
for line in open(os.path.join(EP, "sigs.txt")):
    if line.strip():
        g, exp, sig = line.split(); sigs[g] = (exp, sig)
out = os.path.join(RM, "public", "audio", "voice"); os.makedirs(out, exist_ok=True)
ok = fail = 0
for seg in range(1, 100):
    s = m["segments"][str(seg)]; gen, sess = s["gens"][0], s["sessions"][0]
    dest = os.path.join(out, ev[seg]["file"])
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        ok += 1; continue
    if gen not in sigs:
        continue
    exp, sig = sigs[gen]
    url = f"https://elevenlabsusercontent.com/database/workspace/{WS}/content_generation/{sess}/{gen}/content.mp3?Expires={exp}&KeyName=assets-cdn-key-1&Signature={sig}"
    r = subprocess.run(["curl", "-sS", "--fail", "--retry", "2", "-o", dest, url], capture_output=True, text=True)
    if r.returncode == 0: ok += 1
    else:
        fail += 1; print("FAIL seg", seg, r.stderr.strip()[:120])
        if os.path.exists(dest): os.remove(dest)
print(f"present: {ok}/99  failed this run: {fail}")
