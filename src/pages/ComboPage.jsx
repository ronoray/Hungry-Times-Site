// /combo — Facebook ad landing page for the ₹145 Chilli Pork Combo.
// SPA mirror of the static public/combo/index.html. Self-contained, dark theme.
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { pageView, addToCart, custom } from '../lib/fbpixel';

const COMBO = {
  code: 'COMBO50',
  price: 145,
  mrp: 290,
  ogImage:
    'https://cdn.hungrytimes.in/images/gallery/combo-chilli-pork.png',
};

const WA_NUMBER = '916290471281';

export default function ComboPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

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

  // Build the menu deep-link with UTMs forwarded.
  const menuLink = (() => {
    const qs = new URLSearchParams({ promo: COMBO.code });
    const src = params.get('utm_source');
    const med = params.get('utm_medium');
    const camp = params.get('utm_campaign');
    if (src) qs.set('utm_source', src);
    if (med) qs.set('utm_medium', med);
    if (camp) qs.set('utm_campaign', camp);
    return `/?${qs.toString()}#menu`;
  })();

  const waText = encodeURIComponent(
    `Hi Hungry Times! I want the Chilli Pork Combo at ₹145 (50% OFF) using code ${COMBO.code}. Please take my order.`
  );
  const waLink = `https://wa.me/${WA_NUMBER}?text=${waText}`;

  const handleAddToCart = () => {
    addToCart({ name: 'Chilli Pork Combo', id: COMBO.code, price: COMBO.price });
    navigate(menuLink);
  };

  const handleWhatsApp = () => {
    custom('WhatsAppOrder', { value: COMBO.price, currency: 'INR' });
    window.open(waLink, '_blank', 'noopener');
  };

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
        {/* Brand */}
        <div className="text-center mb-5">
          <div className="text-2xl font-extrabold tracking-tight">
            Hungry <span className="text-[#dc5f1e]">Times</span>
          </div>
        </div>

        {/* Hero image */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          <img
            src={COMBO.ogImage}
            alt="Chilli Pork Combo"
            className="w-full h-56 object-cover"
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

          {/* Primary CTA */}
          <button
            onClick={handleAddToCart}
            className="mt-5 w-full bg-[#dc5f1e] hover:bg-[#c5531a] text-white font-bold text-lg py-3.5 rounded-xl active:scale-[0.98] transition shadow-lg shadow-[#dc5f1e]/20"
          >
            Add to Cart — Order Online
          </button>

          {/* Secondary CTA */}
          <button
            onClick={handleWhatsApp}
            className="mt-3 w-full bg-transparent border border-[#25D366]/60 text-[#25D366] font-semibold py-3 rounded-xl active:scale-[0.98] transition"
          >
            Order on WhatsApp
          </button>
        </div>

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
          Order online, at the counter or on WhatsApp · Valid till 21 June 2026
        </p>
      </div>
    </div>
  );
}
