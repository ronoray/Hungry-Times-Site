// Singleton script loaders — load third-party scripts on demand, only once

let mapsPromise = null;
let razorpayPromise = null;

/**
 * Load Google Maps Places API on demand.
 * Returns a promise that resolves when window.google.maps.places is ready.
 */
export function loadGoogleMaps() {
  if (window.google?.maps?.places) return Promise.resolve();

  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyC1OsnZiTXao9VqePa8npp1CLVBTzCMXSM&libraries=places';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        mapsPromise = null; // allow retry
        reject(new Error('Failed to load Google Maps'));
      };
      document.head.appendChild(script);
    });
  }
  return mapsPromise;
}

/**
 * Load Razorpay checkout SDK on demand.
 * Returns a promise that resolves when window.Razorpay is available.
 */
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();

  if (!razorpayPromise) {
    razorpayPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayPromise = null;
        reject(new Error('Failed to load Razorpay'));
      };
      document.head.appendChild(script);
    });
  }
  return razorpayPromise;
}
