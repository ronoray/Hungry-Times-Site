// src/config/api.js - FIXED API CONFIGURATION
// Supports both local development and production environments

// ✅ FIXED: Dynamic API_BASE configuration
// Development: http://localhost:5000/api
// Production: Uses VITE_API_BASE env var or /api (relative)

const isLocal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

const DEV_DEFAULT = 'http://localhost:5000/api';
const PROD_DEFAULT = '/api';

const API_BASE = isLocal
  ? (import.meta.env.VITE_API_BASE?.trim() || DEV_DEFAULT)
  : (import.meta.env.VITE_API_BASE?.trim() || PROD_DEFAULT);

console.log('[API] 🔌 Environment:', isLocal ? 'LOCAL' : 'PRODUCTION');
console.log('[API] 🌐 API Base URL:', API_BASE);

// Export as default (named export for compatibility)
export default API_BASE;
export { API_BASE };

// ============================================================================
// API ENDPOINT HELPERS (Optional - for convenient reference)
// ============================================================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH_SEND_OTP: `${API_BASE}/customer/auth/send-otp`,
  AUTH_VERIFY_OTP: `${API_BASE}/customer/auth/verify-otp`,
  AUTH_SET_CREDENTIALS: `${API_BASE}/customer/auth/set-credentials`,
  AUTH_COMPLETE_PROFILE: `${API_BASE}/customer/auth/complete-profile`,
  AUTH_SET_ADDRESS: `${API_BASE}/customer/auth/set-address`,
  AUTH_UPDATE_ADDRESS: `${API_BASE}/customer/auth/update-address`,
  AUTH_LOGIN: `${API_BASE}/customer/auth/login`,
  AUTH_FORGOT_PASSWORD_SEND_OTP: `${API_BASE}/customer/auth/forgot-password/send-otp`,
  AUTH_FORGOT_PASSWORD_VERIFY_OTP: `${API_BASE}/customer/auth/forgot-password/verify-otp`,
  AUTH_FORGOT_PASSWORD_RESET: `${API_BASE}/customer/auth/forgot-password/reset`,
  AUTH_LOGOUT: `${API_BASE}/customer/auth/logout`,
  AUTH_ME: `${API_BASE}/customer/auth/me`,
  AUTH_CHANGE_PASSWORD: `${API_BASE}/customer/auth/change-password`,

  // Menu
  MENU_PUBLIC: `${API_BASE}/public/menu`,

  // Orders
  ORDERS_CREATE_PUBLIC: `${API_BASE}/public/orders`,
  ORDERS_GET_PUBLIC: (orderId) => `${API_BASE}/public/orders/${orderId}`,
  ORDERS_LIST_CUSTOMER: `${API_BASE}/customer/orders`,
  ORDERS_GET_CUSTOMER: (orderId) => `${API_BASE}/customer/orders/${orderId}`,
  ORDERS_CANCEL: (orderId) => `${API_BASE}/customer/orders/${orderId}/cancel`,

  // Addresses
  ADDRESSES_LIST: `${API_BASE}/customer/addresses`,
  ADDRESSES_CREATE: `${API_BASE}/customer/addresses`,
  ADDRESSES_UPDATE: (addressId) => `${API_BASE}/customer/addresses/${addressId}`,
  ADDRESSES_DELETE: (addressId) => `${API_BASE}/customer/addresses/${addressId}`,

  // Payments
  PAYMENTS_RAZORPAY_INIT: `${API_BASE}/customer/payments/razorpay/init`,
  PAYMENTS_RAZORPAY_VERIFY: `${API_BASE}/customer/payments/razorpay/verify`,
  PAYMENTS_COD_CONFIRM: `${API_BASE}/customer/payments/cod/confirm`,
  PAYMENTS_ORDER_STATUS: (orderId) => `${API_BASE}/customer/payments/order/${orderId}`,

  // Public
  PUBLIC_FEEDBACK: `${API_BASE}/public/feedback`,
  PUBLIC_CONTACT: `${API_BASE}/public/contact`,
  PUBLIC_TESTIMONIALS: `${API_BASE}/public/feedback/testimonials/public`,

  // Push Notifications
  PUSH_VAPID_PUBLIC: `${API_BASE}/push/vapid-public-key`,
  PUSH_SUBSCRIBE: `${API_BASE}/push/subscribe`,
  PUSH_UNSUBSCRIBE: `${API_BASE}/push/unsubscribe`,
  PUSH_TEST: `${API_BASE}/push/test`,

  // Notifications
  NOTIFICATIONS_LIST: `${API_BASE}/notifications`,
  NOTIFICATIONS_UNREAD_COUNT: `${API_BASE}/notifications/unread-count`,
  NOTIFICATIONS_READ: (notificationId) => `${API_BASE}/notifications/${notificationId}/read`,
  NOTIFICATIONS_READ_ALL: `${API_BASE}/notifications/mark-all-read`,
  NOTIFICATIONS_DELETE: (notificationId) => `${API_BASE}/notifications/${notificationId}`,
};