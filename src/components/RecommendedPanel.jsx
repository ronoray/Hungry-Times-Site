// components/RecommendedPanel.jsx
// RECOMMENDED — sits beside the "On the menu now" offers panel on /menu.
//
//   Offers       give a reason to buy (gold: value, DNA §2).
//   Recommended  shows what customers actually buy (ivory: information).
//
// Two kinds of card, never mixed up:
//   * BEST SELLER — only items the server ranked from real valid sales
//     (/api/public/recommended → server/utils/bestSellers.js). Nothing here is
//     hard-coded; the list moves when sales move.
//   * Featured pre-order card (biryani) — a staff pick, labelled "New & loved",
//     never "best seller". It states PRE-ORDER ONLY · MINIMUM 10 PLATES up front
//     and its only action is "Pre-order →", which opens the biryani section of
//     the menu. It cannot put a single plate in the cart; the menu rows,
//     checkout and the server each enforce the minimum.
//
// Layout is one markup: on phones a compact swipe strip (keeps the menu near
// the top); from lg a 2-column panel the height of the offers panel.
// Renders nothing until data arrives, and nothing if both lists are empty.
import { Link } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from './Toast';
import { trackAddToCart } from '../utils/analytics';
import VegDot from './VegDot';
import { useRecommended } from '../hooks/useRecommended';
import { preOrderCards } from '../lib/recommended';

// The cleaned campaign photograph (kitchen shot, Oct 2026). Swap the file at
// public/images/biryani-hero.jpg for a better shoot; nothing else changes.
const PREORDER_IMAGE = '/images/biryani-hero.jpg';

export default function RecommendedPanel({ canOrder = true, className = '' }) {
  const { bestSellers, featured, loaded } = useRecommended();
  const { addLine } = useCart();
  const showToast = useToast();

  const cards = preOrderCards(featured);
  if (!loaded || (!bestSellers.length && !cards.length)) return null;

  // Same line shape as Home's popular items: the packaging add-on MUST ride
  // along or the cart shows less than the server will charge.
  const add = (item) => {
    const pkg = item.packagingAddon;
    addLine({
      itemId: item.id,
      itemName: item.name,
      name: item.name,
      basePrice: Number(item.basePrice) || 0,
      variants: [],
      addons: pkg ? [{ id: pkg.id, name: pkg.name, priceDelta: Number(pkg.priceDelta) || 0, locked: true }] : [],
      qty: 1,
    }, { source: 'menu_recommended' });
    trackAddToCart(item, 1);
    showToast(`${item.name} added to cart`, 'success');
  };

  return (
    <section
      aria-labelledby="recommended-heading"
      className={`overflow-hidden rounded-[14px] border border-ht-ink/10 bg-ht-ivory !p-3 ${className}`}
    >
      <div className="flex items-baseline gap-2 !mb-2">
        <h2 id="recommended-heading" className="font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ht-red2">
          Recommended
        </h2>
        <span className="text-[12px] text-ht-mute">Popular at Hungry Times</span>
      </div>

      <div className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto !px-3 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:!px-0 lg:pb-0">
        {cards.map((c) => (
          <article
            key={c.key}
            className="flex w-[272px] shrink-0 snap-start flex-col overflow-hidden rounded-[12px] bg-white shadow-plate lg:col-span-2 lg:w-auto lg:flex-row"
          >
            <img
              src={PREORDER_IMAGE}
              alt={`Hungry Times ${c.title.toLowerCase()}`}
              loading="lazy"
              className="h-28 w-full object-cover lg:h-auto lg:w-[42%]"
            />
            <div className="flex flex-1 flex-col !p-3">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[19px] leading-none text-ht-ink">{c.title}</h3>
                <span className="whitespace-nowrap rounded bg-ht-red !px-1.5 !py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-white">
                  New &amp; loved
                </span>
              </div>
              <p className="!mt-1.5 text-[13px] leading-snug text-ht-ink">
                {c.prices.map((p, i) => (
                  <span key={p.id} className="whitespace-nowrap">
                    {i > 0 && <span className="text-ht-mute"> · </span>}
                    {p.label} <b className="tabular-nums">₹{p.price}</b>
                  </span>
                ))}
                <span className="text-ht-mute"> per plate</span>
              </p>
              {/* The condition, in plain sight — not a tooltip, not checkout-only. */}
              <p className="!mt-2 rounded border border-ht-ink/25 !px-2 !py-1 font-mono text-[10.5px] font-semibold uppercase leading-snug tracking-[.05em] text-ht-ink">
                Pre-order only · Minimum {c.minQty} plates · Order a day ahead
              </p>
              <Link
                to={c.href}
                className="!mt-2.5 inline-flex min-h-11 items-center justify-center gap-1 self-start rounded-full bg-ht-red !px-4 text-sm font-semibold text-white hover:bg-ht-red2 hover:no-underline"
              >
                Pre-order <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}

        {bestSellers.map((it) => (
          <article
            key={it.id}
            className="flex w-[152px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-[12px] bg-white !p-2.5 text-center shadow-plate lg:w-auto lg:flex-row lg:items-center lg:gap-2.5 lg:text-left"
          >
            {it.imageUrl ? (
              <img src={it.imageUrl} alt="" loading="lazy" className="plate h-16 w-16 shrink-0" />
            ) : (
              <span className="plate grid h-16 w-16 shrink-0 place-items-center text-[10px] text-ht-mute">Hungry Times</span>
            )}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1 lg:items-start">
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[.06em] text-ht-gold3">
                Best seller
              </span>
              <h3 className="line-clamp-2 text-[14px] font-semibold leading-tight text-ht-ink">
                {it.isVeg != null && <span className="mr-1 inline-block align-[-2px]"><VegDot isVeg={it.isVeg} /></span>}
                {it.name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold tabular-nums text-ht-ink">₹{Math.round(Number(it.basePrice) || 0)}</span>
                {canOrder && (it.needsOptions !== false ? (
                  <Link
                    to={`/menu?highlight=${it.id}`}
                    aria-label={`Choose options for ${it.name}`}
                    className="grid h-11 w-11 place-items-center rounded-full border border-ht-red text-ht-red hover:bg-ht-red hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => add(it)}
                    aria-label={`Add ${it.name} to cart`}
                    className="grid h-11 w-11 place-items-center rounded-full border border-ht-red text-ht-red hover:bg-ht-red hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
