// useCombo50 — single source of truth for whether the COMBO50 offer is live.
// Every combo entry point (home card, menu card, banner, the /combo page itself)
// reads this, so deactivating the offer (or letting valid_till pass) makes them
// all disappear automatically.
import { useEffect, useState } from 'react';
import API_BASE from '../config/api.js';

export function useCombo50() {
  const [state, setState] = useState({ active: false, loading: true, offer: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/offers/active`);
        if (!res.ok) { if (alive) setState({ active: false, loading: false, offer: null }); return; }
        const data = await res.json();
        const offer = (data.offers || []).find(o => (o.promo_code || '').toUpperCase() === 'COMBO50');
        if (alive) setState({ active: !!offer, loading: false, offer: offer || null });
      } catch {
        if (alive) setState({ active: false, loading: false, offer: null });
      }
    })();
    return () => { alive = false; };
  }, []);

  return state;
}
