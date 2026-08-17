// src/lib/billTotals.js
// Single source of truth for the ORDER SUMMARY block on every customer-facing
// surface: the checkout page, the cart drawer, the order-placed confirmation
// and the order-details page.
//
// The GST rule (owner-confirmed; mirror of server/utils/gst.js in the ops repo,
// and of client/src/utils/billTotals.js there):
//
//   NO discount of any kind  → GST is INCLUSIVE in the menu price. It was never
//                              added, so it must NOT appear as a line in the
//                              arithmetic column — it is stated below the Total
//                              instead. A column line reads as "added" no matter
//                              how it is labelled, and the column then overshoots
//                              the Total by 5%.
//
//   ANY discount (offer code OR loyalty points)
//                            → 5% is charged ON TOP of
//                              (subtotal − discount − points + delivery), so it
//                              is a real additive line and belongs in the column.
//
// WHY THIS FILE EXISTS
// Four surfaces render this block and each had its own copy of the branch. They
// had already drifted:
//   * OrderSuccess.jsx and OrderDetails.jsx omitted the loyalty redemption line
//     ENTIRELY, so order #262 showed Subtotal ₹720 and Total ₹604.80 with
//     nothing on the page accounting for the −₹144.
//   * OrderDetails.jsx printed Delivery ABOVE the GST line while every other
//     surface printed it below.
//   * Both post-order pages read `points_to_redeem` (the intent recorded at
//     checkout) rather than `points_redeemed` (what was actually spent). Orders
//     #111 and #112 carry a null `points_to_redeem` beside a non-null
//     `points_redeemed`, so the branch was reading the wrong column.
//   * All four showed the inclusive GST inside the column as "₹26.14 incl.",
//     which is what made a Weekend Special read Subtotal ₹549, GST ₹26.14,
//     Total ₹549.
//
// The invariant every surface must satisfy: the signed `row` values sum to the
// `total` row. billReconciles() checks it.

import { round2 } from './money.js';

export const GST_RATE = 0.05;

const nonNeg = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Decide how GST must be presented, and with what amount.
 *
 * @param {object} args
 * @param {number} args.subtotal          - cart value before any reduction
 * @param {number} [args.discountAmount]  - offer-code discount, in ₹
 * @param {number} [args.loyaltyDiscount] - points redeemed, in ₹ (1 point = ₹1)
 * @param {number} [args.deliveryCharge]
 * @param {number} args.total             - what the customer pays
 * @param {number|null} [args.storedTax]  - `online_orders.tax`. AUTHORITATIVE when
 *        present: it is what the server charged, so a saved order is shown back
 *        exactly as billed instead of re-derived.
 * @returns {{ onTop: boolean, amount: number }}
 */
export function resolveBillGst({
  subtotal = 0,
  discountAmount = 0,
  loyaltyDiscount = 0,
  deliveryCharge = 0,
  total = 0,
  storedTax = null,
} = {}) {
  const sub = nonNeg(subtotal);
  const disc = nonNeg(discountAmount);
  const pts = nonNeg(loyaltyDiscount);
  const delivery = nonNeg(deliveryCharge);
  const paid = nonNeg(total);

  const stored = Number(storedTax);
  const haveStored = storedTax != null && Number.isFinite(stored) && stored > 0;

  let onTop = disc > 0 || pts > 0;

  // Safety net for an old row missing its discount/points fields. Fires only
  // when the arithmetic PROVES the tax was added — subtotal + delivery + tax
  // lands on the total and subtotal + delivery alone does not.
  if (!onTop && haveStored) {
    const inclusiveFits = Math.abs(sub + delivery - paid) < 0.02;
    const onTopFits = Math.abs(sub + delivery + stored - paid) < 0.02;
    if (onTopFits && !inclusiveFits) onTop = true;
  }

  if (onTop) {
    const base = Math.max(0, sub - disc - pts) + delivery;
    return { onTop: true, amount: haveStored ? stored : round2(base * GST_RATE) };
  }

  return {
    onTop: false,
    amount: haveStored ? stored : round2(paid - paid / (1 + GST_RATE)),
  };
}

/**
 * The ordered summary block as render-agnostic descriptors.
 *
 * Order is deliberate and must not be rearranged:
 *   Subtotal → Discount → Points → GST (only when added) → Delivery → Total → note
 *
 * Delivery sits LAST before the Total because it is never discounted; showing it
 * above the discount reads as though the fee had been reduced too, and the
 * column reconciles either way so the misreading cannot be caught from the page.
 *
 * @param {object} args
 * @param {boolean} [args.showDelivery] - render the Delivery row at all. False for
 *        pickup and dine-in, where a "Delivery FREE" line is just noise.
 * @returns {Array<object>} each `{ kind, key, ... }`:
 *   kind 'row'   → { label, value (signed ₹), tone, free? }  counts toward the sum
 *   kind 'total' → { label, value }
 *   kind 'note'  → { text }                                   never part of the sum
 */
