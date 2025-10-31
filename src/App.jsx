// src/App.jsx
import React from "react";

// Providers (adjust paths to match your project)
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";

// Layout
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Centralized route map
import Router from "./routes/Router";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col bg-[#0B0B0B] text-white">
          <Navbar />
          <main className="flex-1">
            <Router />
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
