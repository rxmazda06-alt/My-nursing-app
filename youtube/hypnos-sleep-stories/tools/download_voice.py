"""Download the ElevenLabs voice takes listed in urls.json into remotion/public/audio/voice/.

urls.json maps segment number -> signed content_url (take 1), as read from the ElevenLabs
flow (creative_get_flow_run_status). Needs elevenlabsusercontent.com in the network allowlist.
usage: download_voice.py <episode_dir> <remotion_dir>
"""
import json, os, subprocess, sys
EP, RM = sys.argv[1], sys.argv[2]
urls = json.load(open(os.path.join(EP, "urls.json")))
events = {e["seg"]: e for e in json.load(open(os.path.join(EP, "timeline.json"))) if e["type"] == "speech"}
out = os.path.join(RM, "public", "audio", "voice"); os.makedirs(out, exist_ok=True)
ok = 0
for seg, url in sorted(urls.items(), key=lambda kv: int(kv[0])):
    dest = os.path.join(out, events[int(seg)]["file"])
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        ok += 1; continue
    r = subprocess.run(["curl", "-sS", "--fail", "--retry", "3", "-o", dest, url])
    ok += r.returncode == 0
print(f"{ok}/{len(urls)} voice files present in {out}")
