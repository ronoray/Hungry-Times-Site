// src/components/Navbar.jsx - WITH SMART ORDER BUTTON
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BRAND } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';
import { useCart } from '../context/CartContext';
import { ShoppingCart } from 'lucide-react';

const links = [
  { to: '/home', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/testimonials', label: 'Testimonials' },
  { to: '/contact', label: 'Contact' },
  { to: '/feedback', label: 'Feedback' }
];

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { lines } = useCart();
  const navigate = useNavigate();
  
  const cartCount = lines.reduce((sum, line) => sum + (line.qty || 1), 0);
  const hasItems = lines.length > 0;

  // Smart Order button handler
  const handleOrderClick = (e) => {
    e.preventDefault();
    if (hasItems) {
      navigate('/order');
    } else {
      navigate('/menu');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-neutral-950/95 border-b border-neutral-800">
        <nav className="container-section h-16 flex items-center justify-between px-3 sm:px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 py-1">
            <img
              src={logo}
              alt="Hungry Times"
              className="h-9 w-auto"
              width="180" 
              height="36"
              loading="eager"
            />
            <span className="sr-only">{BRAND.name}</span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center gap-6">
            {links.map(l => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) => 
                    `text-sm hover:text-white transition-colors ${
                      isActive ? 'text-white' : 'text-neutral-300'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Phone Number - Desktop only */}
            <a 
              href={`tel:${BRAND.phone1}`} 
              className="hidden md:inline text-sm text-neutral-300 hover:text-white transition-colors"
            >
              {BRAND.phone1}
            </a>

            {/* Login Button OR User Menu - ALWAYS VISIBLE */}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg text-white font-medium transition-colors text-sm sm:text-sm"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden sm:inline">Login</span>
              </button>
            )}
            
            {/* Cart Badge */}
            {cartCount > 0 && (
              <Link
                to="/order"
                className="relative p-2 text-neutral-300 hover:text-orange-400 transition-colors flex-shrink-0"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-5 leading-none">
                  {Math.min(cartCount, 9)}+
                </span>
              </Link>
            )}

            {/* Smart Order Now Button - Desktop/Tablet only */}
            <button
              onClick={handleOrderClick}
              className="hidden sm:block btn btn-primary text-sm font-semibold px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white transition-colors"
            >
              {hasItems ? `Order (${cartCount})` : "Menu"}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation - Compact */}
        <div className="md:hidden border-t border-neutral-800 bg-neutral-900/50">
          <ul className="container-section flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {links.slice(0, 4).map(l => (
              <li key={l.to} className="flex-shrink-0">
                <NavLink
                  to={l.to}
                  className={({ isActive }) => 
                    `text-xs px-3 py-2 block hover:text-white transition-colors whitespace-nowrap ${
                      isActive ? 'text-orange-400 font-semibold' : 'text-neutral-400'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          // Optional: Show success message
        }}
      />
    </>
  );
}