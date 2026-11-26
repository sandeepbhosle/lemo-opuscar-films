// Renders ad.html into MP4 videos and PNG stills for every story x format.
// Usage: node marketing/msubs/render.cjs [story ...] [--vo] [--fps 30] [--url text] [--cta text]
// Silent:  out/video/<story>-<format>.mp4 (15 s) and out/stills/<story>-<format>-{demo,end}.png
// --vo:    out/video-vo/<story>-<format>.mp4 with the voiceover from vo/timeline.json
//          (longer end card per the timeline's hold/dur), plus out/audio/<story>-vo.wav
// Every frame is rendered by calling window.renderAt(t), so output is deterministic.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const flag = k => { const i = args.indexOf('--' + k); return i >= 0 ? (args.splice(i, 1), true) : false; };
const FPS = +opt('fps', 30);
const URL_TEXT = opt('url', '');
const CTA = opt('cta', '');
const VO = flag('vo');
const STORIES = args.length ? args : ['file', 'live', 'edit'];
const FORMATS = { landscape: [1920, 1080], square: [1080, 1080], story: [1080, 1920] };
const DEMO_T = { file: 11.0, live: 8.6, edit: 10.4 };   // still frame showing the product
const END_T = 14;

const dir = __dirname;
const OUT = path.join(dir, 'out');
const TIMELINE = VO ? JSON.parse(fs.readFileSync(path.join(dir, 'vo', 'timeline.json'), 'utf8')) : null;
for (const d of VO ? ['video-vo', 'audio'] : ['video', 'stills']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

// Mix one story's voice lines into a single track the length of the video, loudness-normalised for social (-16 LUFS).
// If vo/music.wav exists it goes underneath: faded in/out, kept well below the voice and ducked further
// (sidechain) while someone speaks. Music level relative to the voice: MUSIC_DB (more negative = quieter).
const MUSIC = path.join(dir, 'vo', 'music.wav');
const MUSIC_DB = -15;
const MUSIC_LEN = fs.existsSync(MUSIC) ? +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MUSIC]).toString() : 0;
function mixVoice(story) {
  const tl = TIMELINE[story];
  const wav = path.join(OUT, 'audio', `${story}-vo.wav`);
  const inputs = tl.lines.flatMap(l => ['-i', path.join(dir, 'vo', `${l.id}.wav`)]);
  const chains = tl.lines.map((l, i) => {
    const ms = Math.round(l.at * 1000);
    return `[${i}:a]${l.tempo ? `atempo=${l.tempo},` : ''}adelay=${ms}|${ms}[a${i}]`;
  });
  const voice = tl.lines.map((_, i) => `[a${i}]`).join('') +
    `amix=inputs=${tl.lines.length}:normalize=0,apad,atrim=0:${tl.dur},loudnorm=I=-16:TP=-2:LRA=11,aresample=48000`;
  let graph;
  if (fs.existsSync(MUSIC)) {
    inputs.push('-i', MUSIC);
    const m = tl.lines.length;
    graph = [...chains, `${voice},asplit[v][key]`,
      // start the music late enough that its final chord lands on the video's last frame
      `[${m}:a]aformat=channel_layouts=stereo,loudnorm=I=${-16 + MUSIC_DB}:TP=-2,aresample=48000,` +
        `atrim=start=${Math.max(0, MUSIC_LEN - tl.dur).toFixed(2)},asetpts=PTS-STARTPTS,apad,atrim=0:${tl.dur},` +
        `afade=t=in:d=0.6,afade=t=out:st=${(tl.dur - 0.4).toFixed(2)}:d=0.4[m]`,
      `[m][key]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=350[md]`,
      `[v][md]amix=inputs=2:normalize=0,alimiter=limit=0.79,aresample=48000[out]`];
  } else {
    graph = [...chains, `${voice}[out]`];
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph.join(';'),
    '-map', '[out]', '-ac', '2', '-ar', '48000', wav]);
  return wav;
}

async function job(browser, story, fmt, audio) {
  const [w, h] = FORMATS[fmt];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => console.error(story, fmt, e.message));
  const q = new URLSearchParams({ story, format: fmt, t: '0' });
  if (URL_TEXT) q.set('url', URL_TEXT);
  if (CTA) q.set('cta', CTA);
  if (VO) { q.set('hold', TIMELINE[story].hold); q.set('dur', TIMELINE[story].dur); }
  await page.goto('file://' + path.join(dir, 'ad.html') + '?' + q);
  await page.waitForFunction(() => window.READY);
  const dur = await page.evaluate(() => window.DURATION);

  if (!VO) for (const [name, t] of [['demo', DEMO_T[story]], ['end', END_T]]) {
    await page.evaluate(t => renderAt(t), t);
    await page.screenshot({ path: path.join(OUT, 'stills', `${story}-${fmt}-${name}.png`) });
  }

  const file = path.join(OUT, VO ? 'video-vo' : 'video', `${story}-${fmt}.mp4`);
  const audioArgs = audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : [];
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...audioArgs, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  const n = Math.round(dur * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => renderAt(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;
  await page.close();
  console.log('done', path.relative(process.cwd(), file));
}

(async () => {
  const audio = {};
  if (VO) for (const s of STORIES) audio[s] = mixVoice(s);
  const browser = await chromium.launch();
  const jobs = STORIES.flatMap(s => Object.keys(FORMATS).map(f => [s, f]));
  const workers = Array.from({ length: 3 }, async () => {
    while (jobs.length) { const [s, f] = jobs.shift(); await job(browser, s, f, audio[s]); }
  });
  await Promise.all(workers);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
