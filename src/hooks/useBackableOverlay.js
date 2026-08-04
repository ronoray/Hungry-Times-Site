// src/hooks/useBackableOverlay.js
//
// Makes the browser/phone back button close an overlay instead of leaving the
// route underneath it.
//
// Every modal/drawer/sidebar on this site is plain useState, so it is invisible
// to history. Back on an open overlay used to pop the real route below it — and
// when that route was the only entry (deep link, WhatsApp, PWA icon) the whole
// app closed. This hook gives each open overlay its own history entry.
//
// Usage: pass the overlay's own open-state + close-callback, and route EVERY
// close trigger (X button, backdrop, swipe-dismiss, Escape, success/added
// auto-close) through the function it returns, so forward-closes stay in sync
// with the history stack.
//
//   const closeOverlay = useBackableOverlay(isOpen, onClose);
//   <button onClick={closeOverlay}>…</button>
//
// The hook must be called BEFORE any early `if (!isOpen) return null` so hook
// order stays stable across open/close renders.

import { useCallback, useEffect, useRef } from 'react';

// Shared LIFO stack of currently-pushed overlays. A single popstate event fires
// every listener on the window, so without this each nested overlay would close
// at once — sidebar + modal both vanishing on one back press. Only the token on
// top of the stack acts; the rest ignore the event.
const overlayStack = [];

// `enabled` lets a caller opt out of owning a history entry. Use it when the
// overlay did not come from an action on the current page — e.g. the menu's
// add-to-cart sheet auto-opened by /menu?highlight=<id>, which arrived as part
// of a single navigation from somewhere else. There, back should undo that whole
// hop and return the customer where they came from, not spend their back press
// closing a sheet they never opened. The returned closer still works; it just
// calls onClose directly instead of going through history.
export function useBackableOverlay(isOpen, onClose, enabled = true) {
  const pushedRef = useRef(false);
  // onClose is read through a ref so the effect can depend on isOpen alone.
  // Depending on the callback would re-run the effect (and push a second
  // history entry) on every parent render that passes a fresh arrow function.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !enabled) return undefined;

    const token = {};
    overlayStack.push(token);
    // Spread the existing state: react-router keeps { usr, key, idx } there and
    // reads idx back on popstate. Replacing it with a bare object corrupts the
    // router's internal index tracking.
    window.history.pushState({ ...window.history.state, htOverlay: true }, '');
    pushedRef.current = true;

    const handlePopState = () => {
      if (overlayStack[overlayStack.length - 1] !== token) return; // not the top overlay
      overlayStack.pop();
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Closed by a path that never went through the returned closer. Drop the
      // token so it can't block the overlay below it. We deliberately do NOT
      // history.back() here: under StrictMode the mount/cleanup/mount cycle
      // would pop the entry we just re-pushed and close the overlay instantly.
      const i = overlayStack.indexOf(token);
      if (i !== -1) overlayStack.splice(i, 1);
      pushedRef.current = false;
    };
  }, [isOpen, enabled]);

  return useCallback(() => {
    if (pushedRef.current) {
      // Don't clear pushedRef or call onClose here — history.back() fires the
      // popstate handler above, which owns both. Doing it twice would pop the
      // stack for the overlay underneath as well.
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }, []);
}

export default useBackableOverlay;
