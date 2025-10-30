import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Router from './routes/Router'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UnderConstruction from './pages/UnderConstruction';
import Offers from './pages/Offers';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Router />
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  )
}