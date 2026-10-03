// src/utils/siteActivity.js — cart activity for the ops panel.
//
// Every add-to-cart is logged so the Feedback page can show who is browsing,
// what they put in the cart and whether an order followed. Until 22 Sep 2026
// the calls sent no session and no customer, so all the owner ever saw was
// "Fried Rice added at 14:33" with nobody attached to it.
//
// Identity is never sent as a field. When the visitor is logged in we send the
// customer token and the server works out who it is; a customer_id in the body
// is ignored.
//
// Everything here is fire-and-forget: it must never slow down or break a cart
// action, so every storage read and every request swallows its own errors.

import API_BASE from '../config/api';

const SESSION_KEY = 'ht_session_id';

/** One id per browser tab, kept for as long as the tab is open. */
export function getVisitorSessionId() {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

// ── Device id ──────────────────────────────────────────────────────────────
// ht_session_id is per TAB, so counting it counted tabs: one person opening the
// menu in three tabs was three "menu visitors" (owner, 3 Oct 2026). This id is
// per DEVICE (localStorage), so the ops panel counts people.
const VISITOR_KEY = 'ht_visitor_id';
const TEST_DEVICE_KEY = 'ht_test_device';

/** One id per browser/device, kept until site data is cleared. */
export function getVisitorId() {
  try {
    let vid = localStorage.getItem(VISITOR_KEY);
    if (!vid) {
      vid = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, vid);
    }
    return vid;
  } catch {
    return null;
  }
}

// Opening the site once with ?ht_test=1 marks this device as the owner's test
// device; its menu visits then stay out of the visitor count for good.
try {
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('ht_test') === '1') {
    localStorage.setItem(TEST_DEVICE_KEY, '1');
  }
} catch { /* storage blocked */ }

export function isTestDevice() {
  try { return localStorage.getItem(TEST_DEVICE_KEY) === '1'; } catch { return false; }
}

export function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('customerToken');
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch { /* storage blocked: log anonymously */ }
  return headers;
}

/**
 * Log one add-to-cart.
 * @param {{id?: number, name: string}} item
 * @param {{price?: number, qty?: number, source: string}} opts  one of the server's CART_SOURCES
 */
export function logCartAdd(item, { price, qty = 1, source } = {}) {
  if (!item?.name) return;
  fetch(`${API_BASE}/site-activity/cart-add`, {
    method: 'POST',
    headers: authHeaders(),
    keepalive: true,
    body: JSON.stringify({
      item_id: item.id ?? null,
      item_name: item.name,
      price: price ?? item.basePrice ?? item.price ?? 0,
      qty,
      source,
      session_id: getVisitorSessionId(),
    }),
  }).catch(() => {});
}

/**
 * After a login, hand this tab's earlier anonymous adds to the account. Most
 * visitors fill the cart first and only log in at checkout.
 */
export function identifyCartSession() {
  const sessionId = getVisitorSessionId();
  if (!sessionId) return;
  fetch(`${API_BASE}/site-activity/cart-identify`, {
    method: 'POST',
    headers: authHeaders(),
    // visitor_id lets the server mark this device if a test account logged in.
    body: JSON.stringify({ session_id: sessionId, visitor_id: getVisitorId() }),
  }).catch(() => {});
}

const SNAPSHOT_SENT_KEY = 'ht_cart_snapshot_sent';

/**
 * Send the whole cart as it stands. cart-add only ever sees adds, so without
 * this the ops panel could not know an item was taken back out, or that a dish
 * was switched to Large. Skips a send when nothing changed since the last one,
 * and never sends an empty cart for a tab that has not sent a full one.
 * @param {Array<{itemId?: number, name: string, qty: number, unitPrice: number, options?: string}>} lines
 */
export function syncCartSnapshot(lines) {
  const sessionId = getVisitorSessionId();
  if (!sessionId || !Array.isArray(lines)) return;
  const payload = lines.map((l) => ({
    item_id: l.itemId ?? null,
    name: l.name,
    qty: l.qty,
    unit_price: l.unitPrice,
    options: l.options || '',
  }));
  const sig = JSON.stringify(payload);
  try {
    const last = sessionStorage.getItem(SNAPSHOT_SENT_KEY);
    if (last === sig) return;
    if (last === null && payload.length === 0) return;
    sessionStorage.setItem(SNAPSHOT_SENT_KEY, sig);
  } catch { /* storage blocked: send anyway */ }
  fetch(`${API_BASE}/site-activity/cart-snapshot`, {
    method: 'POST',
    headers: authHeaders(),
    keepalive: true,
    body: JSON.stringify({ session_id: sessionId, lines: payload }),
  }).catch(() => {});
}

// ── Presence heartbeat ─────────────────────────────────────────────────────
// Tells the ops panel "this visitor is still on the site" (owner, 28 Sep
// 2026). Every 30s while the page is visible; nothing while the tab is hidden;
// one final beat on pagehide that marks the visit left. The server keeps ONE
// row per session and updates it, so this never adds a row per beat.
//
// Who the visitor is comes from the customer token, as with cart adds. The
// final beat goes by sendBeacon, which cannot carry the token; the server
// keeps the identity it already has for the session.
//
// The rider's delivery page is not a customer visit and never beats.

const PRESENCE_BEAT_MS = 30000;
let presenceTimer = null;
let presenceStarted = false;

function presenceBody(extra = {}) {
  return JSON.stringify({
    session_id: getVisitorSessionId(),
    page: window.location.pathname,
    ...extra,
  });
}

const isRiderPage = () => window.location.pathname.startsWith('/delivery/');

/** Send one beat now (fire-and-forget). Also used when the route changes. */
export function presenceBeat() {
  if (isRiderPage() || !getVisitorSessionId()) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  fetch(`${API_BASE}/site-activity/heartbeat`, {
    method: 'POST',
    headers: authHeaders(),
    keepalive: true,
    body: presenceBody(),
  }).catch(() => {});
}

function presenceLeave() {
  if (isRiderPage() || !getVisitorSessionId()) return;
  try {
    const blob = new Blob([presenceBody({ leaving: true })], { type: 'text/plain' });
    if (navigator.sendBeacon?.(`${API_BASE}/site-activity/heartbeat`, blob)) return;
  } catch { /* fall through */ }
  fetch(`${API_BASE}/site-activity/heartbeat`, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, keepalive: true,
    body: presenceBody({ leaving: true }),
  }).catch(() => {});
}

function presenceRun() {
  clearInterval(presenceTimer);
  presenceTimer = null;
  if (document.visibilityState !== 'visible') return; // hidden: stay silent
  presenceBeat();
  presenceTimer = setInterval(presenceBeat, PRESENCE_BEAT_MS);
}

/** Start the heartbeat once for the whole app. Safe to call more than once. */
export function startPresence() {
  if (presenceStarted || typeof window === 'undefined') return;
  presenceStarted = true;
  try {
    document.addEventListener('visibilitychange', presenceRun);
    window.addEventListener('pagehide', presenceLeave);
    // A page restored from the back/forward cache is a visit resuming.
    window.addEventListener('pageshow', (e) => { if (e.persisted) presenceRun(); });
    presenceRun();
  } catch { /* presence is best-effort */ }
}
