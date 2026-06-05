// Meta Pixel typed helper — safe wrappers around window.fbq.
// The base pixel snippet + PageView are loaded inline in index.html (sets window.__fbLoaded).
// Every function is try/catch guarded and never throws, so callers can fire-and-forget.

const PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID || '1885676585400371';

/**
 * Load the pixel if it has not been loaded by index.html.
 * No-op when window.__fbLoaded is already set (the usual case).
 */
export function initPixel() {
  try {
    if (typeof window === 'undefined') return;
    if (window.__fbLoaded) return; // index.html already booted the pixel
    window.__fbLoaded = true;

    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', PIXEL_ID);
  } catch {
    /* swallow — analytics must never break the app */
  }
}

/** Standard PageView. */
export function pageView() {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  } catch {
    /* noop */
  }
}

/** AddToCart with product context. */
export function addToCart({ name, id, price, currency = 'INR' } = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        content_name: name,
        content_ids: id != null ? [String(id)] : undefined,
        content_type: 'product',
        value: price,
        currency,
      });
    }
  } catch {
    /* noop */
  }
}

/** Purchase conversion. */
export function purchase({ orderId, total, currency = 'INR', code } = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        value: total,
        currency,
        content_ids: code ? [String(code)] : undefined,
        content_type: 'product',
        order_id: orderId != null ? String(orderId) : undefined,
      });
    }
  } catch {
    /* noop */
  }
}

/** Arbitrary custom event (e.g. WhatsAppOrder). */
export function custom(event, data = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('trackCustom', event, data);
    }
  } catch {
    /* noop */
  }
}
