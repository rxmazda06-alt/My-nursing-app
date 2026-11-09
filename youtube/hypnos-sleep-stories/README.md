# Hypnos Can't Sleep — funny bedtime mythology (YouTube)

Two-voice, ~30-minute sleep stories: a soft narrator plus Hypnos, the dry, exhausted god of sleep,
who cracks jokes early and dozes off by the end. They're built with ElevenLabs voices, Google Flow (Veo) clips and a Remotion
motion-graphics edit.

## Episode 1 — Baby Hermes and the Great Cow Heist (`ep01-baby-hermes/`)
| File | What |
|---|---|
| `script.txt` | Full script (narrator `N:` / Hypnos `H:`, chapters, scenes, joke cutaways) |
| `VEO_PROMPTS_GOOGLE_FLOW.md` | 16 ready-to-paste Veo prompts for Google Flow + how to hand clips back |
| `tts_manifest.json` | ElevenLabs flow + generation IDs for all 99 voice lines (2 takes each) |
| `subtitles.en.srt` | Closed captions (regenerated from real audio timing on build) |
| `youtube_chapters.txt` | Chapter timestamps for the description |
| `YOUTUBE_METADATA.md` | Title, description, tags, upload settings |

## Build
```bash
cd remotion && npm install
python3 ../tools/make_audio.py public/audio                      # ambient bed, lyre stings, lullaby, whoosh
python3 ../tools/download_voice.py ../ep01-baby-hermes .         # needs elevenlabsusercontent.com allowed
cp ../ep01-baby-hermes/clips/*.mp4 public/clips/ 2>/dev/null        # Veo clips from Google Flow
python3 ../tools/build_timeline.py ../ep01-baby-hermes .         # timeline + SRT + chapters
npx remotion render src/index.ts Episode out/episode.mp4         # 1920x1080, 24 fps
npx remotion still src/index.ts Thumbnail out/thumbnail.png --scale=0.6667
```
Veo clips are uploaded to `ep01-baby-hermes/clips/<id>.mp4` (ids in the prompt pack). Missing clips fall back to
animated storybook backdrops and motion-graphic gag cards, so the video always renders.
