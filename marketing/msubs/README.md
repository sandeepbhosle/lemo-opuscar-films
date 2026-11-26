# mSUBS ad campaign kit

Ad creatives for **mSUBS by Infoesearch** ([msubs.in](https://msubs.in), [infoesearch.com/msubs](https://infoesearch.com/msubs)) covering three stories:

1. **File Subs**: an MP4 is dropped in, its language is auto-detected, and AI transcribes it, syncs timecodes and translates it (ES · HI · AR). Timed lines appear, ready to export as SRT, VTT, SCC, TTML or burned-in.
2. **Live Subs**: a stream comes in from OBS over RTMP. Captions appear word by word, the Spanish translation follows each finished sentence, and "Editor review" is on.
3. **Human edit**: the AI draft reaches 90%, and an editor fixes three flagged items (the Infoesearch name, the mSUBS name, a speaker label). The file reaches 100% and is approved and exported.

Each video is 15 seconds: about 12 s of product demo, then an end card with the real mSUBS and Infoesearch logos, a tagline, "Start free trial" and "msubs.in · 30 free minutes to try". They work without sound.

## Files

| Path | What |
|---|---|
| `ad.html` | The single source for every creative. Open it in a browser to watch a live loop: `ad.html?story=edit&format=story` |
| `render.cjs` | Renders `ad.html` to MP4 and PNG |
| `copy.md` | Ad copy for Meta, LinkedIn, Google Search and YouTube, the facts behind it, and campaign structure |
| `assets/` | mSUBS logo (from the msubs.in favicon) and the Infoesearch wordmark, plus a white version for dark backgrounds |
| `out/video/<story>-<format>.mp4` | 9 videos: 3 stories × landscape 1920×1080, square 1080×1080, story 1080×1920 |
| `out/stills/<story>-<format>-{demo,end}.png` | 18 static ads: a product frame and the end card for each video |
| `out/video-vo/<story>-<format>.mp4` | The same 9 videos with a voiceover (File 17.2 s, Live 15.6 s, Human edit 16.8 s; the end card runs longer to fit the last line) |
| `out/audio/<story>-vo.wav` | Each story's voice track on its own, for editors |
| `vo/` | The 12 voice lines (`lines.tsv` has their text; `.mp3` as generated, `.wav` silence-trimmed) and `timeline.json`, which places each line on the video timeline |

Colours come from the logo: navy #06264D, purple #775BC9, blue #2A80ED, teal #08C1B9, light blue #A1E1FF. They're defined as CSS variables at the top of `ad.html`.

## Re-rendering

```bash
node marketing/msubs/render.cjs
```

List stories to render only those (`node marketing/msubs/render.cjs edit`). `--cta "Book a demo"` changes the button text, `--url "infoesearch.com/msubs"` replaces the line under it, and `--fps 60` raises the frame rate. All 9 videos take about 2½ minutes. It needs Node with Playwright and Chromium, `ffmpeg`, and the Inter and JetBrains Mono fonts.

URL parameters for previewing `ad.html`: `story` (`file|live|edit`), `format` (`landscape|square|story`), `t` (freeze at a second), `url`, `cta`.

## Voiceover

Voice: **Douglas** (ElevenLabs library voice, model `eleven_v4`), one take per line, generated in the ElevenLabs flow "mSUBS ad voiceovers". Brand names were given pronunciation hints: mSUBS as "em-subs", Infoesearch as "info-e-search".

Re-render the voiced videos after changing `timeline.json` or replacing a `vo/<id>.wav`:

```bash
node marketing/msubs/render.cjs --vo
```

Each story's track is mixed to −16 LUFS (peaks −1.5 dB), which suits Meta, LinkedIn and YouTube. Use the silent 15 s cuts in `out/video/` for YouTube non-skippable (15 s max) and for placements that autoplay muted.

## Claims check

Everything on screen matches the mSUBS product page except:

- **"AI does 90%"** is the campaign framing you asked for. The website doesn't state a percentage. It's presented as how much of the work the AI does, not as an accuracy rate.
- **The demo content** (file name, sample lines, the speaker "Host", the 00:42 stream clock) is illustrative sample data, not real customer content.
- **The Live Subs translation** shows Spanish. The site says live translation runs into "the languages your audience reads" without listing which.
