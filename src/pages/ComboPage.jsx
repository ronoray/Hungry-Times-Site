// /combo — Facebook ad landing page for the ₹145 Chilli Pork Combo.
// SPA mirror of the static public/combo/index.html. Self-contained, dark theme.
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { pageView, addToCart, custom } from '../lib/fbpixel';
import { useCombo50 } from '../hooks/useCombo50';
import API_BASE from '../config/api.js';

const COMBO = {
  code: 'COMBO50',
  price: 145,
  mrp: 290,
  ogImage:
    'https://cdn.hungrytimes.in/images/gallery/combo-chilli-pork.png',
};

// The two combo menu items COMBO50 is restricted to (server-enforced too).
const VARIANTS = [
  { id: 231, name: 'Veg Fried Rice with Chilli Pork', label: 'Veg Fried Rice + Chilli Pork', basePrice: 290 },
  { id: 236, name: 'Veg Chowmein with Chilli Pork',   label: 'Veg Chowmein + Chilli Pork',   basePrice: 290 },
];

const WA_NUMBER = '916290471281';

// Append the chosen combo item to the persisted cart (ht_cart in localStorage),
// matching CartContext's line shape so /order picks it up. No CartProvider needed
// on this standalone page.
function addComboToLocalCart(combo, addons = []) {
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('ht_cart') || '[]'); } catch { cart = []; }
  const addonKey = (arr) => (arr || []).map(a => a.id).sort().join(',');
  const wantKey = addonKey(addons);
  const idx = cart.findIndex(
    l => l.itemId === combo.id && (l.variants || []).length === 0 && addonKey(l.addons) === wantKey
  );
  if (idx >= 0) {
    cart[idx].qty = (cart[idx].qty || 1) + 1;
  } else {
    cart.push({
      key: globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
      itemId: combo.id,
      itemName: combo.name,
      name: combo.name,
      basePrice: combo.basePrice,
      variants: [],
      addons,
      qty: 1,
    });
  }
  try {
    localStorage.setItem('ht_cart', JSON.stringify(cart));
    sessionStorage.setItem('ht_promo', COMBO.code);
  } catch { /* storage blocked — ignore */ }
}

