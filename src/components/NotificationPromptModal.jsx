// site/src/components/NotificationPromptModal.jsx
// ============================================================================
// AGGRESSIVE NOTIFICATION PERMISSION PROMPT - Full Screen Modal
// Shows immediately when user visits site (if permission not granted)
// ============================================================================

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export default function NotificationPromptModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Wait 1.5 seconds after page load to show modal
    const timer = setTimeout(() => {
      const shouldShow = checkShouldShowPrompt();
      if (shouldShow) {
        setShow(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const checkShouldShowPrompt = () => {
    // Don't show if notifications not supported
    if (!('Notification' in window)) {
      console.log('[NotificationModal] Notifications not supported');
      return false;
    }

    // Don't show if already granted
    if (Notification.permission === 'granted') {
      console.log('[NotificationModal] Permission already granted');
      return false;
    }

    // Don't show if denied (user explicitly blocked)
    if (Notification.permission === 'denied') {
      console.log('[NotificationModal] Permission denied by user');
      return false;
    }

    // Check if user dismissed in last 24 hours
    const lastDismissed = localStorage.getItem('notificationModalDismissed');
    if (lastDismissed) {
      const hoursSinceDismiss = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) {
        console.log('[NotificationModal] Dismissed recently, not showing');
        return false;
      }
    }

    // Show if permission is 'default' (not yet asked)
    console.log('[NotificationModal] Showing prompt - permission:', Notification.permission);
    return Notification.permission === 'default';
  };

  const handleEnable = async () => {
    try {
      console.log('[NotificationModal] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('[NotificationModal] Permission result:', permission);
      
      if (permission === 'granted') {
        console.log('[NotificationModal] ✅ Permission granted!');
        setShow(false);
        
        // Show success message briefly
        setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🎉 Notifications Enabled!', {
              body: 'You\'ll now receive order status updates',
              icon: '/icon-192.png',
              tag: 'notification-enabled'
            });
          }
        }, 500);
      } else {
        console.log('[NotificationModal] ⚠️ Permission not granted');
        setShow(false);
      }
    } catch (error) {
      console.error('[NotificationModal] Error requesting permission:', error);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    console.log('[NotificationModal] User dismissed prompt');
    // Save dismiss timestamp
    localStorage.setItem('notificationModalDismissed', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {/* Full-screen backdrop */}
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
        
        {/* Modal content */}
        <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600 rounded-3xl p-8 max-w-md w-full text-center text-white shadow-2xl transform animate-scaleIn">
          
          {/* Animated bell icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-white/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto backdrop-blur-sm">
              <Bell className="w-12 h-12 animate-bounce" />
            </div>
          </div>
          
          {/* Main heading */}
          <h2 className="text-3xl font-bold mb-3 leading-tight">
            Never Miss an Update!
          </h2>
          
          {/* Subheading */}
          <p className="text-white/95 mb-6 text-lg font-medium">
            Enable notifications to track your order in real-time
          </p>
          
          {/* Benefits list */}
          <div className="space-y-3 mb-8 text-left bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="font-semibold text-base">Order Confirmed</p>
                <p className="text-white/80 text-sm">Get instant confirmation</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">👨‍🍳</span>
              </div>
              <div>
                <p className="font-semibold text-base">Being Prepared</p>
                <p className="text-white/80 text-sm">Know when cooking starts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚚</span>
              </div>
              <div>
                <p className="font-semibold text-base">Out for Delivery</p>
                <p className="text-white/80 text-sm">Track your delivery</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <p className="font-semibold text-base">Delivered!</p>
                <p className="text-white/80 text-sm">Enjoy your meal</p>
              </div>
            </div>
          </div>
          
          {/* Enable button */}
          <button
            onClick={handleEnable}
            className="w-full bg-white text-orange-600 font-bold py-4 px-6 rounded-xl hover:bg-white/95 active:scale-95 transition-all text-lg shadow-lg mb-4"
          >
            🔔 Enable Notifications Now
          </button>
          
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors text-sm font-medium"
          >
            I'll do this later
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.4s ease-out;
        }
      `}</style>
    </>
  );
}