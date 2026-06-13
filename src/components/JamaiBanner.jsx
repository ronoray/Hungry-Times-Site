// components/JamaiBanner.jsx
// Temporary Jamai Sasthi headline — auto-expires after 20 Jun 2026 (IST).
// Owns the --banner-h layout var via the same mechanism as OfferBanner, so the
// navbar/content below are never overlapped. Rendered in place of OfferBanner
// while active (see App.jsx). Self-kills on 21 Jun; the component can be
// deleted afterwards, but it is harmless if left in.
import { useEffect, useRef } from 'react';

// Active through end of 20 June 2026 IST; false from the 21st onward.
export function isJamaiBannerActive() {
  const istDate = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
  return istDate <= '2026-06-20';
}

export default function JamaiBanner() {
  const ref = useRef(null);
  const active = isJamaiBannerActive();

  // Drive --banner-h from the bar's actual height so the navbar below never
  // overlaps (matches OfferBanner behaviour, including taller wrap on phones).
  useEffect(() => {
    if (!active) {
      document.documentElement.style.setProperty('--banner-h', '0px');
      return;
    }
    const el = ref.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty('--banner-h', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => { ro.disconnect(); window.removeEventListener('resize', apply); };
  }, [active]);

  if (!active) return null;

  return (
    <div ref={ref} className="fixed top-0 left-0 right-0 z-[60] bg-amber-600 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-xs sm:text-sm">
        <span className="font-semibold">🍴 Jamai Sasthi Special —</span>
        <span>to customise your Jamai Sasthi feast, call</span>
        <a
          href="tel:+918420822919"
          className="font-bold underline underline-offset-2 whitespace-nowrap"
        >
          8420822919
        </a>
      </div>
    </div>
  );
}
