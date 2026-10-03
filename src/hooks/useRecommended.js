// useRecommended — the RECOMMENDED panel's data: real best sellers plus staff
// picks (/api/public/recommended). Any failure leaves both lists empty and the
// panel renders nothing; it must never take the menu page down with it.
import { useEffect, useState } from 'react';
import API_BASE from '../config/api.js';

const EMPTY = { bestSellers: [], featured: [], windowDays: 30, loaded: false };

export function useRecommended() {
  const [data, setData] = useState(EMPTY);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/recommended`);
        if (!res.ok) return;
        const json = await res.json();
        if (!alive) return;
        setData({
          bestSellers: Array.isArray(json?.bestSellers) ? json.bestSellers : [],
          featured: Array.isArray(json?.featured) ? json.featured : [],
          windowDays: Number(json?.windowDays) || 30,
          loaded: true,
        });
      } catch {
        // stays empty
      }
    })();
    return () => { alive = false; };
  }, []);

  return data;
}
