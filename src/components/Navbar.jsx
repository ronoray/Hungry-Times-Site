// src/components/Navbar.jsx — DNA v2 top bar, floating Menu circle, bottom nav
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { BRAND } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';
import KitchenStatus from './KitchenStatus';
import { useMenuCategory } from '../context/MenuCategoryContext';
import { useCart } from '../context/CartContext';
import {
  Home,
  BookOpen,
  ShoppingBag,
  Menu as MenuIcon,
  Package,
  User
} from 'lucide-react';

// Contact and Feedback live in the footer.
const desktopLinks = [
  { to: '/menu', label: 'Menu' },
  { to: '/offers', label: 'Offers' },
  { to: '/reservation', label: 'Reserve a table' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/testimonials', label: 'Reviews' },
];

// Fixed 4 tabs, fixed order — never swapped by cart state. The first slot used
// to flip between Home and Cart depending on whether the cart had items, which
// moved every other tab under the user's thumb the moment they added a dish.
// Cart lives in the top bar (bag + badge) and the floating cart bar instead.
const MOBILE_NAV_TABS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/menu', label: 'Menu', icon: BookOpen },
  { to: '/orders', label: 'Orders', icon: Package },
  { to: '/profile', label: 'Account', icon: User },
];

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
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
      {/* TOP BAR — DNA v2: ivory bar, badge alone (never the wordmark beside it),
          kitchen pill + bag on the right, lal-paar band underneath. Height is
          --nav-h in styles/index.css (64 + 12 phone, 84 + 12 from md); main's
          padding-top and every sticky offset read that variable. */}
      <header className="fixed left-0 right-0 z-50" style={{ top: 'var(--banner-h, 0px)' }}>
        <nav className="flex h-16 items-center bg-ht-ivory px-4 md:h-[84px] md:px-8 lg:px-14">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 md:gap-6">
            <Link to="/" className="flex shrink-0 items-center" aria-label={`${BRAND.name} — home`}>
              <img
                src="/ht_badge.png"
                alt={BRAND.name}
                className="h-[46px] w-[46px] md:h-[58px] md:w-[58px]"
                width="58"
                height="58"
                loading="eager"
              />
            </Link>

            {/* Text links — md and up (phones use the bottom nav). */}
            <ul className="hidden min-w-0 flex-1 items-center gap-4 md:flex lg:gap-8">
              {desktopLinks.map(l => (
                <li key={l.to} className="whitespace-nowrap">
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      `text-sm font-semibold transition-colors lg:text-[15px] ${
                        isActive ? 'text-ht-red' : 'text-ht-ink hover:text-ht-red'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <span className="hidden lg:inline">
                <KitchenStatus />
              </span>
              <span className="lg:hidden">
                <KitchenStatus compact />
              </span>

              {/* Bag — always present, 44px. Goes to the bag when it has
                  something in it, else to the menu. */}
              <button
                type="button"
                onClick={handleOrderClick}
                className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ht-ink/15 text-ht-ink transition hover:border-ht-red hover:text-ht-red active:scale-95"
                aria-label={hasItems ? `Bag, ${cartCount} item${cartCount === 1 ? '' : 's'}` : 'Bag is empty, open the menu'}
                style={{ padding: 0 }}
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ht-red px-1 text-[11px] font-bold text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>

              {/* Account — md and up. Phones reach it from the bottom nav. */}
              <div className="hidden md:block">
                {isAuthenticated ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-ht-red px-5 text-sm font-bold text-white transition hover:bg-ht-red2 active:scale-95"
                  >
                    <User className="h-4 w-4" />
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>
        <div className="paar" />
      </header>

      {/* FLOATING "MENU" BUTTON — /menu, below lg (desktop shows categories as
          a permanent column). Owner, 1 Oct 2026: visitors didn't read the old
          top-right ☰ as "the menu listing"; this replaced it. DNA floating
          action: gold2 circle, ink icon, hops (docs/DESIGN_DNA.md §5).
          Takes the WhatsApp button's slot just above FloatingCartBar;
          WhatsAppFloat steps up on /menu to make room. Hidden while the
          category sidebar is open — the sidebar closes itself. */}
      {location.pathname === '/menu' && !sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu categories"
          className="lg:hidden fixed z-50 right-4 bottom-[calc(144px+env(safe-area-inset-bottom,0px))] md:right-6 md:bottom-24
                     w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center gap-0.5
                     bg-ht-gold2 border-[1.5px] border-ht-gold
                     text-ht-ink shadow-[0_10px_20px_-6px_rgba(168,117,36,0.6)]
                     motion-safe:animate-hop active:scale-90 transition-transform"
          style={{ padding: 0 }}
        >
          <MenuIcon className="w-5 h-5" strokeWidth={2.2} />
          <span className="text-[10.5px] font-bold leading-none">Menu</span>
        </button>
      )}

      {/* MOBILE BOTTOM NAVIGATION — 4 tabs, fixed order */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-ht-ink/10 bg-ht-ivory pb-safe">
        <div className="flex">
          {MOBILE_NAV_TABS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.to);
            const cls = `flex-1 flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 transition-colors ${
              active ? 'text-ht-red' : 'text-ht-mute'
            }`;

            // Account tab: open AuthModal if not logged in
            if (item.to === '/profile' && !isAuthenticated) {
              return (
                <button key={item.to} onClick={() => setShowAuthModal(true)} className={cls}>
                  <Icon className="w-[22px] h-[22px]" strokeWidth={1.8} />
                  <span className="text-[11.5px] font-semibold leading-tight">{item.label}</span>
                </button>
              );
            }

            return (
              <Link key={item.to} to={item.to} className={cls} aria-current={active ? 'page' : undefined}>
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[11.5px] font-semibold leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          window.scrollTo(0, 0);
        }}
      />
    </>
  );
}
