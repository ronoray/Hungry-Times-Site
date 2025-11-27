// src/App.jsx - WITH ALL CONTEXT PROVIDERS
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LocationProvider } from "./context/LocationContext";
import "./styles/index.css";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <LocationProvider>
          <div className="min-h-screen flex flex-col bg-[#0B0B0B] text-white">
            {/* Navbar at top */}
            <Navbar />
            
            {/* Main content */}
            <main className="flex-1">
              <Outlet />
            </main>
            
            {/* Optional Footer can go here */}
          </div>
        </LocationProvider>
      </CartProvider>
    </AuthProvider>
  );
}