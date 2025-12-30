// site/src/App.jsx - WITH AGGRESSIVE NOTIFICATION MODAL
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotificationPromptModal from "./components/NotificationPromptModal";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LocationProvider } from "./context/LocationContext";
import { MenuCategoryProvider } from './context/MenuCategoryContext';
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
 * Setup push notifications
 */
async function setupPushNotifications() {
  try {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] ⚠️ Service Workers not supported');
      return false;
    }

    console.log('[Push] 🔧 Setting up push notifications');

    // Register service worker
    console.log('[Push] 📝 Registering service worker...');
    const registration = await Promise.race([
      navigator.serviceWorker.register('/sw.js', { scope: '/' }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SW registration timeout')), 5000)
      )
    ]);
    
    console.log('[Push] ✅ Service worker registered');

    // Wait for ready
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SW ready timeout')), 5000)
      )
    ]);
    console.log('[Push] ✅ Service worker ready');

    // ✅ Check notification permission
    console.log('[Push] 🔔 Checking notification permission...');
    
    if (Notification.permission === 'denied') {
      console.warn('[Push] ⚠️ Notification permission denied');
      return false;
    }
    
    if (Notification.permission !== 'granted') {
      console.log('[Push] 📱 Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[Push] Permission result:', permission);
      
      if (permission !== 'granted') {
        console.warn('[Push] ⚠️ User declined notification permission');
        return false;
      }
    }
    
    console.log('[Push] ✅ Notification permission: granted');

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
  // ✅ NEW: State to control notification modal visibility
  const [showNotificationModal, setShowNotificationModal] = useState(true);

  useEffect(() => {
    console.log('[Push] 🚀 App mounted');
    
    // Setup service worker messages
    setupServiceWorkerMessages();
    
    // Check if user is logged in
    const token = localStorage.getItem('customerToken');
    
    if (token) {
      console.log('[Push] 🔑 Customer logged in, setting up push...');
      
      setupPushNotifications()
        .then(success => {
          if (success) {
            console.log('[Push] ✅ Push notifications initialized');
          } else {
            console.warn('[Push] ⚠️ Push setup failed (non-blocking)');
          }
        })
        .catch(error => {
          console.warn('[Push] ⚠️ Push error (non-blocking):', error.message);
        });
    } else {
      console.log('[Push] ℹ️ Not logged in, waiting for login');
    }

    // ✅ NEW: Listen for permission changes to hide modal
    const handlePermissionChange = () => {
      console.log('[Push] 🔔 Permission changed, checking...');
      if (Notification.permission === 'granted') {
        console.log('[Push] ✅ Permission granted, hiding modal...');
        setShowNotificationModal(false);
        setupPushNotifications();
      }
    };

    // Poll for permission changes (some browsers don't support permission API)
    const permissionCheckInterval = setInterval(() => {
      if (Notification.permission === 'granted' && showNotificationModal) {
        handlePermissionChange();
      }
    }, 2000);

    return () => {
      clearInterval(permissionCheckInterval);
    };
  }, [showNotificationModal]);

  return (
    <MenuCategoryProvider>
      <AuthProvider>
        <CartProvider>
          <LocationProvider>
            <div className="min-h-screen flex flex-col bg-[#0B0B0B] text-white">
              
              {/* ✅ NEW: AGGRESSIVE NOTIFICATION PROMPT - Shows immediately */}
              {showNotificationModal && <NotificationPromptModal />}
              
              {/* Navigation */}
              <Navbar />

              {/* Main Content */}
              <main className="flex-1">
                <Outlet />
              </main>

              {/* Footer */}
              <Footer />

            </div>
          </LocationProvider>
        </CartProvider>
      </AuthProvider>
    </MenuCategoryProvider>
  );
}