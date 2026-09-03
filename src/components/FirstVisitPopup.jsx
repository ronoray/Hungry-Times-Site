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
import { useNavigate } from 'react-router-dom';
import { X, Copy, Check, Clock } from 'lucide-react';
import { useBackableOverlay } from '../hooks/useBackableOverlay';
import { useOfferFloor, useOffer } from '../hooks/useOfferFloor';

const STORAGE_KEY = 'ht_first_visit_seen';
const CODE = 'WELCOME15';
// Fallbacks only — the live numbers come from the offer row (see useOffer below).
const FALLBACK_DISCOUNT = '15%';
const FALLBACK_MAX_DISCOUNT = 200;

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

    // Show after 4 seconds or 25% scroll, whichever comes first
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setShow(true);
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timeoutId);
    };

    const onScroll = () => {
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (scrollPercent >= 0.25) trigger();
    };

    const timeoutId = setTimeout(trigger, 4000);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

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
        className="fixed inset-0 bg-black/70 z-[9998] backdrop-blur-sm"
        onClick={closePopup}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-[#141418] border border-orange-500/30 rounded-2xl max-w-md w-full shadow-2xl shadow-orange-500/10 relative overflow-hidden">
          {/* Gold accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

          {/* Close button */}
          <button
            onClick={closePopup}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="p-6 pt-8 text-center">
            {/* Header */}
            <p className="text-sm font-medium text-orange-400 tracking-wider uppercase mb-2">
              Welcome to Hungry Times
            </p>
            <h2 className="text-3xl font-bold text-white mb-2">
              {discountLabel} <span className="text-orange-400">OFF</span>
            </h2>
            <span className="inline-block bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              First-time customers only
            </span>
            <p className="text-gray-400 text-sm mb-5">
              On your first ever order of ₹{OFFER_MIN_ORDER} or more.
            </p>

            {/* Code box */}
            <div className="bg-black/40 border border-orange-500/20 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your exclusive code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-mono font-bold text-orange-400 tracking-[0.15em]">
                  {CODE}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
                  title="Copy code"
                >
                  {copied
                    ? <Check className="w-4 h-4 text-green-400" />
                    : <Copy className="w-4 h-4 text-orange-400" />
                  }
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-400 mt-1">Copied!</p>
              )}
            </div>

            {/* What this slot used to be: a 30-minute countdown that, on hitting
                zero, replaced itself with "Don't worry — the code still works!".
                An urgency claim the component itself retracted half an hour
                later, on the most-seen screen on the site. The offer has no
                30-minute life; nothing expired when the clock did.
                What replaces it is true on both counts — the money is the real
                pull, and the only real deadline is the offer's own valid_till,
                read live so a retune in the ops panel moves it. */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-5">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>
                Save up to <span className="font-bold text-orange-400">₹{maxDiscount}</span>
                {validTill ? ` — yours until ${validTill}` : ' — no rush, it keeps'}
              </span>
            </div>

            {/* CTA */}
            <button
              onClick={orderNow}
              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-orange-500/20"
            >
              Order Now
            </button>

            <p className="text-xs text-gray-500 mt-3">
              Max discount ₹{maxDiscount}. No discount on orders below ₹{OFFER_MIN_ORDER}. Online orders only.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Already ordered from us — online or at the counter? This one is for
              first-timers, so it won&rsquo;t apply.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
