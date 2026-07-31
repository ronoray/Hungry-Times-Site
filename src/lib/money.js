// src/lib/money.js
// Rupee arithmetic and display for checkout.
//
// The server keeps money to the paise (server/utils/gst.js rounds with
// toFixed(2)), but checkout used to Math.round every figure to whole rupees.
// On a discounted delivery order that showed the customer ₹959 against a
// charged ₹959.71 — they approve one number and are billed another. These
// helpers make the client agree with the server to the paise.
//
// Keep round2 identical to the server's `+(x).toFixed(2)`. If the two ever
// disagree, the approved total and the charged total drift apart again.

/** Round to paise, matching the server's `+(x).toFixed(2)`. */
export function round2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return +v.toFixed(2);
}

/**
 * Display a rupee amount: whole numbers stay whole (₹800, not ₹800.00), and
 * anything with paise shows both places (₹963.17, never ₹963.2).
 * No thousands separator — the surrounding checkout markup has never used one.
 */
export function money(n) {
  const v = round2(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** Rupees → integer paise, for payment gateways. Never pass a float onward. */
export function toPaise(n) {
  return Math.round(round2(n) * 100);
}
