// components/TestimonialCarousel.jsx
// Auto-rotating customer reviews (master plan §10.2 item 6).
//
// Hand-rolled on purpose: the repo has no carousel library and every other
// horizontal strip is CSS scroll-snap, so a dependency would be the only one of
// its kind for a single section.
//
// One slide at a time at every width — three-up on desktop would mean rotating
// three cards at once, which reads as the page glitching rather than as a
// carousel.

import { useEffect, useRef, useState } from 'react';
import StarRating from './StarRating';

// Auto-advance is a motion effect: honour the OS setting rather than animating
// at someone who has asked the whole system to stop moving.
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduce;
}

export default function TestimonialCarousel({ items = [], intervalMs = 6000 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const reduceMotion = usePrefersReducedMotion();

  const count = items.length;

  // Auto-advance. Stops while the customer is reading (hover/focus/touch) so a
  // slide never disappears mid-sentence.
  useEffect(() => {
    if (count <= 1 || paused || reduceMotion) return undefined;
    const id = setInterval(() => setIndex(i => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [count, paused, reduceMotion, intervalMs]);

  // If the list shrinks under us, don't strand the index past the end.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  const go = (next) => setIndex(((next % count) + count) % count);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const handleTouchEnd = (e) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    setPaused(false);
    if (start == null) return;
    const delta = e.changedTouches[0].clientX - start;
    if (Math.abs(delta) < 50) return; // ignore taps and jitter
    go(delta < 0 ? index + 1 : index - 1);
  };

  return (
    <div
      className="relative"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: reduceMotion ? 'none' : 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {items.map((t, i) => (
            <div
              key={t.id ?? i}
              className="w-full flex-shrink-0 px-1"
              aria-hidden={i !== index}
            >
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mx-auto max-w-2xl">
                <StarRating value={Number(t.rating) || 5} className="mb-3" />
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed mb-4">
                  &ldquo;{t.testimonial_text || t.text}&rdquo;
                </p>
                <p className="text-xs text-neutral-500 font-medium">
                  &mdash; {t.customer_name || t.name || 'Happy Customer'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {items.map((t, i) => (
            <button
              key={t.id ?? i}
              onClick={() => go(i)}
              // 24px hit area around a 6px dot — the dot alone is far below any
              // usable tap target on a phone.
              className="p-2 -m-1"
              aria-label={`Show review ${i + 1} of ${count}`}
              aria-current={i === index}
            >
              <span
                className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                  i === index ? 'bg-orange-500' : 'bg-neutral-700'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
