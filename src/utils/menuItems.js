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
import { isPackagingAddon } from './cartLine';

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
 * Does this dish have anything worth choosing — i.e. must it go through
 * AddToCartModal, or can it go straight into the cart?
 *
 * THE one implementation. Menu's item cards, Profile's favourites and the
 * server's needsOptions on /public/popular-items all have to agree, or a dish
 * offers a bare "Add" on one screen and demands a choice on another.
 *
 * Packaging does not count. It is attached to every item on the menu and is
 * locked, so for ~130 dishes it is the only row in the sheet — opening a modal
 * whose sole content is a charge you cannot decline is friction, not choice.
 * Callers adding directly MUST still attach it via packagingAddonOf(), which is
 * what makes excluding it here safe.
 *
 * Unknown item -> true. A wrong `true` costs one extra tap; a wrong `false`
 * puts an incomplete line in someone's cart.
 */
export function hasRealOptions(item) {
  if (!item) return true;

  const realIn = (groups) => groups.some(g => (g.options || []).some(o => !isPackagingAddon(o)));

  return (item.variants || []).length > 0
    || realIn(item.families || [])
    || realIn(item.addonGroups || []);
}
