// components/AutoOfferCard.jsx
// The dish-level offers that need no code — the September campaign shape
// (Fish n Chips ₹255, any Meifoon 20% off) — rendered where a customer is
// actually choosing food.
//
// WHY THIS IS NOT OffersStrip
// OffersStrip filters `o.promo_code` and always will: it exists to hand out
// CODES and funnels to /offers, where a code is copied. A codeless offer has no
// code to copy and nothing to do on that page — its call to action is "put this
// dish in your cart", which only means something on the menu. Loosening the
// strip's filter would have put a code-shaped pill on screen with no code in
// it, and pointed it at the wrong page. So the two live side by side: codes to
// /offers, dishes to the dish.
//
// WHY THE TITLE IS RENDERED VERBATIM
// The server's offer title already carries the campaign wording ("September —
// Fish n Chips ₹255"). Trimming a "September — " prefix here would read better
// for exactly one month and then quietly mangle October's titles, and building
// the line from discount_type/discount_value would put arithmetic on a surface
// that must never disagree with the bill. The badge label restates
// discount_value and nothing else, matching the menu-tile badge from
// menuPublic.js for the same reason.
//
// Renders nothing while loading and nothing when no codeless offer is live, so
// it can be dropped into a layout without leaving a hole — and it empties by
// itself on 1 October when the offer rows fall out of the feed's date window.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag, ChevronRight } from 'lucide-react';
import API_BASE from '../config/api';
// Shared with PromoBar and the Offers page so the three "Order Now"s cannot
// drift. An offer with no deep link is not a dish offer, so it never reaches
// this card — the filter below drops it.
import { offerDeepLink } from '../utils/offerLink';

export default function AutoOfferCard({ className = '' }) {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // No phone param: these offers are open to everyone, and the anonymous
        // feed already drops the audience-gated and recipient-bound rows.
        const res = await fetch(`${API_BASE}/offers/active`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        setOffers(
          (data.offers || [])
            .filter((o) => o.apply_automatically && !o.promo_code && offerDeepLink(o))
            .slice(0, 4)
        );
      } catch { /* card stays hidden */ }
    })();

    return () => { cancelled = true; };
  }, []);

  if (offers.length === 0) return null;

  const discountText = (o) => (o.discount_type === 'percent'
    ? `${o.discount_value}% OFF`
    : `₹${Math.round(Number(o.discount_value) || 0)} OFF`);

  // Every margin/padding utility carries `!`. Menu.css resets
  // `.menu-page * { margin: 0; padding: 0 }` at equal specificity and loads
  // later, so unprefixed p-/px-/mt- utilities are silently dropped and this
  // collapses into an unreadable sliver on the one page it matters most.
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#dc5f1e]/40 bg-[#161616] !p-3 shadow-lg ${className}`}
    >
      <div className="flex items-center gap-2 !mb-2">
        <Tag className="h-3.5 w-3.5 flex-shrink-0 text-[#f5b944]" />
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-[#f5b944]">
          On the menu now
        </h2>
      </div>

      <ul className="flex flex-col gap-1.5">
        {offers.map((o) => (
          <li key={o.id}>
            <Link
              to={offerDeepLink(o)}
              className="group flex items-center gap-2.5 rounded-xl border border-white/5 bg-black/25 !px-2.5 !py-2 transition-colors hover:border-[#dc5f1e]/40"
            >
              <span className="flex-shrink-0 rounded-lg bg-[#dc5f1e]/15 !px-2 !py-0.5 text-[11px] font-extrabold text-[#f5b944]">
                {discountText(o)}
              </span>
              {/* Wraps rather than truncates. At 390px "September — 20% off any
                  Meifoon" clips to "…any Meif…", cutting the one word that says
                  which dish the offer is for — the exact complaint that started
                  this. Two lines cost a few pixels; a cut dish name costs the
                  offer. */}
              <span className="min-w-0 flex-1 text-sm leading-snug text-white/85">
                {o.title}
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/35 transition-colors group-hover:text-[#f5b944]" />
            </Link>
          </li>
        ))}
      </ul>

      {/* The GST line belongs here rather than on the menu tile: a tile has no
          room to litigate tax, but a customer reading the offer list is deciding
          whether to order on it. Checkout still shows GST as its own line. */}
      <p className="!mt-2 text-[11px] leading-snug text-white/45">
        Taken off automatically at checkout — no code needed. Discounted orders are
        charged 5% GST on top.
      </p>
    </div>
  );
}
