// scripts/mobile-check.mjs
//
// Mobile-first gate. Every page on this site is designed for a phone first, so
// this opens the real built site in a real browser at phone widths and fails if
// anything overflows sideways.
//
// It exists because the alternative was arithmetic. Measuring a string's width
// by hand and reasoning about a flex row catches the obvious cases and misses
// everything else; a browser does not have to guess.
//
// What it checks, per route per viewport:
//   1. the document is not wider than the viewport (no horizontal scroll)
//   2. no individual element sticks out past the right edge
// and it writes a full-page screenshot either way, so you can look.
//
// Usage:
//   npm run mobile:check                 # builds nothing, starts vite preview
//   npm run mobile:check -- --url=https://hungrytimes.in
//   npm run mobile:check -- --route=/menu
//   npm run mobile:check -- --settle=62000   # long enough for the 60s feedback pill
//
// Screenshots land in mobile-check/ (gitignored). Exit code is 1 if any route
// overflows at any width, so this can gate a commit.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

const ROUTES = [
  '/',
  '/menu',
  '/offers',
  '/order',
  '/orders',
  '/profile',
  '/contact',
  '/reservation',
  '/feedback',
  '/gallery',
  '/testimonials',
];

// 320 is the narrowest phone still in real use; 390 is the iPhone 12-15 class
// and the width the house rule names; 768 is the tablet boundary where the
// layout switches to its md: rules.
const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
];

const PREVIEW_PORT = 4174;
const OUT_DIR = 'mobile-check';

const args = process.argv.slice(2);
const argOf = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const baseUrl = argOf('url') || process.env.MOBILE_CHECK_URL || `http://localhost:${PREVIEW_PORT}`;
// 5s by default so the first-visit popup (which triggers at 4s) is on screen and
// gets measured. It is the most-seen overlay on the site; a check that never
// renders it would have missed exactly the thing it is here to catch.
const settleMs = Number(argOf('settle') || 5000);
const only = argOf('route');
const routes = only ? [only] : ROUTES;
const isLocal = /localhost|127\.0\.0\.1/.test(baseUrl);

/**
 * Start `vite preview` and resolve once it answers, so one command does it all.
 *
 * Runs vite's own JS entry under this node binary rather than shelling out to
 * npm. On Windows, spawning npm.cmd without a shell throws EINVAL on Node 20+,
 * and spawning it WITH a shell leaves an orphan vite behind holding the port
 * when we kill the shell. Owning the node process avoids both.
 */
async function startPreview() {
  // vite 7 does not export its bin path, so read it off the package manifest
  // rather than require.resolve()-ing a subpath that "exports" forbids.
  const manifest = require.resolve('vite/package.json');
  const binRel = require(manifest).bin?.vite || 'bin/vite.js';
  const viteBin = path.join(path.dirname(manifest), binRel);
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--port', String(PREVIEW_PORT)],
    { stdio: 'ignore' }
  );
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl, { method: 'GET' });
      if (res.ok || res.status === 404) return child;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  child.kill();
  throw new Error(`vite preview did not answer on ${baseUrl} within 60s — run "npm run build" first`);
}

/**
 * Ask the page what is too wide. Returns the document overflow plus up to five
 * offending elements, so a failure names the thing to fix instead of just
 * saying "something overflows".
 */
function measureOverflow() {
  const vw = window.innerWidth;
  const docWidth = document.documentElement.scrollWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // 1px of tolerance: sub-pixel rounding is not a layout bug.
    if (r.right > vw + 1) {
      const cls = typeof el.className === 'string' ? el.className : '';
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: cls.split(/\s+/).filter(Boolean).slice(0, 4).join(' '),
        right: Math.round(r.right),
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  }
  offenders.sort((a, b) => b.right - a.right);
  return { vw, docWidth, offenders: offenders.slice(0, 5) };
}

async function main() {
  let preview = null;
  if (isLocal) {
    process.stdout.write(`Starting vite preview on ${baseUrl} ...\n`);
    preview = await startPreview();
  }

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const failures = [];

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        isMobile: vp.width < 768,
        hasTouch: vp.width < 768,
      });
      const page = await context.newPage();

      for (const route of routes) {
        const url = `${baseUrl}${route}`;
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
        } catch {
          // A slow or absent API must not fail the layout check — the shell
          // still renders and that is what is being measured.
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        }
        // Let entrance animations, lazy images and timed overlays settle.
        await page.waitForTimeout(settleMs);

        const { vw, docWidth, offenders } = await page.evaluate(measureOverflow);
        const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');
        const shot = path.join(OUT_DIR, `${slug}@${vp.name}.png`);
        await page.screenshot({ path: shot, fullPage: true });

        const overflows = docWidth > vw + 1;
        if (overflows || offenders.length) {
          failures.push({ route, viewport: vp.name, vw, docWidth, offenders });
          process.stdout.write(`FAIL  ${vp.name}px  ${route}  doc=${docWidth} vw=${vw}\n`);
          for (const o of offenders) {
            process.stdout.write(`        <${o.tag} class="${o.cls}"> right=${o.right}  ${JSON.stringify(o.text)}\n`);
          }
        } else {
          process.stdout.write(`ok    ${vp.name}px  ${route}\n`);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    if (preview) preview.kill();
  }

  process.stdout.write(`\nScreenshots: ${path.resolve(OUT_DIR)}\n`);
  if (failures.length) {
    process.stdout.write(`\n${failures.length} overflow(s) across ${routes.length} route(s). Mobile-first means this is a bug.\n`);
    process.exit(1);
  }
  process.stdout.write(`\nAll ${routes.length} route(s) clean at 320, 390 and 768px.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
