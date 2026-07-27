// MidWeekComboCard — homepage promo card for the live fixed-price combo.
//
// Everything shown here (name, price, savings, strike-through price, day window)
// comes from the server's /public/featured-combo, which reads the menu row that
// actually sells. The card used to hardcode a Mon–Thu day check plus ₹500 / ₹449
// / "save ₹51", making it a third independent copy of the offer rule: switching
// the combo off in the Menu Manager left the homepage still advertising it, and
// repricing either component dish turned the savings into a false claim.
//
// No live bundle → renders nothing, so the promotion retires itself.
import { useNavigate } from 'react-router-dom';
import { trackCtaClick } from '../utils/analytics';
import { addToCart as fbAddToCart } from '../lib/fbpixel';
import { useCart } from '../context/CartContext';
import { useFeaturedCombo } from '../hooks/useFeaturedCombo';

export default function MidWeekComboCard({ className = '' }) {
  const { combo, loading } = useFeaturedCombo();
  const { addLine } = useCart();
  const navigate = useNavigate();
  if (loading || !combo) return null;

  // "Mid-Week Combo: A + B" → "A + B" for the headline; plain names pass through.
  const headline = combo.name.includes(':')
    ? combo.name.split(':').slice(1).join(':').trim()
    : combo.name;

  // One tap = in the cart, same as the COMBO50 /combo page's grab button. This
  // used to deep-link to /menu?search=<name>, which only pre-filled a search box
  // and left the customer to find the item, open the modal and add it — four-plus
  // taps for a card whose whole job is to remove friction. Worse, searching the
  // FULL name ("Mid-Week Combo: Chilli Chicken + Prawn Mixed Fried Rice") through
  // Fuse also matches the standalone Chilli Chicken / Prawn Fried Rice items, so
  // the combo wasn't reliably first in its own result list.
  //
  // Packaging is deliberately not attached here: the server owns that decision
  // (normalizePackaging adds it for delivery/pickup and strips it for dine-in),
  // so the cart can't disagree with the bill whichever mode they pick later.
  const handleOrder = () => {
    trackCtaClick('midweek_combo', 'home');
    addLine({
      itemId: combo.id,
      itemName: combo.name,
      name: combo.name,
      basePrice: Number(combo.price) || 0,
      variants: [],
      addons: [],
      qty: 1,
    });
    try { fbAddToCart({ name: combo.name, id: combo.id, price: combo.price }); } catch { /* pixel blocked */ }
    navigate('/order');
  };

  return (
    <button
      type="button"
      onClick={handleOrder}
      className={`block w-full text-left group relative overflow-hidden rounded-2xl border border-[#dc5f1e]/40 bg-[#161616] shadow-lg ${className}`}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        {combo.imageUrl && (
          <img
            src={combo.imageUrl}
            alt={headline}
            loading="lazy"
            className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 bg-[#dc5f1e]/15 text-[#f5b944] text-[10px] font-bold px-2 py-0.5 rounded-full">
            ★ COMBO{combo.daysLabel ? ` — ${combo.daysLabel.toUpperCase()} ONLY` : ''}
          </div>
          <div className="mt-1 font-extrabold text-white leading-tight">
            {headline}
          </div>
          {combo.description && (
            <div className="text-xs text-white/60 line-clamp-1">{combo.description}</div>
          )}
          <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-0.5">
            {combo.compareAt != null && (
              <span className="text-white/40 line-through text-sm">₹{combo.compareAt}</span>
            )}
            <span className="text-xl font-extrabold text-[#f5b944]">₹{combo.price}</span>
            {combo.savings != null && (
              <span className="text-[11px] text-[#f5b944]/80 pb-0.5">save ₹{combo.savings}</span>
            )}
          </div>
        </div>
        <span className="self-center shrink-0 bg-[#dc5f1e] group-hover:bg-[#c5531a] text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors">
          Add →
        </span>
      </div>
    </button>
  );
}
