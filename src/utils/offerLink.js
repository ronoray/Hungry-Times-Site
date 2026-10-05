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

// Pages where the strip's button must not appear. Checkout and the post-order
// pages are the end of the ordering path: "Order Now" there pulled the customer
// OUT of a half-finished checkout and back to the menu.
const isEndOfOrderPath = (path) =>
  path === '/order' ||
  path.startsWith('/order-success/') ||
  path.startsWith('/track/') ||
  path.startsWith('/delivery/');

/**
 * What PromoBar's button should be on this page, or null for no button.
 *
 * "Order Now" is a link to the menu, so on the menu itself it did nothing —
 * owner, 5 Oct 2026: "serves no function on the menu page". On /menu:
 *   - a codeless dish offer → `hideStrip`: AutoOfferCard, above the search bar,
 *     already lists every codeless offer with a link to its dish. The strip was
 *     a second copy of it, costing a phone ~40px.
 *   - a code offer → "Save code": the one useful thing left to do here is carry
 *     the code to checkout, which Order.jsx auto-applies from `ht_promo`.
 *
 * @param {string} pathname  location.pathname
 * @param {{promo_code?: string|null, applicable_item_ids?: string|null, applicable_category_ids?: string|null}} offer
 * @returns {{hideStrip?: true} | {action: 'navigate', label: string, to: string} | {action: 'save', label: string} | null}
 */
export function promoBarCta(pathname, offer) {
  if (!offer) return null;
  const path = pathname || '/';
  if (isEndOfOrderPath(path)) return null;
  if (path === '/menu') {
    if (!offer.promo_code) return { hideStrip: true };
    if (offer.promo_code === 'COMBO50') return { action: 'navigate', label: 'Order Now', to: '/combo' };
    return { action: 'save', label: 'Save code' };
  }
  // COMBO50 has a page of its own. Every other CODE applies to whatever the
  // customer builds, so the menu is the right landing; a codeless dish offer
  // goes to the dish.
  if (offer.promo_code === 'COMBO50') return { action: 'navigate', label: 'Order Now', to: '/combo' };
  const to = (!offer.promo_code && offerDeepLink(offer)) || '/menu';
  return { action: 'navigate', label: 'Order Now', to };
}
