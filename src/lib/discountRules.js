// src/lib/discountRules.js
// Customer-facing discount maths for the /offers savings calculator.
//
// Every number these helpers use comes from the server: `GET /offers/active`
// ships `min_order_for_offer` and `discount_tiers` straight out of
// server/utils/offerPolicy.js. The FALLBACK_* constants below exist only for the
// case where that request fails outright — they are never the source of truth.
// Do not "improve" this file by hardcoding policy: a client copy that drifts
// from the server is how the bill footer and the checkout `offersAllowed` twin
// both went wrong.
//
// This is a PREVIEW, not a quote. The order path (computeOrderDiscounts) remains
// the only authority on what a customer is actually charged.

// Mirrors DEFAULT_MIN_ORDER_FOR_OFFER / DEFAULT_DISCOUNT_TIERS in offerPolicy.js.
export const FALLBACK_MIN_ORDER = 500;
export const FALLBACK_TIERS = [
  { min: 0, pctCap: 0, rsCap: 0 },
  { min: 500, pctCap: 15, rsCap: 150 },
  { min: 1000, pctCap: 20, rsCap: 250 },
];

// Loyalty programme constants — mirrors server/utils/loyaltyUtils.js.
export const LOYALTY_EARN_RATE = 10;          // ₹10 spent = 1 point
export const LOYALTY_MIN_REDEEM = 50;         // balance needed before redeeming
export const LOYALTY_MAX_REDEEM_FRACTION = 0.2; // redemption caps at 20% of subtotal

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * ₹ ceiling a CODE-based promo may grant at this subtotal, per the tiered bands.
 * Port of getDiscountCeiling() in server/utils/offerPolicy.js.
 * @param {number} subtotal
 * @param {Array<{min:number,pctCap:number,rsCap:number}>} tiers
 * @returns {number} ₹ ceiling (0 in the below-floor band)
 */
export function ceilingFor(subtotal, tiers = FALLBACK_TIERS) {
  const bands = (Array.isArray(tiers) && tiers.length ? tiers : FALLBACK_TIERS)
    .slice()
    .sort((a, b) => a.min - b.min);
  const st = Number(subtotal) || 0;

  let band = bands[0];
  for (const t of bands) {
    if (st >= t.min) band = t; else break;
  }
  if (!band) return 0;

  const byPct = band.pctCap > 0 ? (st * band.pctCap) / 100 : Infinity;
  const byRs = band.rsCap > 0 ? band.rsCap : (band.pctCap > 0 ? Infinity : 0);
  const cap = Math.min(byPct, byRs);
  return Number.isFinite(cap) ? r2(cap) : st;
}

/**
 * What one offer would save on a plain cart of this subtotal.
 *
 * Item-restricted offers (COMBO50 and friends) are reported as `unknown: true`
 * rather than given a number — their discount applies to the qualifying items
 * only, so no honest figure exists without a real cart.
 *
 * @param {object} offer   row from /offers/active
 * @param {number} subtotal
 * @param {object} opts    { tiers, floor }
 * @returns {{saving:number, blocked:string|null, unknown:boolean}}
 */
export function offerSavingFor(offer, subtotal, { tiers = FALLBACK_TIERS, floor = FALLBACK_MIN_ORDER } = {}) {
  const st = Number(subtotal) || 0;
  if (!offer) return { saving: 0, blocked: null, unknown: false };

  const restricted = !!(offer.applicable_item_ids && String(offer.applicable_item_ids).trim());
  if (restricted) return { saving: 0, blocked: null, unknown: true };

  if (st < floor) return { saving: 0, blocked: 'floor', unknown: false };
  if (st < (Number(offer.min_order_value) || 0)) return { saving: 0, blocked: 'min_order', unknown: false };

  let saving = offer.discount_type === 'percent'
    ? (st * Number(offer.discount_value)) / 100
    : Math.min(Number(offer.discount_value), st);

  // The offer's own cap, then the global tiered ceiling. Both bind.
  if (offer.max_discount) saving = Math.min(saving, Number(offer.max_discount));
  saving = Math.min(saving, ceilingFor(st, tiers));

  // Floor, not round: rounding a ₹149.85 ceiling up to ₹150 would quote a
  // saving larger than the order path can actually grant.
  return { saving: Math.floor(saving), blocked: null, unknown: false };
}

/**
 * What a points balance would save on this subtotal.
 * @returns {{saving:number, blocked:string|null}}
 */
export function loyaltySavingFor(points, subtotal, { floor = FALLBACK_MIN_ORDER } = {}) {
  const st = Number(subtotal) || 0;
  const pts = Number(points) || 0;

  if (pts < LOYALTY_MIN_REDEEM) return { saving: 0, blocked: 'min_points' };
  if (st < floor) return { saving: 0, blocked: 'floor' };

  return { saving: Math.floor(Math.min(pts, st * LOYALTY_MAX_REDEEM_FRACTION)), blocked: null };
}

/**
 * One discount per order — pick the single best candidate.
 * @param {Array<{label:string, saving:number}>} candidates
 * @returns {object|null}
 */
export function bestOf(candidates = []) {
  return candidates
    .filter((c) => c && c.saving > 0)
    .sort((a, b) => b.saving - a.saving)[0] || null;
}

/** Points earned on a subtotal — 1 per ₹10 spent. */
export function pointsEarnedOn(subtotal) {
  return Math.floor((Number(subtotal) || 0) / LOYALTY_EARN_RATE);
}

/** Human label for an offer's target_audience. */
export function audienceLabel(audience) {
  switch (String(audience || 'all').toLowerCase()) {
    case 'new': return 'First-time customers';
    case 'returning': return 'Returning customers';
    default: return 'Everyone';
  }
}
