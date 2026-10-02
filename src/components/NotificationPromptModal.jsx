// site/src/components/NotificationPromptModal.jsx
// Small bottom notification bar — non-blocking, sequenced after FirstVisitPopup
import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { claimOverlay, overlayClaimedByOther } from '../utils/overlayBudget';

const DELAY_AFTER_FIRST_VISIT_MS = 15_000; // 15s after FIRST30 is done

export default function NotificationPromptModal({ onGranted, firstVisitDone }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!firstVisitDone) return; // wait for FIRST30 to finish

    if (!checkShouldShowPrompt()) return;

    const timer = setTimeout(() => {
      // One overlay per visit — the welcome popup or install prompt may
      // already have had this session.
      if (checkShouldShowPrompt() && claimOverlay('notify')) setShow(true);
    }, DELAY_AFTER_FIRST_VISIT_MS);

    return () => clearTimeout(timer);
  }, [firstVisitDone]);

  function checkShouldShowPrompt() {
    if (!('Notification' in window)) return false;
    if (overlayClaimedByOther('notify')) return false;

    // iOS Safari (not PWA) doesn't support push
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) return false;

    if (Notification.permission !== 'default') return false;
    if (localStorage.getItem('ht_notif_in_progress')) return false;

    try {
      const lastDismissed = localStorage.getItem('notificationModalDismissed');
      if (lastDismissed) {
        const hoursSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
        if (hoursSince < 24) return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  const handleEnable = async () => {
    setShow(false);
    localStorage.setItem('ht_notif_in_progress', '1');
    try {
      const permission = await Notification.requestPermission();
      localStorage.removeItem('ht_notif_in_progress');
      if (permission === 'granted') {
        if (onGranted) onGranted();
      } else if (permission === 'denied') {
        localStorage.setItem('notificationModalDismissed', Date.now().toString());
      }
    } catch {
      localStorage.removeItem('ht_notif_in_progress');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationModalDismissed', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  // Sits above the bottom nav on phones so it never covers it.
  return (
    <div
      className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom,0px))] z-[9990] flex items-center gap-3 border-t border-ht-ink/10 bg-ht-ivory px-4 py-3 text-ht-ink shadow-[0_-8px_24px_-12px_rgba(60,20,10,.35)] motion-safe:animate-slideUp md:bottom-0"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ht-gold2">
        <Bell className="h-4 w-4 text-ht-red" />
      </div>

      <p className="min-w-0 flex-1 text-sm leading-tight text-ht-mute">
        <span className="font-semibold text-ht-ink">Track your order live</span>
        {' '}— enable delivery notifications
      </p>

      <button
        onClick={handleEnable}
        className="h-11 shrink-0 whitespace-nowrap rounded-full bg-ht-red px-4 text-sm font-bold text-white active:scale-95"
      >
        Enable
      </button>

      <button
        onClick={handleDismiss}
        className="grid h-11 w-11 shrink-0 place-items-center text-ht-mute hover:text-ht-ink"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
