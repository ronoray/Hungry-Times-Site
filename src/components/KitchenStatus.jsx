import { useState, useEffect } from 'react';
import API_BASE from '../config/api';

export default function KitchenStatus() {
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

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
      !isOpen ? 'bg-red-500/10 text-red-400 border border-red-500/20'
      : closingSoon ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
      : 'bg-green-500/10 text-green-400 border border-green-500/20'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        !isOpen ? 'bg-red-500' : closingSoon ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
      }`} />
      {!isOpen ? (
        <span>Kitchen Closed — Opens at 12 PM</span>
      ) : closingSoon ? (
        <span>Closing Soon — Order now!</span>
      ) : activeOrders > 3 ? (
        <span>Kitchen Open — ~{estimatedWait} min wait</span>
      ) : (
        <span>Kitchen Open</span>
      )}
    </div>
  );
}
