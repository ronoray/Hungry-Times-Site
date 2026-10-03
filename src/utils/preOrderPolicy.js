// Pre-order items (biryani, owner 3 Oct 2026): made against advance orders for
// gatherings, never sold by the plate on the day.
//
//   * at least PREORDER_MIN_QTY plates per order, all pre-order items together
//   * booked for a later IST calendar day, at most PREORDER_MAX_DAYS_AHEAD out
//   * delivery or pickup only
//   * no codes, offers or points (the server lists them as no-stack items)
//
// MIRROR of server/utils/preOrderPolicy.js in the webapp repo, which is the
// authority — the server refuses the order whatever this screen shows. The
// server also sends both numbers in /public/fulfilment-rules; these are the
// fallback when that call fails. Change both together.
//
// Pure: imported by lib/fulfilmentRules.js, which plain node tests load.
export const PREORDER_MIN_QTY = 10;
export const PREORDER_MAX_DAYS_AHEAD = 7;

/** Total plates of pre-order items in the cart. */
export function preOrderQty(lines, isPreOrder) {
  let n = 0;
  for (const l of Array.isArray(lines) ? lines : []) {
    if (!isPreOrder(l)) continue;
    const q = Number(l?.qty ?? l?.quantity ?? 1);
    n += Number.isFinite(q) && q > 0 ? q : 0;
  }
  return n;
}
