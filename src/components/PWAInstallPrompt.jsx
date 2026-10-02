// src/components/PWAInstallPrompt.jsx
// Install banner (mobile) / card (desktop). Never shown on iOS — Safari has no
// beforeinstallprompt, so the banner could only nag people to use the Share menu.

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { claimOverlay } from '../utils/overlayBudget';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone || dismissed) return;

    // iOS has no beforeinstallprompt and no programmatic install — the banner could
    // only ever show a "tap Share > Add to Home Screen" alert, which reads as spam.
    // Never prompt on iOS; Safari's own Share menu is the only real install path.
    const ua = navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (iosDevice) return;

    const showAfterDelay = (prompt) => {
      setDeferredPrompt(prompt);
      setTimeout(() => {
        // One overlay per visit (docs/DESIGN_DNA.md §8).
        if (!sessionStorage.getItem('pwa-prompt-dismissed') && claimOverlay('pwa')) setShowPrompt(true);
      }, 5000);
    };

    // If beforeinstallprompt already fired before React mounted, grab it from window
    if (window.__pwaDeferred) {
      showAfterDelay(window.__pwaDeferred);
      return;
    }

    // Otherwise wait for the custom event dispatched by main.jsx
    const handler = (e) => showAfterDelay(e.detail.prompt);
    window.addEventListener('pwa-install-available', handler);
    return () => window.removeEventListener('pwa-install-available', handler);
  }, []);

  const handleInstall = async () => {
    // Use global trigger (set up in main.jsx) or local deferred prompt
    const prompt = deferredPrompt || window.__pwaDeferred;
    if (!prompt) {
      alert(
        'To install this app:\n\n' +
        '1. Tap the menu (\u22EE) at top-right\n' +
        '2. Select "Install app" or "Add to Home screen"\n' +
        '3. Tap "Install" to confirm'
      );
      setShowPrompt(false);
      return;
    }

    prompt.prompt();
    await prompt.userChoice;
    window.__pwaDeferred = null;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Check if dismissed in session
  if (sessionStorage.getItem('pwa-prompt-dismissed')) return null;

  if (!showPrompt) return null;

  return (
    <>
      {/* Mobile banner — sits above the bottom nav, never over it */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom,0px))] z-[9999] border-t border-ht-ink/10 bg-ht-ivory p-3 text-ht-ink shadow-[0_-8px_24px_-12px_rgba(60,20,10,.35)] motion-safe:animate-slideUp md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img src="/ht_badge.png" alt="" className="h-11 w-11 shrink-0" width="44" height="44" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">Install Hungry Times</p>
              <p className="truncate text-xs text-ht-mute">Quick access & faster ordering</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={handleInstall}
              className="h-11 whitespace-nowrap rounded-full bg-ht-red px-4 text-sm font-bold text-white active:scale-95"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="grid h-11 w-11 place-items-center text-ht-mute hover:text-ht-ink"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop card — bottom right */}
      <div className="fixed bottom-6 right-6 z-[9999] hidden max-w-sm rounded-[14px] border border-ht-ink/10 bg-ht-ivory p-5 text-ht-ink shadow-2xl motion-safe:animate-slideUp md:block">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 grid h-11 w-11 place-items-center text-ht-mute hover:text-ht-ink"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex items-start gap-4 pr-8">
          <img src="/ht_badge.png" alt="" className="h-14 w-14 shrink-0" width="56" height="56" />
          <div className="flex-1">
            <h3 className="font-display text-lg leading-tight">Install Hungry Times</h3>
            <p className="font-serif text-base italic text-ht-mute">quick access, faster ordering, offline menu</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleInstall}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ht-red px-4 font-bold text-white transition hover:bg-ht-red2 active:scale-95"
          >
            <Download className="h-5 w-5" />
            Install app
          </button>
          <button
            onClick={handleDismiss}
            className="h-11 px-4 font-semibold text-ht-mute hover:text-ht-ink"
          >
            Not now
          </button>
        </div>
      </div>
    </>
  );
}