export function buildTotalsLines({
  subtotal = 0,
  discountAmount = 0,
  loyaltyDiscount = 0,
  pointsRedeemed = 0,
  deliveryCharge = 0,
  total = 0,
  storedTax = null,
  showDelivery = false,
} = {}) {
  const sub = nonNeg(subtotal);
  const disc = nonNeg(discountAmount);
  const pts = nonNeg(loyaltyDiscount) || nonNeg(pointsRedeemed);
  const delivery = nonNeg(deliveryCharge);
  const paid = nonNeg(total);

  const gst = resolveBillGst({
    subtotal: sub,
    discountAmount: disc,
    loyaltyDiscount: pts,
    deliveryCharge: delivery,
    total: paid,
    storedTax,
  });

  const lines = [
    { kind: 'row', key: 'subtotal', label: 'Subtotal', value: round2(sub), tone: 'muted' },
  ];

  if (disc > 0) {
    lines.push({ kind: 'row', key: 'discount', label: 'Discount', value: -round2(disc), tone: 'discount' });
  }

  if (pts > 0) {
    // 1 point = ₹1, and the server debits exactly the ₹ it allowed, so deriving
    // the count from the amount means the label and the figure cannot disagree.
    lines.push({
      kind: 'row',
      key: 'points',
      label: `Points redeemed (${Math.round(pts)} pts)`,
      value: -round2(pts),
      tone: 'points',
    });
  }

  if (gst.onTop) {
    lines.push({ kind: 'row', key: 'gst', label: 'GST (5%)', value: gst.amount, tone: 'muted' });
  }

  if (showDelivery) {
    lines.push({
      kind: 'row',
      key: 'delivery',
      label: 'Delivery',
      value: round2(delivery),
      tone: 'muted',
      free: delivery === 0,
    });
  }

  lines.push({ kind: 'total', key: 'total', label: 'Total', value: round2(paid) });

  if (!gst.onTop) {
    lines.push({ kind: 'note', key: 'gstIncluded', text: gstIncludedNote(gst.amount) });
  }

  return lines;
}

/**
 * The one wording for the inclusive-GST note, so the live cart (which keeps its
 * own interleaved layout and cannot use the line list above) says exactly what
 * the confirmation and order-details pages say.
 */
export function gstIncludedNote(amount) {
  return `Price includes GST 5% — ₹${round2(amount).toFixed(2)}`;
}

/**
 * Map a saved `online_orders` row to buildTotalsLines args.
 *
 * Shared by OrderSuccess and OrderDetails on purpose: the two pages previously
 * each decided which loyalty column to read, and both picked the wrong one.
 *
 * `points_redeemed` is what was actually spent; `points_to_redeem` is only the
 * intent recorded at checkout. Neither alone is safe:
 *   * orders #111 and #112 carry a NULL intent beside a real redemption, so
 *     reading the intent missed the deduction and mislabelled the GST;
 *   * cancelled order #128 carries an intent of 50 points that were never spent,
 *     so blindly falling back to it would invent a deduction.
 * So: trust `points_redeemed`, and fall back to the intent only when the
 * arithmetic proves it was spent — i.e. only when including it is what makes the
 * column reach the stored total.
 */
export function totalsArgsFromOrder(order = {}) {
  const subtotal = nonNeg(order.subtotal);
  const discountAmount = nonNeg(order.discount);
  const deliveryCharge = nonNeg(order.delivery_fee);
  const total = nonNeg(order.total);
  const storedTax = order.tax == null ? null : Number(order.tax);

  let loyaltyDiscount = nonNeg(order.points_redeemed);
  if (loyaltyDiscount === 0) {
    const intent = nonNeg(order.points_to_redeem);
    if (intent > 0) {
      const withIntent = Math.max(0, subtotal - discountAmount - intent) + deliveryCharge;
      const tax = nonNeg(storedTax);
      // The order was priced with the intent spent, on either GST branch.
      if (Math.abs(withIntent - total) < 0.02 || Math.abs(withIntent + tax - total) < 0.02) {
        loyaltyDiscount = intent;
      }
    }
  }

  const type = String(order.order_type || '').toLowerCase();
  return {
    subtotal,
    discountAmount,
    loyaltyDiscount,
    deliveryCharge,
    total,
    storedTax,
    // A "Delivery FREE" line on a pickup or dine-in order is noise the checkout
    // has never shown; these pages used to show it unconditionally.
    showDelivery: type !== 'pickup' && type !== 'dine_in' && type !== 'dine-in',
  };
}

/**
 * True when the displayed rows add up to the displayed Total. A customer who
 * totals the column and lands elsewhere cannot tell a display bug from being
 * overcharged, so every surface must satisfy this.
 */
export function billReconciles(args, tolerance = 0.02) {
  const lines = buildTotalsLines(args);
  const sum = lines
    .filter((l) => l.kind === 'row')
    .reduce((s, l) => s + Number(l.value || 0), 0);
  const total = lines.find((l) => l.kind === 'total');
  return Math.abs(sum - Number(total?.value || 0)) <= tolerance;
}
