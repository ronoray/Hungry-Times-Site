// Dish-offer prices for DISPLAY — looked up, never computed.
//
// The server prices each automatic dish offer with the same function the bill
// uses (ops repo: server/utils/autoItemOffers.js offerBadgeForItem) and ships
// the per-unit saving on `item.autoOffer.off`, keyed by the selected variant
// ids sorted and comma-joined ('' = the dish alone, '9' = Large). This file
// only looks those figures up. A selection with no key returns null, and the
// caller shows the list price plus the badge — checkout still prices it.
//
// Packaging and other addons are never discounted, so they are not in the key.

export function offerKey(variants) {
  return (variants || []).map((v) => String(v?.id)).sort().join(',');
}

/** Per-unit saving for a dish with these variants selected, or null. */
export function unitOfferOff(autoOffer, variants) {
  const off = autoOffer?.off;
  if (!off) return null;
  const v = off[offerKey(variants)];
  return typeof v === 'number' && v > 0 ? v : null;
}
