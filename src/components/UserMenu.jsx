// components/UserMenu.jsx - Header User Menu
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, MapPin, ShoppingBag, ChevronDown } from 'lucide-react';

export default function UserMenu() {
  const { customer, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const hasAddress = !!customer?.address;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!isAuthenticated || !customer) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/menu');
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-full transition-colors"
      >
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
          {customer.name?.[0]?.toUpperCase() || 'U'}
        </div>
        
        {/* User Name (hidden on mobile) */}
        <span className="hidden sm:block text-white font-medium">
          {customer.name || customer.username}
        </span>

        {/* Service Area Badge */}
        {!hasAddress ? (
          <span className="hidden md:flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-300 rounded-full text-xs">
            <MapPin className="w-3 h-3" />
            <span>No address</span>
          </span>
        ) : customer.withinServiceArea ? (
          <span className="hidden md:flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
            <MapPin className="w-3 h-3" />
            <span>Active</span>
          </span>
        ) : (
          <span className="hidden md:flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
            <MapPin className="w-3 h-3" />
            <span>Outside Area</span>
          </span>
        )}

        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden z-50">
          {/* User Info Header */}
          <div className="p-4 bg-neutral-800/50 border-b border-neutral-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                {customer.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">
                  {customer.name || 'Customer'}
                </p>
                <p className="text-neutral-400 text-sm truncate">
                  @{customer.username}
                </p>
              </div>
            </div>

            {/* Service Area Status */}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              {!hasAddress ? (
                <span className="text-neutral-300">
                  No delivery address saved yet.
                </span>
              ) : customer.withinServiceArea ? (
                <span className="text-green-400">
                  ✓ Within delivery area
                  {customer.distanceKm && ` (${customer.distanceKm}km)`}
                </span>
              ) : (
                <span className="text-yellow-400">
                  ⚠️ Outside delivery area
                  {customer.distanceKm && ` (${customer.distanceKm}km)`}
                </span>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => {
                navigate('/profile');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <User className="w-5 h-5 text-orange-500" />
              <div className="flex-1 text-left">
                <p className="font-medium">My Profile</p>
                <p className="text-xs text-neutral-400">Edit details & address</p>
              </div>
            </button>

            <button
              onClick={() => {
                navigate('/orders');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <div className="flex-1 text-left">
                <p className="font-medium">My Orders</p>
                <p className="text-xs text-neutral-400">View order history</p>
              </div>
            </button>

            <div className="my-2 border-t border-neutral-700"></div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}