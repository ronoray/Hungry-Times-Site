// src/utils/menuItems.js
//
// Hydrate menu item ids into full item objects.
//
// FavoritesContext stores bare ids in localStorage and nothing else — no name,
// no price, no image — so any screen that wants to render a favourite as a card
// has to fetch the menu and look them up. Menu.jsx does this by traversing the
// tree it already fetched; Profile has no menu data of its own, hence this.
//
// Deliberately separate from utils/reorder.js's private fetchMenuLookup(): that
// one flattens to { basePrice, disabled, name, priceById } and drops variants,
// families, addonGroups and imageUrl, and it sits on the reorder money path.

import API_BASE from '../config/api';

/**
 * Fetch the public menu and return a Map of itemId -> full item object,
 * preserving variants / addonGroups / families / imageUrl / effectiveDisabled.
 *
 * Returns an empty Map on any failure — callers should treat that as "nothing
 * to show" rather than an error state, since every consumer of this is a
 * secondary section.
 */
export async function fetchMenuItemsById() {
  try {
    const res = await fetch(`${API_BASE}/public/menu`);
    if (!res.ok) return new Map();
    const data = await res.json();

    const byId = new Map();
    for (const tc of data?.topCategories || []) {
      for (const sc of tc.subcategories || []) {
        for (const item of sc.items || []) {
          byId.set(item.id, item);
        }
      }
    }
    return byId;
  } catch {
    return new Map();
  }
}

/**
 * Does this item need AddToCartModal, or can it go straight into the cart?
 *
 * Mirrors Menu.jsx's hasVariantsOrAddons + hasOptions exactly, including the
 * part that looks conservative: the packaging addon is attached to every item
 * and counts here, so nearly everything routes through the modal. That is
 * correct — the modal is what auto-attaches and prices packaging. Adding such
 * an item directly would produce a cheaper line than the same dish added from
 * the menu.
 */
export function itemNeedsOptions(item) {
  if (!item) return true; // unknown -> the safe direction is "open the modal"

  const familyHasOptions = (type) => {
    const fams = (item.families || []).filter(f => f.type === type);
    if (fams.length > 0) return fams.some(f => (f.options || []).length > 0);
    if (type === 'variant') return (item.variants || []).length > 0;
    return (item.addonGroups || []).length > 0;
  };

  return familyHasOptions('variant') || familyHasOptions('addon');
}
