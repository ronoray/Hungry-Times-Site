// site/src/components/NotificationPromptModal.jsx
// ============================================================================
// ELEGANT NOTIFICATION PERMISSION PROMPT - CHARCOAL & GOLD THEME
// ✅ Sophisticated dark design matching site palette
// ✅ Gold accents for highlights
// ✅ Fully responsive for mobile and desktop
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
      {/* Dark backdrop with subtle blur */}
      <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] overflow-y-auto animate-fadeIn">
        
        {/* Centered container */}
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
          
          {/* Modal content - Elegant dark design with gold accents */}
          <div className="relative bg-gradient-to-br from-neutral-900 via-[#0B0B0B] to-neutral-900 border border-[#D4AF37]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl shadow-black/50 my-4 transform animate-scaleIn overflow-hidden">
            
            {/* Subtle gold glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37]/10 via-transparent to-[#D4AF37]/10 rounded-2xl sm:rounded-3xl blur-xl opacity-50"></div>
            
            {/* Content wrapper */}
            <div className="relative overflow-hidden">
              
              {/* Close button - elegant hover effect */}
              <button
                onClick={handleDismiss}
                className="absolute -top-2 -right-2 z-10 text-neutral-400 hover:text-[#D4AF37] p-3 sm:p-2 rounded-full hover:bg-neutral-800/50 transition-all duration-300 touch-manipulation"
                aria-label="Close"
              >
                <X className="w-6 h-6 sm:w-6 sm:h-6" />
              </button>
              
              {/* Bell icon with gold accent */}
              <div className="relative mb-4 sm:mb-6">
                {/* Pulsing glow */}
                <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-2xl animate-pulse"></div>
                {/* Icon container */}
                <div className="relative bg-gradient-to-br from-neutral-800 to-neutral-900 border-2 border-[#D4AF37]/30 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto backdrop-blur-sm">
                  <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-[#D4AF37] animate-bounce" />
                </div>
              </div>
              
              {/* Main heading - Gold accent */}
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 leading-tight px-2 bg-gradient-to-r from-white via-[#D4AF37] to-white bg-clip-text text-transparent break-words">
                Stay Updated
              </h2>
              
              {/* Subheading - Softer white */}
              <p className="text-neutral-300 mb-4 sm:mb-6 text-base sm:text-lg font-medium px-2">
                Enable notifications for real-time order updates
              </p>
              
              {/* Benefits list - Dark elegant cards */}
              <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 text-left bg-neutral-800/40 border border-neutral-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 backdrop-blur-sm overflow-hidden">
                
                {/* Order Confirmed */}
                <div className="flex items-center gap-3 sm:gap-4 group hover:bg-neutral-800/60 p-2 rounded-lg transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#D4AF37]/20 to-neutral-800 border border-[#D4AF37]/30 rounded-full flex items-center justify-center">
                    <span className="text-lg sm:text-xl">✅</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-white group-hover:text-[#D4AF37] transition-colors">Order Confirmed</p>
                    <p className="text-neutral-400 text-xs sm:text-sm">Instant confirmation alert</p>
                  </div>
                </div>
                
                {/* Being Prepared */}
                <div className="flex items-center gap-3 sm:gap-4 group hover:bg-neutral-800/60 p-2 rounded-lg transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#D4AF37]/20 to-neutral-800 border border-[#D4AF37]/30 rounded-full flex items-center justify-center">
                    <span className="text-lg sm:text-xl">👨‍🍳</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-white group-hover:text-[#D4AF37] transition-colors">Being Prepared</p>
                    <p className="text-neutral-400 text-xs sm:text-sm">Track cooking progress</p>
                  </div>
                </div>
                
                {/* Out for Delivery */}
                <div className="flex items-center gap-3 sm:gap-4 group hover:bg-neutral-800/60 p-2 rounded-lg transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#D4AF37]/20 to-neutral-800 border border-[#D4AF37]/30 rounded-full flex items-center justify-center">
                    <span className="text-lg sm:text-xl">🚚</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-white group-hover:text-[#D4AF37] transition-colors">Out for Delivery</p>
                    <p className="text-neutral-400 text-xs sm:text-sm">Live delivery updates</p>
                  </div>
                </div>
                
                {/* Delivered */}
                <div className="flex items-center gap-3 sm:gap-4 group hover:bg-neutral-800/60 p-2 rounded-lg transition-colors">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#D4AF37]/20 to-neutral-800 border border-[#D4AF37]/30 rounded-full flex items-center justify-center">
                    <span className="text-lg sm:text-xl">🎉</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-white group-hover:text-[#D4AF37] transition-colors">Delivered</p>
                    <p className="text-neutral-400 text-xs sm:text-sm">Enjoy your meal!</p>
                  </div>
                </div>
              </div>
              
              {/* Enable button - Gold gradient */}
              <button
                onClick={handleEnable}
                className="w-full bg-gradient-to-r from-[#D4AF37] via-[#F0C674] to-[#D4AF37] text-black font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl hover:shadow-lg hover:shadow-[#D4AF37]/30 active:scale-95 transition-all duration-300 text-base sm:text-lg mb-3 sm:mb-4"
              >
                🔔 Enable Notifications
              </button>
              
              {/* Dismiss button - Subtle */}
              <button
                onClick={handleDismiss}
                className="text-neutral-400 hover:text-neutral-200 transition-colors text-sm font-medium py-2 px-4"
              >
                Maybe later
              </button>
              
              {/* Privacy note */}
              <p className="text-neutral-500 text-xs mt-4">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Smooth animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.92);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
}