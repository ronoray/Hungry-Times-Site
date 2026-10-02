// OfferTicket — the ONE offer a screen shows (docs/DESIGN_DNA.md §4.4, §1:
// "one reason · one offer · one CTA per screen").
//
// Renders the first live one, in this order:
//   1. the featured fixed-price bundle (Mid-Week Combo Mon–Thu / Weekend
//      Special) — /public/featured-combo via useFeaturedCombo
//   2. WELCOME15, for a visitor who is not logged in — /offers/active via
//      useOffer. A logged-in customer may already have ordered (the code is
//      first-order-only, counted across both channels) and the site has no
//      order count to check, so they see nothing rather than a code the
//      server would refuse. Same rule FirstVisitPopup uses.
//   3. nothing.
//
// It replaces FeaturedComboCard + ComboPromoCard + OffersStrip on Home; those
// components stay in the repo for the surfaces that still use them. No fetch of
// its own — every number comes from the hooks, so a retune in the ops panel
// retunes the ticket.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check } from 'lucide-react';
import { trackCtaClick } from '../utils/analytics';
import { addToCart as fbAddToCart } from '../lib/fbpixel';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useFeaturedCombo } from '../hooks/useFeaturedCombo';
import { useOffer, useOfferFloor } from '../hooks/useOfferFloor';
import { markWelcomeTicketSeen } from '../utils/overlayBudget';

const WELCOME_CODE = 'WELCOME15';

/** '2026-12-31' -> '31 Dec'. Null for anything unparseable. */
function shortDate(raw) {
  if (!raw) return null;
  const d = new Date(`${String(raw).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function ComboTicket({ combo, surface }) {
  const { addLine } = useCart();
  const navigate = useNavigate();

  const headline = combo.name.includes(':')
    ? combo.name.split(':').slice(1).join(':').trim()
    : combo.name;
  const windowLabel = [
    combo.daysLabel ? `${combo.daysLabel} only` : '',
    combo.dateLabel || '',
  ].filter(Boolean).join(' · ');

  // Same line FeaturedComboCard builds — packaging rides along so the bag's
  // total matches the order the server creates (see that component's notes).
  const handleOrder = () => {
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
    }, { source: 'featured_combo' });
    try { fbAddToCart({ name: combo.name, id: combo.id, price: combo.price }); } catch { /* pixel blocked */ }
    navigate('/order');
  };

  return (
    <div className="ticket">
      <div className="ticket-main">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[.08em] text-ht-red2">
          {windowLabel || 'Fixed-price bundle'}
        </p>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-[30px] leading-none text-ht-red md:text-[34px]">₹{combo.price}</span>
          <span className="text-xs font-semibold text-ht-red2">+5% GST</span>
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-snug">{headline}</p>
        {combo.compareAt != null && combo.savings != null && (
          <p className="mt-1 text-[12.5px] text-ht-mute">
            <span className="line-through">₹{combo.compareAt}</span> · save ₹{combo.savings}
          </p>
        )}
      </div>
      <div className="ticket-stub">
        <button
          type="button"
          onClick={handleOrder}
          className="flex h-11 items-center whitespace-nowrap rounded-full bg-ht-red px-4 text-sm font-bold text-white active:scale-95"
        >
          Add →
        </button>
      </div>
    </div>
  );
}

function WelcomeTicket({ offer }) {
  const floor = useOfferFloor();
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  const pct = offer?.discount_type === 'percent' && offer?.discount_value
    ? `${Number(offer.discount_value)}%`
    : '15%';
  const cap = Number(offer?.max_discount) > 0 ? Number(offer.max_discount) : null;
  const till = shortDate(offer?.valid_till);

  // Seen = more than half of it on screen. The welcome popup carries the same
  // offer, so once the ticket has been seen the popup stands down.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { markWelcomeTicketSeen(); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const copy = async () => {
    markWelcomeTicketSeen();
    try {
      await navigator.clipboard.writeText(WELCOME_CODE);
    } catch {
      const el = document.createElement('textarea');
      el.value = WELCOME_CODE;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ticket" ref={ref}>
      <div className="ticket-main">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[.08em] text-ht-red2">First order with us</p>
        <p className="mt-1.5 font-display text-[30px] leading-none text-ht-red md:text-[34px]">{pct} off</p>
        <p className="mt-1.5 text-sm font-semibold">
          on ₹{floor}+{cap ? ` · up to ₹${cap}` : ''}
        </p>
        <p className="mt-1 text-[12.5px] text-ht-mute">
          Code <span className="font-mono text-[13px] font-semibold tracking-[.1em] text-ht-red2">{WELCOME_CODE}</span>
          {till ? ` · till ${till}` : ''}
        </p>
      </div>
      <div className="ticket-stub">
        <button
          type="button"
          onClick={copy}
          className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-ht-red px-3.5 text-[13px] font-bold text-ht-red active:scale-95"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : <>Copy<span className="-ml-0.5 hidden md:inline">code</span></>}
        </button>
        <span className="font-mono text-[9.5px] uppercase tracking-[.08em] text-ht-red2">online only</span>
      </div>
    </div>
  );
}

// allowWelcome=false: bundles only (the menu keeps codes for Home and the bag).
export default function OfferTicket({ surface = 'home', className = '', allowWelcome = true }) {
  const { combo, loading } = useFeaturedCombo();
  const { isAuthenticated } = useAuth();
  const welcome = useOffer(WELCOME_CODE);

  if (loading) return null;
  let ticket = null;
  if (combo) ticket = <ComboTicket combo={combo} surface={surface} />;
  else if (allowWelcome && welcome && !isAuthenticated) ticket = <WelcomeTicket offer={welcome} />;
  if (!ticket) return null;
  return <div className={className}>{ticket}</div>;
}
