import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";

// Restaurant location (Hungry Times, Kolkata) - UPDATE THESE WITH YOUR ACTUAL COORDINATES
const RESTAURANT_LAT = 22.5726;
const RESTAURANT_LNG = 88.3639;
const MAX_DELIVERY_DISTANCE_KM = 3;

function Money({ value }) { 
  return <span>₹ {Number(value || 0).toFixed(0)}</span>; 
}

function Required() { 
  return <span className="text-red-400">*</span>; 
}

// Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function ItemModal({ open, onClose, item }) {
  const { addLine } = useCart();
  const [qty, setQty] = useState(1);
  const [legacyVariantId, setLegacyVariantId] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState(new Set());
  const [lockedAddonIds, setLockedAddonIds] = useState(new Set());
  const [familySelections, setFamilySelections] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setQty(1);
    setLegacyVariantId(null);
    setSelectedAddons(new Set());
    setLockedAddonIds(new Set());
    setFamilySelections({});
    setErrors({});
  }, [open, item?.id]);

  const safeItem = item ?? { basePrice: 0, variants: [], addonGroups: [], families: [] };

  useEffect(() => {
    if (!open || !item) return;
    const next = new Set();
    const locked = new Set();

    const consume = (opts = []) => {
      for (const o of opts) {
        if (o?.locked) {
          next.add(o.id);
          locked.add(o.id);
        }
      }
    };

    for (const g of (safeItem.addonGroups || [])) consume(g.options);
    for (const f of (safeItem.families || [])) if (f.type === "addon") consume(f.options);

    setSelectedAddons(next);
    setLockedAddonIds(locked);
  }, [open, item?.id]);

  const legacyVariant = Array.isArray(safeItem.variants)
    ? safeItem.variants.find(v => v.id === legacyVariantId) || null
    : null;

  const famOptionById = (fam, id) => (fam.options || []).find(o => o.id === id) || null;

  const price = useMemo(() => {
    let total = Number(safeItem.basePrice || 0);
    if (legacyVariant) total += Number(legacyVariant.priceDelta || 0);

    for (const f of (safeItem.families || [])) {
      if (f.type !== "variant") continue;
      const pickId = familySelections[f.id];
      const opt = famOptionById(f, pickId);
      if (opt) total += Number(opt.priceDelta || 0);
    }

    const allAddonOptions = [];
    for (const g of (safeItem.addonGroups || [])) allAddonOptions.push(...(g.options || []));
    for (const f of (safeItem.families || [])) if (f.type === "addon") allAddonOptions.push(...(f.options || []));

    for (const o of allAddonOptions) if (selectedAddons.has(o.id)) total += Number(o.priceDelta || 0);

    return total;
  }, [safeItem, legacyVariant, familySelections, selectedAddons]);

  if (!open || !item) return null;

  const toggleAddon = (option, groupMeta = { required: 0, minSelect: 0, maxSelect: 0 }) => {
    if (lockedAddonIds.has(option.id)) return;
    const next = new Set(selectedAddons);
    const checked = next.has(option.id);
    const max = groupMeta.maxSelect || Infinity;
    const min = groupMeta.minSelect || 0;

    const allOptsInGroup = groupMeta._options || [];
    const currentCount = allOptsInGroup.filter(o => next.has(o.id)).length;

    if (!checked) {
      if (currentCount >= max) return;
      next.add(option.id);
    } else {
      if (groupMeta.required && currentCount <= min) return;
      next.delete(option.id);
    }
    setSelectedAddons(next);
  };

  const handleAdd = () => {
    const nextErrors = {};

    for (const f of (safeItem.families || [])) {
      if (f.type === "variant") {
        if (!familySelections[f.id]) {
          nextErrors[`fam:${f.id}`] = `Please select one option for ${f.name}.`;
        }
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const famVariantParts = (safeItem.families || [])
      .filter(f => f.type === "variant")
      .map(f => {
        const pickId = familySelections[f.id];
        const opt = famOptionById(f, pickId);
        return opt ? { id: opt.id, name: `${f.name}: ${opt.name}`, price: Number(opt.priceDelta || 0) } : null;
      }).filter(Boolean);

    const allAddonOptions = [];
    for (const g of (safeItem.addonGroups || [])) allAddonOptions.push(...(g.options || []));
    for (const f of (safeItem.families || [])) if (f.type === "addon") allAddonOptions.push(...(f.options || []));

    const chosenAddons = allAddonOptions
      .filter(o => selectedAddons.has(o.id))
      .map(o => ({ id: o.id, name: o.name, price: Number(o.priceDelta || 0) }));

    const payload = {
      itemId: safeItem.id,
      name: safeItem.name,
      qty,
      basePrice: Number(safeItem.basePrice || 0),
      variant: legacyVariant ? { id: legacyVariant.id, name: legacyVariant.name, priceDelta: Number(legacyVariant.priceDelta || 0) } : null,
      variants: famVariantParts,
      addons: chosenAddons,
      total: price * qty
    };

    addLine({ key: `${safeItem.id}-${Date.now()}`, ...payload });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">{safeItem.name}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {Array.isArray(safeItem.variants) && safeItem.variants.length > 0 && (
          <div className="mb-6">
            <div className="font-semibold text-white mb-3">Choose a variant</div>
            <div className="grid grid-cols-2 gap-3">
              {safeItem.variants.map(v => (
                <label key={v.id} className={`border-2 rounded-xl p-4 cursor-pointer transition ${legacyVariantId === v.id ? "border-rose-500 bg-rose-500/10" : "border-neutral-700 hover:border-neutral-600"}`}>
                  <input type="radio" className="sr-only" name="legacyVariant" checked={legacyVariantId === v.id} onChange={() => setLegacyVariantId(v.id)} />
                  <div className="text-white font-medium">{v.name}</div>
                  {v.priceDelta ? <div className="text-amber-400 text-sm mt-1">+₹{v.priceDelta.toFixed(0)}</div> : null}
                </label>
              ))}
            </div>
          </div>
        )}

        {(safeItem.families || []).map(f => (
          <div key={f.id} className="mb-6">
            <div className="font-semibold text-white mb-3">
              {f.name} {f.type === "variant" && <Required />}
            </div>

            {f.type === "variant" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {(f.options || []).map(o => (
                    <label key={o.id} className={`border-2 rounded-xl p-4 cursor-pointer transition ${familySelections[f.id] === o.id ? "border-rose-500 bg-rose-500/10" : "border-neutral-700 hover:border-neutral-600"}`}>
                      <input type="radio" className="sr-only" name={`family-${f.id}`} checked={familySelections[f.id] === o.id} onChange={() => setFamilySelections(s => ({ ...s, [f.id]: o.id }))} />
                      <div className="text-white font-medium">{o.name}</div>
                      {o.priceDelta ? <div className="text-amber-400 text-sm mt-1">+₹{o.priceDelta.toFixed(0)}</div> : null}
                    </label>
                  ))}
                </div>
                {errors[`fam:${f.id}`] && <div className="text-red-400 text-sm mt-2">{errors[`fam:${f.id}`]}</div>}
              </>
            )}

            {f.type === "addon" && (
              <div className="grid grid-cols-2 gap-3">
                {(f.options || []).map(o => {
                  const checked = selectedAddons.has(o.id);
                  const disabled = o.locked === true;
                  const meta = { required: 0, minSelect: 0, maxSelect: 0, _options: f.options || [] };
                  return (
                    <label key={o.id} className={`border-2 rounded-xl p-4 cursor-pointer transition ${checked ? "border-rose-500 bg-rose-500/10" : "border-neutral-700 hover:border-neutral-600"} ${disabled ? "opacity-60" : ""}`}>
                      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={() => toggleAddon(o, meta)} />
                      <div className="text-white font-medium">{o.name}</div>
                      {o.priceDelta ? <div className="text-amber-400 text-sm mt-1">+₹{o.priceDelta.toFixed(0)}</div> : null}
                      {disabled && <div className="text-xs text-neutral-400 mt-1">(Mandatory)</div>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {Array.isArray(safeItem.addonGroups) && safeItem.addonGroups.length > 0 && (
          <div className="space-y-6">
            {safeItem.addonGroups.map(g => {
              const meta = { required: g.required, minSelect: g.minSelect, maxSelect: g.maxSelect, _options: g.options || [] };
              return (
                <div key={g.id}>
                  <div className="font-semibold text-white">{g.name}</div>
                  <div className="text-xs text-neutral-400 mb-3">{g.required ? "Required" : "Optional"} • {g.minSelect || 0}-{g.maxSelect || "∞"}</div>
                  <div className="grid grid-cols-2 gap-3">
                    {(g.options || []).map(o => {
                      const checked = selectedAddons.has(o.id);
                      const disabled = o.locked === true;
                      return (
                        <label key={o.id} className={`border-2 rounded-xl p-4 cursor-pointer transition ${checked ? "border-rose-500 bg-rose-500/10" : "border-neutral-700 hover:border-neutral-600"} ${disabled ? "opacity-60" : ""}`}>
                          <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={() => toggleAddon(o, meta)} />
                          <div className="text-white font-medium">{o.name}</div>
                          {o.priceDelta ? <div className="text-amber-400 text-sm mt-1">+₹{o.priceDelta.toFixed(0)}</div> : null}
                          {disabled && <div className="text-xs text-neutral-400 mt-1">(Mandatory)</div>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-2xl font-bold text-white"><Money value={price * qty} /></div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-neutral-800 rounded-lg">
              <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-neutral-700 rounded-lg transition" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <div className="min-w-12 text-center text-white font-semibold">{qty}</div>
              <button className="w-10 h-10 flex items-center justify-center text-white hover:bg-neutral-700 rounded-lg transition" onClick={() => setQty(q => q + 1)}>+</button>
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-semibold rounded-lg transition shadow-lg" onClick={handleAdd}>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({ open, onClose, cartLines, calcUnit, clearCart }) {
  const { customer, isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [note, setNote] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const subTotal = cartLines.reduce((sum, l) => sum + calcUnit(l) * l.qty, 0);
  const taxPercent = 5;
  const taxAmt = (subTotal * taxPercent) / 100;
  const grandTotal = Math.round(subTotal + taxAmt);

  const placeOrder = async () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    if (!deliveryAddress.trim()) {
      setError("Please enter your delivery address");
      return;
    }

    setSubmitting(true);
    setError("");
    
    try {
      const payload = {
        items: cartLines.map(l => ({
          itemId: l.itemId,
          itemName: l.name,
          quantity: l.qty,
          basePrice: calcUnit(l),
          variants: l.variants || [],
          addons: l.addons || []
        })),
        discount: 0,
        discountMode: "none",
        discountValue: 0,
        paymentMethod,
        orderType: "delivery",
        customer: {
          name: customer.name,
          phone: customer.phone,
          note
        },
        deliveryAddress: `${deliveryAddress}${landmark ? `, Landmark: ${landmark}` : ''}`,
        deliveryInstructions: note
      };

      const res = await fetch("http://127.0.0.1:5000/api/customer/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const { orderId, total } = await res.json();

      clearCart();
      onClose();
      alert(`Order #${orderId} placed successfully!\nTotal: ₹${total}\n\nWe'll call you shortly to confirm your order.`);
    } catch (e) {
      console.error(e);
      setError("Could not place order. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
        <div className="w-full md:max-w-2xl bg-neutral-900 border border-neutral-800 rounded-t-2xl md:rounded-2xl p-6 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Checkout</h3>
            <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!isAuthenticated && (
            <div className="mb-6 bg-amber-900/20 border border-amber-800 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-medium text-amber-300">Login Required</div>
                <div className="text-sm text-amber-200 mt-1">Please login to place your order</div>
              </div>
            </div>
          )}

          {isAuthenticated && (
            <div className="mb-6 bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
              <div className="font-medium text-emerald-300 mb-2">Delivery Details</div>
              <div className="text-sm text-emerald-200">
                <div><strong>Name:</strong> {customer.name}</div>
                <div><strong>Phone:</strong> {customer.phone}</div>
              </div>
            </div>
          )}

          <div className="grid gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Delivery Address <Required />
              </label>
              <textarea 
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition min-h-24" 
                value={deliveryAddress} 
                onChange={e => setDeliveryAddress(e.target.value)} 
                placeholder="Flat/House No, Building Name, Street, Area..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Landmark (Optional)</label>
              <input 
                className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition" 
                value={landmark} 
                onChange={e => setLandmark(e.target.value)} 
                placeholder="e.g., Near Park Street Metro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Payment Method</label>
              <select className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <option>Cash on Delivery</option>
                <option>UPI</option>
                <option>Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">Special Instructions</label>
              <textarea className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition min-h-20" value={note} onChange={e => setNote(e.target.value)} placeholder="Any special requests..." />
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-6 mb-6">
            <div className="font-semibold text-white mb-4">Order Summary</div>
            <div className="space-y-3 mb-6">
              {cartLines.map(l => (
                <div key={l.key} className="flex items-start justify-between gap-4 bg-neutral-800/50 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="font-medium text-white">{l.name} × {l.qty}</div>
                    {l.variant && <div className="text-xs text-neutral-400 mt-1">{l.variant.name}</div>}
                    {l.variants?.length > 0 && <div className="text-xs text-neutral-400 mt-1">{l.variants.map(v => v.name).join(", ")}</div>}
                    {l.addons?.length > 0 && <div className="text-xs text-neutral-400 mt-1">Add-ons: {l.addons.map(a => a.name).join(", ")}</div>}
                  </div>
                  <div className="text-white font-semibold">₹{(calcUnit(l) * l.qty).toFixed(0)}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-300"><span>Subtotal</span><span>₹{subTotal.toFixed(0)}</span></div>
              <div className="flex justify-between text-neutral-300"><span>GST ({taxPercent}%)</span><span>₹{taxAmt.toFixed(0)}</span></div>
              <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-neutral-800"><span>Total</span><span>₹{grandTotal.toFixed(0)}</span></div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-red-300">{error}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition" onClick={onClose}>Cancel</button>
            <button 
              className="px-6 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-semibold rounded-lg transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={placeOrder} 
              disabled={submitting || cartLines.length === 0}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Placing Order...
                </span>
              ) : (
                'Place Order'
              )}
            </button>
          </div>
        </div>
      </div>

      <AuthModal 
        open={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </>
  );
}

export default function Order() {
  const [data, setData] = useState(null);
  const [activeTop, setActiveTop] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const { lines, total, removeLine, updateQty, clearCart, calcUnit } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/public/menu").then(r => r.json()).then(setData).catch(console.error);
  }, []);

  const tops = Array.isArray(data?.topCategories) ? data.topCategories : [];
  const currentTop = tops.find(t => t.id === activeTop) || null;
  const subs = currentTop?.subcategories ?? [];
  const currentSub = subs.find(s => s.id === activeSub) || null;
  const items = currentSub?.items ?? [];

  useEffect(() => { if (tops.length && !activeTop) setActiveTop(tops[0].id); }, [tops, activeTop]);
  useEffect(() => { if (subs.length && !activeSub) setActiveSub(subs[0].id); }, [subs, activeSub]);

  if (!data) return (
    <div className="container-section py-12 flex items-center justify-center">
      <div className="flex items-center gap-3 text-neutral-400">
        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.
          962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Loading menu...
      </div>
    </div>
  );

  return (
    <section className="container-section py-10 grid lg:grid-cols-[240px_1fr_380px] gap-6">
      {/* LEFT: Main categories */}
      <aside className="hidden lg:block sticky top-24 h-fit">
        <div className="space-y-2">
          {tops.map(t => {
            const active = t.id === (currentTop?.id ?? null);
            return (
              <button
                key={t.id}
                className={`w-full text-left rounded-xl p-4 transition-all ${active 
                  ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg" 
                  : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-rose-500 hover:text-white"}`}
                onClick={() => { setActiveTop(t.id); setActiveSub(null); }}
              >
                <div className="font-semibold">{t.name}</div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* CENTER: Sub-categories + items */}
      <div>
        <div className="flex gap-2 flex-wrap mb-6">
          {subs.map(s => (
            <button
              key={s.id}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${s.id === (currentSub?.id ?? null) 
                ? "bg-emerald-600 text-white shadow-md" 
                : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-emerald-500 hover:text-white"}`}
              onClick={() => setActiveSub(s.id)}
            >
              {s.name}
            </button>
          ))}
          {subs.length === 0 && <div className="text-neutral-500">Choose a category to view items.</div>}
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map(it => (
            <button
              key={it.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 text-left hover:border-rose-500 hover:shadow-lg hover:shadow-rose-900/20 transition-all group"
              onClick={() => setSelectedItem(it)}
            >
              <div className="font-semibold text-white text-lg group-hover:text-rose-400 transition">{it.name}</div>
              {it.description && <div className="text-neutral-400 text-sm mt-2 line-clamp-2">{it.description}</div>}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-amber-400 font-bold text-lg">₹{Number(it.basePrice || 0).toFixed(0)}</div>
                <div className="text-rose-400 text-sm font-semibold group-hover:translate-x-1 transition">Add →</div>
              </div>
            </button>
          ))}
          {items.length === 0 && <div className="text-neutral-500 col-span-full text-center py-12">No items in this category.</div>}
        </div>
      </div>

      {/* RIGHT: Modern Cart */}
      <aside className="sticky top-24 h-fit">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-rose-900/30 to-amber-900/30 p-5 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Your Cart</h3>
                <p className="text-xs text-neutral-400">{lines.length} {lines.length === 1 ? 'item' : 'items'}</p>
              </div>
            </div>
          </div>

          <div className="p-4 max-h-[400px] overflow-y-auto">
            {lines.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-neutral-500 text-sm">Your cart is empty</p>
                <p className="text-neutral-600 text-xs mt-1">Add items to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map(line => (
                  <div key={line.key} className="bg-neutral-800/50 rounded-lg p-3 group hover:bg-neutral-800 transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm">{line.name}</div>
                        {line.variant && <div className="text-xs text-neutral-400 mt-0.5">{line.variant.name}</div>}
                        {line.variants?.length > 0 && <div className="text-xs text-neutral-400 mt-0.5">{line.variants.map(v => v.name).join(", ")}</div>}
                        {line.addons?.length > 0 && <div className="text-xs text-neutral-400 mt-0.5">{line.addons.map(a => a.name).join(", ")}</div>}
                      </div>
                      <button 
                        className="text-neutral-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                        onClick={() => removeLine(line.key)}
                        title="Remove item"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-amber-400 font-semibold text-sm">₹{(calcUnit(line) * line.qty).toFixed(0)}</div>
                      <div className="flex items-center gap-1 bg-neutral-900 rounded-lg">
                        <button className="w-8 h-8 flex items-center justify-center text-white hover:bg-neutral-800 rounded-lg transition" onClick={() => updateQty(line.key, Math.max(1, line.qty - 1))}>−</button>
                        <div className="min-w-8 text-center text-white font-medium text-sm">{line.qty}</div>
                        <button className="w-8 h-8 flex items-center justify-center text-white hover:bg-neutral-800 rounded-lg transition" onClick={() => updateQty(line.key, line.qty + 1)}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <>
              <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-900/50">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span className="text-neutral-300">Total</span>
                  <span className="text-white">₹{Number(total || 0).toFixed(0)}</span>
                </div>
              </div>

              <div className="p-4">
                <button 
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-semibold rounded-lg transition shadow-lg shadow-rose-900/30"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <ItemModal open={!!selectedItem} onClose={() => setSelectedItem(null)} item={selectedItem} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} cartLines={lines} calcUnit={calcUnit} clearCart={clearCart} />
    </section>
  );
}