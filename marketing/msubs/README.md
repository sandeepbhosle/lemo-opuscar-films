# mSubs ad campaign kit

Ad creatives for **mSubs by Infoesearch** covering three stories:

1. **File Subs**: a video file is uploaded; AI transcribes it, syncs timecodes and splits it into lines; subtitles are ready to export.
2. **Live Subs**: a live stream gets captions word by word as the speaker talks.
3. **Human edit**: the AI draft reaches 90%, flagged words (a brand name, a product name, a speaker label) are fixed by an editor, the file reaches 100% and is approved.

Each video is 15 seconds: about 12 s of product demo, then an end card with logo, tagline and CTA. They work without sound.

## Files

| Path | What |
|---|---|
| `ad.html` | The single source for every creative. Open it in a browser to watch a live loop: `ad.html?story=edit&format=story` |
| `render.cjs` | Renders `ad.html` to MP4 and PNG |
| `copy.md` | Ad copy for Meta, LinkedIn, Google Search and YouTube, plus campaign structure |
| `out/video/<story>-<format>.mp4` | 9 videos: 3 stories × landscape 1920×1080, square 1080×1080, story 1080×1920 |
| `out/stills/<story>-<format>-{demo,end}.png` | 18 static ads: a product frame and the end card for each video |

## Re-rendering

```bash
node marketing/msubs/render.cjs
```

Options: list stories to render only those (`node marketing/msubs/render.cjs edit`), `--url "infoesearch.example"` adds a URL under the CTA, `--cta "Start free trial"` changes the button text, `--fps 60`. All 9 videos take a few minutes. It needs Node with Playwright and Chromium, and `ffmpeg`.

URL parameters for previewing `ad.html`: `story` (`file|live|edit`), `format` (`landscape|square|story`), `t` (freeze at a second), `url`, `cta`.

## Claims to verify before launch

I made these assumptions without access to product documentation. Change them in `ad.html` and `copy.md` if they're wrong:

- Export formats shown: SRT, VTT, TXT, burned-in MP4.
- "CC · English" is the only language shown; no language counts are claimed.
- The 90% figure is presented as how much of the work AI does, not a measured accuracy rate.
- Live Subs is shown only as real-time captioning. It isn't shown with human editing or translation.
- CTA "Book a demo" and the logo mark are placeholders. Replace them with real brand assets and colours (the CSS variables at the top of `ad.html`).
