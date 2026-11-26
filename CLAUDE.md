# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Two unrelated things live here:

1. **Lemo-Opuscar films (repo root).** 99 × 720p demo films (`<slug>.mp4`), one per style in the upstream [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) project, named after `styles/<slug>/` there. GitHub Pages serves them (`.nojekyll`) at `https://lemomo-ai.github.io/lemo-opuscar-films/<slug>.mp4` for the upstream gallery.
   - They are generated upstream and copied in by its `tools/films_repo.sh`. **Do not edit, re-encode, rename or add root `.mp4` files here.** Changes belong upstream, and renaming would break gallery URLs.
   - Licensing (see `README.md` / `LICENSE`): CC BY 4.0 with exceptions. Third-party material keeps its own licence. The narration in six films (chalkboard, circuit-board, desktop-flythrough, isometric-picture-book, printed-long-take, news-package) needs a separate legal basis. Clawd and third-party trademarks are not licensed. Reuse requires the credit line given in the README.
   - The root films can serve as visual style references, but don't copy them into new deliverables without honouring those licence terms.

2. **Marketing assets (`marketing/`).** Original ad creatives, currently `marketing/msubs/` for Infoesearch's mSubs subtitle product (File Subs, Live Subs, human editing of AI drafts). See `marketing/msubs/README.md`.

There is no build system, package.json, linter or test suite.

## marketing/msubs architecture

- `ad.html` is the only creative source. One page renders all 3 stories (`file`, `live`, `edit`) × 3 formats (`landscape` 1920×1080, `square` 1080×1080, `story` 1080×1920), selected by URL params (`story`, `format`, `t`, `url`, `cta`).
- Animation is a **pure function of time**: `window.renderAt(t)` sets every style from `t` (0–15 s; demo until ~11.6 s, then the end card). Never use CSS transitions/animations, `Date.now()` or accumulated state for motion, or rendered frames will be wrong.
- Each story is an entry in the `STORIES` object (`win` markup + `render(t)`). Shared intro/outro lives in `renderAt`.
- Sizing uses `--u` (1% of the short viewport side). `--uw` (inside `.win`) and `--ue` (end card) apply per-format multipliers set in JS. Layout differences between formats are `.fmt-<format>` CSS rules.
- The `edit` story positions its cursor from `getBoundingClientRect()` of target words, so layout changes move the cursor path automatically. `.fix` widths are measured once after `document.fonts.ready`.
- `render.cjs` loads the page in Playwright, steps `renderAt(i/fps)`, pipes JPEG screenshots into `ffmpeg` (libx264, CRF 18) and also writes demo/end PNG stills. Output: `marketing/msubs/out/`.

## Commands

```bash
node marketing/msubs/render.cjs                 # all 9 videos + 18 stills (several minutes)
node marketing/msubs/render.cjs edit            # one story, all formats
node marketing/msubs/render.cjs --url "x.com" --cta "Start free trial"
```

Preview a single frame: open `marketing/msubs/ad.html?story=live&format=square&t=8` in Chromium. Without `t` it loops in real time. Use CommonJS (`require('playwright')`) for scripts: the globally installed Playwright doesn't resolve from ESM `import`.

Fonts are Inter and JetBrains Mono, loaded from local system fonts (no web fonts), so the rendering machine needs them installed.
