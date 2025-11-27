// c:\hungry-times-site\client\src\utils\pushNotifications.js
// Push notification utilities for customer portal

const API_BASE = process.env.REACT_APP_API_BASE || 'https://ops.hungrytimes.in';

/**
 * Request push notification permission and subscribe
 */
export async function subscribeToPush() {
  try {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers not supported');
      return false;
    }

    // Check if push is supported
    if (!('PushManager' in window)) {
      console.warn('⚠️ Push notifications not supported');
      return false;
    }

    console.log('🔔 Requesting push notification permission...');

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('❌ Push permission denied');
      return false;
    }

    console.log('✅ Push permission granted');

    // Register service worker
    console.log('📝 Registering service worker...');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    await navigator.serviceWorker.ready;
    console.log('✅ Service worker ready');

    // Get VAPID public key from server
    console.log('🔑 Fetching VAPID public key...');
    const vapidResponse = await fetch(`${API_BASE}/api/push/vapid-public`);
    
    if (!vapidResponse.ok) {
      throw new Error('Failed to get VAPID key');
    }

    const { publicKey } = await vapidResponse.json();
    console.log('✅ VAPID key received');

    // Subscribe to push
    console.log('📮 Creating push subscription...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    console.log('✅ Push subscription created');

    // Send subscription to server
    const token = localStorage.getItem('customerToken') || 
                   sessionStorage.getItem('customerToken');

    if (!token) {
      console.warn('⚠️ No auth token found');
      return false;
    }

    console.log('📤 Sending subscription to server...');
    const saveResponse = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscription.toJSON())
    });

    if (!saveResponse.ok) {
      throw new Error('Failed to save subscription');
    }

    console.log('✅ Push subscription saved to server');
    return true;

  } catch (error) {
    console.error('❌ Push subscription error:', error);
    return false;
  }
}

/**
 * Check if user is subscribed to push
 */
export async function isSubscribedToPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return !!subscription;
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return true;
    }

    // Unsubscribe from browser
    await subscription.unsubscribe();

    // Remove from server
    const token = localStorage.getItem('customerToken') || 
                   sessionStorage.getItem('customerToken');

    if (token) {
      await fetch(`${API_BASE}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
    }

    console.log('✅ Push subscription removed');
    return true;

  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

/**
 * Helper: Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}