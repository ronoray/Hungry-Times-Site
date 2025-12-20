// src/components/Navbar.jsx - FIXED: Force hamburger styles with !important
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { BRAND } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';
import { useMenuCategory } from '../context/MenuCategoryContext';
import { useCart } from '../context/CartContext';
import { 
  Home, 
  UtensilsCrossed, 
  ShoppingCart, 
  Image as ImageIcon, 
  Menu as MenuIcon,
  X,
  MessageSquare,
  Star,
  Phone
} from 'lucide-react';

const desktopLinks = [
  { to: '/home', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/testimonials', label: 'Testimonials' },
  { to: '/contact', label: 'Contact' },
  { to: '/feedback', label: 'Feedback' }
];

const mobileBottomNav = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/order', label: 'Cart', icon: ShoppingCart, showBadge: true },
  { to: '/gallery', label: 'Gallery', icon: ImageIcon },
];

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { lines } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  const cartCount = lines.reduce((sum, line) => sum + (line.qty || 1), 0);
  const hasItems = lines.length > 0;

  const handleOrderClick = (e) => {
    e.preventDefault();
    if (hasItems) {
      navigate('/order');
    } else {
      navigate('/menu');
    }
  };

  const { sidebarOpen, setSidebarOpen } = useMenuCategory();
  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* TOP NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-neutral-950/95 border-b border-neutral-800">
        <nav className="w-full h-16 flex items-center justify-center px-4">
          <div className="max-w-7xl w-full flex items-center justify-between">
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
            <ul className="hidden lg:flex items-center gap-6">
              {desktopLinks.map(l => (
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
                className="hidden lg:inline text-sm text-neutral-300 hover:text-white transition-colors"
              >
                {BRAND.phone1}
              </a>

              {/* Desktop Cart Badge */}
              {cartCount > 0 && (
                <Link
                  to="/order"
                  className="hidden md:flex relative p-2 text-neutral-300 hover:text-orange-400 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {Math.min(cartCount, 9)}
                  </span>
                </Link>
              )}

              {/* HAMBURGER MENU - Mobile only, when on /menu page */}
              {location.pathname === '/menu' && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}  
                  className="lg:hidden w-12 h-12 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 rounded-lg transition-colors"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    margin: 0
                  }}
                >
                  <div 
                    className="flex flex-col w-5"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <span className="block h-0.5 w-full bg-orange-500" style={{display: 'block', width: '100%', height: '2px', backgroundColor: '#f97316'}}></span>
                    <span className="block h-0.5 w-full bg-orange-500" style={{display: 'block', width: '100%', height: '2px', backgroundColor: '#f97316'}}></span>
                    <span className="block h-0.5 w-full bg-orange-500" style={{display: 'block', width: '100%', height: '2px', backgroundColor: '#f97316'}}></span>
                  </div>
                </button>
              )}

              {/* Login Button OR User Menu */}
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="
                      bg-orange-500 hover:bg-orange-600 active:bg-orange-700
                      rounded-lg text-white font-medium transition-colors text-sm
                      flex items-center justify-center

                      w-12 h-12 p-0
                      sm:w-auto sm:h-auto
                      sm:px-3 md:px-4 sm:py-2
                      sm:gap-2
                    "
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">Login</span>
                </button>
              )}

              {/* Desktop Order Button */}
              <button
                onClick={handleOrderClick}
                className="hidden lg:flex items-center gap-2 px-6 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm transition-colors"
              >
                📋 {hasItems ? `Order (${cartCount})` : "Menu"}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-neutral-950 border-t border-neutral-800 pb-4">
        <div className="grid grid-cols-4 h-16">
          {mobileBottomNav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.to);
            const showBadge = item.showBadge && cartCount > 0;
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-orange-500' : 'text-neutral-400'
                }`}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                  {showBadge && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {Math.min(cartCount, 9)}
                    </span>
                  )}
                </div>
                <span className={`text-xs ${active ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for fixed bottom nav on mobile */}
      <div className="md:hidden h-20" />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
        }}
      />
    </>
  );
}