// File: site/src/pages/Menu.jsx

import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import "./Menu.css";
import { useCart } from "../context/CartContext";
import { Plus, Minus, Sparkles, Search, X, Heart, ChevronRight, UtensilsCrossed, Camera } from "lucide-react";
import AddToCartModal from "../components/AddToCartModal";
import FloatingCartBar from "../components/FloatingCartBar";
import VegDot from "../components/VegDot";
import OfferTicket from "../components/OfferTicket";
import AutoOfferCard from "../components/AutoOfferCard";
import { useMenuCategory } from '../context/MenuCategoryContext';
import { useFavorites } from '../context/FavoritesContext';
import SEOHead from '../components/SEOHead';
import MakeYourMealModal from '../components/MakeYourMealModal';
import '../components/MakeYourMealModal.css';
import { useAuth } from '../context/AuthContext';
import { useBackableOverlay } from '../hooks/useBackableOverlay';
import { hasRealOptions } from '../utils/menuItems';
import { packagingAddonOf } from '../utils/cartLine';

import API_BASE from "../config/api";
import { getVisitorSessionId } from "../utils/siteActivity";
import { trackAddToCart, trackSearch, trackCtaClick, trackViewItem, trackFavoriteToggle, trackViewItemList } from "../utils/analytics";

// "Under ₹250" filter chip (DNA v2 menu). List price, before any offer.
const PRICE_CHIP_CAP = 250;

// AddToCartModal's size rule: "Large" is the only size variant and the base
// price is the regular (server/utils/menuOptions.js SIZE_VARIANT_NAMES).
const isLargeVariant = (v) => String(v?.name || "").trim().toLowerCase() === "large";

// Description length limits
const DESC_MAX_RECOMMENDED = 40;  // compact cards - carousel
const DESC_MAX_REGULAR = 100;     // regular items

// ========================
// Description Modal
// ========================
function DescriptionModal({ open, title, description, onClose }) {
  // Hook first: this component is mounted unconditionally, so calling it after
  // the early return would change the hook count between open and closed.
  const closeModal = useBackableOverlay(open, onClose);

  if (!open) return null;

  const backdrop = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const body = {
    position: "relative",
    zIndex: 10000,
    maxWidth: "90vw",
    maxHeight: "90vh",
    background: "#1e1e1e",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    color: "#fff",
  };

  const head = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid #333",
  };

  const closeBtn = {
    background: "#f59e0b",
    color: "#000",
    border: 0,
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.875rem",
  };

  const descText = {
    maxHeight: "75vh",
    overflowY: "auto",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    color: "rgba(255,255,255,0.8)",
    paddingRight: "8px",
  };

  return (
    <div style={backdrop} onClick={closeModal}>
      <div style={body} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "1.2rem",
              color: "#f59e0b",
            }}
          >
            {title}
          </div>
          <button style={closeBtn} onClick={closeModal}>
            ✕ Close
          </button>
        </div>
        <p style={descText}>{description}</p>
      </div>
    </div>
  );
}

// ========================
// Image Modal
// ========================
function ImageModal({ open, urls = [], name, onClose }) {
  if (!open) return null;

  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [open, urls?.length]);

  const backdrop = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const body = {
    position: "relative",
    zIndex: 10000,
    maxWidth: "90vw",
    maxHeight: "90vh",
    background: "#0b0b0b",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
  };

  const head = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    color: "#fff",
    paddingBottom: 8,
    borderBottom: "1px solid #333",
  };

  const img = {
    maxWidth: "86vw",
    maxHeight: "78vh",
    objectFit: "contain",
    borderRadius: 8,
  };

  const closeBtn = {
    background: "#f59e0b",
    color: "#000",
    border: 0,
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
  };

  const empty = {
    color: "#aaa",
    textAlign: "center",
    padding: "40px 20px",
  };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={body} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            {name || "Item Image"}
          </div>
          <button style={closeBtn} onClick={onClose}>
            ✕ Close
          </button>
        </div>
        {urls && urls[idx] ? (
          <img
            src={urls[idx]}
            alt={name || "Item image"}
            style={img}
            onError={() => setIdx((i) => i + 1)}
          />
        ) : (
          <div style={empty}>No image available</div>
        )}
      </div>
    </div>
  );
}

