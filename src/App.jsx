import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Router from './routes/Router'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'

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