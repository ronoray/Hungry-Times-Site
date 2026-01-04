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

  const clearCart = () => setLines([]);

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
      // New helper functions
      findSimpleItem,
      getSimpleItemQty,
      incrementSimpleItem,
      decrementSimpleItem
    }}>
      {children}
    </CartCtx.Provider>
  );
}