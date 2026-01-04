// File: site/src/pages/Menu.jsx

import { useEffect, useMemo, useState, useRef } from "react";
import "./Menu.css";
import { useCart } from "../context/CartContext";
import { ShoppingCart, Plus, Check, Tag, Sparkles, Search, X } from "lucide-react";
import AddToCartModal from "../components/AddToCartModal";
import { useMenuCategory } from '../context/MenuCategoryContext';

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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Active Offers State
  const [activeOffers, setActiveOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);

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
        
        // FIXED: Only include items where the ITEM NAME matches the query
        const matched = items.filter(item => {
          return item.name?.toLowerCase().includes(query);
        });
        
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
  const filteredItemsBySub = useMemo(() => {
    if (!searchQuery.trim()) return itemsBySub;
    
    // Convert global search results to Map format
    const filtered = new Map();
    globalSearchResults?.forEach(result => {
      filtered.set(result.subCategory.id, result.items);
    });
    
    return filtered;
  }, [itemsBySub, searchQuery, globalSearchResults]);

  // Filtered subcategories
  const filteredSubs = useMemo(() => {
    if (!searchQuery.trim()) return subs;
    
    // When searching, return subcategories from global search results
    return globalSearchResults?.map(result => result.subCategory) || [];
  }, [subs, searchQuery, globalSearchResults]);

  // Auto-scroll to search results when search query changes
  useEffect(() => {
    if (!searchQuery || !searchResultsRef.current) return;
    
    // Debounce: only scroll after user stops typing for 700ms
    const timeoutId = setTimeout(() => {
      searchResultsRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 700);
    
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

  const scrollToSub = (subId) => {
    setActiveSub(subId);
    const el = rightPaneRef.current?.querySelector(`[data-sub="${subId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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

    return (
      <article
        key={it.id}
        className={isRecommendedCard ? "recommended-item-card" : "menu-item-card"}
      >
        <div className="item-header">
          <div className="item-name-wrapper">
            <h3 className="item-name">{it.name}</h3>
          </div>
          <span
            className={`item-price ${
              isRecommendedCard ? "item-price-large" : ""
            }`}
          >
            ₹{Number(it.basePrice || 0).toFixed(0)}
          </span>
        </div>

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

        <div className="item-actions">
          {imageUrl && (
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
                >
                  <Plus className="btn-icon" /> Customize & Add
                </button>
              );
            }
            
            // For simple items (no variants/addons), check if already in cart
            const currentQty = getSimpleItemQty(it.id);
            
            if (currentQty > 0) {
              // Item is in cart - show quantity controls
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
            
            // Item not in cart - show Add to Cart button
            return (
              <button
                onClick={() => {
                  incrementSimpleItem(it);
                }}
                className="add-to-cart-btn"
              >
                <ShoppingCart className="btn-icon" /> Add to Cart
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
      <div className="menu-page">
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
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search menu items or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                      }`}
                      onClick={() =>
                        handleCategoryClick(tc.id, tc.subcategories?.[0]?.id)
                      }
                    >
                      {tc.name}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Right Pane */}
            <div className="menu-main" ref={rightPaneRef}>
              <section>
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

                {/* Subcategory Navigation */}
                <nav className="subcategory-bar">
                  <div className="subcategory-scroll">
                    {filteredSubs.map((sc) => (
                      <button
                        key={sc.id}
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
                            <span className="category-breadcrumb">{result.topCategory.name}</span>
                            <h2 className="section-title">{result.subCategory.name}</h2>
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
                          <h2 className="section-title">{sc.name}</h2>
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
                    <h3>No items found</h3>
                    <p>Try searching for something else</p>
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </div>
      </div>

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