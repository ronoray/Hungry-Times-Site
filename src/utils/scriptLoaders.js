// Singleton script loaders — load third-party scripts on demand, only once

let mapsPromise = null;
let razorpayPromise = null;

/**
 * Load Google Maps API on demand (new async loading pattern).
 * Returns a promise that resolves when google.maps.importLibrary is ready.
 * Uses loading=async (Google's current recommended approach).
 */
export function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve();

  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyC1OsnZiTXao9VqePa8npp1CLVBTzCMXSM&loading=async';
      script.async = true;
      script.onload = () => {
        // importLibrary is set up asynchronously — poll until ready
        let attempts = 0;
        const check = () => {
          if (window.google?.maps?.importLibrary) {
            resolve();
          } else if (attempts++ < 20) {
            setTimeout(check, 100);
          } else {
            mapsPromise = null;
            reject(new Error('Google Maps failed to initialize'));
          }
        };
        check();
      };
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
