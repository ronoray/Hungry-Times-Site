import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

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

            {/* Navbar */}
            <Navbar />

            {/* Main Content */}
            <main className="flex-1">
              <Outlet />
            </main>

            {/* Footer Component */}
            <Footer />

          </div>
        </LocationProvider>
      </CartProvider>
    </AuthProvider>
  );
}
