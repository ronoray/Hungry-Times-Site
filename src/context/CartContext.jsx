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

  // helpers
  const calcUnit = (l) =>
    (Number(l.basePrice) || 0) +
    (Number(l.variant?.priceDelta) || 0) +
    (Array.isArray(l.addons) ? l.addons.reduce((s,a)=> s + (Number(a.priceDelta)||0), 0) : 0);

  const addLine = (line) => setLines(prev => {
    // merge same config
    const same = (l) =>
      l.itemId === line.itemId &&
      JSON.stringify(l.variant || null) === JSON.stringify(line.variant || null) &&
      JSON.stringify((l.addons||[]).map(a=>a.id).sort()) ===
      JSON.stringify((line.addons||[]).map(a=>a.id).sort());

    const idx = prev.findIndex(same);
    if (idx >= 0) {
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], qty: copy[idx].qty + (line.qty || 1) };
      return copy;
    }
    const key = (globalThis.crypto?.randomUUID?.() ||
                Math.random().toString(36).slice(2));
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