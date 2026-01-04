// site/src/components/NotificationPromptModal.jsx
// ============================================================================
// MOBILE-RESPONSIVE NOTIFICATION PERMISSION PROMPT
// ✅ Fully responsive for mobile and desktop
// ✅ Proper scrolling on small screens
// ✅ Touch-friendly buttons
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
      {/* Full-screen backdrop with proper scrolling */}
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] overflow-y-auto animate-fadeIn">
        
        {/* Centered container with padding for safe scrolling */}
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
          
          {/* Modal content - responsive sizing */}
          <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full text-center text-white shadow-2xl my-4 transform animate-scaleIn">
            
            {/* Close button - mobile friendly */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            {/* Animated bell icon - responsive sizing */}
            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-white/20 rounded-full w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mx-auto backdrop-blur-sm">
                <Bell className="w-8 h-8 sm:w-12 sm:h-12 animate-bounce" />
              </div>
            </div>
            
            {/* Main heading - responsive text */}
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 leading-tight px-2">
              Never Miss an Update!
            </h2>
            
            {/* Subheading - responsive text */}
            <p className="text-white/95 mb-4 sm:mb-6 text-base sm:text-lg font-medium px-2">
              Enable notifications to track your order in real-time
            </p>
            
            {/* Benefits list - responsive spacing */}
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 text-left bg-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 backdrop-blur-sm">
              
              {/* Order Confirmed */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">✅</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base">Order Confirmed</p>
                  <p className="text-white/80 text-xs sm:text-sm">Get instant confirmation</p>
                </div>
              </div>
              
              {/* Being Prepared */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">👨‍🍳</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base">Being Prepared</p>
                  <p className="text-white/80 text-xs sm:text-sm">Know when cooking starts</p>
                </div>
              </div>
              
              {/* Out for Delivery */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">🚚</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base">Out for Delivery</p>
                  <p className="text-white/80 text-xs sm:text-sm">Track your delivery</p>
                </div>
              </div>
              
              {/* Delivered */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">🎉</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base">Delivered!</p>
                  <p className="text-white/80 text-xs sm:text-sm">Enjoy your meal</p>
                </div>
              </div>
            </div>
            
            {/* Enable button - mobile touch-friendly */}
            <button
              onClick={handleEnable}
              className="w-full bg-white text-orange-600 font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl hover:bg-white/95 active:scale-95 transition-all text-base sm:text-lg shadow-lg mb-3 sm:mb-4"
            >
              🔔 Enable Notifications Now
            </button>
            
            {/* Dismiss button - mobile touch-friendly */}
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors text-sm font-medium py-2 px-4"
            >
              I'll do this later
            </button>
          </div>
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
            transform: scale(0.95);
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