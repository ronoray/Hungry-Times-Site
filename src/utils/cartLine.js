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

/**
 * The packaging addon attached to a menu item, in cart-line shape, or null.
 *
 * Any surface that adds to the cart WITHOUT going through AddToCartModal has to
 * attach this itself: the modal auto-locks packaging onto every line, and the
 * server adds it at order time regardless, so a line without it shows the
 * customer a total below what they are charged.
 */
export function packagingAddonOf(item) {
  const groups = [
    ...(item?.addonGroups || []),
    ...(item?.families || []).filter((f) => f.type === 'addon'),
  ];
  for (const g of groups) {
    const opt = (g.options || []).find(isPackagingAddon);
    if (opt) {
      return { id: opt.id, name: opt.name, priceDelta: Number(opt.priceDelta) || 0, locked: true };
    }
  }
  return null;
}

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
