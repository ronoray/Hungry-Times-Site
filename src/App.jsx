// site/src/App.jsx - COMPLETE: All push notification logic preserved, SW registration moved to main.jsx
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotificationPromptModal from "./components/NotificationPromptModal";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LocationProvider } from "./context/LocationContext";
import { MenuCategoryProvider } from './context/MenuCategoryContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ToastProvider } from "./components/Toast";
import OfferBanner from "./components/OfferBanner";
import FirstVisitPopup from "./components/FirstVisitPopup";
import WhatsAppFloat from "./components/WhatsAppFloat";
import ActiveOrderBar from "./components/ActiveOrderBar";
import API_BASE from "./config/api.js";
import "./styles/index.css";

/**
 * Helper: Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  } catch (error) {
    console.warn('[Push] ⚠️ VAPID conversion failed:', error.message);
    return null;
  }
}

/**
 * Setup push notifications - WITHOUT requesting permission
 * Permission should already be granted before calling this
 */
async function setupPushNotifications() {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] ⚠️ Service Workers not supported');
      return false;
    }

    // ✅ Check permission is already granted
    if (Notification.permission !== 'granted') {
      console.log('[Push] ℹ️ Permission not granted, skipping push setup');
      return false;
    }

    console.log('[Push] 🔧 Setting up push notifications');

    // ✅ Wait for service worker ready (registered in main.jsx)
    console.log('[Push] 🔍 Waiting for service worker from main.jsx...');
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SW ready timeout')), 5000)
      )
    ]);
    
    console.log('[Push] ✅ Service worker ready');

    // Get VAPID key
    console.log('[Push] 🔑 Fetching VAPID key...');
    const keyResponse = await Promise.race([
      fetch(`${API_BASE}/push/vapid-public-key`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('VAPID fetch timeout')), 5000)
      )
    ]);

    if (!keyResponse.ok) {
      console.warn(`[Push] ⚠️ Failed to get VAPID key: ${keyResponse.status}`);
      return false;
    }

    const { publicKey } = await keyResponse.json();
    console.log('[Push] ✅ Got VAPID key');

    // Convert VAPID key
    const vapidArray = urlBase64ToUint8Array(publicKey);
    if (!vapidArray) {
      console.warn('[Push] ⚠️ Invalid VAPID key format');
      return false;
    }

    // Subscribe to push
    console.log('[Push] 📡 Creating push subscription...');
    const subscription = await Promise.race([
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidArray
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Push subscription timeout')), 5000)
      )
    ]);
    
    console.log('[Push] ✅ Push subscription created');

    // Check authentication
    const token = localStorage.getItem('customerToken');

    if (!token) {
      console.log('[Push] ℹ️ No auth token - login required for push');
      return false;
    }

    // Send subscription to backend
    console.log('[Push] 🤝 Sending subscription to backend...');
    
    const subResponse = await Promise.race([
      fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          subscription: subscription.toJSON() 
        })
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Backend subscription timeout')), 5000)
      )
    ]);

    if (!subResponse.ok) {
      const errorText = await subResponse.text();
      console.warn(`[Push] ⚠️ Backend subscription failed: ${subResponse.status} - ${errorText}`);
      return false;
    }

    const result = await subResponse.json();
    console.log('[Push] ✅ Successfully subscribed:', result);
    return true;

  } catch (error) {
    console.warn('[Push] ⚠️ Push setup warning:', error.message);
    return false;
  }
}

/**
 * Setup service worker message listeners
 */
function setupServiceWorkerMessages() {
  if (!('serviceWorker' in navigator)) return;

  try {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};

      console.log('[Push] 📨 Message from SW:', type);

      switch (type) {
        case 'push-received':
          console.log('[Push] 📬 Push received:', data);
          window.dispatchEvent(new CustomEvent('notification:received', { detail: data }));
          break;

        case 'notification-clicked':
          console.log('[Push] 🖱️ Notification clicked:', data);
          window.dispatchEvent(new CustomEvent('notification:clicked', { detail: data }));
          break;

        case 'get-token':
          const token = localStorage.getItem('customerToken');
          event.ports[0]?.postMessage({ token });
          break;

        default:
          console.log('[Push] 📨 Unknown message:', type);
      }
    });

    console.log('[Push] 📡 Message listener set up');
  } catch (error) {
    console.warn('[Push] ⚠️ Failed to setup messages:', error.message);
  }
}

