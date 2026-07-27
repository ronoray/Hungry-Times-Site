// Cart line display helpers.
//
// Packaging is charged on delivery/pickup and not on dine-in. The rule was
// applied in three places that disagreed: Order.jsx's summary memo deducted
// packaging for dine-in, but Order.jsx's line render and CartDrawer's both added
// every addon unconditionally. A dine-in combo therefore read "₹469 each" and
// "Add-ons: Packaging (Combo Parcel)" directly above a ₹449 subtotal and a
// "No packaging charge — saves ₹20" banner.
//
// The order payload and the server (normalizePackaging) already strip packaging
// for dine-in, so the amount charged was always right — this is purely what the
// customer is shown, which is exactly the kind of mismatch that costs trust at
// the checkout step.

const PACKAGING_RE = /packag/i;

export const isPackagingAddon = (addon) => PACKAGING_RE.test(addon?.name || '');

/** Addons that should be shown and priced for the current order mode. */
export function visibleAddons(line, isDineIn) {
  const addons = line?.addons || [];
  return isDineIn ? addons.filter((a) => !isPackagingAddon(a)) : addons;
}

/** Per-unit price of a cart line for the current order mode. */
export function lineUnitPrice(line, isDineIn) {
  const variants = (line?.variants || []).reduce((s, v) => s + (v.priceDelta || 0), 0);
  const addons = visibleAddons(line, isDineIn).reduce((s, a) => s + (a.priceDelta || 0), 0);
  return (line?.basePrice || 0) + variants + addons;
}
