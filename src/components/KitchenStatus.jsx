import { useState, useEffect } from 'react';
import API_BASE from '../config/api';

export default function KitchenStatus({ compact = false }) {
  const [status, setStatus] = useState(null);

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

  if (!status) return null;

  const { isOpen, closingSoon, activeOrders, estimatedWait } = status;

  // DNA v2 pill on the paper/ivory ground. `compact` is the header version —
  // short labels so the 390px bar never wraps (badge + pill + bag icon).
  const tone = !isOpen
    ? 'bg-ht-red/10 text-ht-red'
    : closingSoon
      ? 'bg-ht-gold2 text-ht-red2'
      : 'bg-ht-veg/10 text-ht-veg';
  const dot = !isOpen ? 'bg-ht-red' : closingSoon ? 'bg-ht-gold3 motion-safe:animate-pulse' : 'bg-ht-veg';

  let label;
  if (!isOpen) label = compact ? 'Opens 12 PM' : 'Kitchen closed — opens at 12 PM';
  else if (closingSoon) label = compact ? 'Closing soon' : 'Closing soon — order now';
  else if (activeOrders > 3 && !compact) label = `Kitchen open — ~${estimatedWait} min wait`;
  else label = 'Kitchen open';

  return (
    <div className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold ${tone}`}>
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${dot}`} />
      <span>{label}</span>
    </div>
  );
}
