// src/hooks/useOfferFloor.js
//
// The server's live offer facts, so the site never hardcodes a promise it then
// has to honour: the minimum-order floor (`settings.min_order_for_offer`,
// admin-tunable from the ops panel) and the terms of an individual offer.
//
// Four places on this site had their own `const OFFER_MIN_ORDER = 500`:
// checkout, the offers panel, the first-visit popup, and the offers page.
// Raise the floor to ₹1000 and checkout would still let a customer apply a code
// on a ₹700 order — which the order path then refuses — while the popup went on
// promising "₹500 or more". One hook, one number.
//
// The same reasoning extends to a single offer's terms. The welcome popup used
// to state "15% OFF", "Max discount ₹200" and a 30-minute countdown from its own
// constants; retune the offer in the ops panel and the popup keeps advertising
// the old deal. useOffer() reads them from the same feed instead.
//
// GET /offers/active ships all of this with or without a phone, so this needs no
// auth and no arguments. FALLBACK_MIN_ORDER applies only when the request fails;
// it is never the source of truth (see lib/discountRules.js).
import { useEffect, useState } from 'react';
import API_BASE from '../config/api.js';
import { FALLBACK_MIN_ORDER } from '../lib/discountRules';

// Module-level cache so several components mounting together (popup + strip +
// panel) share one request and one payload, and a remount is instant.
let cached = null;
let inflight = null;

async function loadFeed() {
  if (cached != null) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/offers/active`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && typeof data === 'object') {
        cached = data;
        return data;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function floorOf(feed) {
  const n = Number(feed?.min_order_for_offer);
  return Number.isFinite(n) && n >= 0 ? n : FALLBACK_MIN_ORDER;
}

/**
 * @returns {number} the live floor, starting at FALLBACK_MIN_ORDER until it loads.
 */
export function useOfferFloor() {
  const [floor, setFloor] = useState(() => floorOf(cached));
  useEffect(() => {
    let cancelled = false;
    loadFeed().then((feed) => { if (!cancelled) setFloor(floorOf(feed)); });
    return () => { cancelled = true; };
  }, []);
  return floor;
}

function findOffer(feed, code) {
  if (!feed || !code) return null;
  const wanted = String(code).toUpperCase();
  const list = Array.isArray(feed.offers) ? feed.offers : [];
  return list.find((o) => String(o?.promo_code || '').toUpperCase() === wanted) || null;
}

/**
 * The live active_offers row for one promo code, or null while it loads / if the
 * code is not currently on the public feed.
 *
 * @param {string} code e.g. 'WELCOME15'
 * @returns {object|null} the offer as /offers/active returns it
 */
export function useOffer(code) {
  const [offer, setOffer] = useState(() => findOffer(cached, code));
  useEffect(() => {
    let cancelled = false;
    loadFeed().then((feed) => { if (!cancelled) setOffer(findOffer(feed, code)); });
    return () => { cancelled = true; };
  }, [code]);
  return offer;
}
