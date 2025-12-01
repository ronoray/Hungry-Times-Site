// src/components/Navbar.jsx - WITH LOGIN BUTTON
import { Link, NavLink } from 'react-router-dom';
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
  const cartCount = lines.reduce((sum, line) => sum + (line.qty || 1), 0);

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur bg-neutral-950/70 border-b border-neutral-800">
        <nav className="container-section h-16 flex items-center justify-between">
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
          <div className="flex items-center gap-3">
            {/* Phone Number */}
            <a 
              href={`tel:${BRAND.phone1}`} 
              className="hidden sm:inline text-sm text-neutral-300 hover:text-white transition-colors"
            >
              {BRAND.phone1}
            </a>

            {/* Login Button OR User Menu */}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-full text-white text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Login
              </button>
            )}
            
            {/* Order Now Button */}
            {/* Cart Badge */}
            {cartCount > 0 && (
              <Link
                to="/order"
                className="relative p-2 text-neutral-300 hover:text-white transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              </Link>
            )}

            {/* Order Now Button */}
            <Link
              to="/order"
              className="btn btn-primary text-sm"
            >
              Order Now
            </Link>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-neutral-800">
          <ul className="container-section flex items-center justify-between py-2 overflow-x-auto">
            {links.map(l => (
              <li key={l.to} className="flex-shrink-0">
                <NavLink
                  to={l.to}
                  className={({ isActive }) => 
                    `text-xs px-3 py-2 block hover:text-white transition-colors ${
                      isActive ? 'text-white' : 'text-neutral-400'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            
            {/* Mobile Login Button */}
            {!isAuthenticated && (
              <li className="flex-shrink-0">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs px-3 py-2 text-orange-400 hover:text-white transition-colors"
                >
                  Login
                </button>
              </li>
            )}
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