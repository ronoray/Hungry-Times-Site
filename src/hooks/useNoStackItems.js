// useNoStackItems — which menu items forbid promo codes and loyalty redemption.
//
// Fixed-price bundles (the Mid-Week Combo) already carry their saving in the
// price, so the server refuses any code or points on a cart containing one. The
// checkout previously had no idea: it offered the loyalty slider, showed a
// discount, and the server discarded it — so the customer was charged more than
// the total they had approved. One combo is accidentally shielded by the ₹500
// offer floor, but two clear it, which is where the gap actually opened.
//
// Ids rather than a flag on the cart line, so this works for a cart restored
// from localStorage that predates the flag.
import { useEffect, useState } from 'react';
import API_BASE from '../config/api.js';

export function useNoStackItems() {
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/no-stack-items`);
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data?.itemIds)) {
          setIds(new Set(data.itemIds.map(String)));
        }
      } catch {
        // Leave the set empty — checkout behaves as it did before.
      }
    })();
    return () => { alive = false; };
  }, []);

  return ids;
}

/** True when any cart line is a fixed-price bundle. */
export function cartHasNoStack(lines, noStackIds) {
  if (!noStackIds || noStackIds.size === 0) return false;
  return (lines || []).some((l) =>
    noStackIds.has(String(l?.itemId ?? l?.id ?? ''))
  );
}
