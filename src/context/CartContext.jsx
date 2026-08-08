import { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from "react";
import API_BASE from "../config/api.js";
import { useAuth } from "./AuthContext.jsx";
import { isPackagingAddon, packagingAddonOf } from "../utils/cartLine";

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

// ─── Server cart sync ──────────────────────────────────────────────────────
//
// One logged-in account is one cart, on every device. The server owns a
// revision counter (customers.cart_rev, migration 0012) and bumps it on every
// write; we remember the last rev we saw. A rev that has moved means another
// device wrote after us, so the server copy is the newer one and we adopt it.
//
// This replaces a rule that preferred the local cart whenever it was non-empty
// and pushed it on mount. That made a stale device the winner: clear the cart
// on the phone, open the site on the desktop, and the desktop's old
// localStorage cart was pushed back over the cleared one — so the clear never
// stuck anywhere. src/main.jsx reloads any tab hidden for 60s, which ran that
// path constantly.
//
// A timestamp would have been the wrong key: the two writers are two browsers
// whose clocks disagree by an unknown amount. A counter the server owns needs
// no agreement about what time it is.
//
// Local-wins survives in exactly one place — the login boundary — because
// "I was browsing before I signed in" is a real cart that must not be dropped.
export const CART_KEY = "ht_cart";
export const CART_REV_KEY = "ht_cart_rev";
export const CART_DIRTY_KEY = "ht_cart_dirty";

function getToken() {
  return localStorage.getItem("customerToken") || null;
}

const readRev = () => Number(localStorage.getItem(CART_REV_KEY) || 0) || 0;
const writeRev = (rev) => { try { localStorage.setItem(CART_REV_KEY, String(rev)); } catch {} };
const isDirty = () => localStorage.getItem(CART_DIRTY_KEY) === "1";
const setDirty = (on) => {
  try {
    if (on) localStorage.setItem(CART_DIRTY_KEY, "1");
    else localStorage.removeItem(CART_DIRTY_KEY);
  } catch {}
};

async function fetchServerCart() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/customer/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.cart)) return null;
    // A server that predates migration 0012 sends no rev. Reading it as 0 keeps
    // this client on the old behaviour rather than breaking, which matters in
    // the window between the two repos' deploys.
    return { cart: data.cart, rev: Number(data.rev || 0) || 0 };
  } catch { return null; }
}

