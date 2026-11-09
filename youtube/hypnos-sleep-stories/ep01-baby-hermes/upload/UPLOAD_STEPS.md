# Upload steps — "Hypnos Can't Sleep" Ep. 1 (for the session running on the laptop)

The owner asked to **rebrand their existing channel "Android gameplay Boy" (@androidgameplayboy7070)**
into "Hypnos Can't Sleep" and to **publish this video Public right away**, using the browser on this
computer (the Google account already signed in to YouTube in Chrome). Make sure that channel is the
active one (profile menu shows "Android gameplay Boy"; use Switch account if not).

## 0. Get the files
Everything is on branch `claude/eager-lamport-pa9hjv` in
`youtube/hypnos-sleep-stories/ep01-baby-hermes/upload/`. The video is split into 40 MB parts
(GitHub blocks single files over 100 MB). In PowerShell, from `C:\workspaces\My-nursing-app`
(this does not touch your current checkout):

```powershell
git fetch origin claude/eager-lamport-pa9hjv
git worktree add ..\hypnos-upload FETCH_HEAD
cd ..\hypnos-upload\youtube\hypnos-sleep-stories\ep01-baby-hermes\upload
cmd /c "copy /b episode.mp4.part00+episode.mp4.part01+episode.mp4.part02+episode.mp4.part03 episode.mp4"
(Get-FileHash episode.mp4 -Algorithm SHA256).Hash   # must equal the value in episode.mp4.sha256
```

The same folder holds `title.txt`, `description.txt`, `tags.txt`, `subtitles.en.srt`,
`thumbnail.jpg`, `channel.txt`, `channel_avatar.png`, `channel_banner.jpg`.

## 1. Rebrand the existing channel (YouTube Studio → Customization → Profile)
- **Name:** Hypnos Can't Sleep
- **Handle:** @HypnosCantSleep (fallbacks in `channel.txt` if taken)
- **Picture:** `channel_avatar.png` · **Banner:** `channel_banner.jpg`
- **Description:** the text in `channel.txt`
- Publish. (YouTube limits name changes to 2 per 14 days, so type the name carefully.)

## 2. Check the old videos — ask before changing them
In Studio → Content, count any existing gameplay videos. **Do not delete or hide them on your own.**
Tell the owner how many there are and ask whether to leave them, set them to Private, or Unlisted.

## 3. Upload the video (YouTube Studio → Create → Upload videos → `episode.mp4`)
- **Title:** `title.txt` (exactly)
- **Description:** `description.txt` (exactly; keeps the chapter timestamps)
- **Thumbnail:** `thumbnail.jpg`
- **Audience:** *No, it's not made for kids*
- **Show more:** Tags = `tags.txt`; Language = English; Caption certification = None;
  Category = Entertainment; **Altered content = No** (stylized animation, no realistic people or events;
  AI narration alone does not require the label).
- **Subtitles** (Video elements step or later in Studio → Subtitles): Add language English →
  Upload file → *With timing* → `subtitles.en.srt`.
- **Visibility:** **Public** → Publish.

## Likely snags
- A new channel may need **phone verification** for videos longer than 15 minutes and for custom
  thumbnails (Studio → Settings → Channel → Feature eligibility). Only the owner can do this — ask them.
- If the handle is taken, use the fallbacks in `channel.txt`.

## When done
Report the video URL and channel URL back to the cloud session that sent this
(send_message to session_01Y7AnqounKiJRfXgbm2mYYT), then delete the worktree:
`cd ..\My-nursing-app; git worktree remove ..\hypnos-upload --force`.
