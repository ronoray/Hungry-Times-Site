// site/src/pages/Menu.jsx - DIAGNOSTIC VERSION
import { useEffect, useMemo, useState, useRef } from "react";

const DESC_MAX = 160;

export default function Menu() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [activeTop, setActiveTop] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());

  const rightPaneRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("https://hungrytimes.in/api/public/menu", { 
          headers: { "Cache-Control": "no-cache" }
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
    return () => { alive = false; };
  }, []);

  const tops = data?.topCategories || [];
  const subs = useMemo(() => {
    const t = tops.find(x => x.id === activeTop);
    return t?.subcategories || [];
  }, [tops, activeTop]);

  const itemsBySub = useMemo(() => {
    const map = new Map();
    subs.forEach(sc => map.set(sc.id, sc.items || []));
    return map;
  }, [subs]);

  const scrollToSub = (subId) => {
    setActiveSub(subId);
    const el = rightPaneRef.current?.querySelector(`[data-sub="${subId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

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
    <div className="menu-page">
      {/* Hero Section */}
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

      {/* Menu Content */}
      <div className="menu-container">
        {/* Desktop Sidebar - Hidden on Mobile */}
        <aside className="desktop-sidebar">
          <div className="sidebar-content">
            <h3 className="sidebar-title">Categories</h3>
            {tops.map(tc => (
              <button
                key={tc.id}
                className={`sidebar-btn ${tc.id === activeTop ? 'active' : ''}`}
                onClick={() => { 
                  setActiveTop(tc.id); 
                  setActiveSub((tc.subcategories?.[0]?.id) ?? null); 
                }}
              >
                {tc.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="menu-main">
          {/* Mobile Categories - Only on Mobile */}
          <div className="mobile-categories">
            <h3 className="mobile-title">Categories</h3>
            <div className="mobile-scroll">
              {tops.map(tc => (
                <button
                  key={tc.id}
                  className={`mobile-btn ${tc.id === activeTop ? 'active' : ''}`}
                  onClick={() => { 
                    setActiveTop(tc.id); 
                    setActiveSub((tc.subcategories?.[0]?.id) ?? null); 
                  }}
                >
                  {tc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategories */}
          <div className="subcategories">
            <div className="subcategory-scroll">
              {subs.map(sc => (
                <button
                  key={sc.id}
                  className={`sub-btn ${sc.id === activeSub ? 'active' : ''}`}
                  onClick={() => scrollToSub(sc.id)}
                >
                  {sc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items */}
          <div className="menu-content" ref={rightPaneRef}>
            {subs.map(sc => (
              <div key={sc.id} data-sub={sc.id} className="menu-section">
                <h2 className="section-title">{sc.name}</h2>
                <div className="items-list">
                  {(itemsBySub.get(sc.id) || []).map(it => {
                    const hasVariants = hasVariantsOrAddons(it, 'variant');
                    const hasAddons = hasVariantsOrAddons(it, 'addon');
                    const isExpanded = expandedItems.has(it.id);
                    const showExpandBtn = hasVariants || hasAddons;

                    return (
                      <div key={it.id} className="menu-item">
                        <div className="item-row">
                          <h3 className="item-name">{it.name}</h3>
                          <span className="item-price">
                            ₹{Number(it.basePrice || 0).toFixed(0)}
                          </span>
                        </div>
                        
                        {it.description && (
                          <p className="item-desc">
                            {String(it.description).slice(0, DESC_MAX)}
                          </p>
                        )}

                        {showExpandBtn && (
                          <button
                            className="options-btn"
                            onClick={() => toggleExpand(it.id)}
                          >
                            {isExpanded ? '− Hide' : '+ View Options'}
                          </button>
                        )}

                        {isExpanded && (
                          <div className="options">
                            {renderVariants(it)}
                            {renderAddons(it)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .menu-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: #ffffff;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        /* === LOADING STATES === */
        .menu-loading, .menu-error, .menu-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 2rem;
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* === HERO === */
        .menu-hero {
          width: 100%;
          overflow: hidden;
          background: #000000;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-height: 500px;
        }

        .hero-image-wrapper {
          position: relative;
          aspect-ratio: 16/9;
          background: #000000;
        }

        .hero-black-bg {
          background: #000000 !important;
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-content-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .hero-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          text-shadow: 0 2px 20px rgba(0,0,0,0.8);
        }

        .hero-subtitle {
          font-size: clamp(0.9rem, 2vw, 1.25rem);
          text-shadow: 0 2px 10px rgba(0,0,0,0.8);
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cta-text {
          font-size: clamp(1rem, 2vw, 1.5rem);
          font-weight: 600;
          text-shadow: 0 2px 10px rgba(0,0,0,0.8);
        }

        .cta-button {
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 700;
          font-size: 1rem;
        }

        .cta-button-whatsapp {
          background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
        }

        /* === MENU CONTAINER === */
        .menu-container {
          max-width: 1600px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 2rem;
          padding: 2rem 1rem;
        }

        /* === DESKTOP SIDEBAR === */
        .desktop-sidebar {
          position: sticky;
          top: 2rem;
          height: fit-content;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .sidebar-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f59e0b;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid rgba(255,255,255,0.12);
        }

        .sidebar-btn {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          border-left: 3px solid transparent;
          color: rgba(255,255,255,0.7);
          text-align: left;
          font-size: 0.95rem;
          cursor: pointer;
          border-radius: 8px;
          font-family: inherit;
          transition: all 0.3s;
        }

        .sidebar-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .sidebar-btn.active {
          background: rgba(245,158,11,0.2);
          color: #f59e0b;
          border-left-color: #f59e0b;
          font-weight: 600;
        }

        /* === MOBILE CATEGORIES (Hidden on Desktop) === */
        .mobile-categories {
          display: none;
        }

        /* === MAIN CONTENT === */
        .menu-main {
          width: 100%;
          min-height: 600px;
        }

        /* === SUBCATEGORIES === */
        .subcategories {
          position: sticky;
          top: 0;
          background: #0a0a0a;
          border-bottom: 2px solid rgba(255,255,255,0.12);
          padding: 0.75rem 0;
          margin-bottom: 2rem;
          z-index: 10;
        }

        .subcategory-scroll, .mobile-scroll {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: thin;
        }

        .subcategory-scroll::-webkit-scrollbar,
        .mobile-scroll::-webkit-scrollbar {
          height: 6px;
        }

        .subcategory-scroll::-webkit-scrollbar-thumb,
        .mobile-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }

        .sub-btn, .mobile-btn {
          flex-shrink: 0;
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.7);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 999px;
          white-space: nowrap;
          font-family: inherit;
          transition: all 0.3s;
        }

        .sub-btn:hover, .mobile-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .sub-btn.active, .mobile-btn.active {
          background: #f59e0b;
          color: #fff;
          border-color: #f59e0b;
          font-weight: 600;
        }

        /* === MENU CONTENT === */
        .menu-section {
          margin-bottom: 3rem;
        }

        .section-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid rgba(255,255,255,0.12);
        }

        .items-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        /* === MENU ITEMS === */
        .menu-item {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.3s;
        }

        .menu-item:hover {
          background: rgba(255,255,255,0.08);
          border-color: #f59e0b;
          transform: translateY(-2px);
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .item-name {
          font-size: 1rem;
          font-weight: 600;
          flex: 1;
          word-wrap: break-word;
          line-height: 1.3;
        }

        .item-price {
          font-size: 1rem;
          font-weight: 700;
          color: #f59e0b;
          white-space: nowrap;
        }

        .item-desc {
          font-size: 0.875rem;
          color: rgba(255,255,255,0.7);
          font-style: italic;
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }

        .options-btn {
          width: 100%;
          padding: 0.625rem;
          background: rgba(245,158,11,0.2);
          border: 1px solid #f59e0b;
          color: #f59e0b;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          margin-top: 0.75rem;
          font-family: inherit;
          transition: all 0.3s;
        }

        .options-btn:hover {
          background: #f59e0b;
          color: #fff;
        }

        .options {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255,255,255,0.12);
        }

        .variant-group, .addon-group {
          margin-bottom: 1rem;
        }

        .option-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .option-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .option-chip {
          padding: 0.375rem 0.75rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.7);
        }

        .chip-price {
          margin-left: 0.25rem;
          color: #f59e0b;
          font-weight: 600;
        }

        /* === MOBILE RESPONSIVE === */
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr;
            max-height: none;
          }

          /* Hide desktop sidebar */
          .desktop-sidebar {
            display: none !important;
          }

          /* Show mobile categories */
          .mobile-categories {
            display: block !important;
            background: #0a0a0a;
            border-bottom: 2px solid rgba(255,255,255,0.12);
            padding: 0.75rem 0;
            margin-bottom: 0;
          }

          .mobile-title {
            font-size: 1rem;
            font-weight: 700;
            color: #f59e0b;
            margin-bottom: 0.5rem;
            padding: 0 1rem;
          }

          .mobile-scroll {
            padding: 0 1rem;
          }

          .menu-container {
            grid-template-columns: 1fr;
            padding: 0;
            gap: 0;
          }

          .menu-main {
            padding: 0 1rem;
          }

          .items-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .section-title {
            font-size: 1.5rem;
          }

          .cta-button {
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 1.75rem;
          }

          .item-name {
            font-size: 0.95rem;
          }

          .item-price {
            font-size: 0.95rem;
          }
        }
      `}</style>
    </div>
  );
}

