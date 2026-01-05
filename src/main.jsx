// src/main.jsx - CORRECTED: Removed duplicate AuthProvider + Fixed missing Orders import
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
// Note: Orders.jsx doesn't exist - removed import

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
        { path: "profile", element: <Profile /> },
        // Note: Orders route removed - page doesn't exist yet
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

// ✅ FIXED: Removed duplicate AuthProvider
// AuthProvider is already in App.jsx, no need to wrap again here
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);