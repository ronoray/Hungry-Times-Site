// src/components/PWAInstallPrompt.jsx - DEBUGGING VERSION
// ============================================================================
// EXTENSIVE LOGGING to diagnose why banner doesn't appear
// ============================================================================

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check session storage immediately
    const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone || dismissed) {
      return;
    }

    // Detect iOS (beforeinstallprompt NEVER fires on iOS)
    const ua = navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (iosDevice) {
      setIsIOS(true);
      // Show iOS install prompt after 5 seconds
      const timer = setTimeout(() => {
        const nowDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
        if (!nowDismissed) {
          setShowPrompt(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: Listen for the install prompt event
    const handler = (e) => {
      setDeferredPrompt(e);

      setTimeout(() => {
        const nowDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
        if (!nowDismissed) {
          setShowPrompt(true);
        }
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Monitor showPrompt state changes
  useEffect(() => {
    console.log('[PWA Install Debug] 🔄 showPrompt state changed to:', showPrompt);
  }, [showPrompt]);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS: Show manual instructions since beforeinstallprompt doesn't exist
      alert(
        'To install Hungry Times on iPhone/iPad:\n\n' +
        '1. Tap the Share button (square with arrow) at the bottom of Safari\n' +
        '2. Scroll down and tap "Add to Home Screen"\n' +
        '3. Tap "Add" to confirm\n\n' +
        'This gives you quick access and push notifications!'
      );
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) {
      alert(
        'To install this app:\n\n' +
        '1. Tap the menu (\u22EE) at top-right\n' +
        '2. Select "Install app" or "Add to Home screen"\n' +
        '3. Tap "Install" to confirm'
      );
      setShowPrompt(false);
      return;
    }

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    console.log('[PWA Install Debug] ✖️ User dismissed banner');
    setShowPrompt(false);
    const timestamp = Date.now().toString();
    sessionStorage.setItem('pwa-prompt-dismissed', timestamp);
    console.log('[PWA Install Debug] 📦 Saved dismissal timestamp:', timestamp);
  };

  // Check if dismissed in session
  if (sessionStorage.getItem('pwa-prompt-dismissed')) {
    console.log('[PWA Install Debug] 🚫 RENDER BLOCKED: Session storage has dismissal');
    return null;
  }

  if (!showPrompt) {
    console.log('[PWA Install Debug] 🚫 RENDER BLOCKED: showPrompt =', showPrompt);
    return null;
  }

  console.log('[PWA Install Debug] 🎨 RENDERING BANNER NOW!');

  return (
    <>
      {/* Mobile Banner - Bottom - Elegant dark design */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-neutral-900 via-[#0B0B0B] to-neutral-900 border-t-2 border-[#D4AF37]/30 text-white p-4 shadow-2xl z-[9999] md:hidden animate-slide-up backdrop-blur-md"
        style={{ zIndex: 9999 }}
      >
        {/* Subtle gold glow at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
        
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* App icon with gold border */}
            <div className="w-12 h-12 bg-gradient-to-br from-neutral-800 to-neutral-900 border-2 border-[#D4AF37]/30 rounded-xl flex items-center justify-center flex-shrink-0 p-0.5">
              <img 
                src="/icon-192.png" 
                alt="Hungry Times" 
                className="w-full h-full rounded-lg"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate bg-gradient-to-r from-white to-[#D4AF37] bg-clip-text text-transparent">
                Install Hungry Times
              </p>
              <p className="text-xs text-neutral-400 truncate">
                Quick access & faster ordering
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Install button - Gold gradient */}
            <button
              onClick={handleInstall}
              className="bg-gradient-to-r from-[#D4AF37] to-[#F0C674] text-black px-4 py-2 rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-[#D4AF37]/30 active:scale-95 transition-all whitespace-nowrap"
            >
              Install
            </button>
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="text-neutral-400 hover:text-[#D4AF37] p-1 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Card - Bottom Right - Elegant dark design */}
      <div 
        className="hidden md:block fixed bottom-6 right-6 bg-gradient-to-br from-neutral-900 via-[#0B0B0B] to-neutral-900 border border-[#D4AF37]/20 rounded-2xl shadow-2xl shadow-black/50 p-6 max-w-sm z-[9999] animate-slide-up backdrop-blur-md"
        style={{ zIndex: 9999 }}
      >
        {/* Subtle gold glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37]/10 via-transparent to-[#D4AF37]/10 rounded-2xl blur-xl opacity-50"></div>
        
        {/* Content */}
        <div className="relative">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-0 right-0 text-neutral-400 hover:text-[#D4AF37] transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            {/* App icon with gold border and glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-2xl blur-lg"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-neutral-800 to-neutral-900 border-2 border-[#D4AF37]/30 rounded-2xl flex items-center justify-center flex-shrink-0 p-1">
                <img 
                  src="/icon-192.png" 
                  alt="Hungry Times" 
                  className="w-full h-full rounded-xl"
                />
              </div>
            </div>
            
            {/* Text */}
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg mb-1 bg-gradient-to-r from-white via-[#D4AF37] to-white bg-clip-text text-transparent">
                Install Hungry Times
              </h3>
              <p className="text-neutral-400 text-sm">
                Quick access, faster ordering, offline menu
              </p>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-3">
            {/* Install button - Gold gradient */}
            <button
              onClick={handleInstall}
              className="flex-1 bg-gradient-to-r from-[#D4AF37] via-[#F0C674] to-[#D4AF37] text-black px-4 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#D4AF37]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Install App
            </button>
            
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="px-4 py-3 text-neutral-400 hover:text-neutral-200 font-medium transition-colors"
            >
              Not now
            </button>
          </div>
          
          {/* Debug info */}
          <p className="text-neutral-500 text-xs mt-3 text-center">
            ✅ Ready to install
          </p>
        </div>
      </div>

      {/* Smooth animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
}