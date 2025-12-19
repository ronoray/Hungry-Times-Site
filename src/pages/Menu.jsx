// File: site/src/pages/Menu.jsx

import { useEffect, useMemo, useState, useRef } from "react";
import "./Menu.css";
import { useCart } from "../context/CartContext";
import { ShoppingCart, Plus, Check } from "lucide-react";
import AddToCartModal from "../components/AddToCartModal";

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
  const { addLine } = useCart();
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [addedItems, setAddedItems] = useState(new Set());

  const [activeTop, setActiveTop] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const subs = useMemo(() => {
    const t = tops.find((x) => x.id === activeTop);
    return t?.subcategories || [];
  }, [tops, activeTop]);

  const itemsBySub = useMemo(() => {
    const map = new Map();
    subs.forEach((sc) => map.set(sc.id, sc.items || []));
    return map;
  }, [subs]);

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

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleCategoryClick = (tcId, firstSubId) => {
    setActiveTop(tcId);
    setActiveSub(firstSubId);
    setSidebarOpen(false); // close sidebar on mobile
    
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
  // Card component
  // ========================
  const MenuItemCard = ({ it, isRecommendedCard = false }) => {
    const hasVariants = hasVariantsOrAddons(it, "variant");
    const hasAddons = hasVariantsOrAddons(it, "addon");
    const isExpanded = expandedItems.has(it.id);
    const showExpandBtn = hasVariants || hasAddons;

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
                  // If server returns absolute URL, use as-is; if server returns a root path, keep it.
                  urls: [imageUrl],
                  name: it.name,
                })
              }
            >
              🖼️ View Image
            </button>
          )}

          {/* No options toggle on compact recommended cards */}
          {showExpandBtn && !isRecommendedCard && (
            <button
              className="expand-btn"
              onClick={() => toggleExpand(it.id)}
            >
              {isExpanded ? "− Hide Options" : "+ View Options"}
            </button>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={() => {
            const hasOptions = hasVariantsOrAddons(it, 'variant') || hasVariantsOrAddons(it, 'addon');
            
            if (hasOptions) {
              // Open modal for items with variants/addons
              setSelectedItem(it);
              setShowAddToCartModal(true);
            } else {
              // Add directly for simple items
              addLine({
                itemId: it.id,
                name: it.name,
                basePrice: parseFloat(it.basePrice || 0),
                variant: null,
                addons: [],
                qty: 1
              });
              
              // Show success feedback
              setAddedItems(prev => {
                const next = new Set(prev);
                next.add(it.id);
                return next;
              });
              setTimeout(() => {
                setAddedItems(prev => {
                  const next = new Set(prev);
                  next.delete(it.id);
                  return next;
                });
              }, 2000);
            }
          }}
          className={`add-to-cart-btn ${addedItems.has(it.id) ? 'added' : ''}`}
        >
          {addedItems.has(it.id) ? (
            <>
              <Check className="btn-icon" /> Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart className="btn-icon" /> Add to Cart
            </>
          )}
        </button>

        {isRecommendedCard && (
          <div className="recommended-badge-bottom">
            <span className="star-badge">⭐ RECOMMENDED</span>
          </div>
        )}

        {isExpanded && !isRecommendedCard && (
          <div className="options-container">
            {renderVariants(it)}
            {renderAddons(it)}
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
                  <p className="cta-text">Ready to order?</p>
                  <a href="tel:+918420822919" className="cta-button">
                    📞 Call 8420822919
                  </a>
                  <a
                    href="https://wa.me/918420822919"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cta-button cta-button-whatsapp"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Hamburger (CSS controls visibility) */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close menu categories" : "Open menu categories"}
        >
          <span className="hamburger-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="hamburger-label">Menu</span>
        </button>

        {/* Overlay (only when sidebar open) */}
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
                {/* Recommended Section */}
                {recommendedItems.length > 0 && (
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
                    {subs.map((sc) => (
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
                {subs.map((sc) => (
                  <div key={sc.id} data-sub={sc.id} className="menu-section">
                    <h2 className="section-title">{sc.name}</h2>
                    <div className="items-grid">
                      {(itemsBySub.get(sc.id) || []).map((it) => (
                        <MenuItemCard
                          key={it.id}
                          it={it}
                          isRecommendedCard={false}
                        />
                      ))}
                    </div>
                  </div>
                ))}
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

// ========================
// Helpers for variants/addons
// ========================
function hasVariantsOrAddons(it, type) {
  const families = (it.families || []).filter((f) => f.type === type);
  if (families.length > 0) {
    return families.some((fam) => (fam.options || []).length > 0);
  }
  if (type === "variant") return (it.variants || []).length > 0;
  if (type === "addon") return (it.addonGroups || []).length > 0;
  return false;
}

function renderVariants(it) {
  const famVariants = (it.families || []).filter((f) => f.type === "variant");
  const blocks = famVariants.length
    ? famVariants
    : it.variants?.length
    ? [{ name: "Variants", options: it.variants }]
    : [];

  if (!blocks.length) return null;

  return (
    <div className="variants-section">
      {blocks.map((blk, i) => (
        <div key={i}>
          <div className="section-label">{blk.name || "Variants"}</div>
          <div className="options-row">
            {(blk.options || []).map((opt) => (
              <span key={opt.id} className="option-chip">
                {opt.name}
                {formatPriceDelta(opt.priceDelta)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderAddons(it) {
  const famAddons = (it.families || []).filter((f) => f.type === "addon");
  const blocks = famAddons.length
    ? famAddons
    : it.addonGroups?.length
    ? it.addonGroups
    : [];

  if (!blocks.length) return null;

  return (
    <div className="addons-section">
      {blocks.map((blk, i) => (
        <div key={i}>
          <div className="section-label">{blk.name || "Add-ons"}</div>
          <div className="options-row">
            {(blk.options || []).map((opt) => (
              <span key={opt.id} className="option-chip">
                {opt.name}
                {formatPriceDelta(opt.priceDelta)}
              </span>
            ))}
          </div>
        </div>
      ))}
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