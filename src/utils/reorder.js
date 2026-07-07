// utils/reorder.js — rebuild a past order into the cart safely:
// verifies each item against the CURRENT menu (availability + price) instead of
// blindly trusting the old order's stored prices.
import API_BASE from '../config/api.js';

function parseItems(itemsJson) {
  try { return JSON.parse(itemsJson || '[]'); }
  catch { return []; }
}

async function fetchMenuLookup() {
  try {
    const res = await fetch(`${API_BASE}/public/menu`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.topCategories) return null;

    const lookup = new Map();
    for (const tc of data.topCategories) {
      for (const sc of (tc.subcategories || [])) {
        for (const item of (sc.items || [])) {
          const priceById = new Map();
          for (const v of (item.variants || [])) priceById.set(v.id, v.priceDelta);
          for (const fam of (item.families || [])) {
            for (const opt of (fam.options || [])) priceById.set(opt.id, opt.priceDelta);
          }
          for (const g of (item.addonGroups || [])) {
            for (const opt of (g.options || [])) priceById.set(opt.id, opt.priceDelta);
          }
          lookup.set(item.id, {
            basePrice: item.basePrice,
            disabled: !!item.effectiveDisabled,
            name: item.name,
            priceById,
          });
        }
      }
    }
    return lookup;
  } catch {
    return null;
  }
}

/**
 * Build fresh cart lines from a past order.
 * Returns { lines, skipped, menuChecked }:
 *  - lines: cart-ready lines with CURRENT menu prices where verifiable
 *  - skipped: names of items no longer available (disabled/removed from menu)
 *  - menuChecked: false if the menu fetch failed (lines fall back to stored prices)
 */
export async function buildReorderLines(order) {
  const items = parseItems(order.items_json);
  const lookup = await fetchMenuLookup();

  const lines = [];
  const skipped = [];

  for (const item of items) {
    const info = item.itemId != null && lookup ? lookup.get(item.itemId) : null;

    // Item known to the menu but currently unavailable → skip it
    if (info?.disabled) {
      skipped.push(item.itemName || info.name || 'Item');
      continue;
    }
    // Item has an id but no longer exists on the menu → skip it
    if (item.itemId != null && lookup && !info) {
      skipped.push(item.itemName || 'Item');
      continue;
    }

    const freshPrice = (id, stored) => {
      if (!info) return stored;
      const p = info.priceById.get(id);
      return p !== undefined ? p : stored;
    };

    lines.push({
      itemId: item.itemId,
      itemName: item.itemName,
      name: item.itemName,
      basePrice: info?.basePrice !== undefined ? info.basePrice : (item.basePrice || 0),
      variants: (item.variants || []).map(v => ({
        id: v.id, name: v.name,
        priceDelta: freshPrice(v.id, v.priceDelta || v.price || 0),
      })),
      addons: (item.addons || []).map(a => ({
        id: a.id, name: a.name,
        priceDelta: freshPrice(a.id, a.priceDelta || a.price || 0),
      })),
      qty: item.quantity || 1,
    });
  }

  return { lines, skipped, menuChecked: !!lookup };
}

/**
 * Full reorder flow: confirm cart replacement, rebuild lines, populate cart.
 * Returns true if the cart was populated, false if aborted/empty.
 */
export async function reorderIntoCart(order, { cartLines, clearCart, addLine, showToast }) {
  if (cartLines?.length > 0) {
    const ok = window.confirm('Your cart already has items. Replace them with this order?');
    if (!ok) return false;
  }

  const { lines, skipped } = await buildReorderLines(order);

  if (lines.length === 0) {
    showToast?.('None of these items are available right now', 'error');
    return false;
  }

  clearCart();
  lines.forEach(addLine);

  if (skipped.length > 0) {
    showToast?.(`Added ${lines.length} item(s) at current prices. Unavailable: ${skipped.join(', ')}`, 'info');
  } else {
    showToast?.('Items added to cart at current prices', 'success');
  }
  return true;
}
