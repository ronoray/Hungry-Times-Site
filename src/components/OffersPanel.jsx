import { useState, useEffect, useMemo } from 'react';
import { Tag, Gift, Users, Check } from 'lucide-react';
import API_BASE from '../config/api.js';

const SOURCE_ICONS = { promo: Tag, crm: Gift, referral: Users };

export default function OffersPanel({ cartTotal, customerPhone, onApplyOffer, onRemoveOffer, appliedCode }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerPhone) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/offers/my-offers?phone=${encodeURIComponent(customerPhone)}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (!cancelled) setOffers(data.offers || []);
      } catch (e) {
        console.error('[OffersPanel] fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerPhone]);

  // Calculate savings and sort
  const ranked = useMemo(() => {
    return offers
      .map(o => {
        let savings = 0;
        const meetsMin = cartTotal >= (o.min_order_value || 0);
        if (meetsMin) {
          if (o.discount_type === 'percent') {
            savings = cartTotal * o.discount_value / 100;
            if (o.max_discount && savings > o.max_discount) savings = o.max_discount;
          } else {
            savings = o.discount_value;
          }
          savings = Math.round(savings);
        }
        const shortfall = meetsMin ? 0 : Math.ceil((o.min_order_value || 0) - cartTotal);
        return { ...o, savings, meetsMin, shortfall };
      })
      .filter(o => o.meetsMin ? o.savings > 0 : o.shortfall > 0)
      .sort((a, b) => b.savings - a.savings);
  }, [offers, cartTotal]);

  if (loading || ranked.length === 0) return null;

  const bestCode = ranked[0]?.meetsMin ? ranked[0].code : null;

  return (
    <div className="py-2">
      <p className="text-neutral-300 text-sm font-medium mb-2">Your Offers</p>
      <div className="space-y-2">
        {ranked.map((offer) => {
          const Icon = SOURCE_ICONS[offer.source] || Tag;
          const isApplied = appliedCode?.code === offer.code;
          const isBest = offer.code === bestCode && offer.meetsMin;

          return (
            <div
              key={`${offer.source}-${offer.code}`}
              className={`rounded-lg p-3 border transition-all ${
                isApplied
                  ? 'border-green-500 bg-green-500/10'
                  : offer.meetsMin
                    ? 'border-neutral-600 bg-neutral-700/50 hover:border-neutral-500'
                    : 'border-neutral-700 bg-neutral-800/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Icon className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{offer.title}</span>
                      {isBest && !isApplied && (
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Best Value
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-400 text-xs mt-0.5">
                      Code: <span className="font-mono text-neutral-300">{offer.code}</span>
                      {offer.meetsMin && <span className="text-green-400 ml-2">Save ₹{offer.savings}</span>}
                      {!offer.meetsMin && <span className="text-orange-400 ml-2">Add ₹{offer.shortfall} more</span>}
                    </p>
                  </div>
                </div>

                {offer.meetsMin && (
                  isApplied ? (
                    <button
                      onClick={onRemoveOffer}
                      className="flex-shrink-0 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded transition-colors hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      Applied
                    </button>
                  ) : (
                    <button
                      onClick={() => onApplyOffer(offer)}
                      className="flex-shrink-0 px-3 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded hover:bg-orange-500/30 transition-colors"
                    >
                      Apply
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
