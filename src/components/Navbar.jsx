// src/components/Navbar.jsx - WITH LOGIN BUTTON
import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { BRAND } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';

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
  const [showOrderModal, setShowOrderModal] = useState(false);

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
            <button
              onClick={() => setShowOrderModal(true)}
              className="btn btn-primary text-sm"
            >
              Order Now
            </button>
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

      {/* Order Now Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-8 relative border border-neutral-800">
            {/* Close Button */}
            <button
              onClick={() => setShowOrderModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Place Your Order</h2>
                <p className="text-neutral-400">
                  To place an order, please call or WhatsApp us
                </p>
              </div>

              {/* Contact Options */}
              <div className="space-y-3">
                <a
                  href="tel:8420822919"
                  className="flex items-center justify-center gap-3 w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call 8420822919
                </a>

                <a
                  href="https://wa.me/918420822919"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp 8420822919
                </a>
              </div>

              <p className="text-sm text-neutral-500">
                Online ordering will be available soon!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}