export default function ComboPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState(null); // chosen combo item id
  const { active, loading } = useCombo50();

  // Per-item add-ons (packaging + optional extras) pulled from the live menu so the
  // combo flow carries the SAME packaging + add-ons the normal menu modal would.
  // Without this the combo line was sent with addons:[] — dropping the ₹10 packaging
  // and hiding the Prawns/Pork/Egg/Chicken extras. Keyed by item id →
  // { packaging: {id,name,priceDelta,locked}|null, extras: [...] }.
  const [addonsByItem, setAddonsByItem] = useState({});
  const [selectedExtras, setSelectedExtras] = useState({}); // { [optionId]: option }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/menu`, { headers: { 'Cache-Control': 'no-cache' } });
        if (!res.ok) return;
        const json = await res.json();
        const allItems = [];
        for (const tc of (json.topCategories || [])) {
          for (const sc of (tc.subcategories || [])) {
            for (const it of (sc.items || [])) allItems.push(it);
          }
        }
        const map = {};
        for (const v of VARIANTS) {
          const it = allItems.find(i => Number(i.id) === v.id);
          if (!it) continue;
          const opts = (it.addonGroups || []).flatMap(g => g.options || []);
          const packaging = opts.find(o => /packag/i.test(o.name || '') || o.locked) || null;
          const extras = opts.filter(o => !/packag/i.test(o.name || '') && !o.locked);
          map[v.id] = {
            packaging: packaging
              ? { id: packaging.id, name: packaging.name, priceDelta: Number(packaging.priceDelta) || 0, locked: true }
              : null,
            extras: extras.map(o => ({ id: o.id, name: o.name, priceDelta: Number(o.priceDelta) || 0, locked: false })),
          };
        }
        if (alive) setAddonsByItem(map);
      } catch { /* ignore — server still enforces packaging at checkout */ }
    })();
    return () => { alive = false; };
  }, []);

  // Offer ended → don't show a stale ₹145 page; send them to the live menu.
  useEffect(() => {
    if (!loading && !active) navigate('/menu', { replace: true });
  }, [loading, active, navigate]);

  // Capture UTMs + promo on mount, fire PageView, set title.
  useEffect(() => {
    const utm = {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      offer: params.get('offer') || undefined,
    };
    try {
      sessionStorage.setItem('ht_utm', JSON.stringify(utm));
      sessionStorage.setItem('ht_promo', COMBO.code);
    } catch {
      /* sessionStorage may be unavailable (private mode) — ignore */
    }
    pageView();
    document.title = '50% OFF — Chilli Pork Combo at ₹145 🔥 | Hungry Times';
  }, [params]);

  const chosen = VARIANTS.find(v => v.id === selected) || null;
  const chosenAddons = (chosen && addonsByItem[chosen.id]) || { packaging: null, extras: [] };

  const toggleExtra = (opt) => {
    setSelectedExtras(prev => {
      const next = { ...prev };
      if (next[opt.id]) delete next[opt.id]; else next[opt.id] = opt;
      return next;
    });
  };

  const extrasTotal = Object.values(selectedExtras).reduce((s, o) => s + (Number(o.priceDelta) || 0), 0);

  const waText = encodeURIComponent(
    `Hi Hungry Times! I want the ${chosen ? chosen.label : 'Chilli Pork Combo'} at ₹145 (50% OFF) using code ${COMBO.code}. Please take my order.`
  );
  const waLink = `https://wa.me/${WA_NUMBER}?text=${waText}`;

  const handleAddToCart = () => {
    if (!chosen) return; // must pick a combo first
    const addons = [];
    if (chosenAddons.packaging) addons.push(chosenAddons.packaging);
    addons.push(...Object.values(selectedExtras));
    addComboToLocalCart(chosen, addons);
    addToCart({ name: chosen.name, id: COMBO.code, price: COMBO.price });
    navigate('/order');
  };

  const handleWhatsApp = () => {
    custom('WhatsAppOrder', { value: COMBO.price, currency: 'INR' });
    window.open(waLink, '_blank', 'noopener');
  };

  // While the offer-active check resolves, render the page (FB clickers see it
  // instantly). The effect above redirects if it turns out inactive.
  if (!loading && !active) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(COMBO.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-[#f0ece6] px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* Brand — tappable so it's not a dead-end */}
        <div className="text-center mb-5">
          <Link to="/menu" className="text-2xl font-extrabold tracking-tight inline-block">
            Hungry <span className="text-[#dc5f1e]">Times</span>
          </Link>
        </div>

        {/* Hero image */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          <img
            src={COMBO.ogImage}
            alt="Chilli Pork Combo"
            className="block w-full h-auto"
            loading="eager"
          />
        </div>

        {/* Card */}
        <div className="mt-5 bg-[#161616] rounded-2xl border border-white/10 p-5">
          <div className="inline-flex items-center gap-2 bg-[#dc5f1e]/15 text-[#f5b944] text-xs font-bold px-3 py-1 rounded-full">
            🔥 50% OFF — LIMITED TIME
          </div>

          <h1 className="mt-3 text-2xl font-extrabold leading-tight">
            Chilli Pork Combo
          </h1>
          <p className="mt-1 text-sm text-[#f0ece6]/70">
            Veg Fried Rice <span className="text-[#f0ece6]/40">or</span> Veg
            Chowmein <span className="text-[#dc5f1e] font-semibold">+ Chilli Pork</span>
          </p>

          {/* Price */}
          <div className="mt-4 flex items-end gap-3">
            <span className="text-[#f0ece6]/40 line-through text-lg">₹{COMBO.mrp}</span>
            <span className="text-4xl font-extrabold text-[#f5b944]">₹{COMBO.price}</span>
            <span className="mb-1 text-xs font-bold text-[#dc5f1e]">
              SAVE ₹{COMBO.mrp - COMBO.price}
            </span>
          </div>

          {/* Code + copy */}
          <div className="mt-4 flex items-center justify-between bg-[#0b0b0b] border border-dashed border-[#dc5f1e]/50 rounded-xl px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#f0ece6]/50">
                Use code
              </div>
              <div className="text-lg font-extrabold text-[#f5b944]">{COMBO.code}</div>
            </div>
            <button
              onClick={copyCode}
              className="text-sm font-semibold px-3 py-2 rounded-lg bg-[#dc5f1e]/15 text-[#f5b944] active:scale-95 transition"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          {/* Pick your combo — required before adding to cart */}
          <div className="mt-5">
            <div className="text-xs font-semibold text-[#f0ece6]/70 mb-2">Choose your combo</div>
            <div className="grid grid-cols-1 gap-2">
              {VARIANTS.map(v => {
                const on = selected === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setSelected(v.id); setSelectedExtras({}); }}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      on ? 'border-[#dc5f1e] bg-[#dc5f1e]/10' : 'border-white/10 bg-[#0b0b0b]'
                    }`}
                  >
                    <span className="font-semibold text-sm">{v.label}</span>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] ${
                      on ? 'border-[#dc5f1e] bg-[#dc5f1e] text-white' : 'border-white/30'
                    }`}>{on ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add-ons — packaging (auto-added for pickup/delivery) + optional extras */}
          {chosen && (
            <div className="mt-4">
              {chosenAddons.packaging && (
                <div className="flex items-center justify-between text-xs text-[#f0ece6]/60 mb-2">
                  <span>{chosenAddons.packaging.name} — added for pickup/delivery</span>
                  <span>+₹{chosenAddons.packaging.priceDelta}</span>
                </div>
              )}
              {chosenAddons.extras.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-[#f0ece6]/70 mb-2">Add extras (optional)</div>
                  <div className="flex flex-wrap gap-2">
                    {chosenAddons.extras.map(opt => {
                      const on = !!selectedExtras[opt.id];
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleExtra(opt)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            on ? 'border-[#dc5f1e] bg-[#dc5f1e]/15 text-[#f5b944]' : 'border-white/15 bg-[#0b0b0b] text-[#f0ece6]/70'
                          }`}
                        >
                          {opt.name} +₹{opt.priceDelta}{on ? ' ✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                  {extrasTotal > 0 && (
                    <div className="mt-2 text-xs text-[#f0ece6]/50">Extras: +₹{extrasTotal} (added to your bill)</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Primary CTA — disabled until a combo is chosen */}
          <button
            onClick={handleAddToCart}
            disabled={!chosen}
            className="mt-4 w-full bg-[#dc5f1e] hover:bg-[#c5531a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#dc5f1e]/20"
          >
            {chosen ? 'Add to Cart — Order Online' : 'Pick a combo above'}
          </button>

          {/* Secondary CTA */}
          <button
            onClick={handleWhatsApp}
            className="mt-3 w-full bg-transparent border border-[#25D366]/60 text-[#25D366] font-semibold py-3 rounded-xl active:scale-[0.98] transition"
          >
            Order on WhatsApp
          </button>
        </div>

        {/* Escape hatch — explore the rest of the menu (no dead-end) */}
        <Link
          to="/menu"
          className="mt-4 block text-center text-sm text-[#f0ece6]/60 hover:text-[#f5b944] transition"
        >
          View full menu →
        </Link>

        {/* Trust strip */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-[#f0ece6]/70">
          <div className="bg-[#161616] rounded-xl py-2.5 border border-white/5">
            ⏱️ 30–45 min
          </div>
          <div className="bg-[#161616] rounded-xl py-2.5 border border-white/5">
            📍 Dhakuria, Kolkata
          </div>
          <div className="bg-[#161616] rounded-xl py-2.5 border border-white/5">
            🕛 12–11 PM
          </div>
        </div>

        {/* Fine print */}
        <p className="mt-5 text-[11px] leading-relaxed text-[#f0ece6]/45 text-center">
          Code {COMBO.code} · 50% off · Min order ₹200 · One use per customer ·
          Order online, at the counter or on WhatsApp · Valid till 31 July 2026
        </p>
      </div>
    </div>
  );
}
