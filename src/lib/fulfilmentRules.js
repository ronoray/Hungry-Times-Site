// Pure fulfilment rules — what may leave the building, and what may not travel
// alone. No React, no API import: this must stay importable by a plain node test
// runner, which is why it lives here rather than beside the hook that feeds it.
//
//   dine-in only    Most drinks have no packaging — a Black Coffee has no lid —
//                   so they cannot be delivered or picked up.
//   needs companion A dip cannot be the whole order.
//
// "Company" deliberately excludes anything flagged as an extra: a dip plus a
// bottle of water is still a trip worth nothing, so drinks never satisfy a dip.
//
//   pre-order       Biryani is made for gatherings: at least PREORDER_MIN_QTY
//                   plates across all pre-order lines, and never dine-in.
//                   (The "later day" half lives in utils/paymentPolicy.js.)

import { PREORDER_MIN_QTY, preOrderQty } from '../utils/preOrderPolicy.js';

const lineId = (l) => String(l?.itemId ?? l?.id ?? '');

/**
 * Why this cart cannot be ordered for delivery/pickup, or null when it can.
 *
 * Synchronous and pure — it is read during checkout render alongside the
 * no-stack guard, and an async check there would let the customer press Pay
 * before the answer arrived.
 *
 * @param {Array}  lines     cart lines
 * @param {string} orderType 'delivery' | 'pickup' | 'dine_in'.
 *        MUST be the checkout page's own orderType, never the cart context's
 *        orderMode — Order.jsx owns the choice and the customer can change it
 *        there, so a cart built in dine-in mode and switched to delivery would
 *        otherwise keep dine-in's exemption.
 * @param {object} rules     { dineInOnly:Set, needsCompanion:Set, extras:Set,
 *                             preOrder?:Set, preOrderMinQty?:number }
 * @returns {{reason:'dine_in_only'|'needs_companion'|'pre_order_dine_in'|'pre_order_min', names:string[], message:string}|null}
 */
export function cartFulfilmentBlock(lines, orderType, rules) {
  if (!rules) return null;

  const cart = Array.isArray(lines) ? lines : [];
  if (!cart.length) return null;

  // 0. Pre-order (biryani). Checked before the dine-in exemption: it is party
  //    food that goes out, and the minimum holds whatever the order type.
  const isPre = (l) => !!rules.preOrder?.has(lineId(l));
  const pre = cart.filter(isPre);
  if (pre.length) {
    const names = [...new Set(pre.map((l) => l?.name || 'Biryani'))];
    if (orderType === 'dine_in') {
      return {
        reason: 'pre_order_dine_in',
        names,
        message: `${names.join(' and ')} ${names.length === 1 ? 'is' : 'are'} for delivery or pickup only. Please switch to delivery or pickup.`,
      };
    }
    const min = rules.preOrderMinQty || PREORDER_MIN_QTY;
    const qty = preOrderQty(cart, isPre);
    if (qty < min) {
      const more = min - qty;
      return {
        reason: 'pre_order_min',
        names,
        message: `Biryani is pre-order only, minimum ${min} plates per order (chicken and mutton together). Add ${more} more plate${more === 1 ? '' : 's'} to continue.`,
      };
    }
  }

  if (orderType === 'dine_in') return null; // the counter serves everything

  // 1. Anything that simply cannot travel. Reported first: telling someone to
  //    "add food" when the real problem is an unpackageable coffee would send
  //    them round in circles.
  const stranded = cart.filter((l) => rules.dineInOnly?.has(lineId(l)));
  if (stranded.length) {
    const names = [...new Set(stranded.map((l) => l?.name || 'An item'))];
    const channel = orderType === 'pickup' ? 'pickup' : 'delivery';
    return {
      reason: 'dine_in_only',
      names,
      message:
        names.length === 1
          ? `${names[0]} is available at the restaurant only — we can't pack it for ${channel}. Please remove it, or switch to dine-in.`
          : `${names.join(', ')} are available at the restaurant only — we can't pack them for ${channel}. Please remove them, or switch to dine-in.`,
    };
  }

  // 2. Anything that cannot be the whole order.
  const clingy = cart.filter((l) => rules.needsCompanion?.has(lineId(l)));
  if (clingy.length) {
    // An id we don't recognise counts as food — never block a cart we can't
    // actually verify, matching the server's tolerance for unresolved lines.
    const hasRealFood = cart.some((l) => {
      const id = lineId(l);
      return !rules.extras?.has(id) && !rules.needsCompanion?.has(id);
    });
    if (!hasRealFood) {
      const names = [...new Set(clingy.map((l) => l?.name || 'An item'))];
      const subject =
        names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
      return {
        reason: 'needs_companion',
        names,
        message: `${subject} can only be added to an order with food in it. Please add a dish, or come and enjoy it with us.`,
      };
    }
  }

  return null;
}