// Helper functions
function hasVariantsOrAddons(it, type) {
  const families = (it.families || []).filter(f => f.type === type);
  if (families.length > 0) {
    return families.some(fam => (fam.options || []).length > 0);
  }
  if (type === 'variant') {
    return (it.variants || []).length > 0;
  }
  if (type === 'addon') {
    return (it.addonGroups || []).length > 0;
  }
  return false;
}

function renderVariants(it) {
  const famVariants = (it.families || []).filter(f => f.type === "variant");
  const blocks = famVariants.length 
    ? famVariants 
    : (it.variants?.length ? [{ name: "Variants", options: it.variants }] : []);
  
  if (!blocks.length) return null;
  
  return (
    <>
      {blocks.map((blk, i) => (
        <div key={i} className="variant-group">
          <div className="option-label">{blk.name || "Variants"}</div>
          <div className="option-chips">
            {(blk.options || []).map(opt => (
              <span key={opt.id} className="option-chip">
                {opt.name}
                {formatPriceDelta(opt.priceDelta)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function renderAddons(it) {
  const famAddons = (it.families || []).filter(f => f.type === "addon");
  const blocks = famAddons.length 
    ? famAddons 
    : (it.addonGroups?.length ? it.addonGroups : []);
  
  if (!blocks.length) return null;
  
  return (
    <>
      {blocks.map((blk, i) => (
        <div key={i} className="addon-group">
          <div className="option-label">{blk.name || "Add-ons"}</div>
          <div className="option-chips">
            {(blk.options || []).map(opt => (
              <span key={opt.id} className="option-chip">
                {opt.name}
                {formatPriceDelta(opt.priceDelta)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function formatPriceDelta(v) {
  const n = Number(v || 0);
  if (!n) return null;
  const sign = n >= 0 ? "+" : "";
  return (
    <span className="chip-price">
      {sign}₹{Math.abs(n).toFixed(0)}
    </span>
  );
}