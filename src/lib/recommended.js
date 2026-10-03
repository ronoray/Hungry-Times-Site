// Pure helpers for the RECOMMENDED panel (components/RecommendedPanel.jsx).
// No React, no API import: plain node tests load this file.
//
// The server (/api/public/recommended, webapp server/utils/bestSellers.js)
// sends two lists:
//   bestSellers  real valid sales, last N days. The ONLY items that may be
//                called "best seller".
//   featured     staff picks (menu_items.featured_recommended). Never ranked.
//
// Featured pre-order items that share a menu section (Chicken / Mutton / Pork
// Biryani) become ONE card: one photo, every price, the condition, and a
// "Pre-order" link to that section. The card never adds to the cart, so a
// single plate can't be added from it; the menu rows and checkout enforce the
// minimum, and the server refuses anything under it.

/** Featured pre-order items grouped by menu section → one card each. */
export function preOrderCards(featured) {
  const groups = new Map();
  for (const f of Array.isArray(featured) ? featured : []) {
    if (!f?.preOrder) continue;
    const key = f.categoryId ?? `item-${f.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key: String(key),
        categoryId: f.categoryId ?? null,
        items: [],
        minQty: Number(f.minQty) || 10,
      });
    }
    groups.get(key).items.push(f);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    title: sharedTitle(g.items),
    prices: g.items.map((i) => ({
      id: i.id,
      label: shortLabel(i.name),
      price: Math.round(Number(i.basePrice) || 0),
    })),
    href: g.categoryId != null ? `/menu?sub=${g.categoryId}` : `/menu?highlight=${g.items[0].id}`,
  }));
}

/** Featured items that are NOT pre-order: shown as ordinary cards with a "New" tag. */
export function plainFeatured(featured) {
  return (Array.isArray(featured) ? featured : []).filter((f) => f && !f.preOrder);
}

// "Chicken Biryani", "Mutton Biryani" → card title "Biryani", labels "Chicken" / "Mutton".
function sharedTitle(items) {
  if (items.length === 1) return items[0].name;
  const words = items.map((i) => String(i.name || '').trim().split(/\s+/));
  const last = words[0].at(-1);
  return words.every((w) => w.at(-1) === last) ? last : 'Pre-order';
}

function shortLabel(name) {
  const w = String(name || '').trim().split(/\s+/);
  return w.length > 1 ? w.slice(0, -1).join(' ') : name;
}
