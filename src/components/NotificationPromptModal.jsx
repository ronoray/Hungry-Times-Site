// site/src/components/NotificationPromptModal.jsx
// Small bottom notification bar — non-blocking, sequenced after FirstVisitPopup
import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

const DELAY_AFTER_FIRST_VISIT_MS = 15_000; // 15s after FIRST30 is done

export default function NotificationPromptModal({ onGranted, firstVisitDone }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!firstVisitDone) return; // wait for FIRST30 to finish

    if (!checkShouldShowPrompt()) return;

    const timer = setTimeout(() => {
      if (checkShouldShowPrompt()) setShow(true);
    }, DELAY_AFTER_FIRST_VISIT_MS);

    return () => clearTimeout(timer);
  }, [firstVisitDone]);

  function checkShouldShowPrompt() {
    if (!('Notification' in window)) return false;

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

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9990] flex items-center gap-3 px-4 py-3 bg-neutral-900 border-t border-neutral-700 shadow-2xl"
      style={{ animation: 'slideUp 0.3s ease-out' }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center">
        <Bell className="w-4 h-4 text-amber-400" />
      </div>

      <p className="flex-1 text-sm text-neutral-300 leading-tight">
        <span className="font-semibold text-white">Track your order live</span>
        {' '}— enable delivery notifications
      </p>

      <button
        onClick={handleEnable}
        className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors"
      >
        Enable
      </button>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
