// site/src/components/AddToCartModal.jsx
// FINAL VERSION — Fully compatible with menuPublic.js + Menu.jsx

import { useState, useMemo } from "react";
import { X, Plus, Minus, ShoppingCart, Check } from "lucide-react";

const CDN_BASE = import.meta.env.VITE_CDN_BASE || "http://localhost:5000";

export default function AddToCartModal({ item, isOpen, onClose, onAdd }) {
  if (!isOpen || !item) return null;

  // Normalize price for safety (supports old + new fields)
  const basePrice = Number(
    item.basePrice ?? item.price ?? item.base_price ?? 0
  );

  // Families (variants + addons)
  const families = Array.isArray(item.families) ? item.families : [];

  // Separate variant families and addon families
  const variantFamilies = families.filter((f) => f.type === "variant");
  const addonFamilies = families.filter((f) => f.type === "addon");

  // State
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedAddons, setSelectedAddons] = useState({});
  const [quantity, setQuantity] = useState(1);

  // SELECT VARIANT HANDLER (only one option per family)
  const selectVariant = (familyId, option) => {
    setSelectedVariants((prev) => ({ ...prev, [familyId]: option }));
  };

  // SELECT ADDON HANDLER (toggle per-option)
  const toggleAddon = (familyId, option) => {
    setSelectedAddons((prev) => {
      const fam = prev[familyId] || {};
      const exists = fam[option.id];

      // toggle:
      const updatedFamily = { ...fam };
      if (exists) delete updatedFamily[option.id];
      else updatedFamily[option.id] = option;

      return { ...prev, [familyId]: updatedFamily };
    });
  };

  // Calculate final price
  const unitPrice = useMemo(() => {
    let total = basePrice;

    // Add selected variant priceDelta(s)
    for (const familyId in selectedVariants) {
      const opt = selectedVariants[familyId];
      total += Number(opt.priceDelta || 0);
    }

    // Add selected addon priceDelta(s)
    for (const famId in selectedAddons) {
      const group = selectedAddons[famId];
      for (const optId in group) {
        total += Number(group[optId].priceDelta || 0);
      }
    }

    return total;
  }, [basePrice, selectedVariants, selectedAddons]);

  const finalTotal = unitPrice * quantity;

  // Submit to cart
  const handleAdd = () => {
    const variantList = Object.values(selectedVariants);
    const addonList = Object.values(selectedAddons).flatMap((g) =>
      Object.values(g)
    );

    const lineItem = {
      itemId: item.id,
      name: item.name,
      basePrice: basePrice,
      variants: variantList.map((v) => ({
        id: v.id,
        name: v.name,
        priceDelta: v.priceDelta,
      })),
      addons: addonList.map((a) => ({
        id: a.id,
        name: a.name,
        priceDelta: a.priceDelta,
      })),
      qty: quantity,
    };

    onAdd(lineItem);
  };

  // Image URL normalization
  const imageUrl = item.imageUrl
    ? `${CDN_BASE}${item.imageUrl}`
    : "/images/placeholder-dish.jpg";

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 max-w-2xl w-full rounded-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER IMAGE */}
        {item.imageUrl && (
          <div className="w-full h-64 bg-neutral-800 rounded-t-2xl overflow-hidden">
            <img
              src={imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "/images/placeholder-dish.jpg";
              }}
            />
          </div>
        )}

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 bg-black/60 p-2 rounded-full text-white hover:bg-black/80"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CONTENT */}
        <div className="p-6 space-y-6">
          {/* TITLE */}
          <div>
            <h2 className="text-2xl font-bold text-white">{item.name}</h2>
            {item.description && (
              <p className="text-neutral-400 text-sm mt-2">
                {item.description}
              </p>
            )}
            <p className="text-orange-400 text-xl mt-2 font-semibold">
              ₹{basePrice.toFixed(0)}
              <span className="text-neutral-500 text-sm ml-1">base price</span>
            </p>
          </div>

          {/* VARIANT FAMILIES */}
          {variantFamilies.map((family) => (
            <div key={family.id}>
              <h3 className="text-lg font-semibold text-white mb-3">
                {family.name}{" "}
                {family.required && (
                  <span className="text-red-400">*</span>
                )}
              </h3>

              <div className="space-y-2">
                {family.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer ${
                      selectedVariants[family.id]?.id === opt.id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-neutral-700 hover:border-neutral-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`variant-${family.id}`}
                        checked={selectedVariants[family.id]?.id === opt.id}
                        onChange={() => selectVariant(family.id, opt)}
                        className="w-5 h-5 text-orange-500"
                      />
                      <span className="text-white">{opt.name}</span>
                    </div>

                    {opt.priceDelta > 0 && (
                      <span className="text-orange-400 font-semibold">
                        +₹{opt.priceDelta}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* ADDON FAMILIES */}
          {addonFamilies.map((family) => (
            <div key={family.id}>
              <h3 className="text-lg font-semibold text-white mb-3">
                {family.name}
              </h3>

              <div className="space-y-2">
                {family.options.map((opt) => {
                  const selected =
                    selectedAddons[family.id]?.[opt.id] !== undefined;

                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer ${
                        selected
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-neutral-700 hover:border-neutral-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleAddon(family.id, opt)}
                          className="w-5 h-5 text-orange-500"
                        />
                        <span className="text-white">{opt.name}</span>
                      </div>
                      {opt.priceDelta > 0 && (
                        <span className="text-orange-400 font-semibold">
                          +₹{opt.priceDelta}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* QUANTITY */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Quantity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 bg-neutral-800 rounded-lg hover:bg-neutral-700"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl text-white">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 bg-neutral-800 rounded-lg hover:bg-neutral-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PRICE SUMMARY */}
          <div className="p-4 bg-neutral-800 rounded-lg">
            <div className="flex justify-between text-neutral-400">
              <span>Base Price</span>
              <span>₹{basePrice.toFixed(0)}</span>
            </div>

            {/* Selected variants */}
            {Object.values(selectedVariants).map((v) => (
              <div
                key={v.id}
                className="flex justify-between text-neutral-400"
              >
                <span>{v.name}</span>
                <span>+₹{v.priceDelta}</span>
              </div>
            ))}

            {/* Selected addons */}
            {Object.values(selectedAddons).flatMap((g) =>
              Object.values(g)
            ).map((a) => (
              <div
                key={a.id}
                className="flex justify-between text-neutral-400"
              >
                <span>{a.name}</span>
                <span>+₹{a.priceDelta}</span>
              </div>
            ))}

            <div className="border-t border-neutral-700 my-2"></div>

            <div className="flex justify-between text-lg font-bold text-white">
              <span>Total</span>
              <span className="text-orange-500">
                ₹{finalTotal.toFixed(0)}
              </span>
            </div>
          </div>

          {/* ADD TO CART */}
          <button
            onClick={handleAdd}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl shadow-lg"
          >
            <ShoppingCart className="w-5 h-5 inline-block mr-2" />
            Add {quantity} to Cart — ₹{finalTotal.toFixed(0)}
          </button>
        </div>
      </div>
    </div>
  );
}
