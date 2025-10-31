// site/src/pages/Menu.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import "./Menu.css";

const DESC_MAX = 160;

export default function Menu() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [activeTop, setActiveTop] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="menu-loading">
        <div className="spinner"></div>
        <p>Loading our delicious menu...</p>
      </div>
    );
  }

  if (err) {
    return <div className="menu-error"><p>😔 Failed to load menu. {err}</p></div>;
  }

  if (!data || tops.length === 0) {
    return <div className="menu-empty"><p>🍽️ No menu available yet. Check back soon!</p></div>;
  }

  return (
    <div className="menu-page-wrapper">
      <div className="menu-page">
        {/* Hero */}
        <div className="menu-hero">
          <div className="hero-grid">
            <div className="hero-image-wrapper hero-black-bg">
              <div className="hero-content-overlay">
                <h1 className="hero-title">Our Menu</h1>
                <p className="hero-subtitle">Crafted with passion, served with love</p>
              </div>
            </div>
            <div className="hero-image-wrapper">
              <img src="/images/menu/menu-hero-2.jpg" alt="Hungry Times" className="hero-image" loading="eager" />
              <div className="hero-content-overlay">
                <div className="hero-cta">
                  <p className="cta-text">Ready to order?</p>
                  <a href="tel:+918420822919" className="cta-button">📞 Call 8420822919</a>
                  <a href="https://wa.me/918420822919" target="_blank" rel="noopener noreferrer" className="cta-button cta-button-whatsapp">💬 WhatsApp</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Hamburger */}
        <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span></span><span></span><span></span>
        </button>

        {/* Overlay */}
        {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Content */}
        <div className="menu-container">
          <div className="menu-layout">
            <aside className={`categories-sidebar ${sidebarOpen ? 'open' : ''}`}>
              <div className="sidebar-sticky">
                <h3 className="sidebar-heading">Categories</h3>
                <nav className="sidebar-category-list">
                  {tops.map(tc => (
                    <button key={tc.id} className={`sidebar-category-btn ${tc.id === activeTop ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(tc.id, (tc.subcategories?.[0]?.id) ?? null)}>
                      {tc.name}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="menu-main">
              <nav className="subcategory-bar">
                <div className="subcategory-scroll">
                  {subs.map(sc => (
                    <button key={sc.id} className={`subcategory-btn ${sc.id === activeSub ? 'active' : ''}`}
                      onClick={() => scrollToSub(sc.id)}>{sc.name}</button>
                  ))}
                </div>
              </nav>

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
                              <span className="item-price">₹{Number(it.basePrice || 0).toFixed(0)}</span>
                            </div>
                            {it.description && <p className="item-description">{String(it.description).slice(0, DESC_MAX)}</p>}
                            {showExpandBtn && (
                              <button className="expand-btn" onClick={() => toggleExpand(it.id)}>
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
      </div>
    </div>
  );
}

function hasVariantsOrAddons(it, type) {
  const families = (it.families || []).filter(f => f.type === type);
  if (families.length > 0) return families.some(fam => (fam.options || []).length > 0);
  if (type === 'variant') return (it.variants || []).length > 0;
  if (type === 'addon') return (it.addonGroups || []).length > 0;
  return false;
}

function renderVariants(it) {
  const famVariants = (it.families || []).filter(f => f.type === "variant");
  const blocks = famVariants.length ? famVariants : (it.variants?.length ? [{ name: "Variants", options: it.variants }] : []);
  if (!blocks.length) return null;
  
  return (
    <div className="variants-section">
      {blocks.map((blk, i) => (
        <div key={i}>
          <div className="section-label">{blk.name || "Variants"}</div>
          <div className="options-row">
            {(blk.options || []).map(opt => (
              <span key={opt.id} className="option-chip">{opt.name}{formatPriceDelta(opt.priceDelta)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderAddons(it) {
  const famAddons = (it.families || []).filter(f => f.type === "addon");
  const blocks = famAddons.length ? famAddons : (it.addonGroups?.length ? it.addonGroups : []);
  if (!blocks.length) return null;
  
  return (
    <div className="addons-section">
      {blocks.map((blk, i) => (
        <div key={i}>
          <div className="section-label">{blk.name || "Add-ons"}</div>
          <div className="options-row">
            {(blk.options || []).map(opt => (
              <span key={opt.id} className="option-chip">{opt.name}{formatPriceDelta(opt.priceDelta)}</span>
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
  return <span className="option-price-delta">{sign}₹{Math.abs(n).toFixed(0)}</span>;
}