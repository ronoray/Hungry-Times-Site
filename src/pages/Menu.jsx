// site/src/pages/Menu.jsx
import { useEffect, useMemo, useState, useRef } from "react";

const DESC_MAX = 160;

export default function Menu() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [activeTop, setActiveTop] = useState(null);
  const [activeSub, setActiveSub] = useState(null);

  const rightPaneRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/public/menu", { 
          headers: { "Cache-Control": "no-cache" }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!alive) return;
        setData(json);
        // default selections
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
          <div className="hero-image-wrapper">
            <img
              src="/images/menu/menu-hero-1.jpg"
              alt="Hungry Times - Fresh Ingredients"
              className="hero-image"
              loading="eager"
            />
            <div className="hero-overlay">
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
            <div className="hero-overlay">
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
        {/* Top Categories Navigation */}
        <nav className="category-nav">
          <div className="category-nav-scroll">
            {tops.map(tc => (
              <button
                key={tc.id}
                className={`category-tab ${tc.id === activeTop ? 'active' : ''}`}
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

        {/* Main Menu Grid */}
        <div className="menu-grid">
          {/* Sidebar: Subcategories */}
          <aside className="menu-sidebar">
            <div className="sidebar-sticky">
              <h3 className="sidebar-title">Categories</h3>
              {subs.length === 0 ? (
                <div className="sidebar-empty">No subcategories</div>
              ) : (
                <div className="subcategory-list">
                  {subs.map(sc => (
                    <button
                      key={sc.id}
                      className={`subcategory-tab ${sc.id === activeSub ? 'active' : ''}`}
                      onClick={() => scrollToSub(sc.id)}
                    >
                      <span className="subcategory-dot"></span>
                      {sc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content: Menu Items */}
          <section className="menu-content" ref={rightPaneRef}>
            {subs.map(sc => (
              <div key={sc.id} data-sub={sc.id} className="menu-section">
                <h2 className="section-title">{sc.name}</h2>
                <div className="items-grid">
                  {(itemsBySub.get(sc.id) || []).map(it => (
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

                      {renderVariants(it)}
                      {renderAddons(it)}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        /* === VARIABLES === */
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
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
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
        }

        /* === HERO SECTION === */
        .menu-hero {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0;
          max-height: 500px;
        }

        .hero-image-wrapper {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 9;
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .hero-image-wrapper:hover .hero-image {
          transform: scale(1.05);
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.3) 0%,
            rgba(0, 0, 0, 0.7) 100%
          );
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          margin: 0 0 0.5rem 0;
          color: var(--color-text);
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
          letter-spacing: -0.02em;
        }

        .hero-subtitle {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: var(--color-text-dim);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
          margin: 0;
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }

        .cta-text {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
          color: var(--color-text);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: var(--color-accent);
          color: #000;
          font-weight: 600;
          text-decoration: none;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          transition: all 0.3s ease;
        }

        .cta-button:hover {
          background: #fbbf24;
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .cta-button-whatsapp {
          background: #25d366;
          color: #fff;
        }

        .cta-button-whatsapp:hover {
          background: #20ba5a;
        }

        /* === MENU CONTAINER === */
        .menu-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        /* === CATEGORY NAVIGATION === */
        .category-nav {
          margin-bottom: 2rem;
          position: sticky;
          top: 0;
          background: var(--color-bg);
          z-index: 100;
          padding: 1rem 0;
          border-bottom: 1px solid var(--color-border);
        }

        .category-nav-scroll {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: thin;
          scrollbar-color: var(--color-border) transparent;
        }

        .category-nav-scroll::-webkit-scrollbar {
          height: 6px;
        }

        .category-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .category-nav-scroll::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 3px;
        }

        .category-tab {
          flex-shrink: 0;
          padding: 0.75rem 1.5rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-dim);
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .category-tab:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
          border-color: var(--color-accent);
        }

        .category-tab.active {
          background: var(--color-accent-dim);
          border-color: var(--color-accent);
          color: var(--color-accent);
          font-weight: 600;
        }

        /* === MENU GRID === */
        .menu-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
        }

        /* === SIDEBAR === */
        .menu-sidebar {
          position: relative;
        }

        .sidebar-sticky {
          position: sticky;
          top: 140px;
        }

        .sidebar-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 1rem 0;
        }

        .sidebar-empty {
          color: var(--color-text-muted);
          font-size: 0.875rem;
          font-style: italic;
        }

        .subcategory-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .subcategory-tab {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          border-left: 2px solid transparent;
          color: var(--color-text-dim);
          text-align: left;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: var(--radius-sm);
        }

        .subcategory-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-text-muted);
          transition: all 0.3s ease;
        }

        .subcategory-tab:hover {
          background: var(--color-surface);
          color: var(--color-text);
          border-left-color: var(--color-accent);
        }

        .subcategory-tab:hover .subcategory-dot {
          background: var(--color-accent);
          transform: scale(1.3);
        }

        .subcategory-tab.active {
          background: var(--color-surface);
          color: var(--color-accent);
          font-weight: 600;
          border-left-color: var(--color-accent);
        }

        .subcategory-tab.active .subcategory-dot {
          background: var(--color-accent);
          transform: scale(1.5);
        }

        /* === MENU CONTENT === */
        .menu-content {
          min-height: 600px;
        }

        .menu-section {
          margin-bottom: 3rem;
          scroll-margin-top: 140px;
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
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        /* === MENU ITEM CARD === */
        .menu-item-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 1.25rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .menu-item-card:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .item-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0;
          flex: 1;
        }

        .item-price {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-accent);
          white-space: nowrap;
        }

        .item-description {
          font-size: 0.875rem;
          color: var(--color-text-dim);
          font-style: italic;
          margin: 0 0 0.75rem 0;
          line-height: 1.5;
        }

        /* === VARIANTS & ADDONS === */
        .variants-section,
        .addons-section {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border);
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

        /* === RESPONSIVE === */
        @media (max-width: 1024px) {
          .menu-grid {
            grid-template-columns: 1fr;
          }

          .menu-sidebar {
            display: none;
          }

          .hero-grid {
            grid-template-columns: 1fr;
            max-height: none;
          }

          .hero-image-wrapper {
            aspect-ratio: 16 / 10;
          }
        }

        @media (max-width: 768px) {
          .menu-container {
            padding: 1rem 0.75rem;
          }

          .category-nav {
            padding: 0.75rem 0;
          }

          .items-grid {
            grid-template-columns: 1fr;
          }

          .hero-title {
            font-size: 2rem;
          }

          .hero-subtitle {
            font-size: 0.9rem;
          }

          .section-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

// === HELPER FUNCTIONS ===

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