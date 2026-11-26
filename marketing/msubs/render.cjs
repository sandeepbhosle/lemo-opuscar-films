// Renders ad.html into MP4 videos and PNG stills for every story x format.
// Usage: node marketing/msubs/render.cjs [story ...] [--fps 30] [--url text] [--cta text]
// Output: marketing/msubs/out/video/<story>-<format>.mp4 and out/stills/<story>-<format>-{demo,end}.png
// Every frame is rendered by calling window.renderAt(t), so output is deterministic.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const FPS = +opt('fps', 30);
const URL_TEXT = opt('url', '');
const CTA = opt('cta', '');
const STORIES = args.length ? args : ['file', 'live', 'edit'];
const FORMATS = { landscape: [1920, 1080], square: [1080, 1080], story: [1080, 1920] };
const DEMO_T = { file: 11.0, live: 8.6, edit: 10.4 };   // still frame showing the product
const END_T = 14;

const dir = __dirname;
const OUT = path.join(dir, 'out');
fs.mkdirSync(path.join(OUT, 'video'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });

async function job(browser, story, fmt) {
  const [w, h] = FORMATS[fmt];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => console.error(story, fmt, e.message));
  const q = new URLSearchParams({ story, format: fmt, t: '0' });
  if (URL_TEXT) q.set('url', URL_TEXT);
  if (CTA) q.set('cta', CTA);
  await page.goto('file://' + path.join(dir, 'ad.html') + '?' + q);
  await page.waitForFunction(() => window.READY);
  const dur = await page.evaluate(() => window.DURATION);

  for (const [name, t] of [['demo', DEMO_T[story]], ['end', END_T]]) {
    await page.evaluate(t => renderAt(t), t);
    await page.screenshot({ path: path.join(OUT, 'stills', `${story}-${fmt}-${name}.png`) });
  }

  const file = path.join(OUT, 'video', `${story}-${fmt}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
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
  const browser = await chromium.launch();
  const jobs = STORIES.flatMap(s => Object.keys(FORMATS).map(f => [s, f]));
  const workers = Array.from({ length: 3 }, async () => {
    while (jobs.length) { const [s, f] = jobs.shift(); await job(browser, s, f); }
  });
  await Promise.all(workers);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