/**
 * Re-subscribe after login
 */
export async function resubscribeOnLogin() {
  console.log('[Push] 🔄 Re-subscribing after login...');
  try {
    const token = localStorage.getItem('customerToken');
    
    if (!token) {
      console.warn('[Push] ⚠️ No token after login');
      return false;
    }
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('[Push] 📋 Found subscription, attaching to account...');
        
        const subResponse = await fetch(`${API_BASE}/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            subscription: subscription.toJSON() 
          })
        });

        if (subResponse.ok) {
          const result = await subResponse.json();
          console.log('[Push] ✅ Re-subscribed successfully:', result);
          return true;
        } else {
          const errorText = await subResponse.text();
          console.warn('[Push] ⚠️ Re-subscription failed:', subResponse.status, errorText);
          return false;
        }
      } else {
        console.log('[Push] ℹ️ No subscription found, creating new one...');
        return await setupPushNotifications();
      }
    }
    return false;
  } catch (error) {
    console.error('[Push] ❌ Re-subscription error:', error);
    return false;
  }
}

export default function App() {
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    console.log('[Push] 🚀 App mounted - waiting for SW from main.jsx');
    
    // Setup service worker messages
    setupServiceWorkerMessages();

    // ✅ Wait for SW to be ready (registered in main.jsx)
    const initializePushNotifications = async () => {
      try {
        if ('serviceWorker' in navigator) {
          // Wait for SW ready (registered in main.jsx)
          await navigator.serviceWorker.ready;
          console.log('[Push] ✅ Service worker ready from main.jsx');
          setSwReady(true);

          // ✅ Check permission status
          if ('Notification' in window) {
            const permission = Notification.permission;
            console.log('[Push] 🔔 Current permission:', permission);

            if (permission === 'granted') {
              // Permission already granted - setup push immediately
              console.log('[Push] ✅ Permission already granted, setting up push...');
              setupPushNotifications();
            } else if (permission === 'default') {
              // Not asked yet - show modal after 1.5s
              console.log('[Push] 📱 Permission not asked, showing modal...');
              setTimeout(() => {
                setShowNotificationModal(true);
              }, 1500);
            } else {
              // Permission denied
              console.log('[Push] ⚠️ Permission denied by user');
            }
          }
        }
      } catch (error) {
        console.error('[Push] ❌ Initialization error:', error);
      }
    };

    initializePushNotifications();

    // ✅ Listen for permission changes (when user grants via modal)
    const checkPermissionInterval = setInterval(() => {
      if ('Notification' in window && Notification.permission === 'granted' && showNotificationModal) {
        console.log('[Push] ✅ Permission granted! Hiding modal and setting up push...');
        setShowNotificationModal(false);
        
        // Setup push immediately after permission granted
        setupPushNotifications()
          .then(success => {
            if (success) {
              console.log('[Push] ✅ Push notifications fully configured');
            } else {
              console.warn('[Push] ⚠️ Push setup incomplete (may need login)');
            }
          });
      }
    }, 1000);

    return () => {
      clearInterval(checkPermissionInterval);
    };
  }, [showNotificationModal]);

  return (
    <MenuCategoryProvider>
      <AuthProvider>
        <CartProvider>
          <LocationProvider>
            <FavoritesProvider>
            <ToastProvider>
            <div className="min-h-screen flex flex-col bg-[#0B0B0B] text-white">
              
              {/* ✅ Show modal only when SW ready and permission needed */}
              {swReady && showNotificationModal && <NotificationPromptModal />}
              
              {/* PWA Install Prompt */}
              <PWAInstallPrompt />
              
              {/* Offer Banner */}
              <OfferBanner />

              {/* Navigation */}
              <Navbar />

              {/* Main Content */}
              <main className="flex-1">
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </main>

              {/* Footer */}
              <Footer />

              {/* First-visit welcome offer popup */}
              <FirstVisitPopup />

              {/* WhatsApp floating CTA */}
              <WhatsAppFloat />

              {/* Active order tracking bar */}
              <ActiveOrderBar />

            </div>
            </ToastProvider>
            </FavoritesProvider>
          </LocationProvider>
        </CartProvider>
      </AuthProvider>
    </MenuCategoryProvider>
  );
}