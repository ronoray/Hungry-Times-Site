// components/FirstVisitPopup.jsx
// Shows the welcome offer to new visitors — once per device, never to logged-in
// users with orders. Was FIRST30 (30%) until 2026-07-25; WELCOME15 is now the
// only live code, and every offer needs a ₹500+ order (server min_order_for_offer).
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Copy, Check, Clock } from 'lucide-react';
import { useBackableOverlay } from '../hooks/useBackableOverlay';
import { useOfferFloor } from '../hooks/useOfferFloor';

const STORAGE_KEY = 'ht_first_visit_seen';
const CODE = 'WELCOME15';
const DISCOUNT = '15%';
const TIMER_MINUTES = 30;

export default function FirstVisitPopup({ onDone }) {
  // Never hardcode the floor — this popup promises a number the order path has
  // to honour, and it is admin-tunable.
  const OFFER_MIN_ORDER = useOfferFloor();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_MINUTES * 60);
  const timerRef = useRef(null);
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

  // Countdown timer
  useEffect(() => {
    if (!show) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [show]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    clearInterval(timerRef.current);
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

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerExpired = timeLeft <= 0;

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
              {DISCOUNT} <span className="text-orange-400">OFF</span>
            </h2>
            <span className="inline-block bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              First-time customers only
            </span>
            <p className="text-gray-400 text-sm mb-5">
              On your first online order of ₹{OFFER_MIN_ORDER} or more.
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

            {/* Timer */}
            {!timerExpired ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-5">
                <Clock className="w-4 h-4" />
                <span>Offer expires in </span>
                <span className="font-mono font-bold text-orange-400">
                  {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-5">
                Don't worry — the code still works! Order anytime.
              </p>
            )}

            {/* CTA */}
            <button
              onClick={orderNow}
              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-xl transition-all text-lg shadow-lg shadow-orange-500/20"
            >
              Order Now
            </button>

            <p className="text-xs text-gray-500 mt-3">
              Max discount ₹200. No discount on orders below ₹{OFFER_MIN_ORDER}. Online orders only.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
