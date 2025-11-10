// =============================
// File: site/src/pages/Menu.jsx - COMPLETELY FIXED
// =============================

import { useEffect, useMemo, useState, useRef } from "react";
import "./Menu.css";

// CRITICAL: Reduced description length for more compact cards
const DESC_MAX_RECOMMENDED = 80; // Short for recommended items
const DESC_MAX_REGULAR = 120; // Slightly longer for regular items

// --- New Component for Full Description ---
function DescriptionModal({ open, title, description, onClose }) {
  if (!open) return null;
  const backdrop = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const body = {
    position: "relative", zIndex: 10000, maxWidth: "90vw", maxHeight: "90vh",
    background: "#1e1e1e", borderRadius: 16, padding: 20,
    display: "flex", flexDirection: "column",
    color: "#fff",
  };
  const head = { 
    display: "flex", justifyContent: "space-between", alignItems: "center", 
    marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #333"
  };
  const closeBtn = { 
    background: "#f59e0b", color: "#000", border: 0, borderRadius: 8, 
    padding: "6px 12px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem"
  };
  const descText = { 
    maxHeight: "75vh", overflowY: "auto", fontSize: "0.95rem", lineHeight: "1.5",
    color: "rgba(255, 255, 255, 0.8)", paddingRight: "8px",
  };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={body} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "#f59e0b" }}>{title}</div>
          <button style={closeBtn} onClick={onClose}>✕ Close</button>
        </div>
        <p style={descText}>{description}</p>
      </div>
    </div>
  );
}
// ----------------------------------------

function ImageModal({ open, url, name, onClose }) {
  if (!open) return null;
  const backdrop = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const body = {
    position: "relative", zIndex: 10000, maxWidth: "90vw", maxHeight: "90vh",
    background: "#0b0b0b", borderRadius: 16, padding: 16,
    display: "flex", flexDirection: "column",
  };
  const head = { 
    display: "flex", justifyContent: "space-between", alignItems: "center", 
    marginBottom: 12, color: "#fff", paddingBottom: 8, borderBottom: "1px solid #333"
  };
  const img = { maxWidth: "86vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 8 };
  const closeBtn = { 
    background: "#f59e0b", color: "#000", border: 0, borderRadius: 8, 
    padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: "0.95rem"
  };
  const empty = { color: "#aaa", textAlign: "center", padding: "40px 20px" };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={body} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{name || "Item Image"}</div>
          <button style={closeBtn} onClick={onClose}>✕ Close</button>
        </div>
        {url ? (
          <img src={url} alt={name || "Item image"} style={img} />
        ) : (
          <div style={empty}>No image available</div>
        )}
      </div>
    </div>
  );
}

