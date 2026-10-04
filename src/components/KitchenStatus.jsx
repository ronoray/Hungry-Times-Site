import { useState, useEffect } from 'react';
import API_BASE from '../config/api';

// "12:00" → "12 PM", "11:30" → "11:30 AM".
function fmt12(hhmm) {
  const [h, m] = String(hhmm || '12:00').split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

// Outside kitchen hours the only order taken is a biryani pre-order (server
// utils/kitchenHours.offHoursOrderError, owner 4 Oct 2026) — the pill says so.
const PREORDER_SHORT = 'Biryani pre-orders';
const PREORDER_LONG = 'Biryani pre-orders open';

export default function KitchenStatus({ compact = false }) {
  const [status, setStatus] = useState(null);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    let alive = true;
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/kitchen-status`);
        if (res.ok && alive) setStatus(await res.json());
      } catch {}
    };
    fetch_();
    const iv = setInterval(fetch_, 60000); // refresh every minute
    return () => { alive = false; clearInterval(iv); };
  }, []);

  // Phones have room for ~18 characters, so the closed pill alternates
  // between the opening time and the pre-order line. Reduced motion: no swap.
  const closed = !!status && !status.isOpen;
  useEffect(() => {
    if (!compact || !closed) return undefined;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
    if (reduce) return undefined;
    const iv = setInterval(() => setFlip((f) => !f), 4000);
    return () => { clearInterval(iv); setFlip(false); };
  }, [compact, closed]);

  if (!status) return null;

  const { isOpen, isClosed, closingSoon, activeOrders, estimatedWait, opensAt } = status;

  // DNA v2 pill on the paper/ivory ground. `compact` is the header version —
  // short labels so the 390px bar never wraps (badge + pill + bag icon).
  const tone = !isOpen
    ? 'bg-ht-red/10 text-ht-red'
    : closingSoon
      ? 'bg-ht-gold2 text-ht-red2'
      : 'bg-ht-veg/10 text-ht-veg';
  const dot = !isOpen ? 'bg-ht-red' : closingSoon ? 'bg-ht-gold3 motion-safe:animate-pulse' : 'bg-ht-veg';

  const opens = isClosed ? 'Closed today' : `Opens ${fmt12(opensAt)}`;
  let label;
  let spoken;
  if (!isOpen) {
    const full = `${isClosed ? 'Kitchen closed today' : `Kitchen closed — opens at ${fmt12(opensAt)}`} · ${PREORDER_LONG}`;
    label = compact ? (flip ? PREORDER_SHORT : opens) : full;
    spoken = full;
  } else if (closingSoon) label = compact ? 'Closing soon' : 'Closing soon — order now';
  else if (activeOrders > 3 && !compact) label = `Kitchen open — ~${estimatedWait} min wait`;
  else label = 'Kitchen open';

  return (
    <div
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold ${tone}`}
      role={spoken ? "img" : undefined}
      aria-label={spoken}
      title={spoken}
    >
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} />
      <span aria-hidden={spoken ? true : undefined}>{label}</span>
    </div>
  );
}
