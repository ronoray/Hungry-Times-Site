// src/components/SiteFeedbackWidget.jsx
// Non-intrusive visitor feedback widget.
// Appears as a small chat-bubble bottom-left after 60s of browsing.
// Opens a gentle slide-up card — never blocks content, instant dismiss.

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ChevronRight } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || 'https://hungrytimes.in';

const ISSUE_OPTIONS = [
  { id: 'payment', label: 'Payment didn\'t work' },
  { id: 'slow',    label: 'Site too slow' },
  { id: 'menu',    label: 'Menu not loading' },
  { id: 'item',    label: 'Couldn\'t find item' },
  { id: 'order',   label: 'Ordering was confusing' },
  { id: 'other',   label: 'Something else' },
];

const POSITIVE_OPTIONS = [
  { id: 'easy',    label: 'Easy to order' },
  { id: 'variety', label: 'Great menu variety' },
  { id: 'fast',    label: 'Website loads fast' },
  { id: 'design',  label: 'Looks nice' },
];

const EMOJI_RATINGS = [
  { value: 1, emoji: '😞', label: 'Very poor' },
  { value: 2, emoji: '😕', label: 'Poor'      },
  { value: 3, emoji: '😐', label: 'Okay'      },
  { value: 4, emoji: '🙂', label: 'Good'      },
  { value: 5, emoji: '😊', label: 'Excellent'  },
];

const STORAGE_KEY = 'ht_feedback_last';
const COOLDOWN_DAYS = 7;

function shouldShow() {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return true;
  const diffDays = (Date.now() - Number(last)) / (1000 * 60 * 60 * 24);
  return diffDays >= COOLDOWN_DAYS;
}

export default function SiteFeedbackWidget() {
  const [phase, setPhase] = useState('hidden');   // hidden | bubble | card | followup | done
  const [rating, setRating] = useState(null);
  const [selected, setSelected] = useState([]);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!shouldShow()) return;

    // Show the bubble after 60s — user has had time to browse
    timerRef.current = setTimeout(() => setPhase('bubble'), 60_000);
    return () => clearTimeout(timerRef.current);
  }, []);

  const openCard = () => setPhase('card');

  const dismiss = () => {
    setPhase('bubble'); // collapse back to bubble — always reachable
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const selectRating = (val) => {
    setRating(val);
    setPhase('followup');
  };

  const toggleOption = (id) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const submit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/site-activity/opinion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          issues: selected,
          comment: comment.trim() || null,
          name:    name.trim()    || null,
          phone:   phone.trim()   || null,
          page:    window.location.pathname,
        }),
      });
    } catch { /* silent */ }

    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setPhase('done');
    setTimeout(() => setPhase('hidden'), 2500);
    setSubmitting(false);
  };

  const isNegative = rating !== null && rating <= 3;
  const options = rating !== null ? (isNegative ? ISSUE_OPTIONS : POSITIVE_OPTIONS) : [];

  if (phase === 'hidden') return null;

  return (
    <div className="fixed bottom-20 left-4 z-[9990] flex flex-col items-start gap-2">

      {/* ── Slide-up card ── */}
      {(phase === 'card' || phase === 'followup' || phase === 'done') && (
        <div
          className="w-72 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{ animation: 'ht-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <span className="text-sm font-semibold text-white">
              {phase === 'done' ? 'Thank you! 🙏' : 'Quick question'}
            </span>
            {phase !== 'done' && (
              <button onClick={dismiss} className="text-neutral-500 hover:text-neutral-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Done state */}
          {phase === 'done' && (
            <div className="px-4 py-5 text-center">
              <p className="text-neutral-300 text-sm">Your feedback helps us improve for everyone.</p>
            </div>
          )}

          {/* Rating step */}
          {phase === 'card' && (
            <div className="px-4 py-4">
              <p className="text-neutral-300 text-sm mb-4">How's your experience on our site?</p>
              <div className="flex justify-between">
                {EMOJI_RATINGS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => selectRating(r.value)}
                    title={r.label}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">{r.emoji}</span>
                    <span className="text-neutral-600 text-[10px] group-hover:text-neutral-400">{r.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-neutral-600 text-xs text-center mt-3">Tap to rate — takes 10 seconds</p>
            </div>
          )}

          {/* Follow-up step */}
          {phase === 'followup' && (
            <div className="px-4 py-4 space-y-3">
              {/* Chosen emoji confirmation */}
              <div className="flex items-center gap-2">
                <span className="text-xl">{EMOJI_RATINGS.find(r => r.value === rating)?.emoji}</span>
                <span className="text-white text-sm font-medium">
                  {isNegative ? 'What went wrong?' : 'What did you love?'}
                </span>
              </div>

              {/* Quick-tap options */}
              <div className="flex flex-wrap gap-1.5">
                {options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      selected.includes(opt.id)
                        ? isNegative
                          ? 'bg-red-900/60 border-red-600 text-red-300'
                          : 'bg-green-900/60 border-green-600 text-green-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Optional comment */}
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Anything else? (optional)"
                rows={2}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-neutral-500"
              />

              {/* Optional contact */}
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                />
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  inputMode="tel"
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                />
              </div>
              <p className="text-neutral-600 text-xs">Leave phone if you'd like us to follow up</p>

              {/* Submit */}
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#c49d2f] active:scale-95 text-black font-semibold text-sm py-2.5 rounded-xl transition-all"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Persistent bubble button ── */}
      {(phase === 'bubble' || phase === 'card' || phase === 'followup') && (
        <button
          onClick={phase === 'bubble' ? openCard : dismiss}
          title={phase === 'bubble' ? 'Share your feedback' : 'Close'}
          className={`flex items-center gap-2 rounded-full shadow-lg transition-all active:scale-95 ${
            phase === 'bubble'
              ? 'bg-neutral-800 border border-neutral-600 text-neutral-300 hover:border-[#D4AF37] hover:text-[#D4AF37] px-3 py-2'
              : 'bg-neutral-700 border border-neutral-600 text-neutral-400 hover:text-white p-2'
          }`}
        >
          {phase === 'bubble' ? (
            <>
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">How's your experience?</span>
              <ChevronRight className="w-3 h-3" />
            </>
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Inline keyframe */}
      <style>{`
        @keyframes ht-slide-up {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
