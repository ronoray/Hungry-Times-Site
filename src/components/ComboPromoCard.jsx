// ComboPromoCard — tappable entry point to the /combo page. Self-gating: renders
// nothing unless COMBO50 is live, so it auto-disappears when the offer ends.
import { Link } from 'react-router-dom';
import { useCombo50 } from '../hooks/useCombo50';

const IMG = 'https://cdn.hungrytimes.in/images/gallery/combo-chilli-pork.png';

export default function ComboPromoCard({ className = '' }) {
  const { active, loading } = useCombo50();
  if (loading || !active) return null;

  return (
    <Link
      to="/combo"
      className={`block group relative overflow-hidden rounded-2xl border border-ht-red/40 bg-ht-ivory shadow-lg ${className}`}
    >
      <div className="flex items-center gap-3 p-3">
        <img src={IMG} alt="Chilli Pork Combo" loading="lazy"
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 bg-ht-red/15 text-ht-gold3 text-[10px] font-bold px-2 py-0.5 rounded-full">
            🔥 50% OFF — LIMITED TIME
          </div>
          <div className="mt-1 font-extrabold text-ht-ink leading-tight">Chilli Pork Combo</div>
          <div className="text-xs text-ht-ink">Veg Fried Rice or Chowmein + Chilli Pork</div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-ht-mute line-through text-sm">₹290</span>
            <span className="text-xl font-extrabold text-ht-gold3">₹145</span>
          </div>
        </div>
        <span className="self-center shrink-0 bg-ht-red group-hover:bg-ht-red2 text-ht-ink text-sm font-bold px-3 py-2 rounded-xl transition-colors">
          Grab it →
        </span>
      </div>
    </Link>
  );
}
