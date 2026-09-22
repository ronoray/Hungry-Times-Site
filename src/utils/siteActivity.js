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

function authHeaders() {
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
 * @param {{price?: number, qty?: number, source: 'menu'|'item_modal'|'home_popular'}} opts
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
    body: JSON.stringify({ session_id: sessionId }),
  }).catch(() => {});
}
