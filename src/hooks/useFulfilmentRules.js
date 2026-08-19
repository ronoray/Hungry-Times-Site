// useFulfilmentRules — which items may leave the building, and which may not
// travel alone.
//
// Two rules the checkout has to know before the customer commits:
//
//   dineInOnly     Most drinks have no packaging — a Black Coffee has no lid —
//                  so they cannot be delivered or picked up. Only the sealed
//                  bottles and cans go out.
//   needsCompanion A dip cannot be the whole order. Nobody sends a rider across
//                  Kolkata with ₹40 of mayo.
//
// "Company" deliberately excludes anything flagged as an extra: a dip plus a
// bottle of water is still a trip worth nothing, so drinks do not satisfy a dip.
//
// Ids rather than flags on the cart line, following useNoStackItems — a cart
// restored from localStorage predates these flags and would otherwise slip past
// every check here. The server gate remains the authority; this exists so the
// customer finds out while they can still fix it, instead of being rejected at
// payment.
import { useEffect, useState } from 'react';
import API_BASE from '../config/api.js';

const EMPTY = { dineInOnly: new Set(), needsCompanion: new Set(), extras: new Set() };

export function useFulfilmentRules() {
  const [rules, setRules] = useState(EMPTY);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/fulfilment-rules`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setRules({
          dineInOnly: new Set((data?.dineInOnlyIds || []).map(String)),
          needsCompanion: new Set((data?.needsCompanionIds || []).map(String)),
          extras: new Set((data?.extraIds || []).map(String)),
        });
      } catch {
        // Leave the sets empty — checkout behaves as it did before, and the
        // server still refuses anything it should.
      }
    })();
    return () => { alive = false; };
  }, []);

  return rules;
}

const lineId = (l) => String(l?.itemId ?? l?.id ?? '');

/**
 * Why this cart cannot be ordered for delivery/pickup, or null when it can.
 *
 * Synchronous and pure — it is read during checkout render alongside the
 * no-stack guard, and an async check there would let the customer press Pay
 * before the answer arrived.
 *
 * @param {Array}  lines     cart lines
 * @param {string} orderMode 'delivery' | 'pickup' | 'dine_in'
 * @param {object} rules     from useFulfilmentRules()
 * @returns {{reason: 'dine_in_only'|'needs_companion', names: string[], message: string}|null}
 */
export function cartFulfilmentBlock(lines, orderMode, rules) {
  if (orderMode === 'dine_in') return null; // the counter serves everything
  if (!rules) return null;

  const cart = Array.isArray(lines) ? lines : [];
  if (!cart.length) return null;

  // 1. Anything that simply cannot travel.
  const stranded = cart.filter((l) => rules.dineInOnly.has(lineId(l)));
  if (stranded.length) {
    const names = [...new Set(stranded.map((l) => l?.name || 'An item'))];
    const subject = names.length === 1 ? names[0] : names.join(', ');
    return {
      reason: 'dine_in_only',
      names,
      message:
        names.length === 1
          ? `${subject} is available at the restaurant only — we can't pack it for ${orderMode === 'pickup' ? 'pickup' : 'delivery'}. Please remove it, or switch to dine-in.`
          : `${subject} are available at the restaurant only — we can't pack them. Please remove them, or switch to dine-in.`,
    };
  }

  // 2. Anything that cannot be the whole order.
  const clingy = cart.filter((l) => rules.needsCompanion.has(lineId(l)));
  if (clingy.length) {
    // An id we don't recognise counts as food — never block a cart we can't
    // actually verify, matching the server's tolerance for unresolved lines.
    const hasRealFood = cart.some((l) => {
      const id = lineId(l);
      return !rules.extras.has(id) && !rules.needsCompanion.has(id);
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
