// FeaturedComboCard — promo card for whichever fixed-price bundle is live now.
//
// Everything shown here (name, price, savings, strike-through price, day window,
// date window, livery) comes from the server's /public/featured-combo, which
// reads the menu row that actually sells. The card used to hardcode a Mon–Thu
// day check plus ₹500 / ₹449 / "save ₹51", making it a third independent copy of
// the offer rule: switching the combo off in the Menu Manager left the homepage
// still advertising it, and repricing either component dish turned the savings
// into a false claim.
//
// It was named MidWeekComboCard until the Weekend Special (₹549, Fri–Sun)
// shipped alongside the Mid-Week Combo (₹449, Mon–Thu). It never rendered one
// specific combo — the server picks — so the old name described the only row
// that happened to exist rather than what the component does.
//
// The two bundles can never both be live: the resolver publishes exactly one,
// and their day windows are disjoint. No live bundle → renders nothing, so the
// promotion retires itself.
import { useNavigate } from 'react-router-dom';
import { trackCtaClick } from '../utils/analytics';
import { addToCart as fbAddToCart } from '../lib/fbpixel';
import { useCart } from '../context/CartContext';
import { useFeaturedCombo } from '../hooks/useFeaturedCombo';

// Livery per bundle, chosen server-side (menu_items.combo_theme) so a second
// offer doesn't read as the first one with a new price. Classes are written out
// in full rather than composed: Tailwind scans source text, so an interpolated
// `bg-[${x}]` would never be emitted into the stylesheet.
const THEMES = {
  // Mid-Week Combo — the original burnt-orange/amber house palette.
  ember: {
    shell: 'border-[#dc5f1e]/40 bg-[#161616]',
    badge: 'bg-[#dc5f1e]/15 text-[#f5b944]',
    title: 'text-white',
    desc: 'text-white/60',
    strike: 'text-white/40',
    price: 'text-[#f5b944]',
    save: 'text-[#f5b944]/80',
    button: 'bg-[#dc5f1e] group-hover:bg-[#c5531a] text-white',
  },
  // Weekend Special — Ink navy / Ocean / Azure / Sky / Ice.
  ocean: {
    shell: 'border-[#155A8A]/60 bg-[#0B2A47]',
    badge: 'bg-[#2E9BD6]/20 text-[#7FCFEF]',
    title: 'text-[#E8F1F7]',
    desc: 'text-[#E8F1F7]/60',
    strike: 'text-[#E8F1F7]/40',
    price: 'text-[#7FCFEF]',
    save: 'text-[#7FCFEF]/80',
    button: 'bg-[#2E9BD6] group-hover:bg-[#155A8A] text-white',
  },
};

export default function FeaturedComboCard({ className = '', surface = 'home' }) {
  const { combo, loading } = useFeaturedCombo();
  const { addLine } = useCart();
  const navigate = useNavigate();
  if (loading || !combo) return null;

  // An unrecognised theme falls back rather than spreading undefined into the
  // class strings, which would render an unstyled card on a bad DB value.
  const t = THEMES[combo.theme] || THEMES.ember;

  // "Weekend Special: A + B" → "A + B" for the headline; plain names pass through.
  const headline = combo.name.includes(':')
    ? combo.name.split(':').slice(1).join(':').trim()
    : combo.name;

  // "FRI–SUN ONLY · 1–31 AUG". Either half may be empty — the Mid-Week Combo has
  // no date bounds — so they're joined only when both are present.
  const windowLabel = [
    combo.daysLabel ? `${combo.daysLabel.toUpperCase()} ONLY` : '',
    combo.dateLabel ? combo.dateLabel.toUpperCase() : '',
  ].filter(Boolean).join(' · ');

  // One tap = in the cart, same as the COMBO50 /combo page's grab button. This
  // used to deep-link to /menu?search=<name>, which only pre-filled a search box
  // and left the customer to find the item, open the modal and add it — four-plus
  // taps for a card whose whole job is to remove friction. Worse, searching the
  // FULL name ("Mid-Week Combo: Chilli Chicken + Prawn Mixed Fried Rice") through
  // Fuse also matches the standalone Chilli Chicken / Prawn Fried Rice items, so
  // the combo wasn't reliably first in its own result list.
  //
  // Packaging MUST be attached here. Leaving it to the server was wrong: the
  // server's normalizePackaging injects it at order time regardless, so a cart
  // line without it showed ₹449 and a GST/total computed off ₹449, while the
  // order actually created was ₹469 + GST — the customer was charged more than
  // the total they approved. AddToCartModal auto-locks this same addon for every
  // other item; this card just has to do what the modal does.
  //
  // It's attached unconditionally, matching Order.jsx, which subtracts packaging
  // again when the order mode is dine-in. Order mode is chosen at checkout, after
  // this button is pressed, so deciding here would guess wrong half the time.
  const handleOrder = () => {
    // Derived from the row, not hardcoded: this used to report 'midweek_combo'
    // from 'home' on every fire, so the weekend bundle would have been logged
    // under the wrong offer and the /menu placement under the wrong surface.
    trackCtaClick(`featured_combo_${combo.id}`, surface);
    const pkg = combo.packagingAddon;
    addLine({
      itemId: combo.id,
      itemName: combo.name,
      name: combo.name,
      basePrice: Number(combo.price) || 0,
      variants: [],
      addons: pkg ? [{ id: pkg.id, name: pkg.name, priceDelta: Number(pkg.priceDelta) || 0 }] : [],
      qty: 1,
    });
    try { fbAddToCart({ name: combo.name, id: combo.id, price: combo.price }); } catch { /* pixel blocked */ }
    navigate('/order');
  };

  return (
    <button
      type="button"
      onClick={handleOrder}
      className={`block w-full text-left group relative overflow-hidden rounded-2xl border shadow-lg ${t.shell} ${className}`}
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
          {/* Wraps rather than truncates: "FRI–SUN ONLY · 1–31 AUG" overflows one
              line on a 390px viewport, and the date window is the point of the
              badge. */}
          <div className={`inline-flex flex-wrap items-center gap-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${t.badge}`}>
            ★ COMBO{windowLabel ? ` — ${windowLabel}` : ''}
          </div>
          <div className={`mt-1 font-extrabold leading-tight ${t.title}`}>
            {headline}
          </div>
          {combo.description && (
            <div className={`text-xs line-clamp-1 ${t.desc}`}>{combo.description}</div>
          )}
          <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-0.5">
            {combo.compareAt != null && (
              <span className={`line-through text-sm ${t.strike}`}>₹{combo.compareAt}</span>
            )}
            <span className={`text-xl font-extrabold ${t.price}`}>₹{combo.price}</span>
            {combo.savings != null && (
              <span className={`text-[11px] pb-0.5 ${t.save}`}>save ₹{combo.savings}</span>
            )}
          </div>
        </div>
        <span className={`self-center shrink-0 text-sm font-bold px-3 py-2 rounded-xl transition-colors ${t.button}`}>
          Add →
        </span>
      </div>
    </button>
  );
}
