// components/FirstVisitPopup.jsx
// Shows the welcome offer to new visitors — once per device, never to logged-in
// users. Was FIRST30 (30%) until 2026-07-25; WELCOME15 is now the only live
// code, and every offer needs a ₹500+ order (server min_order_for_offer).
//
// The copy here must state the rule the SERVER actually enforces
// (utils/offerEligibility.js, case 'WELCOME15'): eligible only on a customer's
// FIRST EVER order, counted by phone across BOTH channels — a walk-in paid at
// the counter disqualifies you exactly as an online order does — and refused if
// the delivery address already belongs to another account with order history.
// It used to say "your first online order", which read as though counter orders
// did not count. They do.
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Copy, Check } from 'lucide-react';
import { useBackableOverlay } from '../hooks/useBackableOverlay';
import { useOfferFloor, useOffer } from '../hooks/useOfferFloor';
import { claimOverlay, welcomeTicketSeen } from '../utils/overlayBudget';

const STORAGE_KEY = 'ht_first_visit_seen';
const CODE = 'WELCOME15';
// Fallbacks only — the live numbers come from the offer row (see useOffer below).
const FALLBACK_DISCOUNT = '15%';
const FALLBACK_MAX_DISCOUNT = 200;
// Popup budget (docs/DESIGN_DNA.md §8): Home only, never /menu or /order.
const HOME_PATHS = ['/', '/home'];
const SHOW_AFTER_MS = 20_000;

/** '2026-12-31' -> '31 December'. Returns null for anything unparseable. */
function formatValidTill(raw) {
  if (!raw) return null;
  const d = new Date(`${String(raw).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
}

export default function FirstVisitPopup({ onDone }) {
  // Never hardcode the floor — this popup promises a number the order path has
  // to honour, and it is admin-tunable.
  const OFFER_MIN_ORDER = useOfferFloor();
  // Live terms, so retuning the offer in the ops panel retunes what the popup
  // promises. Falls back to the constants above until the feed lands.
  const offer = useOffer(CODE);
  const discountLabel = offer?.discount_type === 'percent' && offer?.discount_value
    ? `${Number(offer.discount_value)}%`
    : FALLBACK_DISCOUNT;
  const maxDiscount = Number(offer?.max_discount) > 0
    ? Number(offer.max_discount)
    : FALLBACK_MAX_DISCOUNT;
  const validTill = formatValidTill(offer?.valid_till);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    // Already seen?
    if (localStorage.getItem(STORAGE_KEY)) { onDone?.(); return; }

    // Already logged in with orders? Don't show.
    const token = localStorage.getItem('customerToken');
    if (token) {
      // Mark as seen — returning customer doesn't need first-visit offer
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      onDone?.();
      return;
    }

    // Home only. Anywhere else, release the notification prompt that waits
    // on us; if the visitor reaches Home later this effect runs again.
    if (!HOME_PATHS.includes(pathname)) { onDone?.(); return; }

    // The WELCOME15 ticket on Home already put the offer in front of them.
    if (welcomeTicketSeen()) { onDone?.(); return; }

    // After the visitor scrolls past the hero, or 20 s — whichever is first.
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timeoutId);
      // Re-check at the moment of showing: scrolling past the hero usually
      // brings the ticket into view, and another overlay may have claimed
      // this visit meanwhile.
      if (welcomeTicketSeen() || !claimOverlay('welcome')) { onDone?.(); return; }
      setShow(true);
    };

    const onScroll = () => {
      const hero = document.querySelector('[data-hero]');
      const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : window.innerHeight;
      if (window.scrollY + 64 >= heroBottom) trigger();
    };

    const timeoutId = setTimeout(trigger, SHOW_AFTER_MS);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    onDone?.();
  };

  // Back button dismisses the welcome popup instead of leaving the site. This is
  // the highest-traffic overlay on the site — nearly every first-time visitor
  // sees it, and many of them arrive on a single history entry from WhatsApp.
  // Declared after `dismiss` so the hook can capture it without hitting the TDZ,
  // and before the early return so the hook count stays stable.
  const closePopup = useBackableOverlay(show, dismiss);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = CODE;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const orderNow = () => {
    dismiss();
    // `replace`, not push: the popup's own history entry is on top right now, so
    // replacing it both takes the user to /menu and consumes that entry. Calling
    // closePopup() here instead would race — history.back() lands after the
    // push and would undo the navigation.
    navigate('/menu', { replace: true });
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-ht-ink/55"
        onClick={closePopup}
      />

      {/* Popup — bottom sheet on phones, centred card from md */}
      <div className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center md:inset-0 md:items-center md:p-4">
        <div className="relative w-full max-w-md overflow-hidden rounded-t-[22px] bg-ht-ivory pb-[env(safe-area-inset-bottom,0px)] text-ht-ink shadow-2xl motion-safe:animate-slideUp md:rounded-[14px]">
          <div className="paar" />

          <button
            onClick={closePopup}
            className="absolute right-2 top-4 z-10 grid h-11 w-11 place-items-center rounded-full text-ht-mute hover:bg-ht-ink/5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="px-5 pb-5 pt-5 text-center">
            <p className="kicker mb-2">First order with us</p>
            <h2 className="font-display text-[40px] leading-none text-ht-red">
              {discountLabel} off
            </h2>
            <p className="mt-2 text-[15px] font-semibold">
              on ₹{OFFER_MIN_ORDER}+ · up to ₹{maxDiscount}
              {validTill ? ` · till ${validTill}` : ''}
            </p>

            {/* Code box */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-ht-gold2 px-4 py-3">
              <span className="font-mono text-lg font-semibold tracking-[.12em] text-ht-red2">{CODE}</span>
              <button
                onClick={copyCode}
                className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-ht-red px-4 text-sm font-bold text-ht-red active:scale-95"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy code'}
              </button>
            </div>

            {/* CTA */}
            <button
              onClick={orderNow}
              className="mt-4 flex h-[52px] w-full items-center justify-center rounded-full bg-ht-red text-base font-bold text-white transition hover:bg-ht-red2 active:scale-95"
            >
              Open the menu →
            </button>

            <p className="mt-3 text-xs text-ht-mute">
              Max discount ₹{maxDiscount}. No discount on orders below ₹{OFFER_MIN_ORDER}. Online orders only.
            </p>
            <p className="mt-1.5 text-xs text-ht-mute">
              Already ordered from us — online or at the counter? This one is for
              first-timers, so it won&rsquo;t apply.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
