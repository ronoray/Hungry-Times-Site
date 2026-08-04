// components/InstallAppSection.jsx
// Home's "Download App" block (master plan §10.2 item 8).
//
// Distinct from PWAInstallPrompt: that one is an uninvited overlay on a timer,
// this is a section the customer scrolls to. Same guards though — deliberately
// mirroring PWAInstallPrompt's rather than re-deriving them, because getting
// them wrong means nagging iPhone users about an install they cannot perform
// (fixed in 93a229f, do not reintroduce).
//
// Renders nothing when there is no real install to offer.

import { useEffect, useState } from 'react';
import { Download, Zap, WifiOff, Bell } from 'lucide-react';

export default function InstallAppSection() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return undefined;

    // iOS has no beforeinstallprompt and no programmatic install. The only
    // honest thing to show there is nothing.
    const ua = navigator.userAgent;
    const iosDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (iosDevice) return undefined;

    // The event may have fired before this mounted — main.jsx stashes it.
    if (window.__pwaDeferred) {
      setAvailable(true);
      return undefined;
    }

    const handler = () => setAvailable(true);
    window.addEventListener('pwa-install-available', handler);

    const onInstalled = () => setAvailable(false);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!available) return null;

  const install = async () => {
    // Defined in main.jsx; owns the deferred prompt and the userChoice await.
    const accepted = await window.triggerPWAInstall?.();
    if (accepted) setAvailable(false);
  };

  return (
    <section className="py-10 px-4 bg-neutral-950">
      <div className="max-w-3xl mx-auto rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-neutral-900 via-[#0B0B0B] to-neutral-900 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <img
            src="/icon-192.png"
            alt=""
            className="w-16 h-16 rounded-2xl border-2 border-[#D4AF37]/30 flex-shrink-0"
            width="64"
            height="64"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white mb-1">Install the app</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Order in two taps from your home screen.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5 text-xs text-neutral-400">
              <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-orange-500 flex-shrink-0" /> Faster ordering</li>
              <li className="flex items-center gap-2"><WifiOff className="w-4 h-4 text-orange-500 flex-shrink-0" /> Menu works offline</li>
              <li className="flex items-center gap-2"><Bell className="w-4 h-4 text-orange-500 flex-shrink-0" /> Order updates</li>
            </ul>
            <button
              onClick={install}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#F0C674] text-black font-semibold px-6 py-3 rounded-full transition-all active:scale-95 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              Install
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
