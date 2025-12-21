import { createContext, useContext, useMemo, useState, useEffect } from "react";

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ht_cart") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("ht_cart", JSON.stringify(lines));
  }, [lines]);

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
    return [...prev, { ...line, qty: line.qty || 1, key }];
  });

  const removeLine = (key) =>
    setLines(prev => prev.filter(l => l.key !== key));

  const updateQty = (key, qty) =>
    setLines(prev => prev.map(l => l.key === key ? { ...l, qty: Math.max(1, Number(qty)||1) } : l));

  const clearCart = () => setLines([]);

  const total = useMemo(
    () => lines.reduce((s, l) => s + calcUnit(l) * (l.qty || 1), 0),
    [lines]
  );

  return (
    <CartCtx.Provider value={{ lines, addLine, removeLine, updateQty, clearCart, total, calcUnit }}>
      {children}
    </CartCtx.Provider>
  );
}