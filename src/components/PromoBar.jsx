// components/PromoBar.jsx
//
// One promo strip, replacing the two that used to stack: OfferBanner (fixed to
// the top of the viewport) and WhatsAppOrderBar (fixed below the navbar). Both
// could be on screen at once, costing ~76px of a phone's height on top of the
// 64px navbar, permanently, on every screen.
//
// Two changes from the originals:
//   1. At most one variant renders — a live discount wins, WhatsApp is the
//      fallback. Never both.
//   2. It sits in normal flow at the top of <main> instead of position:fixed, so
//      it scrolls away with the content instead of following the user around.
//
// One dismissal key covers the strip as a whole, so dismissing does not simply
// swap in the other variant.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import API_BASE from '../config/api.js';
import { useAuth } from '../context/AuthContext';
import { useExpiryLabel } from '../hooks/useExpiryLabel';

const DISMISS_KEY = 'ht_promo_bar_dismissed';
const WA_NUMBER = '916290471281';
const WA_PHONE_DISPLAY = '6290471281';

export default function PromoBar() {
  const { customer, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [offer, setOffer] = useState(null);
  // Shared with OffersStrip and the Offers page — see utils/offerCountdown.js.
  const timeLeft = useExpiryLabel(offer?.valid_till);
  const [dismissed, setDismissed] = useState(() => {
    try { return !!sessionStorage.getItem(DISMISS_KEY); } catch { return false; }
  });

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const phoneParam = isAuthenticated && customer?.phone ? `?phone=${customer.phone}` : '';
        const res = await fetch(`${API_BASE}/offers/active${phoneParam}`);
        if (!res.ok) return;
        const data = await res.json();
        const offers = data.offers || [];
        if (!cancelled && offers.length > 0) setOffer(offers[0]);
      } catch {
        // silently fall through to the WhatsApp variant
      }
    })();
    return () => { cancelled = true; };
  }, [dismissed, isAuthenticated, customer?.phone]);

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
  };

  if (dismissed) return null;

  // A live discount always outranks the WhatsApp cross-promo.
  const showOffer = !!offer;
  // WhatsApp fallback stays off /menu — the search bar conflicts with it and the
  // pitch is redundant on the ordering page itself.
  const showWhatsApp = !showOffer && location.pathname !== '/menu';

  if (!showOffer && !showWhatsApp) return null;

  if (showOffer) {
    const discountText = offer.discount_type === 'percent'
      ? `${offer.discount_value}% OFF`
      : `₹${offer.discount_value} OFF`;

    return (
      <div className="relative bg-emerald-700 text-white px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pr-8 text-sm">
          <span className="font-bold">{discountText}</span>
          <span className="hidden sm:inline">—</span>
          <span className="hidden sm:inline">{offer.title}</span>
          {offer.promo_code && (
            <span className="bg-white/20 px-2 py-0.5 rounded font-mono text-xs">
              Code: {offer.promo_code}
            </span>
          )}
          {timeLeft && (
            <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-medium">
              {timeLeft}
            </span>
          )}
          <button
            onClick={() => {
              if (offer.promo_code) {
                try { sessionStorage.setItem('ht_promo', offer.promo_code); } catch { /* private mode */ }
              }
              navigate(offer.promo_code === 'COMBO50' ? '/combo' : '/menu');
            }}
            className="bg-white text-emerald-700 px-3 py-1 rounded font-bold text-xs hover:bg-emerald-50 transition-colors"
          >
            Order Now
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative border-b border-neutral-800" style={{ background: 'rgba(15,18,24,0.97)' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 px-4 py-2 pr-10 text-sm">
        {/* WhatsApp icon — muted green, not full background */}
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0 text-[#4ade80]">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="text-neutral-300">
          Prefer WhatsApp?{' '}
          <a
            href={`https://wa.me/${WA_NUMBER}?text=Hi%2C+I%27d+like+to+order`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4ade80] font-medium hover:text-green-300 transition-colors"
          >
            Order on {WA_PHONE_DISPLAY}
          </a>
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