// --- Menu Component Start ---
export default function Menu() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [activeTop, setActiveTop] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Image modal state
  const [imgModal, setImgModal] = useState({ open: false, url: null, name: "" });
  // New Description modal state
  const [descModal, setDescModal] = useState({ open: false, title: "", description: "" });

  const rightPaneRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("https://hungrytimes.in/api/public/menu", {
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

  // Extract all recommended items across all categories
  const recommendedItems = useMemo(() => {
    const items = [];
    tops.forEach((tc) => {
      tc.subcategories?.forEach((sc) => {
        sc.items?.forEach((item) => {
          if (item.isRecommended) {
            items.push(item);
          }
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
    setSidebarOpen(false);
  };
  
  // --- New Helper Component for Item Card Rendering ---
  const MenuItemCard = ({ it, isRecommendedCard = false }) => {
    const hasVariants = hasVariantsOrAddons(it, "variant");
    const hasAddons = hasVariantsOrAddons(it, "addon");
    const isExpanded = expandedItems.has(it.id);
    const showExpandBtn = hasVariants || hasAddons;

    const DESC_MAX = isRecommendedCard ? DESC_MAX_RECOMMENDED : DESC_MAX_REGULAR;
    const fullDescription = String(it.description || "");
    const isTruncated = fullDescription.length > DESC_MAX;

    return (
      <article 
        key={it.id} 
        className={isRecommendedCard ? "recommended-item-card" : "menu-item-card"}
      >
        {isRecommendedCard ? (
          <div className="recommended-badge">
            <span className="star-badge">⭐ RECOMMENDED</span>
          </div>
        ) : (
          it.isRecommended && <div className="item-star-badge">⭐</div>
        )}
        
        <div className="item-header">
          {/* CRITICAL FIX: Add a div around the name to push the badge away on mobile (CSS handles spacing) */}
          <div className="item-name-wrapper">
            <h3 className="item-name">{it.name}</h3>
          </div>
          <span className={`item-price ${isRecommendedCard ? "item-price-large" : ""}`}>
            ₹{Number(it.basePrice || 0).toFixed(0)}
          </span>
        </div>

        {it.description && (
          <p className="item-description">
            {fullDescription.slice(0, DESC_MAX)}
            {isTruncated && "..."}
          </p>
        )}

        {/* Action buttons row */}
        <div className="item-actions">
          {/* Show 'Read Description' if truncated */}
          {isTruncated && (
            <button
              className="read-desc-btn"
              onClick={() => setDescModal({ open: true, title: it.name, description: fullDescription })}
            >
              📖 Read Full Description
            </button>
          )}

          {/* CRITICAL FIX: Check for imageUrl on the item itself and enable in recommended section */}
          {it.imageUrl && (
            <button
              className="view-image-btn"
              onClick={() => setImgModal({ open: true, url: it.imageUrl, name: it.name })}
            >
              🖼️ View Image
            </button>
          )}
          
          {showExpandBtn && (
            <button 
              className="expand-btn" 
              onClick={() => toggleExpand(it.id)}
            >
              {isExpanded ? (isRecommendedCard ? "∸ Hide Options" : "− Hide Options") : "+ View Options"}
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="options-container">
            {renderVariants(it)}
            {renderAddons(it)}
          </div>
        )}
      </article>
    );
  };
  // --------------------------------------------------------


  if (loading) {
    return (
      <div className="menu-loading">
        <div className="spinner"></div>
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

  return (
    <div className="menu-page-wrapper">
      <div className="menu-page">
        {/* Hero */}
        {/* ... (Hero content remains the same) ... */}
        <div className="menu-hero">
          <div className="hero-grid">
            <div className="hero-image-wrapper hero-black-bg">
              <div className="hero-content-overlay">
                <h1 className="hero-title">Our Menu</h1>
                <p className="hero-subtitle">Crafted with passion, served with love</p>
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
                  <a href="tel:+918420822919" className="cta-button">📞 Call 8420822919</a>
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


        {/* Mobile Hamburger */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Overlay */}
        {sidebarOpen && (
          <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Content */}
        <div className="menu-container">
          <div className="menu-layout">
            <aside className={`categories-sidebar ${sidebarOpen ? "open" : ""}`}>
              <div className="sidebar-sticky">
                <h3 className="sidebar-heading">Categories</h3>
                <nav className="sidebar-category-list">
                  {tops.map((tc) => (
                    <button
                      key={tc.id}
                      className={`sidebar-category-btn ${tc.id === activeTop ? "active" : ""}`}
                      onClick={() => handleCategoryClick(tc.id, tc.subcategories?.[0]?.id)}
                    >
                      {tc.name}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="menu-main" ref={rightPaneRef}>
              <section>
                {/* Recommended Section */}
                {recommendedItems.length > 0 && (
                  <div className="recommended-section">
                    <div className="recommended-header">
                      <span className="star-icon">⭐</span>
                      <h2 className="recommended-title">Chef's Recommendations</h2>
                      <span className="star-icon">⭐</span>
                    </div>
                    <div className="recommended-items-grid">
                      {recommendedItems.map((it) => (
                        <MenuItemCard key={it.id} it={it} isRecommendedCard={true} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Subcategory Navigation - Placed after recommended section */}
                <nav className="subcategory-bar">
                  <div className="subcategory-scroll">
                    {subs.map((sc) => (
                      <button
                        key={sc.id}
                        className={`subcategory-btn ${sc.id === activeSub ? "active" : ""}`}
                        onClick={() => scrollToSub(sc.id)}
                      >
                        {sc.name}
                      </button>
                    ))}
                  </div>
                </nav>

                {/* Regular Category Sections */}
                {subs.map((sc) => (
                  <div key={sc.id} data-sub={sc.id} className="menu-section">
                    <h2 className="section-title">{sc.name}</h2>
                    <div className="items-grid">
                      {(itemsBySub.get(sc.id) || []).map((it) => (
                        <MenuItemCard key={it.id} it={it} isRecommendedCard={false} />
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
        url={imgModal.url}
        name={imgModal.name}
        onClose={() => setImgModal({ open: false, url: null, name: "" })}
      />

      {/* Global Description Modal */}
      <DescriptionModal
        open={descModal.open}
        title={descModal.title}
        description={descModal.description}
        onClose={() => setDescModal({ open: false, title: "", description: "" })}
      />
    </div>
  );
}

// ... (renderVariants, renderAddons, hasVariantsOrAddons, formatPriceDelta functions follow) ...

function hasVariantsOrAddons(it, type) {
  const families = (it.families || []).filter((f) => f.type === type);
  if (families.length > 0)
    return families.some((fam) => (fam.options || []).length > 0);
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