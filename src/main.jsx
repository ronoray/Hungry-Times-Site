// src/main.jsx - FIXED: Added Testimonials route + AuthProvider wrapper
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

// Import AuthProvider
import { AuthProvider } from "./context/AuthContext";

// Import pages
import Menu from "./pages/Menu";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Feedback from "./pages/Feedback";
import Contact from "./pages/Contact";
import Careers from "./pages/Careers";
import Offers from "./pages/Offers";
import Testimonials from "./pages/Testimonials";

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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);