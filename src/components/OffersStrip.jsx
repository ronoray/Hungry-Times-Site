// components/OffersStrip.jsx
// Compact live-offers teaser that funnels to /offers. One implementation shared
// by Home and Menu — the two surfaces where a customer is deciding whether to
// order — so the copy and the fetch never fork.
//
// Renders nothing while loading or when there is no code to show, so it can be
// dropped into a layout without leaving a hole.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag, ArrowRight } from 'lucide-react';
import API_BASE from '../config/api';
import { useAuth } from '../context/AuthContext';

export default function OffersStrip({ compact = false }) {
  const { customer, isAuthenticated } = useAuth();
  const [offers, setOffers] = useState([]);
  const [floor, setFloor] = useState(500);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Phone-aware, same as OfferBanner — a signed-in customer sees the codes
        // they are actually eligible for, not the anonymous list.
        const phoneParam = isAuthenticated && customer?.phone ? `?phone=${customer.phone}` : '';
        const res = await fetch(`${API_BASE}/offers/active${phoneParam}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setOffers((data.offers || []).filter((o) => o.promo_code).slice(0, 3));
        if (Number(data.min_order_for_offer) >= 0) setFloor(Number(data.min_order_for_offer));
      } catch { /* strip stays hidden */ }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, customer?.phone]);

  if (offers.length === 0) return null;

  const discountText = (o) => (o.discount_type === 'percent'
    ? `${o.discount_value}% OFF`
    : `₹${o.discount_value} OFF`);

  if (compact) {
    return (
      <Link
        to="/offers"
        className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm transition-colors hover:bg-amber-500/15"
      >
        <Tag className="h-4 w-4 flex-shrink-0 text-amber-400" />
        <span className="min-w-0 flex-1 truncate text-neutral-200">
          <span className="font-semibold text-amber-400">{discountText(offers[0])}</span>
          {' '}with <span className="font-mono font-semibold">{offers[0].promo_code}</span>
          {offers.length > 1 && ` · +${offers.length - 1} more`}
        </span>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-amber-400" />
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-neutral-900/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-white sm:text-lg">
          <Tag className="h-4 w-4 text-amber-400" />
          Offers running now
        </h2>
        <Link
          to="/offers"
          className="flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 sm:text-sm"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((o) => (
          <Link
            key={o.id}
            to="/offers"
            className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2.5 transition-colors hover:border-amber-500/40"
          >
            <span className="flex-shrink-0 rounded-lg bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-400">
              {discountText(o)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-neutral-200">{o.title}</span>
              <span className="block font-mono text-xs text-neutral-500">{o.promo_code}</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        One discount per order — we apply whichever saves you more. Codes and points start at ₹{floor}.
      </p>
    </div>
  );
}
