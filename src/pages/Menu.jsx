// File: site/src/pages/Menu.jsx

import { useEffect, useMemo, useState, useRef } from "react";
import "./Menu.css";
import { useCart } from "../context/CartContext";
import { ShoppingCart, Plus, Check, Tag, Sparkles, Search, X, Heart } from "lucide-react";
import AddToCartModal from "../components/AddToCartModal";
import FloatingCartBar from "../components/FloatingCartBar";
import VegDot from "../components/VegDot";
import { useMenuCategory } from '../context/MenuCategoryContext';
import { useFavorites } from '../context/FavoritesContext';
import SEOHead from '../components/SEOHead';
import KitchenStatus from '../components/KitchenStatus';

import API_BASE from "../config/api";

// Description length limits
const DESC_MAX_RECOMMENDED = 40;  // compact cards - carousel
const DESC_MAX_REGULAR = 100;     // regular items

// ========================
// Description Modal
// ========================
function DescriptionModal({ open, title, description, onClose }) {
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
    <div style={backdrop} onClick={onClose}>
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
          <button style={closeBtn} onClick={onClose}>
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
     decrementSimpleItem 
   } = useCart();
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);

  const [activeTop, setActiveTop] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const { sidebarOpen, setSidebarOpen } = useMenuCategory();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
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
    try { return localStorage.getItem('ht_veg_only') === '1'; }
    catch { return false; }
  });

  // Active Offers State
  const [activeOffers, setActiveOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);

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
    try { localStorage.setItem('ht_veg_only', vegOnly ? '1' : '0'); }
    catch {}
  }, [vegOnly]);

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

  const openAddToCart = (item) => {
    setSelectedItem(item);
    setShowAddToCartModal(true);
  };
  const closeAddToCart = () => {
    setSelectedItem(null);
    setShowAddToCartModal(false);
  };

  const rightPaneRef = useRef(null);
  const searchResultsRef = useRef(null);

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
        // Extract global ordering status
        setAcceptingOnlineOrders(json.acceptingOnlineOrders !== false);
        setOrderingDisabledMessage(json.onlineOrdersDisabledMessage || "");

        const t0 = json?.topCategories?.[0]?.id ?? null;
        const s0 = json?.topCategories?.[0]?.subcategories?.[0]?.id ?? null;
        setActiveTop(t0);
        setActiveSub(s0);
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

  const tops = data?.topCategories || [];

  // Fetch active offers
  useEffect(() => {
    fetchActiveOffers();
  }, []);

  const fetchActiveOffers = async () => {
    try {
      const response = await fetch(`${API_BASE}/offers/active`);
      if (!response.ok) throw new Error('Failed to fetch offers');
      
      const data = await response.json();
      const offers = data.offers || [];
      
      setActiveOffers(offers);
      
      const autoOffer = offers.find(o => o.apply_automatically);
      if (autoOffer) {
        setAppliedOffer(autoOffer);
      }
    } catch (err) {
      console.error('[Menu] Error fetching offers:', err);
    }
  };

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

  // Global search across ALL categories
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    const results = [];
    
    // Search through ALL top categories and their subcategories
    tops.forEach((topCat) => {
      topCat.subcategories?.forEach((subCat) => {
        const items = subCat.items || [];

        // Match item name, category name, or subcategory name
        const catMatch = topCat.name?.toLowerCase().includes(query);
        const subMatch = subCat.name?.toLowerCase().includes(query);
        const matched = (catMatch || subMatch)
          ? items  // all items if category/subcategory matches
          : items.filter(item => item.name?.toLowerCase().includes(query));

        // Only add subcategory if it has matching items
        if (matched.length > 0) {
          results.push({
            topCategory: topCat,
            subCategory: subCat,
            items: matched
          });
        }
      });
    });
    
    return results;
  }, [tops, searchQuery]);

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

    if (!vegOnly) return base;

    // Apply veg filter
    const filtered = new Map();
    base.forEach((items, subId) => {
      const vegItems = items.filter(it => it.isVeg === true);
      if (vegItems.length > 0) filtered.set(subId, vegItems);
    });
    return filtered;
  }, [itemsBySub, searchQuery, globalSearchResults, vegOnly]);

  // Filtered subcategories (also filtered by veg if active)
  const filteredSubs = useMemo(() => {
    let result;
    if (searchQuery.trim()) {
      result = globalSearchResults?.map(r => r.subCategory) || [];
    } else {
      result = subs;
    }
    // When veg filter is active, only show subcategories that have veg items
    if (vegOnly) {
      return result.filter(sc => filteredItemsBySub.has(sc.id));
    }
    return result;
  }, [subs, searchQuery, globalSearchResults, vegOnly, filteredItemsBySub]);

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
      // Calculate offset for sticky subcategory bar + search bar
      const subcategoryBarHeight = 60; // Approximate height of subcategory bar
      const searchBarHeight = 80; // Approximate height of search bar
      const totalOffset = subcategoryBarHeight + searchBarHeight + 10; // 10px extra padding
      
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - totalOffset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleCategoryClick = (tcId, firstSubId) => {
    setActiveTop(tcId);
    setActiveSub(firstSubId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
    
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
    const hasVariants = hasVariantsOrAddons(it, "variant");
    const hasAddons = hasVariantsOrAddons(it, "addon");

    const DESC_MAX = isRecommendedCard
      ? DESC_MAX_RECOMMENDED
      : DESC_MAX_REGULAR;

    const fullDescription = String(it.description || "");
    const isTruncated = fullDescription.length > DESC_MAX;

    // Use ONLY the API-provided imageUrl (already normalized on the server)
    const imageUrl = it.imageUrl || null;

    // Check if item is disabled
    const isDisabled = !acceptingOnlineOrders || it.effectiveDisabled;
    
    // Price display: show range for items with variants
    const priceDisplay = (() => {
      const base = Number(it.basePrice || 0);
      if (!hasVariants) return `₹${base.toFixed(0)}`;
      // "From ₹XX" for items with variants
      return `From ₹${base.toFixed(0)}`;
    })();

    return (
      <article
        key={it.id}
        className={`${isRecommendedCard ? "recommended-item-card" : "menu-item-card"} ${isDisabled ? "item-disabled" : ""}`}
        style={{
          opacity: isDisabled ? 0.6 : 1,
          filter: isDisabled ? 'grayscale(0.5)' : 'none',
          pointerEvents: isDisabled ? 'none' : 'auto'
        }}
      >
        {/* Bestseller badge + Favorite heart */}
        <div className="flex items-center justify-between mb-1">
          {it.isBestseller ? (
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded">
              Bestseller
            </span>
          ) : <span />}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(it.id); }}
            className="p-1 -mr-1 transition-colors"
            aria-label={isFavorite(it.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              size={18}
              className={isFavorite(it.id) ? 'text-red-500 fill-red-500' : 'text-neutral-500 hover:text-red-400'}
            />
          </button>
        </div>

        {/* Inline thumbnail + content row */}
        {!isRecommendedCard && imageUrl && (
          <div className="flex gap-3 mb-2">
            <img
              src={imageUrl}
              alt={it.name}
              width={80}
              height={80}
              loading="lazy"
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0 cursor-pointer"
              onClick={() => setImgModal({ open: true, urls: [imageUrl], name: it.name })}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <VegDot isVeg={it.isVeg} />
                <h3 className="item-name">{it.name}</h3>
              </div>
              <span
                className={`item-price ${isRecommendedCard ? "item-price-large" : ""}`}
                style={{
                  textDecoration: isDisabled ? 'line-through' : 'none',
                  color: isDisabled ? '#999' : '',
                  fontSize: hasVariants ? '0.875rem' : undefined
                }}
              >
                {priceDisplay}
              </span>
              {(hasVariants || hasAddons) && (
                <span className="block text-xs text-neutral-400 mt-0.5">Customisable</span>
              )}
            </div>
          </div>
        )}

        {/* Original header for cards without thumbnail or recommended cards */}
        {(isRecommendedCard || !imageUrl) && (
          <div className="item-header">
            <div className="item-name-wrapper">
              <div className="flex items-center gap-1.5">
                <VegDot isVeg={it.isVeg} />
                <h3 className="item-name">{it.name}</h3>
              </div>
            </div>
            <span
              className={`item-price ${isRecommendedCard ? "item-price-large" : ""}`}
              style={{
                textDecoration: isDisabled ? 'line-through' : 'none',
                color: isDisabled ? '#999' : '',
                fontSize: hasVariants ? '0.875rem' : undefined
              }}
            >
              {priceDisplay}
            </span>
          </div>
        )}
        {(isRecommendedCard || !imageUrl) && (hasVariants || hasAddons) && (
          <span className="block text-xs text-neutral-400 mb-1">Customisable</span>
        )}

        {it.description && (
          <p
            className="item-description"
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
              <span className="read-more-inline">… Read more</span>
            )}
          </p>
        )}

        {/* Disabled Message */}
        {isDisabled && it.disabledMessage && (
          <div style={{
            color: '#ef4444',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>⚠️</span>
            <span>{it.disabledMessage}</span>
          </div>
        )}

        <div className="item-actions">
          {imageUrl && isRecommendedCard && (
            <button
              className="view-image-btn"
              onClick={() =>
                setImgModal({
                  open: true,
                  urls: [imageUrl],
                  name: it.name,
                })
              }
            >
              🖼️ View Image
            </button>
          )}

          {/* ✅ NEW: Quantity Controls or Add to Cart Button */}
          {(() => {
            const hasOptions = hasVariantsOrAddons(it, 'variant') || hasVariantsOrAddons(it, 'addon');
            
            // If item has variants/addons, always show "Customize" button
            if (hasOptions) {
              return (
                <button
                  onClick={() => {
                    setSelectedItem(it);
                    setShowAddToCartModal(true);
                  }}
                  className="add-to-cart-btn"
                  disabled={isDisabled}
                  style={{ opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                >
                  <Plus className="btn-icon" /> {isDisabled ? 'Unavailable' : 'Customize & Add'}
                </button>
              );
            }
            
            // For simple items (no variants/addons), check if already in cart
            const currentQty = getSimpleItemQty(it.id);
            
            if (currentQty > 0 && !isDisabled) {
              // Item is in cart - show quantity controls (only if not disabled)
              return (
                <div className="quantity-control">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      decrementSimpleItem(it.id);
                    }}
                    className={`quantity-btn ${currentQty === 1 ? 'remove-indicator' : ''}`}
                    aria-label={currentQty === 1 ? 'Remove from cart' : 'Decrease quantity'}
                  >
                    −
                  </button>
                  
                  <div className="quantity-display">
                    <ShoppingCart className="cart-icon" />
                    <span>{currentQty}</span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      incrementSimpleItem(it);
                    }}
                    className="quantity-btn"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              );
            }
            
            // If item is disabled but was in cart, show unavailable message
            if (currentQty > 0 && isDisabled) {
              return (
                <div style={{
                  padding: '8px 16px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  Currently Unavailable
                </div>
              );
            }
            
            // Item not in cart - show Add to Cart button
            return (
              <button
                onClick={() => {
                  if (!isDisabled) {
                    incrementSimpleItem(it);
                  }
                }}
                className="add-to-cart-btn"
                disabled={isDisabled}
                style={{ 
                  opacity: isDisabled ? 0.5 : 1, 
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  backgroundColor: isDisabled ? '#9ca3af' : ''
                }}
              >
                <ShoppingCart className="btn-icon" /> {isDisabled ? 'Unavailable' : 'Add to Cart'}
              </button>
            );
          })()}
        </div>

        {isRecommendedCard && (
          <div className="recommended-badge-bottom">
            <span className="star-badge">⭐ RECOMMENDED</span>
          </div>
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
        <p>Loading our delicious menu...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="menu-error">
        <p>😔 Failed to load menu. {err}</p>
      </div>
    );
  }

  if (!data || tops.length === 0) {
    return (
      <div className="menu-empty">
        <p>🍽️ No menu available yet. Check back soon!</p>
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
      {/* ================================================ */}
      {/* GLOBAL ORDERING DISABLED BANNER */}
      {/* ================================================ */}
      {!acceptingOnlineOrders && (
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          borderBottom: '3px solid #7f1d1d',
          padding: '20px',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '32px' }}>🛑</span>
            <div style={{ textAlign: 'left', flex: '1', minWidth: '250px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: 'white',
                marginBottom: '8px'
              }}>
                Online Ordering Currently Unavailable
              </h3>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)',
                fontSize: '16px',
                margin: 0
              }}>
                {orderingDisabledMessage}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="menu-page">
        {/* Kitchen Status */}
        <div className="flex justify-center py-2">
          <KitchenStatus />
        </div>

        {/* Hero */}
        <div className="menu-hero menu-hero-mobile-compact">
          <div className="hero-grid">
            <div className="hero-image-wrapper hero-black-bg">
              <div className="hero-content-overlay">
                <h1 className="hero-title">Our Menu</h1>
                <p className="hero-subtitle">
                  Crafted with passion, served with love
                </p>
              </div>
            </div>
            <div className="hero-image-wrapper">
              <img
                src="/images/menu/menu-hero-2.jpg"
                alt="Hungry Times"
                className="hero-image"
                loading="eager"
              />
              <div className="hero-content-overlay">
                <div className="hero-cta">
                  <p className="cta-text">Order Online Now!</p>
                  
                  {/* Primary CTA - Start Order */}
                  <button
                    onClick={() => {
                      // Scroll to first menu section
                      const firstSection = rightPaneRef.current?.querySelector('[data-sub]');
                      if (firstSection) {
                        firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="cta-button cta-button-primary"
                  >
                    🛒 Start Your Order
                  </button>
                  
                  {/* Secondary CTAs - Call & WhatsApp */}
                  <div className="cta-secondary-group">
                    <a href="tel:+918420822919" className="cta-button cta-button-secondary">
                      📞 Call
                    </a>
                    <a
                      href="https://wa.me/918420822919"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cta-button cta-button-secondary cta-button-whatsapp-secondary"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🔍 SEARCH BAR */}
        <div className="search-bar-container">
          <div className="search-bar">
            <div></div> {/* Empty spacer for sidebar column */}
            <div className="search-bar-input-wrapper relative">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search menu items or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    saveRecentSearch(searchQuery);
                    e.target.blur();
                  }
                }}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="search-clear"
                  aria-label="Clear search"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            {/* Recent searches dropdown */}
            {searchFocused && !searchQuery && recentSearches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl shadow-lg z-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400 font-medium">Recent Searches</span>
                  <button
                    onClick={() => {
                      setRecentSearches([]);
                      try { localStorage.removeItem('ht_recent_searches'); } catch {}
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-300"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => { e.preventDefault(); setSearchQuery(term); }}
                    className="block w-full text-left px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 rounded"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🎉 OFFERS BANNER */}
        {appliedOffer && (
          <div className="offers-banner-container">
            <div className="offers-banner">
              <div className="offers-banner-icon">
                <Sparkles className="sparkle-icon" />
              </div>
              <div className="offers-banner-content">
                <h3 className="offers-banner-title">{appliedOffer.title}</h3>
                <p className="offers-banner-description">{appliedOffer.description}</p>
                {appliedOffer.valid_till && (
                  <p className="offers-banner-validity">
                    Valid till: {new Date(appliedOffer.valid_till).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                )}
              </div>
              <div className="offers-banner-badge">
                <div className="offers-badge-content">
                  <span className="offers-badge-value">
                    {appliedOffer.discount_value}{appliedOffer.discount_type === 'percent' ? '%' : '₹'}
                  </span>
                  <span className="offers-badge-label">OFF</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overlay */}
        {sidebarOpen && (
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main layout */}
        <div className="menu-container">
          <div className="menu-layout">
            {/* Sidebar */}
            <aside className={`categories-sidebar ${sidebarOpen ? "open" : ""}`}>
              <div className="sidebar-sticky">
                <h3 className="sidebar-heading">Categories</h3>
                <nav className="sidebar-category-list">
                  {tops.map((tc) => (
                    <button
                      key={tc.id}
                      className={`sidebar-category-btn ${
                        tc.id === activeTop ? "active" : ""
                      } ${tc.isDisabled ? "disabled-category" : ""}`}
                      onClick={() =>
                        handleCategoryClick(tc.id, tc.subcategories?.[0]?.id)
                      }
                      style={{
                        opacity: tc.isDisabled ? 0.5 : 1,
                        textDecoration: tc.isDisabled ? 'line-through' : 'none'
                      }}
                    >
                      {tc.isDisabled && '🚫 '}{tc.name}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Right Pane */}
            <div className="menu-main" ref={rightPaneRef}>
              <section>
                {/* Favorites Section - Hidden during search */}
                {!searchQuery && favoriteItems.length > 0 && (
                  <div className="recommended-section" style={{ borderBottom: '1px solid #333', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div className="recommended-header">
                      <Heart size={20} className="text-red-500 fill-red-500" />
                      <h2 className="recommended-title">Your Favorites</h2>
                      <Heart size={20} className="text-red-500 fill-red-500" />
                    </div>
                    <div className="recommended-items-grid-wrapper">
                      <div className="recommended-items-grid">
                        {favoriteItems.map((it) => (
                          <MenuItemCard key={`fav-${it.id}`} it={it} isRecommendedCard={true} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommended Section - Hidden during search */}
                {!searchQuery && recommendedItems.length > 0 && (
                  <div className="recommended-section">
                    <div className="recommended-header">
                      <span className="star-icon">⭐</span>
                      <h2 className="recommended-title">
                        Chef&apos;s Recommendations
                      </h2>
                      <span className="star-icon">⭐</span>
                    </div>
                    <div className="recommended-items-grid-wrapper">
                    <div className="recommended-items-grid">
                      {recommendedItems.map((it) => (
                        <MenuItemCard
                          key={it.id}
                          it={it}
                          isRecommendedCard={true}
                        />
                      ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subcategory Navigation - Sticky after recommendations, hidden during search */}
                {!searchQuery && (
                  <nav className="subcategory-bar">
                    <div className="subcategory-scroll">
                      {/* Veg filter toggle */}
                      <button
                        className={`subcategory-btn flex items-center gap-1.5 ${vegOnly ? 'active' : ''}`}
                        onClick={() => setVegOnly(v => !v)}
                        style={vegOnly ? {
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          borderColor: '#22c55e',
                          boxShadow: '0 0 12px rgba(34,197,94,0.5)'
                        } : {}}
                      >
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-green-500 rounded-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        </span>
                        Veg
                      </button>
                      {filteredSubs.map((sc) => (
                        <button
                          key={sc.id}
                          id={`pill-${sc.id}`}
                          className={`subcategory-btn ${
                            sc.id === activeSub ? "active" : ""
                          }`}
                          onClick={() => scrollToSub(sc.id)}
                        >
                          {sc.name}
                        </button>
                      ))}
                    </div>
                  </nav>
                )}

                {/* Regular sections */}
                {filteredSubs.length > 0 ? (
                  <>
                    {searchQuery && (
                      <div className="search-results-header" ref={searchResultsRef}>
                        <p>
                          Found {globalSearchResults?.reduce((sum, r) => sum + r.items.length, 0) || 0} item
                          {(globalSearchResults?.reduce((sum, r) => sum + r.items.length, 0) || 0) !== 1 ? 's' : ''} across{' '}
                          {filteredItemsBySub.size} {filteredItemsBySub.size === 1 ? 'category' : 'categories'}
                        </p>
                      </div>
                    )}
                    {searchQuery ? (
                      // Search results with category context
                      globalSearchResults?.map((result) => (
                        <div key={result.subCategory.id} data-sub={result.subCategory.id} className="menu-section">
                          <div className="section-title-with-breadcrumb">
                            <span 
                              className="category-breadcrumb"
                              style={{
                                opacity: result.topCategory.isDisabled ? 0.5 : 1,
                                textDecoration: result.topCategory.isDisabled ? 'line-through' : 'none'
                              }}
                            >
                              {result.topCategory.isDisabled && '🚫 '}{result.topCategory.name}
                            </span>
                            <h2 
                              className="section-title"
                              style={{
                                opacity: result.subCategory.isDisabled ? 0.5 : 1,
                                textDecoration: result.subCategory.isDisabled ? 'line-through' : 'none',
                                color: result.subCategory.isDisabled ? '#999' : ''
                              }}
                            >
                              {result.subCategory.isDisabled && '🚫 '}{result.subCategory.name}
                            </h2>
                          </div>
                          <div className="items-grid">
                            {result.items.map((it) => (
                              <MenuItemCard
                                key={it.id}
                                it={it}
                                isRecommendedCard={false}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      // Normal view - current category only
                      filteredSubs.map((sc) => (
                        <div key={sc.id} data-sub={sc.id} className="menu-section">
                          <h2 
                            className="section-title" 
                            style={{
                              opacity: sc.isDisabled ? 0.5 : 1,
                              textDecoration: sc.isDisabled ? 'line-through' : 'none',
                              color: sc.isDisabled ? '#999' : ''
                            }}
                          >
                            {sc.isDisabled && '🚫 '}{sc.name}
                            {sc.isDisabled && (
                              <span style={{
                                marginLeft: '12px',
                                fontSize: '0.875rem',
                                color: '#ef4444',
                                fontWeight: 600
                              }}>
                                (Temporarily Unavailable)
                              </span>
                            )}
                          </h2>
                          <div className="items-grid">
                            {(filteredItemsBySub.get(sc.id) || []).map((it) => (
                              <MenuItemCard
                                key={it.id}
                                it={it}
                                isRecommendedCard={false}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                ) : searchQuery ? (
                  <div className="search-empty-state">
                    <Search size={48} />
                    <h3>No items found for "{searchQuery}"</h3>
                    <p>Try browsing categories below</p>
                    <div className="flex flex-wrap gap-2 mt-3 justify-center">
                      {tops.slice(0, 5).map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setSearchQuery(''); setActiveTop(t.id); }}
                          className="px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-300 border border-neutral-700"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : vegOnly ? (
                  <div className="search-empty-state">
                    <span className="inline-flex items-center justify-center w-12 h-12 border-2 border-green-500 rounded-lg mb-2">
                      <span className="w-5 h-5 rounded-full bg-green-500" />
                    </span>
                    <h3>No veg items found in this category</h3>
                    <p>Try another category or turn off the veg filter</p>
                    <button
                      onClick={() => setVegOnly(false)}
                      className="mt-3 px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-300 border border-neutral-700"
                    >
                      Show all items
                    </button>
                  </div>
                ) : null}
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

      {/* Add to Cart Modal */}
      {showAddToCartModal && selectedItem && (
        <AddToCartModal
          item={selectedItem}
          isOpen={showAddToCartModal}
          onClose={() => {
            setShowAddToCartModal(false);
            setSelectedItem(null);
          }}
          onAdd={(lineItem) => {
            addLine(lineItem);
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