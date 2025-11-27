// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

import Menu from "./pages/Menu";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Feedback from "./pages/Feedback";
import Contact from "./pages/Contact";
import Careers from "./pages/Careers";
import Offers from "./pages/Offers";

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
         { path: "home", element: <Home /> },        // optional landing page
         { path: "gallery", element: <Gallery /> },
         { path: "feedback", element: <Feedback /> },
         { path: "contact", element: <Contact /> },
         { path: "careers", element: <Careers /> },
         { path: "offers", element: <Offers /> },
 
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
    <RouterProvider router={router} />
  </React.StrictMode>
);
