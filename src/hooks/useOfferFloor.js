// src/hooks/useOfferFloor.js
//
// The server's minimum-order floor for offers and loyalty points
// (`settings.min_order_for_offer`, admin-tunable from the ops panel).
//
// Four places on this site had their own `const OFFER_MIN_ORDER = 500`:
// checkout, the offers panel, the first-visit popup, and the offers page.
// Raise the floor to ₹1000 and checkout would still let a customer apply a code
// on a ₹700 order — which the order path then refuses — while the popup went on
// promising "₹500 or more". One hook, one number.
//
// GET /offers/active ships the floor with or without a phone, so this needs no
// auth and no arguments. FALLBACK_MIN_ORDER applies only when the request fails;
// it is never the source of truth (see lib/discountRules.js).
import { useEffect, useState } from 'react';
import API_BASE from '../config/api.js';
import { FALLBACK_MIN_ORDER } from '../lib/discountRules';

// Module-level cache so several components mounting together (popup + strip +
// panel) share one request and one value, and a remount is instant.
let cached = null;
let inflight = null;

async function loadFloor() {
  if (cached != null) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/offers/active`);
      if (!res.ok) return FALLBACK_MIN_ORDER;
      const data = await res.json();
      const n = Number(data?.min_order_for_offer);
      if (Number.isFinite(n) && n >= 0) {
        cached = n;
        return n;
      }
      return FALLBACK_MIN_ORDER;
    } catch {
      return FALLBACK_MIN_ORDER;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * @returns {number} the live floor, starting at FALLBACK_MIN_ORDER until it loads.
 */
export function useOfferFloor() {
  const [floor, setFloor] = useState(cached ?? FALLBACK_MIN_ORDER);
  useEffect(() => {
    let cancelled = false;
    loadFloor().then((v) => { if (!cancelled) setFloor(v); });
    return () => { cancelled = true; };
  }, []);
  return floor;
}
