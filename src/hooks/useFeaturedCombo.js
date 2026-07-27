// useFeaturedCombo — single source of truth for the fixed-price combo card.
//
// Mirrors useCombo50: every combo surface reads this, so clearing the item's
// availability (or unticking "Fixed-price bundle") in the ops Menu Manager makes
// them all disappear on their own. The price, savings, parcel price and day
// window all come from the server's /public/featured-combo, which reads the menu
// row itself — the card previously hardcoded "Mon–Thu", "₹500", "₹449" and
// "save ₹51", so any reprice silently turned the homepage into a false claim.
import { useEffect, useState } from 'react';
import API_BASE from '../config/api.js';

export function useFeaturedCombo() {
  const [state, setState] = useState({ combo: null, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/featured-combo`);
        if (!res.ok) { if (alive) setState({ combo: null, loading: false }); return; }
        const data = await res.json();
        if (alive) setState({ combo: data?.ok ? data.combo : null, loading: false });
      } catch {
        if (alive) setState({ combo: null, loading: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  return state;
}
