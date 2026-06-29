// MidWeekComboCard — homepage promo card for the Mid-Week Combo (menu item 1188).
// Self-gating by IST date: renders nothing outside 29–30 Jun 2026, matching the
// menu item's available_till='2026-06-30'. So it auto-disappears on 1 Jul with no
// code removal needed — same idiom as the Jamai headline on the WhatsApp bot.
import { Link } from 'react-router-dom';
import { trackCtaClick } from '../utils/analytics';

function comboActive() {
  const istDate = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
  return istDate >= '2026-06-29' && istDate <= '2026-06-30';
}

export default function MidWeekComboCard({ className = '' }) {
  if (!comboActive()) return null;

  return (
    <Link
      to={`/menu?search=${encodeURIComponent('Mid-Week Combo')}`}
      onClick={() => trackCtaClick('midweek_combo', 'home')}
      className={`block group relative overflow-hidden rounded-2xl border border-[#dc5f1e]/40 bg-[#161616] shadow-lg ${className}`}
    >
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 bg-[#dc5f1e]/15 text-[#f5b944] text-[10px] font-bold px-2 py-0.5 rounded-full">
            ★ MID-WEEK COMBO — TODAY &amp; TOMORROW ONLY
          </div>
          <div className="mt-1 font-extrabold text-white leading-tight">
            Chilli Chicken + Prawn Mixed Fried Rice
          </div>
          <div className="text-xs text-white/60">Our #1 starter with our #1 fried rice</div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-white/40 line-through text-sm">₹500</span>
            <span className="text-xl font-extrabold text-[#f5b944]">₹449</span>
            <span className="text-[11px] text-[#f5b944]/80 pb-0.5">save ₹51</span>
          </div>
        </div>
        <span className="self-center shrink-0 bg-[#dc5f1e] group-hover:bg-[#c5531a] text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors">
          Order →
        </span>
      </div>
    </Link>
  );
}
