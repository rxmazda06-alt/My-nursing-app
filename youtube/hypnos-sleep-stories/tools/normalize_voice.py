"""Two-pass EBU R128 loudness normalization of every voice file to a soft, even level.
Originals are kept in voice_raw/. usage: normalize_voice.py <voice_dir> [target_lufs]"""
import json, os, shutil, subprocess, sys
d = sys.argv[1]; T = float(sys.argv[2]) if len(sys.argv) > 2 else -20.0
raw = os.path.join(os.path.dirname(d.rstrip('/')), 'voice_raw'); os.makedirs(raw, exist_ok=True)
for f in sorted(os.listdir(d)):
    if not f.endswith('.mp3'): continue
    src = os.path.join(raw, f)
    if not os.path.exists(src): shutil.copy2(os.path.join(d, f), src)
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af',
        f'loudnorm=I={T}:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    af = (f"loudnorm=I={T}:TP=-2:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
          f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', af, '-ar', '44100',
                    '-c:a', 'libmp3lame', '-b:a', '128k', os.path.join(d, f)], check=True)
print('normalized', len([f for f in os.listdir(d) if f.endswith('.mp3')]), 'files to', T, 'LUFS')
