// site/src/App.jsx - COMPLETE WITH PROPER PUSH SUBSCRIPTION
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LocationProvider } from "./context/LocationContext";
import { API_BASE } from "./api";
import "./styles/index.css";

/**
 * Helper: Convert base64 VAPID key to Uint8Array for push subscription
 */
function urlBase64ToUint8Array(base64String) {
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
}

/**
 * Register service worker and setup push notifications
 */
async function setupPushNotifications() {
  try {
    // Check browser support
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers not supported');
      return false;
    }

    console.log('[Push] 🔧 Setting up push notifications for customer site');

    // Register service worker
    console.log('[Push] 📝 Registering service worker...');
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Push] ✅ Service worker registered');

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[Push] ✅ Service worker is ready');

    // Get VAPID public key from backend
    console.log('[Push] 🔑 Fetching VAPID public key...');
    const keyResponse = await fetch(`${API_BASE}/push/vapid-public-key`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!keyResponse.ok) {
      console.error(`[Push] ❌ Failed to get VAPID key: ${keyResponse.status}`);
      return false;
    }

    const { publicKey } = await keyResponse.json();
    console.log('[Push] ✅ Got VAPID public key');

    // Subscribe to push notifications
    console.log('[Push] 🔔 Creating push subscription...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    console.log('[Push] ✅ Push subscription created');

    // Get authentication token
    const token = localStorage.getItem('token');
    const hasAuth = !!token;

    if (hasAuth) {
      console.log('[Push] 🔐 Customer is logged in, sending subscription to backend...');
      
      // Send subscription to backend
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

      if (!subResponse.ok) {
        const errorText = await subResponse.text();
        console.error(`[Push] ❌ Failed to subscribe: ${subResponse.status} - ${errorText}`);
        return false;
      }

      const result = await subResponse.json();
      console.log('[Push] ✅ Successfully subscribed to push notifications:', result);
      return true;
    } else {
      console.log('[Push] ℹ️ Customer not logged in - push subscription ready, will activate on login');
      // Subscription is created locally, will be sent to backend when customer logs in
      return true;
    }

  } catch (error) {
    console.error('[Push] ❌ Push setup failed:', error.message);
    console.error('[Push] Error details:', error);
    return false;
  }
}

/**
 * Handle service worker messages
 */
function setupServiceWorkerMessages() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, data } = event.data || {};

    console.log('[Push] 📨 Message from service worker:', type);

    switch (type) {
      case 'push-received':
        console.log('[Push] 📬 Push notification received:', data);
        // Dispatch custom event for app components to react to
        window.dispatchEvent(new CustomEvent('notification:received', { detail: data }));
        break;

      case 'notification-clicked':
        console.log('[Push] 🖱️ Notification clicked:', data);
        window.dispatchEvent(new CustomEvent('notification:clicked', { detail: data }));
        break;

      case 'feedback-published':
        console.log('[Push] 📢 Feedback published:', data);
        window.dispatchEvent(new CustomEvent('feedback:published', { detail: data }));
        break;

      case 'get-token':
        // Service worker requests auth token
        const token = localStorage.getItem('token');
        event.ports[0]?.postMessage({ token });
        break;

      default:
        console.log('[Push] 📨 Unknown message type:', type);
    }
  });

  console.log('[Push] 🔊 Service worker message listener set up');
}

/**
 * Re-subscribe on login
 * Call this after customer successfully logs in
 */
export async function resubscribeOnLogin() {
  console.log('[Push] 🔄 Re-subscribing after customer login...');
  try {
    const success = await setupPushNotifications();
    if (success) {
      console.log('[Push] ✅ Re-subscribed successfully after login');
    } else {
      console.warn('[Push] ⚠️ Re-subscription after login had issues');
    }
  } catch (error) {
    console.error('[Push] ❌ Re-subscription after login failed:', error);
  }
}

/**
 * Main App Component
 */
export default function App() {
  useEffect(() => {
    // Setup push notifications on app load
    console.log('[Push] 🚀 App mounted, initializing push notifications...');
    setupPushNotifications().then(success => {
      if (success) {
        console.log('[Push] ✅ Push notifications initialized');
      } else {
        console.warn('[Push] ⚠️ Push notifications initialization had issues, continuing anyway');
      }
    });

    // Setup service worker message listener
    setupServiceWorkerMessages();

  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <LocationProvider>
          <div className="min-h-screen flex flex-col bg-[#0B0B0B] text-white">
            
            {/* Navigation Bar */}
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
  );
}

// ============================================================================
// EXPORT FUNCTION FOR LOGIN PAGES TO CALL
// ============================================================================
// In your Login.jsx or auth context, after successful login:
// import { resubscribeOnLogin } from './App';
// await resubscribeOnLogin();