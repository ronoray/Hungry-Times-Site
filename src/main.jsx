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

// Helper to wrap a lazy component with a specific skeleton
function withSkeleton(Component, Skeleton) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Component />
    </Suspense>
  );
}

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
        { path: "offers", element: withSkeleton(Offers, DefaultSkeleton) },

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
