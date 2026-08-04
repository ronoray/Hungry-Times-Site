// components/ScrollMemory.jsx
//
// Scroll position across navigations. Replaces App.jsx's blanket
// `window.scrollTo(0, 0)` on every route change, which had two problems: it
// raced the browser's own restoration on back, and it treated a back press the
// same as a fresh navigation.
//
// The hard part is not remembering the position — it is that Home's sections
// (popular items, testimonials, gallery, offers) all mount EMPTY and fill in
// from their own fetches. At the instant we restore, the document is far
// shorter than it was when the position was recorded, so a single scrollTo
// clamps to the bottom of the short page. That is why coming back from a dish
// landed at the bottom of Home instead of at the card that was tapped.
//
// So the target is re-asserted for a few hundred milliseconds while the page
// grows, and abandoned the moment the customer touches the scroll themselves.

import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORE_KEY = 'ht_scroll_positions';
// ~660ms at 60fps. Long enough for the API calls behind Home's sections, short
// enough that a genuinely short page stops fighting quickly.
const MAX_SETTLE_FRAMES = 40;

const loadPositions = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}'); }
  catch { return {}; }
};

const savePosition = (key, y) => {
  try {
    const all = loadPositions();
    all[key] = y;
    sessionStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch { /* private mode — restoration silently degrades, nothing breaks */ }
};

export default function ScrollMemory() {
  const location = useLocation();
  const navigationType = useNavigationType();

  const locationKey = location.key;
  const keyRef = useRef(locationKey);
  const prevPathRef = useRef(location.pathname);
  // While we are driving the scroll ourselves, don't record what we write —
  // otherwise the settle loop overwrites the very target it is restoring to.
  const restoringRef = useRef(false);

  // Take the wheel off the browser. Its automatic restoration fires on back at
  // the same moment as ours and clamps against the not-yet-populated page, so
  // leaving it on means two mechanisms fighting over one scroll position.
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  // Record the position for the entry currently on screen, continuously, so
  // whatever the customer was looking at is what we come back to.
  useEffect(() => {
    keyRef.current = locationKey;

    let ticking = false;
    const record = () => {
      if (restoringRef.current) return;
      savePosition(keyRef.current, window.scrollY);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; record(); });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      record(); // capture the final position before this entry goes away
    };
  }, [locationKey]);

  useEffect(() => {
    const pathChanged = prevPathRef.current !== location.pathname;
    prevPathRef.current = location.pathname;

    if (navigationType === 'POP') {
      const target = loadPositions()[locationKey];
      if (typeof target !== 'number' || target <= 0) return undefined;

      restoringRef.current = true;
      let frames = 0;
      let cancelled = false;

      const stop = () => {
        cancelled = true;
        restoringRef.current = false;
      };

      const settle = () => {
        if (cancelled) return;
        window.scrollTo(0, target);
        frames += 1;
        // Done once the document is tall enough to actually hold the position.
        if (Math.abs(window.scrollY - target) < 2 || frames >= MAX_SETTLE_FRAMES) {
          stop();
          return;
        }
        requestAnimationFrame(settle);
      };
      requestAnimationFrame(settle);

      // The customer's own input always wins — never fight a finger.
      window.addEventListener('wheel', stop, { passive: true, once: true });
      window.addEventListener('touchstart', stop, { passive: true, once: true });
      window.addEventListener('keydown', stop, { once: true });

      return () => {
        stop();
        window.removeEventListener('wheel', stop);
        window.removeEventListener('touchstart', stop);
        window.removeEventListener('keydown', stop);
      };
    }

    // Forward navigation to a new page starts at the top. Deliberately gated on
    // the PATHNAME changing: /menu?cat=<id> is a push to the same page, and
    // Menu scrolls itself to the chosen category — jumping to the top first
    // would undo that.
    if (pathChanged) window.scrollTo(0, 0);
    return undefined;
  }, [locationKey, navigationType, location.pathname]);

  return null;
}
