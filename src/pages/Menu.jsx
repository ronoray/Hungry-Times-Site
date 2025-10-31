// site/src/pages/Menu.jsx
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
      {/* Hero Section with 2 Images */}
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
              alt="Hungry Times - Delicious Cuisine"
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

      {/* Menu Content Container */}
      <div className="menu-container">
        {/* Main Content Layout */}
        <div className="menu-layout">
          {/* Sidebar: Top Categories (Desktop Only) */}
          <aside className="desktop-sidebar">
            <div className="sidebar-sticky">
              <h3 className="sidebar-heading">Categories</h3>
              <nav className="sidebar-category-list">
                {tops.map(tc => (
                  <button
                    key={tc.id}
                    className={`sidebar-category-btn ${tc.id === activeTop ? 'active' : ''}`}
                    onClick={() => { 
                      setActiveTop(tc.id); 
                      setActiveSub((tc.subcategories?.[0]?.id) ?? null); 
                    }}
                  >
                    {tc.name}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="menu-main">
            {/* Mobile: Top Categories */}
            <nav className="mobile-top-categories">
              <h3 className="mobile-heading">Categories</h3>
              <div className="mobile-category-scroll">
                {tops.map(tc => (
                  <button
                    key={tc.id}
                    className={`mobile-category-btn ${tc.id === activeTop ? 'active' : ''}`}
                    onClick={() => { 
                      setActiveTop(tc.id); 
                      setActiveSub((tc.subcategories?.[0]?.id) ?? null); 
                    }}
                  >
                    {tc.name}
                  </button>
                ))}
              </div>
            </nav>

            {/* Subcategories Bar */}
            <nav className="subcategory-bar">
              <div className="subcategory-scroll">
                {subs.map(sc => (
                  <button
                    key={sc.id}
                    className={`subcategory-btn ${sc.id === activeSub ? 'active' : ''}`}
                    onClick={() => scrollToSub(sc.id)}
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
            </nav>

            {/* Menu Items */}
            <section className="menu-content" ref={rightPaneRef}>
              {subs.map(sc => (
                <div key={sc.id} data-sub={sc.id} className="menu-section">
                  <h2 className="section-title">{sc.name}</h2>
                  <div className="items-grid">
                    {(itemsBySub.get(sc.id) || []).map(it => {
                      const hasVariants = hasVariantsOrAddons(it, 'variant');
                      const hasAddons = hasVariantsOrAddons(it, 'addon');
                      const isExpanded = expandedItems.has(it.id);
                      const showExpandBtn = hasVariants || hasAddons;

                      return (
                        <article key={it.id} className="menu-item-card">
                          <div className="item-header">
                            <h3 className="item-name">{it.name}</h3>
                            <span className="item-price">
                              ₹{Number(it.basePrice || 0).toFixed(0)}
                            </span>
                          </div>
                          
                          {it.description && (
                            <p className="item-description">
                              {String(it.description).slice(0, DESC_MAX)}
                            </p>
                          )}

                          {showExpandBtn && (
                            <button
                              className="expand-btn"
                              onClick={() => toggleExpand(it.id)}
                            >
                              {isExpanded ? '− Hide Options' : '+ View Options'}
                            </button>
                          )}

                          {isExpanded && (
                            <div className="options-container">
                              {renderVariants(it)}
                              {renderAddons(it)}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* === RESET & VARIABLES === */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --color-bg: #0a0a0a;
          --color-surface: rgba(255, 255, 255, 0.04);
          --color-surface-hover: rgba(255, 255, 255, 0.08);
          --color-border: rgba(255, 255, 255, 0.12);
          --color-text: #ffffff;
          --color-text-dim: rgba(255, 255, 255, 0.7);
          --color-text-muted: rgba(255, 255, 255, 0.5);
          --color-accent: #f59e0b;
          --color-accent-dim: rgba(245, 158, 11, 0.2);
        }

        /* === LOADING & ERROR STATES === */
        .menu-loading,
        .menu-error,
        .menu-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: 2rem;
          text-align: center;
          color: var(--color-text);
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* === MENU PAGE === */
        .menu-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: var(--color-text);
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        /* === HERO SECTION === */
        .menu-hero {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: #000000;
          color-scheme: normal;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0;
          max-height: 500px;
          background: #000000;
        }

        .hero-image-wrapper {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 9;
          background: #000000;
        }

        .hero-black-bg {
          background: #000000 !important;
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .hero-content-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          z-index: 2;
        }

        .hero-title {
          font-size: clamp(2rem, 5vw, 3.5rem);
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.5rem;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.8);
        }

        .hero-subtitle {
          font-size: clamp(0.9rem, 2vw, 1.25rem);
          color: rgba(255, 255, 255, 0.95);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .cta-text {
          font-size: clamp(1rem, 2vw, 1.5rem);
          font-weight: 600;
          color: #ffffff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
        }

        .cta-button {
          display: inline-block;
          padding: 0.875rem 2rem;
          background: linear-gradient(135deg, var(--color-accent) 0%, #d97706 100%);
          color: #ffffff;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 700;
          font-size: 1rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
        }

        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.6);
        }

        .cta-button-whatsapp {
          background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
          box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);
        }

        .cta-button-whatsapp:hover {
          box-shadow: 0 6px 20px rgba(37, 211, 102, 0.6);
        }

        /* === MENU CONTAINER === */
        .menu-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0;
          width: 100%;
        }

        /* === LAYOUT === */
        .menu-layout {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 2rem;
          align-items: start;
          padding: 2rem 1rem;
        }

        /* === DESKTOP SIDEBAR === */
        .desktop-sidebar {
          display: block;
        }

        .sidebar-sticky {
          position: sticky;
          top: 2rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .sidebar-heading {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-accent);
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid var(--color-border);
        }

        .sidebar-category-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sidebar-category-btn {
          display: block;
          width: 100%;
          padding: 0.875rem 1rem;
          background: transparent;
          border: 1px solid var(--color-border);
          border-left: 3px solid transparent;
          color: var(--color-text-dim);
          text-align: left;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 8px;
          font-family: inherit;
        }

        .sidebar-category-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
          border-left-color: var(--color-accent);
        }

        .sidebar-category-btn.active {
          background: var(--color-accent-dim);
          color: var(--color-accent);
          font-weight: 600;
          border-left-color: var(--color-accent);
        }

        /* === MOBILE TOP CATEGORIES (Hidden on Desktop) === */
        .mobile-top-categories {
          display: none;
        }

        /* === MAIN CONTENT === */
        .menu-main {
          min-height: 600px;
          width: 100%;
          max-width: 100%;
        }

        /* === SUBCATEGORY BAR === */
        .subcategory-bar {
          position: sticky;
          top: 0;
          background: var(--color-bg);
          border-bottom: 2px solid var(--color-border);
          margin-bottom: 2rem;
          padding: 1rem 0;
          z-index: 10;
        }

        .subcategory-scroll {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--color-border) transparent;
          padding-bottom: 0.5rem;
        }

        .subcategory-scroll::-webkit-scrollbar {
          height: 6px;
        }

        .subcategory-scroll::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 3px;
        }

        .subcategory-btn {
          flex-shrink: 0;
          padding: 0.625rem 1.25rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text-dim);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 999px;
          white-space: nowrap;
          font-family: inherit;
        }

        .subcategory-btn:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
          border-color: var(--color-accent);
        }

        .subcategory-btn.active {
          background: var(--color-accent);
          color: #ffffff;
          font-weight: 600;
          border-color: var(--color-accent);
        }

        /* === MENU CONTENT === */
        .menu-content {
          min-height: 600px;
          width: 100%;
        }

        .menu-section {
          margin-bottom: 3rem;
          scroll-margin-top: 100px;
        }

        .section-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 1.5rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid var(--color-border);
        }

        /* === ITEMS GRID === */
        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
          width: 100%;
        }

        /* === MENU ITEM CARD === */
        .menu-item-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 1.25rem;
          transition: all 0.3s ease;
          width: 100%;
        }

        .menu-item-card:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .item-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
          flex: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.3;
        }

        .item-price {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-accent);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .item-description {
          font-size: 0.875rem;
          color: var(--color-text-dim);
          font-style: italic;
          margin: 0 0 0.75rem 0;
          line-height: 1.5;
        }

        /* === EXPAND BUTTON === */
        .expand-btn {
          width: 100%;
          padding: 0.625rem;
          background: var(--color-accent-dim);
          border: 1px solid var(--color-accent);
          color: var(--color-accent);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 8px;
          margin-top: 0.75rem;
          font-family: inherit;
        }

        .expand-btn:hover {
          background: var(--color-accent);
          color: #ffffff;
        }

        /* === OPTIONS CONTAINER === */
        .options-container {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* === VARIANTS & ADDONS === */
        .variants-section,
        .addons-section {
          margin-bottom: 1rem;
        }

        .variants-section:last-child,
        .addons-section:last-child {
          margin-bottom: 0;
        }

        .section-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .options-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .option-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.75rem;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--color-border);
          border-radius: 999px;
          font-size: 0.8125rem;
          color: var(--color-text-dim);
          transition: all 0.2s ease;
        }

        .option-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--color-accent);
          color: var(--color-text);
        }

        .option-price-delta {
          margin-left: 0.25rem;
          color: var(--color-accent);
          font-weight: 600;
        }

        /* === MOBILE RESPONSIVE === */
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr;
            max-height: none;
          }

          .hero-image-wrapper {
            aspect-ratio: 16 / 10;
          }

          /* Hide desktop sidebar */
          .desktop-sidebar {
            display: none;
          }

          /* Show mobile top categories */
          .mobile-top-categories {
            display: block;
            background: var(--color-bg);
            border-bottom: 2px solid var(--color-border);
            padding: 1rem;
            margin-bottom: 0;
          }

          .mobile-heading {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--color-accent);
            margin-bottom: 0.75rem;
          }

          .mobile-category-scroll {
            display: flex;
            gap: 0.75rem;
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--color-border) transparent;
            padding-bottom: 0.5rem;
          }

          .mobile-category-scroll::-webkit-scrollbar {
            height: 6px;
          }

          .mobile-category-scroll::-webkit-scrollbar-thumb {
            background: var(--color-border);
            border-radius: 3px;
          }

          .mobile-category-btn {
            flex-shrink: 0;
            padding: 0.625rem 1.25rem;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            color: var(--color-text-dim);
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 999px;
            white-space: nowrap;
            font-family: inherit;
          }

          .mobile-category-btn:hover {
            background: var(--color-surface-hover);
            color: var(--color-text);
            border-color: var(--color-accent);
          }

          .mobile-category-btn.active {
            background: var(--color-accent);
            color: #ffffff;
            font-weight: 600;
            border-color: var(--color-accent);
          }

          .menu-layout {
            grid-template-columns: 1fr;
            padding: 0;
            gap: 0;
          }

          .menu-main {
            padding: 0 1rem;
          }

          .items-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .subcategory-bar {
            padding: 0.75rem 0;
            margin-bottom: 1.5rem;
          }

          .section-title {
            font-size: 1.5rem;
          }

          .cta-button {
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
          }

          .menu-item-card {
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .mobile-top-categories {
            padding: 0.75rem;
          }

          .mobile-heading {
            font-size: 1rem;
          }

          .mobile-category-btn,
          .subcategory-btn {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
          }

          .hero-title {
            font-size: 1.75rem;
          }

          .hero-subtitle {
            font-size: 0.85rem;
          }

          .cta-text {
            font-size: 0.95rem;
          }

          .cta-button {
            padding: 0.625rem 1.25rem;
            font-size: 0.85rem;
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

// === HELPER FUNCTIONS ===

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
    <div className="variants-section">
      {blocks.map((blk, i) => (
        <div key={i}>
          <div className="section-label">{blk.name || "Variants"}</div>
          <div className="options-row">
            {(blk.options || []).map(opt => (
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
  const famAddons = (it.families || []).filter(f => f.type === "addon");
  const blocks = famAddons.length 
    ? famAddons 
    : (it.addonGroups?.length ? it.addonGroups : []);
  
  if (!blocks.length) return null;
  
  return (
    <div className="addons-section">
      {blocks.map((blk, i) => (
        <div key={i}>
          <div className="section-label">{blk.name || "Add-ons"}</div>
          <div className="options-row">
            {(blk.options || []).map(opt => (
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