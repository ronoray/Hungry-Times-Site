import { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from "react";
import API_BASE from "../config/api.js";

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

// ─── Server cart helpers ───────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("customerToken") || null;
}

async function fetchServerCart() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/customer/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.cart) ? data.cart : null;
  } catch { return null; }
}

async function pushServerCart(cart) {
  const token = getToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE}/customer/cart`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cart }),
    });
  } catch {}
}
// ──────────────────────────────────────────────────────────────────────────

export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ht_cart") || "[]"); }
    catch { return []; }
  });

  const [orderMode, setOrderMode] = useState(() => {
    try { return localStorage.getItem("ht_order_mode") || "delivery"; }
    catch { return "delivery"; }
  });

  const updateOrderMode = (mode) => {
    setOrderMode(mode);
    try { localStorage.setItem("ht_order_mode", mode); } catch {}
  };

  // Debounce timer ref for server push
  const syncTimer = useRef(null);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem("ht_cart", JSON.stringify(lines));
  }, [lines]);

  // Debounced push to server whenever lines change (only if logged in)
  useEffect(() => {
    if (!getToken()) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => pushServerCart(lines), 1500);
    return () => clearTimeout(syncTimer.current);
  }, [lines]);

  // On mount (or when token appears), sync cart from server
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetchServerCart().then(serverCart => {
      if (!serverCart) return;
      setLines(local => {
        // If local cart is non-empty keep it (user was browsing before login)
        // and push it to server so both devices converge.
        // If local is empty, use server cart.
        if (local.length > 0) {
          pushServerCart(local);
          return local;
        }
        return serverCart;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // CALCULATE UNIT PRICE - Support both singular and array variants
  // ============================================================================
  const calcUnit = (l) => {
    const basePrice = Number(l.basePrice) || 0;
    
    // Handle both old (singular variant) and new (array variants) structure
    let variantPrice = 0;
    if (Array.isArray(l.variants)) {
      // New structure: variants array
      variantPrice = l.variants.reduce((sum, v) => sum + (Number(v.priceDelta) || 0), 0);
    } else if (l.variant) {
      // Old structure: singular variant
      variantPrice = Number(l.variant.priceDelta) || 0;
    }
    
    // Addons always array
    const addonPrice = Array.isArray(l.addons) 
      ? l.addons.reduce((s, a) => s + (Number(a.priceDelta) || 0), 0) 
      : 0;
    
    return basePrice + variantPrice + addonPrice;
  };

  // ============================================================================
  // ADD LINE - Support both singular and array variants
  // ✅ CRITICAL FIX: Explicitly preserve ALL fields including itemName
  // ============================================================================
  const addLine = (line) => setLines(prev => {
    // Merge same config
    const same = (l) => {
      // Compare item IDs
      if (l.itemId !== line.itemId) return false;
      
      // Compare variants (handle both singular and array)
      const lVariants = Array.isArray(l.variants) 
        ? l.variants 
        : (l.variant ? [l.variant] : []);
      const lineVariants = Array.isArray(line.variants) 
        ? line.variants 
        : (line.variant ? [line.variant] : []);
      
      const variantsMatch = JSON.stringify(lVariants.map(v => v.id).sort()) === 
                           JSON.stringify(lineVariants.map(v => v.id).sort());
      
      // Compare addons
      const addonsMatch = JSON.stringify((l.addons || []).map(a => a.id).sort()) ===
                         JSON.stringify((line.addons || []).map(a => a.id).sort());
      
      return variantsMatch && addonsMatch;
    };

    const idx = prev.findIndex(same);
    if (idx >= 0) {
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], qty: copy[idx].qty + (line.qty || 1) };
      return copy;
    }
    
    const key = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    
    // ✅ CRITICAL FIX: Explicitly construct cart item with ALL required fields
    // This ensures itemName is preserved from AddToCartModal
    return [...prev, {
      key,
      itemId: line.itemId,
      itemName: line.itemName || line.name,  // ✅ Primary field
      name: line.name || line.itemName,      // ✅ Fallback field
      basePrice: line.basePrice,
      variants: line.variants || [],
      addons: line.addons || [],
      qty: line.qty || 1
    }];
  });

  const removeLine = (key) =>
    setLines(prev => prev.filter(l => l.key !== key));

  // ✅ UPDATED: Remove item if quantity becomes 0
  const updateQty = (key, qty) => {
    const newQty = Math.max(0, Number(qty) || 0);
    if (newQty === 0) {
      // Remove item when quantity is 0
      setLines(prev => prev.filter(l => l.key !== key));
    } else {
      setLines(prev => prev.map(l => l.key === key ? { ...l, qty: newQty } : l));
    }
  };

  const clearCart = () => {
    setLines([]);
    pushServerCart([]);
  };

  // ============================================================================
  // RECONCILE CART PRICES WITH FRESH MENU DATA
  // Fixes stale priceDelta values in localStorage (e.g. after a server-side fix).
  // Can be called directly with already-fetched menu items (Menu.jsx path),
  // or auto-triggered on mount (covers /order and other pages).
  // ============================================================================

  const reconcileWithMenu = useCallback((allItems) => {
    // Build lookup: itemId → { basePrice, priceById (covers both variants and addon options) }
    const lookup = new Map();
    for (const item of allItems) {
      const priceById = new Map();
      for (const v of (item.variants || [])) priceById.set(v.id, v.priceDelta);
      for (const fam of (item.families || [])) {
        for (const opt of (fam.options || [])) priceById.set(opt.id, opt.priceDelta);
      }
      for (const g of (item.addonGroups || [])) {
        for (const opt of (g.options || [])) priceById.set(opt.id, opt.priceDelta);
      }
      lookup.set(item.id, { basePrice: item.basePrice, priceById });
    }

    setLines(prev => {
      let anyChanged = false;
      const next = prev.map(line => {
        const info = lookup.get(line.itemId);
        if (!info) return line;

        let lineChanged = false;
        const newBase = info.basePrice !== undefined ? info.basePrice : line.basePrice;
        if (newBase !== line.basePrice) lineChanged = true;

        const newVariants = Array.isArray(line.variants)
          ? line.variants.map(v => {
              const fresh = info.priceById.get(v.id);
              if (fresh !== undefined && fresh !== v.priceDelta) { lineChanged = true; return { ...v, priceDelta: fresh }; }
              return v;
            })
          : line.variants;

        const newAddons = Array.isArray(line.addons)
          ? line.addons.map(a => {
              const fresh = info.priceById.get(a.id);
              if (fresh !== undefined && fresh !== a.priceDelta) { lineChanged = true; return { ...a, priceDelta: fresh }; }
              return a;
            })
          : line.addons;

        if (lineChanged) {
          anyChanged = true;
          return { ...line, basePrice: newBase, variants: newVariants, addons: newAddons };
        }
        return line;
      });
      return anyChanged ? next : prev;
    });
  }, []);

  // Auto-reconcile on mount: silently fetch fresh menu in the background and
  // correct any stale priceDelta values that may be cached in localStorage.
  useEffect(() => {
    // No cart items — nothing to reconcile
    const stored = (() => { try { return JSON.parse(localStorage.getItem("ht_cart") || "[]"); } catch { return []; } })();
    if (stored.length === 0) return;

    fetch(`${API_BASE}/public/menu`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.topCategories) return;
        const allItems = [];
        for (const tc of data.topCategories) {
          for (const sc of (tc.subcategories || [])) {
            for (const item of (sc.items || [])) allItems.push(item);
          }
        }
        if (allItems.length > 0) reconcileWithMenu(allItems);
      })
      .catch(() => {}); // never surface errors to the user
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once per page-load

  const total = useMemo(
    () => lines.reduce((s, l) => s + calcUnit(l) * (l.qty || 1), 0),
    [lines]
  );

  // ============================================================================
  // NEW: Helper functions for Menu page +/- controls
  // ============================================================================
  
  /**
   * Find cart line for a simple item (no variants/addons)
   * Returns the line if found, null otherwise
   */
  const findSimpleItem = (itemId) => {
    return lines.find(l => 
      l.itemId === itemId && 
      (!l.variants || l.variants.length === 0) && 
      (!l.addons || l.addons.length === 0)
    ) || null;
  };

  /**
   * Get quantity for a simple item (no variants/addons)
   * Returns 0 if not in cart
   */
  const getSimpleItemQty = (itemId) => {
    const line = findSimpleItem(itemId);
    return line ? line.qty : 0;
  };

  /**
   * Increment quantity for a simple item
   * Adds to cart if not present
   */
  const incrementSimpleItem = (item) => {
    const existingLine = findSimpleItem(item.id);
    
    if (existingLine) {
      // Item exists, increment quantity
      updateQty(existingLine.key, existingLine.qty + 1);
    } else {
      // Item not in cart, add it
      addLine({
        itemId: item.id,
        itemName: item.name,
        name: item.name,
        basePrice: parseFloat(item.basePrice || 0),
        variants: [],
        addons: [],
        qty: 1
      });
    }
  };

  /**
   * Decrement quantity for a simple item
   * Removes from cart if quantity becomes 0
   */
  const decrementSimpleItem = (itemId) => {
    const line = findSimpleItem(itemId);
    if (line) {
      updateQty(line.key, line.qty - 1);  // Will auto-remove if qty becomes 0
    }
  };

  return (
    <CartCtx.Provider value={{
      lines,
      addLine,
      removeLine,
      updateQty,
      clearCart,
      total,
      calcUnit,
      reconcileWithMenu,
      findSimpleItem,
      getSimpleItemQty,
      incrementSimpleItem,
      decrementSimpleItem,
      orderMode,
      updateOrderMode,
    }}>
      {children}
    </CartCtx.Provider>
  );
}