async function pushServerCart(cart) {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/customer/cart`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cart }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Number(data.rev || 0) || 0;
  } catch { return null; }
}
// ──────────────────────────────────────────────────────────────────────────

const SYNC_POLL_MS = 30000;

export function CartProvider({ children }) {
  const { token } = useAuth();

  const [lines, setLines] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
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

  // Debounce timer for the outbound push.
  const syncTimer = useRef(null);
  // Latest lines, readable from callbacks that must not re-subscribe on every
  // keystroke of a quantity change.
  const linesRef = useRef(lines);
  // Guards against two reconciles overlapping (a poll landing on a focus).
  const inFlight = useRef(false);
  // Distinguishes "logged in since before this mount" from a fresh login.
  const prevToken = useRef(token);

  // Persist on every change. The dirty flag is set by the mutations themselves,
  // never here, so a cart adopted from the server also reaches localStorage
  // without being mistaken for a local edit we owe the server.
  //
  // The flag lives in localStorage rather than in a ref because ComboPage writes
  // ht_cart from outside this provider (/combo is a top-level route with no
  // CartProvider) and needs a way to say it did.
  useEffect(() => {
    linesRef.current = lines;
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch {}
  }, [lines]);

  // Adopt a server cart: it becomes the truth, and is explicitly not dirty.
  const adopt = useCallback((cart, rev) => {
    setLines(cart);
    linesRef.current = cart;
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
    writeRev(rev);
    setDirty(false);
  }, []);

  // The one sync primitive. Dirty → push ours. Clean → pull, and adopt when the
  // rev has moved. An empty cart with a newer rev is a real state: that is what
  // carries a clear from one device to the others.
  const reconcile = useCallback(async () => {
    if (!getToken() || inFlight.current) return;
    inFlight.current = true;
    try {
      if (isDirty()) {
        const rev = await pushServerCart(linesRef.current);
        if (rev !== null) { writeRev(rev); setDirty(false); }
        return;
      }
      const server = await fetchServerCart();
      if (!server) return;
      if (server.rev !== readRev()) adopt(server.cart, server.rev);
    } finally {
      inFlight.current = false;
    }
  }, [adopt]);

  // Debounced push after a local edit, so dragging a quantity doesn't spam the
  // API. reconcile picks the dirty branch and sends whatever the cart is by then.
  useEffect(() => {
    if (!token || !isDirty()) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(reconcile, 1500);
    return () => clearTimeout(syncTimer.current);
  }, [lines, token, reconcile]);

  // Login / logout boundary.
  useEffect(() => {
    const had = prevToken.current;
    prevToken.current = token;

    if (!token) {
      // Logged out. AuthContext clears the stored cart keys; drop the in-memory
      // copy too so the UI matches, and so nothing is left to push into the next
      // account signed in on this device.
      if (had) { setLines([]); linesRef.current = []; writeRev(0); setDirty(false); }
      return;
    }

    if (!had) {
      // Fresh login. This is the one moment local-wins is right — a cart built
      // while browsing signed-out belongs to the account now signing in.
      if (linesRef.current.length > 0) { setDirty(true); reconcile(); return; }
      // Nothing local: take whatever the account already has, whatever our
      // stored rev says, because that rev belonged to a different session.
      fetchServerCart().then((server) => { if (server) adopt(server.cart, server.rev); });
      return;
    }

    reconcile();
  }, [token, reconcile, adopt]);

  // Stay fresh: on return to the tab, and on a slow poll while it is visible.
  // Same idiom as the rest of the site (ActiveOrderBar 15s, Menu 30s).
  useEffect(() => {
    if (!token) return;
    const onVisible = () => { if (document.visibilityState === "visible") reconcile(); };
    window.addEventListener("focus", reconcile);
    document.addEventListener("visibilitychange", onVisible);
    const id = setInterval(onVisible, SYNC_POLL_MS);
    return () => {
      window.removeEventListener("focus", reconcile);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(id);
    };
  }, [token, reconcile]);

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
  // Every mutation below marks the cart dirty before touching state, so the next
  // reconcile pushes ours instead of pulling. Marking on a no-op edit is harmless
  // — the push just re-sends the same cart and costs a rev.
  const addLine = (line) => { setDirty(true); setLines(prev => {
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
  }); };

  const removeLine = (key) => {
    setDirty(true);
    setLines(prev => prev.filter(l => l.key !== key));
  };

  // ✅ UPDATED: Remove item if quantity becomes 0
  const updateQty = (key, qty) => {
    const newQty = Math.max(0, Number(qty) || 0);
    setDirty(true);
    if (newQty === 0) {
      // Remove item when quantity is 0
      setLines(prev => prev.filter(l => l.key !== key));
    } else {
      setLines(prev => prev.map(l => l.key === key ? { ...l, qty: newQty } : l));
    }
  };

  // Clearing pushes immediately rather than waiting on the debounce: this is the
  // change most likely to be followed by closing the tab, and an empty cart that
  // never reached the server is exactly the bug this file exists to fix.
  const clearCart = () => {
    setDirty(true);
    setLines([]);
    linesRef.current = [];
    reconcile();
  };

  // ============================================================================
  // RECONCILE CART PRICES WITH FRESH MENU DATA
  // Fixes stale priceDelta values in localStorage (e.g. after a server-side fix).
  // Can be called directly with already-fetched menu items (Menu.jsx path),
  // or auto-triggered on mount (covers /order and other pages).
  // ============================================================================

  const reconcileWithMenu = useCallback((allItems) => {
    // Build lookup: itemId → { basePrice, variantPrices, addonPrices }
    //
    // TWO maps, and the key is id + name. Never one flat map keyed on the bare
    // id — that is exactly the bug this function shipped with.
    //
    // Options come from three independent AUTOINCREMENT tables whose ids
    // overlap: variant 9 is "Large" (₹130 on Bacon & Ham Diff Fried Rice) while
    // addon 9 is "Ham" (₹50). A single Map<id, price> filled variants → families
    // → addons let Ham overwrite Large, and this function then quietly rewrote
    // the cart line from 130 down to 50. Order #253 on 3 Aug 2026 was charged
    // ₹330 for a ₹410 dish, and 192 option pairs across ~100 items can do it.
    //
    // Splitting by cart array is necessary but NOT sufficient: an addon-type
    // family member lands in line.addons alongside real add-ons, so item 432
    // carries both family member 17 "Three Parathas" (₹120) and addon 17
    // "Packaging" (₹10). Hence id + name.
    //
    // The split below must mirror how AddToCartModal builds a line — families
    // with type 'addon' go to addons, everything else to variants. Change one
    // and you must change the other.
    const keyOf = (id, name) => `${id}|${String(name || "").trim().toLowerCase()}`;

    const lookup = new Map();
    for (const item of allItems) {
      const variantPrices = new Map();
      const addonPrices = new Map();
      for (const v of (item.variants || [])) variantPrices.set(keyOf(v.id, v.name), v.priceDelta);
      for (const fam of (item.families || [])) {
        const target = String(fam.type).toLowerCase() === "addon" ? addonPrices : variantPrices;
        for (const opt of (fam.options || [])) target.set(keyOf(opt.id, opt.name), opt.priceDelta);
      }
      for (const g of (item.addonGroups || [])) {
        for (const opt of (g.options || [])) addonPrices.set(keyOf(opt.id, opt.name), opt.priceDelta);
      }
      lookup.set(item.id, { basePrice: item.basePrice, variantPrices, addonPrices });
    }

    setLines(prev => {
      let anyChanged = false;
      const next = prev.map(line => {
        const info = lookup.get(line.itemId);
        if (!info) return line;

        let lineChanged = false;
        const newBase = info.basePrice !== undefined ? info.basePrice : line.basePrice;
        if (newBase !== line.basePrice) lineChanged = true;

        // A miss leaves the stored price untouched. Never fall back to the other
        // map, and never default to 0 — an option we fail to recognise must not
        // become free. The server reprices from the database on checkout, so a
        // stale value here cannot reach a bill.
        const reprice = (list, priceMap) =>
          Array.isArray(list)
            ? list.map(o => {
                const fresh = priceMap.get(keyOf(o.id, o.name));
                if (fresh !== undefined && fresh !== o.priceDelta) {
                  lineChanged = true;
                  return { ...o, priceDelta: fresh };
                }
                return o;
              })
            : list;

        const newVariants = reprice(line.variants, info.variantPrices);
        const newAddons = reprice(line.addons, info.addonPrices);

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
    const stored = (() => { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; } })();
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
   * Find cart line for a simple item — no variants, and no addon the customer
   * actually chose.
   *
   * Packaging does not disqualify a line. It is attached to every dish, it is
   * locked, and the customer never picks it, so a dish whose only addon is
   * packaging still belongs to the +/- controls. Requiring zero addons meant
   * these lines were invisible to this lookup, and the quantity controls would
   * add a second, duplicate line instead of incrementing the first.
   */
  const findSimpleItem = (itemId) => {
    return lines.find(l =>
      l.itemId === itemId &&
      (!l.variants || l.variants.length === 0) &&
      (l.addons || []).every(isPackagingAddon)
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
      // Packaging has to ride along. AddToCartModal locks it onto every line it
      // builds and the server adds it at order time regardless, so a line
      // without it shows a total below what the customer is charged. This path
      // used to always send addons: [], which was harmless only because every
      // item with an addon went through the modal instead.
      const pkg = packagingAddonOf(item);
      addLine({
        itemId: item.id,
        itemName: item.name,
        name: item.name,
        basePrice: parseFloat(item.basePrice || 0),
        variants: [],
        addons: pkg ? [pkg] : [],
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