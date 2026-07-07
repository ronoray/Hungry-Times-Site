// src/main.jsx - Code-split with React.lazy()
import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

// Skeleton fallbacks
import MenuSkeleton from "./components/skeletons/MenuSkeleton";
import OrderSkeleton from "./components/skeletons/OrderSkeleton";
import OrdersSkeleton from "./components/skeletons/OrdersSkeleton";
import DefaultSkeleton from "./components/skeletons/DefaultSkeleton";

// Self-heal stale-cache clients. After a deploy, a browser holding an old index.html
// requests chunk hashes that no longer exist (404) → React.lazy import rejects with
// "Failed to fetch dynamically imported module" and the page dies ("Something went wrong").
// Vite fires `vite:preloadError`; we also catch the raw error/rejection. Force ONE reload
// to pull the fresh index + chunks. The 10s sessionStorage guard prevents a reload loop
// if the chunk is genuinely gone (bad deploy / offline) — user then sees the normal error UI.
(function setupChunkReloadSelfHeal() {
  const KEY = "ht_chunk_reload_at";
  const CHUNK_ERR = /dynamically imported module|ChunkLoadError|Loading chunk|Importing a module script failed/i;
  function reloadOnce() {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  }
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    reloadOnce();
  });
  window.addEventListener("error", (e) => {
    if (CHUNK_ERR.test(e?.message || "")) reloadOnce();
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (CHUNK_ERR.test(e?.reason?.message || String(e?.reason || ""))) reloadOnce();
  });
})();

// Lazy-loaded pages
const Menu = lazy(() => import("./pages/Menu"));
const Home = lazy(() => import("./pages/Home"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Contact = lazy(() => import("./pages/Contact"));
const Careers = lazy(() => import("./pages/Careers"));
const Offers = lazy(() => import("./pages/Offers"));
const Testimonials = lazy(() => import("./pages/Testimonials"));
const Order = lazy(() => import("./pages/Order"));
const Profile = lazy(() => import("./pages/Profile"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const DeliveryView = lazy(() => import("./pages/DeliveryView"));
const ComboPage = lazy(() => import("./pages/ComboPage"));
const Reservation = lazy(() => import("./pages/Reservation"));

// Helper to wrap a lazy component with a specific skeleton
function withSkeleton(Component, Skeleton) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Component />
    </Suspense>
  );
}

// ============================================================================
// Hard refresh when app reopened after 60+ seconds hidden
// ============================================================================
(function () {
  let hiddenAt = null;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (document.visibilityState === 'visible' && hiddenAt) {
      if (Date.now() - hiddenAt > 60000) {
        window.location.reload();
      }
      hiddenAt = null;
    }
  });
})();

// ============================================================================
// Service Worker Registration
// ============================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope);
        setInterval(() => registration.update(), 60000);
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  });
}

// ============================================================================
// PWA Install Prompt
// ============================================================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  deferredPrompt = e;
  // Store on window so late-mounting components can read it
  window.__pwaDeferred = e;
  window.dispatchEvent(new CustomEvent('pwa-install-available', {
    detail: { prompt: e }
  }));
});

window.triggerPWAInstall = async () => {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return result.outcome === 'accepted';
};

window.addEventListener('appinstalled', () => {
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
        { index: true, element: <Navigate to="/menu" replace /> },

        // Menu — primary landing, gets its own skeleton
        { path: "menu", element: withSkeleton(Menu, MenuSkeleton) },

        // Order flow — cart/checkout skeleton
        { path: "order", element: withSkeleton(Order, OrderSkeleton) },
        { path: "order-success/:orderId", element: withSkeleton(OrderSuccess, DefaultSkeleton) },

        // Order history
        { path: "orders", element: withSkeleton(Orders, OrdersSkeleton) },
        { path: "orders/:orderId", element: withSkeleton(OrderDetails, OrdersSkeleton) },
        { path: "my-orders/:orderId", element: withSkeleton(OrderDetails, OrdersSkeleton) },

        // Profile
        { path: "profile", element: withSkeleton(Profile, DefaultSkeleton) },

        // Content pages
        { path: "home", element: withSkeleton(Home, DefaultSkeleton) },
        { path: "gallery", element: withSkeleton(Gallery, DefaultSkeleton) },
        { path: "testimonials", element: withSkeleton(Testimonials, DefaultSkeleton) },
        { path: "feedback", element: withSkeleton(Feedback, DefaultSkeleton) },
        { path: "contact", element: withSkeleton(Contact, DefaultSkeleton) },
        { path: "careers", element: withSkeleton(Careers, DefaultSkeleton) },
        { path: "reservation", element: withSkeleton(Reservation, DefaultSkeleton) },
        { path: "offers", element: withSkeleton(Offers, DefaultSkeleton) },

        // Delivery tracking (public, token-based)
        { path: "track/:token", element: withSkeleton(TrackOrder, DefaultSkeleton) },
        { path: "delivery/:token", element: withSkeleton(DeliveryView, DefaultSkeleton) },

        { path: "*", element: <Navigate to="/menu" replace /> },
      ],
    },

    // Standalone ad landing page — no nav/footer chrome
    { path: "/combo", element: withSkeleton(ComboPage, DefaultSkeleton) },
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