// ========================
// Main Menu Component
// ========================
export default function Menu() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const {
     addLine,
     getSimpleItemQty,
     incrementSimpleItem,
     decrementSimpleItem,
     reconcileWithMenu,
     orderMode,
     updateOrderMode,
   } = useCart();
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const { customer } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const [activeTop, setActiveTop] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const { sidebarOpen, setSidebarOpen } = useMenuCategory();
  // Back button closes the category sidebar instead of leaving /menu.
  const closeSidebar = useBackableOverlay(sidebarOpen, () => setSidebarOpen(false));
  const { toggleFavorite, isFavorite } = useFavorites();

  // Search state — seed from ?search= so deep-links (home Quick Categories,
  // the Mid-Week Combo card) land pre-filtered instead of on the bare menu.
  const [searchQuery, setSearchQuery] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('search') || ''; }
    catch { return ''; }
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ht_recent_searches') || '[]'); }
    catch { return []; }
  });
  const saveRecentSearch = (term) => {
    const t = term.trim();
    if (!t || t.length < 2) return;
    const updated = [t, ...recentSearches.filter(s => s.toLowerCase() !== t.toLowerCase())].slice(0, 5);
    setRecentSearches(updated);
    try { localStorage.setItem('ht_recent_searches', JSON.stringify(updated)); } catch {}
  };

  // Veg filter
  const [vegOnly, setVegOnly] = useState(() => {
    try { return localStorage.getItem('ht_veg_filter') === '1'; }
    catch { return false; }
  });

  // "Under ₹250" chip — session-only, unlike the veg filter.
  const [underCap, setUnderCap] = useState(false);

  // Active Offers State

  // Track items that were just added (for success animation)
  const [addedItems, setAddedItems] = useState(new Set());

  // Global online ordering state
  const [acceptingOnlineOrders, setAcceptingOnlineOrders] = useState(true);
  const [orderingDisabledMessage, setOrderingDisabledMessage] = useState(
    "Online ordering is currently unavailable. Please try again later."
  );

  // Helper to check if item has any customization options
  function hasVariantsOrAddons(it, type) {
    const families = (it.families || []).filter((f) => f.type === type);
    if (families.length > 0) {
      return families.some((fam) => (fam.options || []).length > 0);
    }
    if (type === "variant") return (it.variants || []).length > 0;
    if (type === "addon") return (it.addonGroups || []).length > 0;
    return false;
  }

  useEffect(() => {
  if (sidebarOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => {
    document.body.style.overflow = '';
  };
}, [sidebarOpen]);

  // Persist veg filter
  useEffect(() => {
    try { localStorage.setItem('ht_veg_filter', vegOnly ? '1' : '0'); }
    catch {}
  }, [vegOnly]);

  // Menu session tracking — fire once per browser session for conversion denominator
  useEffect(() => {
    if (sessionStorage.getItem('menu_view_tracked')) return;
    // Same id the cart log uses, so a menu visit and its cart adds line up.
    const sid = getVisitorSessionId() || Math.random().toString(36).slice(2) + Date.now().toString(36);
    fetch(`${API_BASE}/public/menu-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sid }),
    }).catch(() => {});
    sessionStorage.setItem('menu_view_tracked', '1');
  }, []);

  // Modals
  const [imgModal, setImgModal] = useState({
    open: false,
    url: null,
    name: "",
  });
  const [descModal, setDescModal] = useState({
    open: false,
    title: "",
    description: "",
  });

  // True when the sheet was opened BY the ?highlight= navigation rather than by
  // a tap on this page. Such a sheet takes no history entry of its own, so one
  // back press undoes the whole hop and returns the customer to wherever they
  // tapped through from — spending it closing a sheet they never opened, and
  // leaving them on a menu they never asked for, is the wrong feel entirely.
  const [modalFromHighlight, setModalFromHighlight] = useState(false);

  const openAddToCart = (item) => {
    setModalFromHighlight(false);
    setSelectedItem(item);
    setShowAddToCartModal(true);
  };
  const closeAddToCart = () => {
    setSelectedItem(null);
    setShowAddToCartModal(false);
    setModalFromHighlight(false);
  };

  const rightPaneRef = useRef(null);
  const searchResultsRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchBarRef = useRef(null);

  // "Search the menu" in the category sidebar.
  //
  // ORDER IS LOAD-BEARING. focus() must run synchronously inside this tap's own
  // task or iOS will not raise the keyboard — and closeSidebar() goes through
  // history.back(), which lands a task later. Focus first and the keyboard is
  // already up when the sidebar slides away; close first and the customer gets a
  // focused field they still have to tap.
  const pendingSearchScrollRef = useRef(false);
  const focusSearchFromSidebar = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select(); // typing replaces an existing query
    pendingSearchScrollRef.current = true;
    closeSidebar();
  };

  // Scroll the search bar into view only once the sidebar has actually closed.
  // While it is open the body carries overflow: hidden, so scrolling from inside
  // the click handler is silently dropped and never retried.
  useEffect(() => {
    if (sidebarOpen || !pendingSearchScrollRef.current) return;
    pendingSearchScrollRef.current = false;
    searchBarRef.current?.scrollIntoView({ block: 'start' });
  }, [sidebarOpen]);

  // Fetch menu data
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
          const res = await fetch(`${API_BASE}/public/menu`, {
            headers: { "Cache-Control": "no-cache" },
          });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!alive) return;

        setData(json);

        // Reconcile any stale prices in the cart (e.g. variant priceDelta that was
        // incorrectly 0 before a server-side fix). Runs immediately with fresh data.
        const allItems = [];
        for (const tc of (json.topCategories || [])) {
          for (const sc of (tc.subcategories || [])) {
            for (const item of (sc.items || [])) allItems.push(item);
          }
        }
        if (allItems.length > 0) reconcileWithMenu(allItems);

        // Extract global ordering status
        setAcceptingOnlineOrders(json.acceptingOnlineOrders !== false);
        setOrderingDisabledMessage(json.onlineOrdersDisabledMessage || "");

        // activeTop/activeSub are not set here: the ?cat= sync effect below owns
        // them, and it fires as soon as this setData lands. Setting them here too
        // would briefly override a /menu?cat=<id> deep link.
        // Track initial category impression
        const firstCat = json?.topCategories?.[0];
        if (firstCat) {
          const items = firstCat.subcategories?.flatMap(sc => sc.items || []) || [];
          trackViewItemList(firstCat.name, items);
        }
      } catch (e) {
        if (!alive) return;
        setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Poll ordering status every 30s so toggle changes appear without a refresh
  useEffect(() => {
    const poll = async () => {
      try {
        // Public endpoint — the old /menu/settings/online-ordering target is
        // admin-auth'd, so this poll silently 401'd forever and never updated.
        const res = await fetch(`${API_BASE}/public/kitchen-status`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.accepting_online_orders !== undefined) {
          setAcceptingOnlineOrders(Number(json.accepting_online_orders) === 1);
          setOrderingDisabledMessage(json.online_orders_disabled_message || "");
        }
      } catch {}
    };
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  // Inject FoodEstablishment + Menu JSON-LD for Googlebot (executes JS, sees this)
  useEffect(() => {
    if (!data?.topCategories?.length) return;
    const sections = [];
    for (const tc of data.topCategories) {
      for (const sc of (tc.subcategories || [])) {
        if (!sc.items?.length) continue;
        sections.push({
          '@type': 'MenuSection',
          name: `${tc.name} — ${sc.name}`,
          hasMenuItem: sc.items.map(item => ({
            '@type': 'MenuItem',
            name: item.name,
            ...(item.description ? { description: item.description } : {}),
            ...(item.imageUrl ? { image: item.imageUrl } : {}),
            offers: { '@type': 'Offer', price: String(item.basePrice || 0), priceCurrency: 'INR' },
          })),
        });
      }
    }
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FoodEstablishment',
      name: 'Hungry Times',
      url: 'https://home.hungrytimes.in',
      hasMenu: {
        '@type': 'Menu',
        name: 'Hungry Times Full Menu',
        url: 'https://home.hungrytimes.in/menu',
        hasMenuSection: sections,
      },
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'menu-jsonld';
    el.textContent = JSON.stringify(schema);
    document.head.appendChild(el);
    return () => { document.getElementById('menu-jsonld')?.remove(); };
  }, [data]);

  const tops = data?.topCategories || [];

  // The selected top category lives in the URL as /menu?cat=<id>, and this
  // effect is the only thing that turns it into state.
  //
  // Picking a category swaps out the entire right pane, so it reads as a page
  // to the customer — but it used to be pure component state with nothing in
  // the history stack. On a cold PWA launch (start_url "/", which redirects to
  // /menu with `replace`) /menu is the ONLY entry, so back out of a category
  // dropped straight out of the app instead of returning to the menu.
  //
  // Deps are `data`, not `tops`: `data?.topCategories || []` mints a fresh array
  // on every render while data is still null, which would loop this effect.
  useEffect(() => {
    if (!tops.length) return;
    const params = new URLSearchParams(location.search);

    // A highlighted dish picks the category for us — it cannot be scrolled to
    // or opened until its category is the one on screen.
    const highlightId = Number(params.get('highlight')) || null;
    if (highlightId) {
      for (const tc of tops) {
        for (const sc of tc.subcategories || []) {
          if ((sc.items || []).some(it => it.id === highlightId)) {
            setActiveTop(tc.id);
            setActiveSub(sc.id);
            return;
          }
        }
      }
    }

    // ?sub=<subcategoryId> — the category-scoped twin of ?highlight. A dish
    // offer that names a CATEGORY ("any Meifoon") has no single item to point
    // at, so AutoOfferCard links the section instead. Resolved here for the same
    // reason ?highlight is: the section cannot be scrolled to until its top
    // category is the one mounted in the right pane.
    const subRaw = params.get('sub');
    if (subRaw) {
      for (const tc of tops) {
        for (const sc of tc.subcategories || []) {
          if (String(sc.id) === subRaw) {
            setActiveTop(tc.id);
            setActiveSub(sc.id);
            return;
          }
        }
      }
    }

    const raw = params.get('cat');
    const target = (raw && tops.find(t => String(t.id) === raw)) || tops[0];
    setActiveTop(target.id);
    setActiveSub(target.subcategories?.[0]?.id ?? null);
  }, [location.search, data]);

  // ?sub=<id> — scroll the section into view once it has mounted. Mirrors the
  // ?highlight effect below, including its once-per-arrival ref: without that,
  // any later render (a scroll-spy tick, an offers fetch resolving) would yank
  // the customer back to the section they had already scrolled away from.
  const handledSubRef = useRef(null);
  useEffect(() => {
    if (!tops.length) return undefined;

    const subId = new URLSearchParams(location.search).get('sub');
    if (!subId) {
      handledSubRef.current = null;
      return undefined;
    }
    if (handledSubRef.current === subId) return undefined;
    handledSubRef.current = subId;

    // Let the category switch above commit and paint before looking for it.
    const t = setTimeout(() => {
      const el = rightPaneRef.current?.querySelector(`[data-sub="${subId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);

    return () => clearTimeout(t);
  }, [tops, location.search, data]);

  // ?highlight=<id> — scroll to the dish, and open its options when it has any.
  //
  // The param has been passed by Home, TodaysSpecial and Profile's favourites
  // since long before this, and Menu never read it: every one of those links
  // just dropped the customer on the menu with no idea where their dish went.
  // Home's "Choose options" button made the broken promise explicit.
  const handledHighlightRef = useRef(null);
  useEffect(() => {
    if (!tops.length) return undefined;

    const highlightId = Number(new URLSearchParams(location.search).get('highlight')) || null;
    if (!highlightId) {
      handledHighlightRef.current = null;
      return undefined;
    }
    // Once per arrival. Without this, closing the modal (which leaves the URL
    // untouched) would reopen it on the next render.
    if (handledHighlightRef.current === highlightId) return undefined;

    let found = null;
    for (const tc of tops) {
      for (const sc of tc.subcategories || []) {
        for (const it of sc.items || []) {
          if (it.id === highlightId) found = it;
        }
      }
    }
    if (!found) return undefined;

    handledHighlightRef.current = highlightId;

    // Let the category switch above commit and paint before looking for the card.
    const t = setTimeout(() => {
      const el = rightPaneRef.current?.querySelector(`[data-item="${highlightId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);

    const orderable = acceptingOnlineOrders && !found.effectiveDisabled;
    if (orderable && hasRealOptions(found)) {
      setModalFromHighlight(true);
      setSelectedItem(found);
      setShowAddToCartModal(true);
    }

    return () => clearTimeout(t);
  }, [tops, location.search, data, acceptingOnlineOrders]);

  // The page used to fetch /offers/active here to render a one-offer banner below
  // the search bar, built from `offers.find(o => o.apply_automatically)`. `find`
  // is the bug: it returns the FIRST automatic offer and silently discards the
  // rest, so the September campaign's two codeless offers showed up as Fish n
  // Chips alone and Meifoon appeared nowhere on the menu at all. The banner also
  // rendered a flat discount as "65₹ OFF" and linked to nothing.
  //
  // AutoOfferCard replaces it above the search bar: it lists every codeless offer
  // and each row deep-links to the dish. It owns its own fetch, so the state,
  // the banner and this second call to the same endpoint are all gone.

  const subs = useMemo(() => {
    const t = tops.find((x) => x.id === activeTop);
    return t?.subcategories || [];
  }, [tops, activeTop]);

  // Scroll-spy: highlight active subcategory as user scrolls
  useEffect(() => {
    if (searchQuery) return; // Disable during search

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const subId = Number(entry.target.dataset.sub);
            if (subId) {
              setActiveSub(subId);
              const pill = document.getElementById(`pill-${subId}`);
              pill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
          }
        });
      },
      { rootMargin: '-120px 0px -70% 0px' }
    );

    const sections = rightPaneRef.current?.querySelectorAll('[data-sub]');
    sections?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [subs, searchQuery]);

  const itemsBySub = useMemo(() => {
    const map = new Map();
    subs.forEach((sc) => map.set(sc.id, sc.items || []));
    return map;
  }, [subs]);

  // Flat list of all items with category context for Fuse.js
  const searchableItems = useMemo(() => {
    const list = [];
    tops.forEach(topCat => {
      topCat.subcategories?.forEach(subCat => {
        (subCat.items || []).forEach(item => {
          list.push({ item, topCat, subCat, name: item.name, catName: topCat.name, subName: subCat.name });
        });
      });
    });
    return list;
  }, [tops]);

  const fuse = useMemo(() => new Fuse(searchableItems, {
    keys: [
      { name: 'name', weight: 3 },
      { name: 'subName', weight: 2 },
      { name: 'catName', weight: 1 },
    ],
    threshold: 0.4,
    minMatchCharLength: 2,
    ignoreLocation: true,
  }), [searchableItems]);

  // Global search across ALL categories
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const fuseResults = fuse.search(searchQuery.trim());

    // Re-group by subcategory preserving order
    const subMap = new Map();
    fuseResults.forEach(({ item: record }) => {
      const key = record.subCat.id;
      if (!subMap.has(key)) {
        subMap.set(key, { topCategory: record.topCat, subCategory: record.subCat, items: [] });
      }
      subMap.get(key).items.push(record.item);
    });

    return Array.from(subMap.values());
  }, [fuse, searchQuery]);

  // When searching, use global results; otherwise use current category
  // Also apply veg filter
  const filteredItemsBySub = useMemo(() => {
    let base;
    if (searchQuery.trim()) {
      base = new Map();
      globalSearchResults?.forEach(result => {
        base.set(result.subCategory.id, result.items);
      });
    } else {
      base = itemsBySub;
    }

    if (!vegOnly && !underCap) return base;

    // Apply veg / price filters
    const filtered = new Map();
    base.forEach((items, subId) => {
      const kept = items.filter(it =>
        (!vegOnly || it.isVeg === true || it.isVeg === 1 || it.is_veg === 1) &&
        (!underCap || Number(it.basePrice || 0) < PRICE_CHIP_CAP)
      );
      if (kept.length > 0) filtered.set(subId, kept);
    });
    return filtered;
  }, [itemsBySub, searchQuery, globalSearchResults, vegOnly, underCap]);

  // Filtered subcategories (also filtered by veg if active)
  const filteredSubs = useMemo(() => {
    let result;
    if (searchQuery.trim()) {
      result = globalSearchResults?.map(r => r.subCategory) || [];
    } else {
      result = subs;
    }
    // With a filter on, only show subcategories that still have items
    if (vegOnly || underCap) {
      return result.filter(sc => filteredItemsBySub.has(sc.id));
    }
    return result;
  }, [subs, searchQuery, globalSearchResults, vegOnly, underCap, filteredItemsBySub]);

  // Auto-scroll to search results when search query changes
  useEffect(() => {
    if (!searchQuery || !searchResultsRef.current) return;
    
    // Debounce: only scroll after user stops typing for 200ms
    const timeoutId = setTimeout(() => {
      searchResultsRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 200);
    
    // Cleanup: cancel scroll if user continues typing
    return () => clearTimeout(timeoutId);
  }, [searchQuery, globalSearchResults]);

  // Collect all recommended items
  const recommendedItems = useMemo(() => {
    const items = [];
    tops.forEach((tc) => {
      tc.subcategories?.forEach((sc) => {
        sc.items?.forEach((item) => {
          if (item.isRecommended) items.push(item);
        });
      });
    });
    return items;
  }, [tops]);

  // Collect favorite items from all categories
  const favoriteItems = useMemo(() => {
    const items = [];
    tops.forEach((tc) => {
      tc.subcategories?.forEach((sc) => {
        sc.items?.forEach((item) => {
          if (isFavorite(item.id)) items.push(item);
        });
      });
    });
    return items;
  }, [tops, isFavorite]);

  const scrollToSub = (subId) => {
    setActiveSub(subId);
    const el = rightPaneRef.current?.querySelector(`[data-sub="${subId}"]`);
    if (el) {
      // Offset = everything stuck above the section: offer banner, fixed
      // header (--nav-h), search + chips, category tabs (Menu.css vars).
      const px = (node, name) => parseInt(getComputedStyle(node).getPropertyValue(name)) || 0;
      const root = document.documentElement;
      const wrap = rightPaneRef.current?.closest('.menu-page-wrapper') || root;
      const totalOffset = px(root, '--banner-h') + px(root, '--nav-h')
        + px(wrap, '--menu-sticky-h') + px(wrap, '--menu-tabs-h') + 8;
      
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - totalOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleCategoryClick = (tcId, firstSubId) => {
    // Clear the search first. While searchQuery is non-empty, filteredSubs and
    // filteredItemsBySub are built entirely from globalSearchResults and ignore
    // activeTop — so picking a category during a search silently did nothing,
    // the results just stayed on screen.
    setSearchQuery('');
    const sameCategory = tcId === activeTop;
    setActiveTop(tcId);
    setActiveSub(firstSubId);

    if (sameCategory) {
      // Already on this category — a new entry would render identically and
      // cost the customer a back press that appears to do nothing. Just close
      // the sidebar through the closer, which consumes the entry it pushed.
      if (sidebarOpen) closeSidebar();
    } else {
      const fromSidebar = sidebarOpen;
      setSidebarOpen(false);
      // Make the category a real history entry so back walks out of it.
      // `replace` when the pick came from the sidebar: the sidebar already
      // pushed an entry when it opened, and replacing consumes it.
      // closeSidebar() must NOT be used here — history.back() is async and
      // would land after this navigate, undoing it.
      navigate(`/menu?cat=${tcId}`, { replace: fromSidebar });
    }

    const tc = tops.find(t => t.id === tcId);
    if (tc) {
      const items = tc.subcategories?.flatMap(sc => sc.items || []) || [];
      trackViewItemList(tc.name, items);
    }
    
    // Scroll to the subcategory after state updates
    setTimeout(() => {
      if (firstSubId) {
        const el = rightPaneRef.current?.querySelector(`[data-sub="${firstSubId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 100); // Small delay to ensure state has updated
  };

// ========================
  // Menu Item Card Component
  // ========================
  const MenuItemCard = ({ it, isRecommendedCard = false }) => {
    // Drives the price range ("from ₹X"). Packaging is an addon, never a
    // variant, so this one needs no packaging filter.
    const hasVariants = hasVariantsOrAddons(it, "variant");
    // Drives the "Customisable" label and the Customize & Add button. Packaging
    // is excluded — a dish whose only addon is a locked packaging charge is not
    // customisable, and labelling it so promises a choice that isn't there.
    const isCustomisable = hasRealOptions(it);

    const DESC_MAX = DESC_MAX_REGULAR;

    const fullDescription = String(it.description || "");
    const isTruncated = fullDescription.length > DESC_MAX;

    // Use ONLY the API-provided imageUrl (already normalized on the server)
    const imageUrl = it.imageUrl || null;

    // Some items have no packaging and so cannot leave the building (the teas,
    // the coffee, the made-to-order sodas). They stay visible but unorderable
    // outside dine-in mode: greying them with a reason reads as "come and have
    // it here", where hiding them would just look like a menu that lost items.
    const dineInOnlyBlocked = Boolean(it.dineInOnly) && orderMode !== 'dine_in';

    // Check if item is disabled
    const isDisabled = !acceptingOnlineOrders || it.effectiveDisabled || dineInOnlyBlocked;
    
    // Price display: show range for items with variants
    const priceDisplay = (() => {
      const base = Number(it.basePrice || 0);
      if (!hasVariants) return `₹${base.toFixed(0)}`;
      // "From ₹XX" for items with variants
      return `From ₹${base.toFixed(0)}`;
    })();

    // Two sizes (Regular / Large): the row shows two price chips instead of
    // a leader and a single price. A dish whose only choice is the size adds
    // straight from the chip; anything with more to choose opens the sheet.
    const largeVariant = (it.variants || []).find(isLargeVariant) || null;
    const twoSize = Boolean(largeVariant);
    const sizeOnly = twoSize && (it.variants || []).length === 1
      && !hasRealOptions({ ...it, variants: [] });
    const base = Number(it.basePrice || 0);
    const largePrice = largeVariant ? base + Number(largeVariant.priceDelta || 0) : null;
    const simpleQty = getSimpleItemQty(it.id);

    const addSize = (variant) => {
      if (isDisabled) return;
      if (!sizeOnly) { openAddToCart(it); trackViewItem(it); return; }
      // Same line shape AddToCartModal builds — packaging rides along.
      const pkg = packagingAddonOf(it);
      addLine({
        itemId: it.id,
        itemName: it.name,
        name: it.name,
        basePrice: base,
        variants: variant ? [{ id: variant.id, name: variant.name, priceDelta: Number(variant.priceDelta) || 0 }] : [],
        addons: pkg ? [pkg] : [],
        qty: 1,
      }, { source: 'menu' });
      trackAddToCart(it, 1);
    };

    const circle = 'grid h-11 w-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ht-red transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40';

    // The action cell: + / stepper / sheet opener. Packaging alone is not a
    // customisation — those dishes get +/- (incrementSimpleItem attaches the
    // packaging line), only dishes with real choices open the sheet.
    const action = (() => {
      if (isCustomisable) {
        return (
          <button
            type="button"
            onClick={() => { openAddToCart(it); trackViewItem(it); }}
            className={`${circle} bg-ht-ivory text-ht-red`}
            disabled={isDisabled}
            aria-label={isDisabled ? `${it.name} unavailable` : `Choose options for ${it.name}`}
          >
            <Plus className="h-5 w-5" />
          </button>
        );
      }
      if (simpleQty > 0 && !isDisabled) {
        return (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); decrementSimpleItem(it.id); }}
              className={`${circle} bg-ht-ivory text-ht-red`}
              aria-label={simpleQty === 1 ? `Remove ${it.name}` : `One less ${it.name}`}
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); incrementSimpleItem(it); }}
              className={`${circle} bg-ht-red text-[15px] font-bold text-white`}
              aria-label={`${simpleQty} in bag — add one more ${it.name}`}
            >
              {simpleQty}
            </button>
          </div>
        );
      }
      return (
        <button
          type="button"
          onClick={() => {
            if (!isDisabled) {
              incrementSimpleItem(it, { source: 'menu' });
              trackAddToCart(it, 1);
            }
          }}
          className={`${circle} bg-ht-ivory text-ht-red`}
          disabled={isDisabled}
          aria-label={isDisabled ? `${it.name} unavailable` : `Add ${it.name}`}
        >
          <Plus className="h-5 w-5" />
        </button>
      );
    })();

    return (
      <article
        key={it.id}
        // Scroll anchor for ?highlight=<id>. Only on the main list: the
        // favourites strip renders the same dish again, and querySelector
        // would find that copy pinned near the top instead of the row in the
        // category the customer was sent to.
        data-item={isRecommendedCard ? undefined : it.id}
        className={`menu-row border-b border-ht-ink/15 py-3.5 ${isDisabled ? 'item-disabled' : ''}`}
        style={{ opacity: isDisabled ? 0.6 : 1 }}
      >
        <div className={`flex min-w-0 items-baseline gap-2 ${twoSize ? 'col-span-4' : ''}`}>
          <span className="translate-y-px"><VegDot isVeg={it.isVeg} /></span>
          <h3 className="min-w-0 text-[16px] font-semibold leading-tight">
            {it.name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleFavorite(it.id); }}
              className="-my-2 ml-0.5 inline-grid h-8 w-8 place-items-center align-middle"
              aria-label={isFavorite(it.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                size={14}
                className={isFavorite(it.id) ? 'fill-ht-red text-ht-red' : 'text-ht-mute/50 hover:text-ht-red'}
              />
            </button>
          </h3>
        </div>

        {!twoSize && (
          <>
            <span className="leader" aria-hidden="true" />
            <span className={`whitespace-nowrap text-[16px] font-bold tabular-nums ${isDisabled ? 'line-through' : ''}`}>
              {priceDisplay}
            </span>
            <div className="flex justify-end">{action}</div>
          </>
        )}

        {twoSize && (
          <div className="col-span-4 mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addSize(null)}
              disabled={isDisabled}
              className={`price-chip ${sizeOnly && simpleQty > 0 ? 'is-on' : ''}`}
              aria-label={`${it.name}, regular, ₹${base}`}
            >
              <small>REGULAR</small>
              <b className={isDisabled ? 'line-through' : ''}>₹{base.toFixed(0)}</b>
              {sizeOnly && simpleQty > 0 ? <span className="text-xs font-bold">× {simpleQty}</span> : <Plus className="h-4 w-4 text-ht-red" />}
            </button>
            <button
              type="button"
              onClick={() => addSize(largeVariant)}
              disabled={isDisabled}
              className="price-chip"
              aria-label={`${it.name}, ${largeVariant.name}, ₹${largePrice}`}
            >
              <small>{String(largeVariant.name).toUpperCase()}</small>
              <b className={isDisabled ? 'line-through' : ''}>₹{Number(largePrice).toFixed(0)}</b>
              <Plus className="h-4 w-4 text-ht-red" />
            </button>
          </div>
        )}

        {/* Tags line — its own line under the name, never inside it. The offer
            LABEL comes from the server and the price above stays the list
            price; the saving lands at checkout (one money authority). */}
        {(it.autoOffer || (isCustomisable && !twoSize) || imageUrl) && (
        <div className="row-tags mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {it.autoOffer ? (
            <span
              title={`${it.autoOffer.title} — applied automatically at checkout. Discounted orders are charged 5% GST on top.`}
              className="whitespace-nowrap rounded bg-ht-gold2 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-ht-red2"
            >
              {it.autoOffer.label}
            </span>
          ) : null}
          {isCustomisable && !twoSize && (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-ht-mute">Your way</span>
          )}
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImgModal({ open: true, urls: [imageUrl], name: it.name })}
              className="inline-flex min-h-8 items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[.05em] text-ht-mute hover:text-ht-red"
            >
              <Camera className="h-3.5 w-3.5" /> Photo
            </button>
          )}
        </div>
        )}

        {it.description && (
          <p
            className="row-desc mt-1"
            onClick={
              isTruncated
                ? () =>
                    setDescModal({
                      open: true,
                      title: it.name,
                      description: fullDescription,
                    })
                : undefined
            }
            style={isTruncated ? { cursor: "pointer" } : undefined}
          >
            {fullDescription.slice(0, DESC_MAX)}
            {isTruncated && (
              <span className="not-italic font-sans text-sm font-semibold text-ht-red">… more</span>
            )}
          </p>
        )}

        {/* Dine-in only — explain WHY it can't be added, so it reads as an
            invitation rather than a broken button. */}
        {dineInOnlyBlocked && !it.effectiveDisabled && (
          <p className="col-span-4 mt-1 text-[13px] font-semibold text-ht-gold3">
            Available at the restaurant only
          </p>
        )}

        {isDisabled && it.disabledMessage && (
          <div className="col-span-4 mt-1 flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-ht-red">{it.disabledMessage}</span>
            {it.outOfStock && it.backInStockAt && (
              <span className="text-xs text-ht-mute">
                Back in stock: {new Date(it.backInStockAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
        {isDisabled && simpleQty > 0 && (
          <p className="col-span-4 mt-1 text-sm font-semibold text-ht-red">In your bag, but currently unavailable</p>
        )}
      </article>
    );
  };

  // ========================
  // Loading / Error / Empty
  // ========================
  if (loading) {
    return (
      <div className="menu-loading">
        <div className="spinner" />
        <p>Setting the table…</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="menu-error">
        <p>Could not load the menu. {err}</p>
      </div>
    );
  }

  if (!data || tops.length === 0) {
    return (
      <div className="menu-empty">
        <p>No menu available yet. Check back soon.</p>
      </div>
    );
  }

  // ========================
  // Main Render
  // ========================
  return (
    <div className="menu-page-wrapper">
      <SEOHead
        title="Menu"
        description="Browse our full menu. Veg & non-veg options. Starters, main course, Chinese, Continental, desserts & more. Order now!"
        canonicalPath="/menu"
      />
      {!acceptingOnlineOrders && (
        <div className="sticky top-0 z-[1000] bg-ht-red px-5 py-4 text-center text-white">
          <p className="font-display text-lg leading-tight">Online ordering is paused</p>
          <p className="mt-1 text-sm text-ht-ivory/90">{orderingDisabledMessage}</p>
        </div>
      )}
      <div className="menu-page">
        {/* Offers on this page: the codeless dish offers (each row deep-links
            to its dish) and the live fixed-price bundle. Codes stay on Home
            and in the bag. Both render nothing when nothing is live. */}
        <div className="mx-auto w-full max-w-5xl px-4 empty:hidden">
          <AutoOfferCard />
        </div>
        <OfferTicket surface="menu" allowWelcome={false} className="mx-auto mt-3 w-full max-w-5xl px-4" />

        {/* Search + filter chips — sticky under the header */}
        <div className="menu-sticky" ref={searchBarRef}>
          <div className="mx-auto grid h-full max-w-6xl content-center gap-2.5 px-5 lg:px-8">
            <div className="relative">
              <div className="flex h-12 items-center gap-2.5 rounded-full border-[1.5px] border-ht-ink/15 bg-ht-ivory px-4 focus-within:border-ht-red">
                <Search className="h-[18px] w-[18px] shrink-0 text-ht-mute" />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search the menu — try ‘meifoon’"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      saveRecentSearch(searchQuery);
                      trackSearch(searchQuery.trim());
                      e.target.blur();
                    }
                  }}
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-ht-ink placeholder:text-ht-mute focus:outline-none focus:ring-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="-mr-2 grid h-11 w-11 shrink-0 place-items-center text-ht-mute"
                    aria-label="Clear search"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              {/* Recent searches dropdown */}
              {searchFocused && !searchQuery && recentSearches.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-[14px] border border-ht-ink/15 bg-ht-ivory p-3 shadow-plate">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="kicker">Recent searches</span>
                    <button
                      onClick={() => {
                        setRecentSearches([]);
                        try { localStorage.removeItem('ht_recent_searches'); } catch {}
                      }}
                      className="min-h-9 px-2 text-xs font-semibold text-ht-red"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); setSearchQuery(term); }}
                      className="block min-h-10 w-full rounded px-2 text-left text-sm hover:bg-ht-ink/5"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter chips. "No pork" and "Mild" need a pork / heat flag on
                the menu payload, which it does not carry yet — they appear
                once Ops adds it. */}
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-hide lg:mx-0 lg:px-0">
              {[
                {
                  key: 'mode',
                  on: orderMode === 'dine_in',
                  label: orderMode === 'dine_in' ? 'Dine-in' : orderMode === 'pickup' ? 'Takeaway' : 'Delivery',
                  title: 'Tap to switch: Delivery → Takeaway → Dine-in',
                  onClick: () => updateOrderMode(orderMode === 'delivery' ? 'pickup' : orderMode === 'pickup' ? 'dine_in' : 'delivery'),
                },
                { key: 'veg', on: vegOnly, label: 'Veg only', veg: true, onClick: () => setVegOnly(v => !v) },
                { key: 'cap', on: underCap, label: `Under ₹${PRICE_CHIP_CAP}`, onClick: () => setUnderCap(v => !v) },
              ].map(c => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={c.on}
                  title={c.title}
                  onClick={c.onClick}
                  className={`flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-[13px] font-semibold transition active:scale-95 ${
                    c.on ? 'border-ht-ink bg-ht-ink text-ht-ivory' : 'border-ht-ink/15 bg-ht-ivory text-ht-ink'
                  }`}
                >
                  {c.veg && <VegDot isVeg />}
                  {c.key === 'mode' && orderMode === 'dine_in' && <UtensilsCrossed className="h-3.5 w-3.5" />}
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <div className="mobile-overlay lg:hidden" onClick={closeSidebar} />
        )}

        {/* Main layout */}
        <div className="mx-auto max-w-6xl lg:px-8 lg:pt-6">
          <div className="menu-layout">
            {/* Category list — drawer below lg, column from lg */}
            <aside className={`categories-sidebar ${sidebarOpen ? "open" : ""}`}>
              <div className="sidebar-sticky">
                {/* Jump to search. Drawer only: from lg the search bar is
                    already on screen beside the list. */}
                <button
                  type="button"
                  className="sidebar-search-btn mb-4 flex h-12 w-full items-center gap-2.5 rounded-full border-[1.5px] border-ht-ink/15 bg-ht-paper px-4 text-[15px] text-ht-mute"
                  onClick={focusSearchFromSidebar}
                >
                  <Search size={16} />
                  <span>Search the menu</span>
                </button>

                <p className="kicker mb-2">The menu</p>
                <nav className="flex flex-col">
                  {tops.map((tc, i) => (
                    <button
                      key={tc.id}
                      className={`flex min-h-11 items-baseline gap-3 border-b border-ht-ink/10 py-2 text-left text-[15px] font-semibold transition ${
                        tc.id === activeTop ? 'text-ht-red' : 'text-ht-ink hover:text-ht-red'
                      } ${tc.isDisabled ? 'line-through opacity-50' : ''}`}
                      onClick={() =>
                        handleCategoryClick(tc.id, tc.subcategories?.[0]?.id)
                      }
                    >
                      <span className="w-6 shrink-0 font-mono text-[11px] font-medium text-ht-gold3">{String(i + 1).padStart(2, '0')}</span>
                      <span>{tc.name}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Right Pane */}
            <div className="min-w-0" ref={rightPaneRef}>
              <section>
                {/* Category tabs — the sections of the open category. Hidden
                    during search, which spans every category. */}
                {!searchQuery && (
                  <nav className="menu-tabs" aria-label="Sections">
                    <div className="flex h-full gap-6 overflow-x-auto px-5 scrollbar-hide lg:px-0">
                      {filteredSubs.map((sc) => (
                        <button
                          key={sc.id}
                          id={`pill-${sc.id}`}
                          className={`flex h-full flex-none items-center whitespace-nowrap border-b-[3px] font-mono text-xs font-semibold uppercase tracking-[.1em] transition ${
                            sc.id === activeSub ? 'border-ht-red text-ht-red' : 'border-transparent text-ht-mute hover:text-ht-ink'
                          }`}
                          onClick={() => scrollToSub(sc.id)}
                        >
                          {sc.name}
                        </button>
                      ))}
                    </div>
                  </nav>
                )}

                <div className="px-5 lg:px-0">
                {/* Favorites — hidden during search */}
                {!searchQuery && favoriteItems.length > 0 && (
                  <div className="pt-5">
                    <p className="kicker flex items-center gap-1.5"><Heart size={12} className="fill-ht-red text-ht-red" /> Your favourites</p>
                    <div>
                      {favoriteItems.map((it) => (
                        <MenuItemCard key={`fav-${it.id}`} it={it} isRecommendedCard={true} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Make Your Meal */}
                {!searchQuery && (
                  <button className="myom-entry-btn mt-5" onClick={() => setShowMealModal(true)}>
                    <Sparkles size={22} className="myom-entry-icon" />
                    <span className="myom-entry-text">
                      <span className="myom-entry-title">Make Your Meal</span>
                      <span className="myom-entry-sub">Tell us how many people — we'll suggest the perfect order</span>
                    </span>
                    <ChevronRight size={18} className="myom-entry-arrow" />
                  </button>
                )}

                {/* Dine-in mode note */}
                {orderMode === 'dine_in' && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-ht-gold2 px-4 py-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ht-red2">
                      <UtensilsCrossed className="h-4 w-4 shrink-0" />
                      <span className="truncate">Dine-in — no packaging charge</span>
                    </span>
                    <button
                      onClick={() => updateOrderMode('delivery')}
                      className="min-h-11 shrink-0 px-1 text-xs font-bold text-ht-red"
                    >
                      Switch
                    </button>
                  </div>
                )}

                {/* Sections */}
                {filteredSubs.length > 0 ? (
                  <>
                    {searchQuery && (
                      <p className="pt-5 font-mono text-xs font-semibold uppercase tracking-[.08em] text-ht-mute" ref={searchResultsRef}>
                        {globalSearchResults?.reduce((sum, r) => sum + r.items.length, 0) || 0} dish
                        {(globalSearchResults?.reduce((sum, r) => sum + r.items.length, 0) || 0) !== 1 ? 'es' : ''} in{' '}
                        {filteredItemsBySub.size} {filteredItemsBySub.size === 1 ? 'section' : 'sections'}
                      </p>
                    )}
                    {(searchQuery
                      ? (globalSearchResults || []).map(r => ({ sc: r.subCategory, tc: r.topCategory }))
                      : filteredSubs.map(sc => ({ sc, tc: tops.find(t => t.id === activeTop) }))
                    ).map(({ sc, tc }, idx) => {
                      const topIndex = tc ? tops.findIndex(t => t.id === tc.id) : -1;
                      return (
                        <div key={sc.id} data-sub={sc.id} className="menu-section pt-7">
                          <p className="font-mono text-xs font-medium uppercase tracking-[.14em] text-ht-gold3">
                            {String((searchQuery ? idx : topIndex) + 1).padStart(2, '0')}
                            {tc ? ` · ${tc.name}` : ''}
                          </p>
                          <h2 className={`mb-1 mt-1.5 font-display text-[28px] leading-none ${sc.isDisabled ? 'line-through opacity-50' : ''}`}>
                            {sc.name}
                          </h2>
                          {sc.isDisabled && (
                            <p className="text-sm font-semibold text-ht-red">Temporarily unavailable</p>
                          )}
                          <div className="mt-2">
                            {(filteredItemsBySub.get(sc.id) || []).map((it) => (
                              <MenuItemCard key={it.id} it={it} isRecommendedCard={false} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : searchQuery ? (
                  <div className="py-12 text-center">
                    <Search size={40} className="mx-auto text-ht-mute/60" />
                    <h3 className="mt-3 font-display text-xl">Nothing called &ldquo;{searchQuery}&rdquo;</h3>
                    <p className="mt-1 font-serif text-lg italic text-ht-mute">try a section instead</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {tops.slice(0, 5).map(t => (
                        <button
                          key={t.id}
                          onClick={() => handleCategoryClick(t.id, t.subcategories?.[0]?.id)}
                          className="h-10 whitespace-nowrap rounded-full border-[1.5px] border-ht-ink/15 bg-ht-ivory px-3.5 text-sm font-semibold"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (vegOnly || underCap) ? (
                  <div className="py-12 text-center">
                    <h3 className="font-display text-xl">Nothing here with those filters</h3>
                    <p className="mt-1 font-serif text-lg italic text-ht-mute">try another section, or clear them</p>
                    <button
                      onClick={() => { setVegOnly(false); setUnderCap(false); }}
                      className="mt-4 h-11 rounded-full bg-ht-red px-5 text-sm font-bold text-white"
                    >
                      Show every dish
                    </button>
                  </div>
                ) : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Cart Bar */}
      <FloatingCartBar />

      {/* Global Image Modal */}
      <ImageModal
        open={imgModal.open}
        urls={imgModal.urls || []}
        name={imgModal.name}
        onClose={() => setImgModal({ open: false, urls: [], name: "" })}
      />

      {/* Global Description Modal */}
      <DescriptionModal
        open={descModal.open}
        title={descModal.title}
        description={descModal.description}
        onClose={() =>
          setDescModal({ open: false, title: "", description: "" })
        }
      />

      {/* Make Your Meal Modal */}
      <MakeYourMealModal
        isOpen={showMealModal}
        onClose={() => setShowMealModal(false)}
        recommendedItems={recommendedItems}
        customerPhone={customer?.phone || null}
      />

      {/* Add to Cart Modal */}
      {showAddToCartModal && selectedItem && (
        <AddToCartModal
          item={selectedItem}
          isOpen={showAddToCartModal}
          isDineIn={orderMode === 'dine_in'}
          pushHistory={!modalFromHighlight}
          onClose={() => {
            setShowAddToCartModal(false);
            setSelectedItem(null);
            setModalFromHighlight(false);
          }}
          onAdd={(lineItem, opts) => {
            addLine(lineItem, opts);
            setShowAddToCartModal(false);
            
            // Show success
            setAddedItems(prev => {
              const next = new Set(prev);
              next.add(selectedItem.id);
              return next;
            });
            setTimeout(() => {
              setAddedItems(prev => {
                const next = new Set(prev);
                next.delete(selectedItem.id);
                return next;
              });
            }, 2000);
            
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}

function formatPriceDelta(v) {
  const n = Number(v || 0);
  if (!n) return null;
  const sign = n >= 0 ? "+" : "";
  return (
    <span className="option-price-delta">
      {sign}₹{Math.abs(n).toFixed(0)}
    </span>
  );
}