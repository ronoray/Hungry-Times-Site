// components/FirstVisitPopup.jsx
// Shows FIRST30 offer to new visitors — once per device, never to logged-in users with orders
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Copy, Check, Clock } from 'lucide-react';

const STORAGE_KEY = 'ht_first_visit_seen';
const CODE = 'FIRST30';
const DISCOUNT = '30%';
const TIMER_MINUTES = 30;

export default function FirstVisitPopup() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_MINUTES * 60);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Already seen?
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Already logged in with orders? Don't show.
    const token = localStorage.getItem('customerToken');
    if (token) {
      // Mark as seen — returning customer doesn't need first-visit offer
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
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
  };

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
    navigate('/menu');
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
        onClick={dismiss}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-[#141418] border border-orange-500/30 rounded-2xl max-w-md w-full shadow-2xl shadow-orange-500/10 relative overflow-hidden">
          {/* Gold accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="p-6 pt-8 text-center">
            {/* Header */}
            <p className="text-sm font-medium text-orange-400 tracking-wider uppercase mb-2">
              Welcome to Hungry Times
            </p>
            <h2 className="text-3xl font-bold text-white mb-1">
              {DISCOUNT} <span className="text-orange-400">OFF</span>
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              Your first online order, on us.
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
              Max discount ₹200. Valid on online orders only.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
