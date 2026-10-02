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
        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-ht-ivory hover:bg-ht-paper border border-ht-ink/15 rounded-full transition-colors"
      >
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-ht-red flex items-center justify-center text-white font-bold text-sm">
          {customer.name?.[0]?.toUpperCase() || 'U'}
        </div>
        
        {/* User Name (hidden on mobile) */}
        <span className="hidden sm:block text-ht-ink font-medium">
          {customer.name || customer.username}
        </span>

        {/* Service Area Badge */}
        {!hasAddress ? (
          <span className="hidden md:flex items-center gap-1 px-2 py-1 bg-ht-paper text-ht-ink rounded-full text-xs">
            <MapPin className="w-3 h-3" />
            <span>No address</span>
          </span>
        ) : customer.withinServiceArea ? (
          <span className="hidden md:flex items-center gap-1 px-2 py-1 bg-ht-veg/10 text-ht-veg rounded-full text-xs">
            <MapPin className="w-3 h-3" />
            <span>Active</span>
          </span>
        ) : (
          <span className="hidden md:flex items-center gap-1 px-2 py-1 bg-ht-gold2/60 text-ht-gold3 rounded-full text-xs">
            <MapPin className="w-3 h-3" />
            <span>Outside Area</span>
          </span>
        )}

        <ChevronDown className={`w-4 h-4 text-ht-mute transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-ht-ivory border border-ht-ink/15 rounded-2xl shadow-2xl overflow-hidden z-50">
          {/* User Info Header */}
          <div className="p-4 bg-ht-paper border-b border-ht-ink/15">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-ht-red flex items-center justify-center text-white font-bold text-lg">
                {customer.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ht-ink font-semibold truncate">
                  {customer.name || 'Customer'}
                </p>
                <p className="text-ht-mute text-sm truncate">
                  @{customer.username}
                </p>
              </div>
            </div>

            {/* Service Area Status */}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-ht-mute flex-shrink-0" />
              {!hasAddress ? (
                <span className="text-ht-ink">
                  No delivery address saved yet.
                </span>
              ) : customer.withinServiceArea ? (
                <span className="text-ht-veg">
                  ✓ Within delivery area
                  {customer.distanceKm && ` (${customer.distanceKm}km)`}
                </span>
              ) : (
                <span className="text-ht-gold3">
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
              className="w-full flex items-center gap-3 px-4 py-3 text-ht-ink hover:bg-ht-paper rounded-xl transition-colors"
            >
              <User className="w-5 h-5 text-ht-red" />
              <div className="flex-1 text-left">
                <p className="font-medium">My Profile</p>
                <p className="text-xs text-ht-mute">Edit details & address</p>
              </div>
            </button>

            <button
              onClick={() => {
                navigate('/orders');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-ht-ink hover:bg-ht-paper rounded-xl transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-ht-red" />
              <div className="flex-1 text-left">
                <p className="font-medium">My Orders</p>
                <p className="text-xs text-ht-mute">View order history</p>
              </div>
            </button>

            <div className="my-2 border-t border-ht-ink/15"></div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-ht-red hover:bg-ht-red/10 rounded-xl transition-colors"
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