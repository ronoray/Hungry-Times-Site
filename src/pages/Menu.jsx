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

  if (loading)
    return (
      <div className="menu-loading">
        <div className="spinner"></div>
        <p>Loading our delicious menu...</p>
      </div>
    );

  if (err)
    return (
      <div className="menu-error">
        <p>😔 Failed to load menu. {err}</p>
      </div>
    );

  if (!data || tops.length === 0)
    return (
      <div className="menu-empty">
        <p>🍽️ No menu available yet. Check back soon!</p>
      </div>
    );

  return (
    <div className="menu-page">
      {/* === HERO SECTION === */}
      <div className="menu-hero">
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

      {/* === MENU CONTENT === */}
      <div className="menu-container">
        <div className="menu-layout">
          {/* DESKTOP SIDEBAR */}
          <aside className="desktop-sidebar">
            <div className="sidebar-sticky">
              <h3 className="sidebar-heading">Categories</h3>
              {tops.map((tc) => (
                <button
                  key={tc.id}
                  className={`sidebar-category-btn ${
                    tc.id === activeTop ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveTop(tc.id);
                    setActiveSub(tc.subcategories?.[0]?.id ?? null);
                  }}
                >
                  {tc.name}
                </button>
              ))}
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="menu-main">
            {/* MOBILE TOP CATEGORIES */}
            <nav className="mobile-top-categories">
              <h3 className="mobile-heading">Categories</h3>
              <div className="mobile-category-scroll">
                {tops.map((tc) => (
                  <button
                    key={tc.id}
                    className={`mobile-category-btn ${
                      tc.id === activeTop ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveTop(tc.id);
                      setActiveSub(tc.subcategories?.[0]?.id ?? null);
                    }}
                  >
                    {tc.name}
                  </button>
                ))}
              </div>
            </nav>

            {/* SUBCATEGORY BAR */}
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

            {/* MENU ITEMS */}
            <section className="menu-content" ref={rightPaneRef}>
              {subs.map((sc) => (
                <div key={sc.id} data-sub={sc.id} className="menu-section">
                  <h2 className="section-title">{sc.name}</h2>
                  <div className="items-grid">
                    {(itemsBySub.get(sc.id) || []).map((it) => {
                      const hasVariants = hasVariantsOrAddons(it, "variant");
                      const hasAddons = hasVariantsOrAddons(it, "addon");
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
                              {isExpanded
                                ? "− Hide Options"
                                : "+ View Options"}
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

      {/* === INLINE STYLES === */}
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --accent: #f59e0b;
          --bg: #0a0a0a;
          --surface: rgba(255,255,255,0.04);
          --surface-hover: rgba(255,255,255,0.08);
          --border: rgba(255,255,255,0.12);
          --text: #fff;
          --text-dim: rgba(255,255,255,0.7);
        }

        body, html { overflow-x: hidden; }

        .menu-page {
          background: linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);
          color: var(--text);
          min-height: 100vh;
          width: 100%;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-height: 500px;
        }

        .hero-image-wrapper { position: relative; background: #000; }
        .hero-image { width: 100%; height: 100%; object-fit: cover; }
        .hero-content-overlay { position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }

        .hero-title { font-size: clamp(2rem,5vw,3.5rem); font-weight:800; text-shadow:0 2px 20px rgba(0,0,0,0.8);}
        .hero-subtitle { font-size:clamp(0.9rem,2vw,1.25rem);}
        .cta-button { padding:0.8rem 2rem; border-radius:999px; font-weight:700; background:var(--accent); color:#fff; text-decoration:none; display:inline-block; margin:0.25rem 0; }
        .cta-button-whatsapp { background:linear-gradient(135deg,#25d366,#128c7e); }

        .menu-layout { display:grid; grid-template-columns:250px 1fr; gap:2rem; padding:2rem 1rem; }

        .desktop-sidebar { display:block; }
        .sidebar-sticky { position:sticky; top:2rem; background:var(--surface); padding:1.5rem; border:1px solid var(--border); border-radius:12px;}
        .sidebar-heading { font-size:1.25rem; color:var(--accent); font-weight:700; margin-bottom:1rem;}
        .sidebar-category-btn { display:block; width:100%; padding:0.75rem 1rem; border:1px solid var(--border); border-left:3px solid transparent; background:transparent; color:var(--text-dim); border-radius:8px; text-align:left; transition:0.3s;}
        .sidebar-category-btn.active { background:rgba(245,158,11,0.2); color:var(--accent); border-left-color:var(--accent);}
        .sidebar-category-btn:hover { background:var(--surface-hover); color:#fff;}

        .mobile-top-categories { display:none; }

        .subcategory-bar { position:sticky; top:0; background:var(--bg); border-bottom:2px solid var(--border); padding:0.75rem 0; z-index:10;}
        .subcategory-scroll { display:flex; gap:0.75rem; overflow-x:auto; scrollbar-width:thin; }
        .subcategory-btn { padding:0.5rem 1rem; border-radius:999px; border:1px solid var(--border); background:var(--surface); color:var(--text-dim); }
        .subcategory-btn.active { background:var(--accent); color:#fff;}

        .items-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1.25rem;}
        .menu-item-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem; transition:0.3s;}
        .menu-item-card:hover { background:var(--surface-hover); border-color:var(--accent);}
        .item-header { display:flex; justify-content:space-between; align-items:start; margin-bottom:0.75rem;}
        .item-price { color:var(--accent); font-weight:700;}
        .item-description { color:var(--text-dim); font-style:italic;}

        .expand-btn { width:100%; padding:0.6rem; border-radius:8px; border:1px solid var(--accent); color:var(--accent); background:rgba(245,158,11,0.2); font-weight:600; }
        .expand-btn:hover { background:var(--accent); color:#fff; }

        @media (max-width:1024px){
          .hero-grid { grid-template-columns:1fr; }
          .desktop-sidebar { display:none; }
          .mobile-top-categories { display:block; background:var(--bg); border-bottom:2px solid var(--border); padding:0.75rem 1rem;}
          .mobile-category-scroll { display:flex; gap:0.75rem; overflow-x:auto; }
          .mobile-category-btn { padding:0.5rem 1rem; border-radius:999px; border:1px solid var(--border); background:var(--surface); color:var(--text-dim);}
          .mobile-category-btn.active { background:var(--accent); color:#fff;}
          .menu-layout { grid-template-columns:1fr; padding:0; gap:0;}
          .menu-main { padding:0 1rem;}
          .items-grid { grid-template-columns:1fr;}
        }

        @media (max-width:768px){
          .section-title{font-size:1.5rem;}
          .cta-button{padding:0.75rem 1.5rem;font-size:0.9rem;}
        }
        @media (max-width:480px){
          .hero-title{font-size:1.75rem;}
          .item-name,.item-price{font-size:0.95rem;}
        }
      `}</style>
    </div>
  );
}

// === HELPERS ===
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
