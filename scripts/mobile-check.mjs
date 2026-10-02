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
//   npm run mobile:check -- --overlays       # let popups show (suppressed by default)
//   npm run mobile:check -- --cart=empty     # only the empty-cart pass
//   npm run mobile:check -- --api=https://hungrytimes.in/api
//       serve the local build's GET /api calls from a live API, so pages
//       render real menu data. Only GETs are forwarded; every other method is
//       answered locally with 204, so a check never writes to that server
//       (no cart-add logs, no presence pings, no orders).
//
// Each route is captured twice per width: cart empty, and with three items
// seeded into localStorage (ht_cart), so the floating stack (cart bar, circles)
// is on screen and measured.
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
  '/home',
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

// 320 is the narrowest phone still in real use; 360 is the common Android
// width; 390 is the iPhone 12-15 class and the width the house rule names;
// 768 is the tablet boundary where the layout switches to its md: rules.
const VIEWPORTS = [
  { name: '320', width: 320, height: 720 },
  { name: '360', width: 360, height: 780 },
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
// Overlays (welcome popup, notification bar, install prompt) are suppressed by
// default so the screenshot is the page itself. --overlays lets them run; the
// welcome popup then needs --settle=21000 (it waits 20s on Home).
const showOverlays = args.includes('--overlays');
const settleMs = Number(argOf('settle') || 3000);
const cartModes = argOf('cart') === 'empty' ? ['empty'] : ['empty', 'cart3'];
const apiUpstream = (argOf('api') || '').replace(/\/+$/, '');

// Three plain lines in the CartContext shape (see addLine). Prices are only
// for the bar's total; nothing is ordered.
const SEED_CART = [
  { key: 'mc1', itemId: 900001, itemName: 'Fish n Chips', name: 'Fish n Chips', basePrice: 320, variants: [], addons: [], qty: 1 },
  { key: 'mc2', itemId: 900002, itemName: 'Prawn Mixed Fried Rice', name: 'Prawn Mixed Fried Rice', basePrice: 230, variants: [], addons: [], qty: 1 },
  { key: 'mc3', itemId: 900003, itemName: 'Chicken Chowmein', name: 'Chicken Chowmein', basePrice: 180, variants: [], addons: [], qty: 1 },
];

function seedStorage({ cart, overlays }) {
  try {
    if (!overlays) {
      sessionStorage.setItem('ht_overlay_shown', 'mobile-check');
      sessionStorage.setItem('pwa-prompt-dismissed', '1');
      localStorage.setItem('ht_first_visit_seen', '1');
      localStorage.setItem('notificationModalDismissed', String(Date.now()));
      localStorage.setItem('ht_feedback_last', String(Date.now()));
    }
    if (cart) localStorage.setItem('ht_cart', JSON.stringify(cart));
    else localStorage.removeItem('ht_cart');
  } catch { /* storage blocked */ }
}
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
  // Plates are allowed to bleed off the frame edge (DNA §4.3) and rails scroll
  // sideways on purpose — both sit inside an ancestor that clips or scrolls
  // and itself fits. Those are not overflow.
  const contained = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (a instanceof SVGElement) continue; // svg clips by default; look past it
      const ox = getComputedStyle(a).overflowX;
      // Any clipping/scrolling ancestor that itself fits contains it.
      if (ox !== 'visible' && a.getBoundingClientRect().right <= vw + 1) return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // 1px of tolerance: sub-pixel rounding is not a layout bug.
    if (r.right > vw + 1 && !contained(el)) {
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
      for (const mode of cartModes) {
      const page = await context.newPage();
      if (apiUpstream) {
        // The build calls either the dev API or whatever VITE_API_BASE baked
        // in (production builds use the live origin, which refuses
        // localhost by CORS). Catch both and answer from here.
        const apiPath = (u) => {
          const m = new URL(u).pathname.match(/^\/api(\/.*)$/);
          return m ? m[1] : null;
        };
        await page.route((u) => Boolean(apiPath(u.href)) && !u.href.startsWith('http://localhost:4174'), async (route) => {
          const req = route.request();
          if (req.method() === 'OPTIONS') {
            return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
          }
          if (req.method() !== 'GET') return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*' } });
          const u = new URL(req.url());
          const upstream = apiUpstream + apiPath(req.url()) + u.search;
          try {
            const res = await fetch(upstream);
            const body = Buffer.from(await res.arrayBuffer());
            return route.fulfill({
              status: res.status,
              body,
              headers: { 'content-type': res.headers.get('content-type') || 'application/json', 'access-control-allow-origin': '*' },
            });
          } catch {
            return route.fulfill({ status: 502, body: '' });
          }
        });
      }
      await page.addInitScript(seedStorage, {
        cart: mode === 'cart3' ? SEED_CART : null,
        overlays: showOverlays,
      });

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
        const shot = path.join(OUT_DIR, `${slug}@${vp.name}-${mode}.png`);
        await page.screenshot({ path: shot, fullPage: true });

        const overflows = docWidth > vw + 1;
        if (overflows || offenders.length) {
          failures.push({ route, viewport: vp.name, mode, vw, docWidth, offenders });
          process.stdout.write(`FAIL  ${vp.name}px  ${mode}  ${route}  doc=${docWidth} vw=${vw}\n`);
          for (const o of offenders) {
            process.stdout.write(`        <${o.tag} class="${o.cls}"> right=${o.right}  ${JSON.stringify(o.text)}\n`);
          }
        } else {
          process.stdout.write(`ok    ${vp.name}px  ${mode}  ${route}\n`);
        }
      }
      await page.close();
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
  process.stdout.write(`\nAll ${routes.length} route(s) clean at 320, 360, 390 and 768px.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
