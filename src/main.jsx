// src/main.jsx - FIXED: Automatic prompt restored + manual trigger option
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

// Import pages
import Menu from "./pages/Menu";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Feedback from "./pages/Feedback";
import Contact from "./pages/Contact";
import Careers from "./pages/Careers";
import Offers from "./pages/Offers";
import Testimonials from "./pages/Testimonials";
import Order from "./pages/Order";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import OrderSuccess from "./pages/OrderSuccess";

// ============================================================================
// ✅ Service Worker Registration
// ============================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[SW] ✅ Registered from main.jsx:', registration.scope);
        
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch((error) => {
        console.error('[SW] ❌ Registration failed:', error);
      });
  });
}

// ============================================================================
// ✅ FIXED: PWA Install Prompt - Allows Chrome's automatic prompt
// ============================================================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] 📱 Install prompt available');
  
  // ✅ Just capture the prompt for manual trigger later
  // DON'T call e.preventDefault() - let Chrome show automatic prompt
  deferredPrompt = e;
  
  // Dispatch custom event for components that want to show custom install button
  window.dispatchEvent(new CustomEvent('pwa-install-available', { 
    detail: { prompt: e } 
  }));
  
  // Chrome will show the prompt automatically now (restored old behavior)
});

// Manual trigger function (for custom install buttons if needed)
window.triggerPWAInstall = async () => {
  if (!deferredPrompt) {
    console.warn('[PWA] ⚠️ Install prompt not available');
    return false;
  }
  
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  console.log('[PWA] User choice:', result.outcome);
  
  deferredPrompt = null;
  return result.outcome === 'accepted';
};

// Listen for successful installation
window.addEventListener('appinstalled', () => {
  console.log('[PWA] ✅ App successfully installed');
  deferredPrompt = null;
});

// ============================================================================
// Router Configuration
// ============================================================================
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        // Default → Menu
        { index: true, element: <Navigate to="/menu" replace /> },

        // Public site pages
        { path: "menu", element: <Menu /> },
        { path: "home", element: <Home /> },
        { path: "order", element: <Order /> },
        { path: "orders", element: <Orders /> },
        { path: "orders/:orderId", element: <OrderDetails /> },
        { path: "my-orders/:orderId", element: <OrderDetails /> },
        { path: "order-success/:orderId", element: <OrderSuccess /> },
        { path: "profile", element: <Profile /> },
        { path: "gallery", element: <Gallery /> },
        { path: "testimonials", element: <Testimonials /> },
        { path: "feedback", element: <Feedback /> },
        { path: "contact", element: <Contact /> },
        { path: "careers", element: <Careers /> },
        { path: "offers", element: <Offers /> },

        // Catch-all redirect
        { path: "*", element: <Navigate to="/menu" replace /> },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

// ============================================================================
// React Rendering
// ============================================================================
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);