// utils/offerLink.js
// Where an offer should send a customer who taps it.
//
// One implementation, shared by PromoBar, AutoOfferCard and the Offers page,
// because all three had grown their own "Order Now" and all three sent the
// customer to a bare /menu. For a code that is fine — the code is what they
// carry, and it applies to whatever they build. For a CODELESS DISH offer it is
// a dead end: the September campaign advertises two specific dishes, and the
// button dropped people at the top of a 443-item menu with no hint which one the
// offer they just tapped was even about.
//
// Ids come from the offer row (`applicable_item_ids` / `applicable_category_ids`
// on /offers/active). The dish NAMES still come from the menu feed — this module
// deliberately knows no menu content, so it cannot become a second source of it.

/** First id out of a comma-separated id list, or null. */
export function firstId(csv) {
  if (!csv) return null;
  const first = String(csv)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return first || null;
}

/**
 * The /menu link that shows what an offer is actually about, or null when the
 * offer names nothing to point at.
 *
 * An item-scoped offer knows its dish, so ?highlight= takes the customer to it —
 * Menu scrolls the card into view and opens its options sheet. A category-scoped
 * offer names no single dish (that is the whole point of "any Meifoon"), so ?sub=
 * takes them to the section instead.
 *
 * Returns null rather than '/menu' so callers can tell "no useful destination"
 * apart from "the menu is the destination" — AutoOfferCard filters those offers
 * out entirely, while PromoBar and the Offers page fall back to /menu.
 *
 * @param {{applicable_item_ids?: string|null, applicable_category_ids?: string|null}} offer
 * @returns {string|null}
 */
export function offerDeepLink(offer) {
  if (!offer) return null;
  const itemId = firstId(offer.applicable_item_ids);
  if (itemId) return `/menu?highlight=${itemId}`;
  const catId = firstId(offer.applicable_category_ids);
  if (catId) return `/menu?sub=${catId}`;
  return null;
}
