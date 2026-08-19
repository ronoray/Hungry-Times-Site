// useFulfilmentRules — loads the item ids behind the two fulfilment rules.
//
//   dineInOnly     Most drinks have no packaging, so they cannot be delivered
//                  or picked up. Only the sealed bottles and cans go out.
//   needsCompanion A dip cannot be the whole order.
//   extras         Do not count as the food that satisfies needsCompanion, so a
//                  dip plus a bottle of water is still not an order.
//
// Ids rather than flags on the cart line, following useNoStackItems — a cart
// restored from localStorage predates these flags and would otherwise slip past
// every check. The server gate remains the authority; this exists so the
// customer finds out while they can still fix it, rather than being rejected at
// payment.
//
// The rule itself lives in ../lib/fulfilmentRules.js so it can be unit-tested
// without a DOM (this file reaches window via the API config).
import { useEffect, useState } from 'react';
import API_BASE from '../config/api.js';

export { cartFulfilmentBlock } from '../lib/fulfilmentRules.js';

const EMPTY = { dineInOnly: new Set(), needsCompanion: new Set(), extras: new Set() };

export function useFulfilmentRules() {
  const [rules, setRules] = useState(EMPTY);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/fulfilment-rules`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setRules({
          dineInOnly: new Set((data?.dineInOnlyIds || []).map(String)),
          needsCompanion: new Set((data?.needsCompanionIds || []).map(String)),
          extras: new Set((data?.extraIds || []).map(String)),
        });
      } catch {
        // Leave the sets empty — checkout behaves as it did before, and the
        // server still refuses anything it should.
      }
    })();
    return () => { alive = false; };
  }, []);

  return rules;
}
