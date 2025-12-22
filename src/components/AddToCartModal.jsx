// site/src/components/AddToCartModal.jsx - WITH FAMILY VALIDATION
// ✅ Handles VARIANTS (from variants table) - OPTIONAL
// ✅ Handles ADDONS (from addons table) - OPTIONAL (except packaging auto-locked)
// ✅ Handles FAMILIES (from option_families table) - ALWAYS REQUIRED
// ✅ Validation: Cannot add to cart without selecting family options
// ✅ Radio buttons can be deselected
// ✅ Close X button always visible
// ✅ Mobile responsive

import { useState, useMemo, useEffect } from "react";
import { X, Plus, Minus, ShoppingCart, AlertCircle } from "lucide-react";

const CDN_BASE = import.meta.env.VITE_CDN_BASE || "http://localhost:5000";

export default function AddToCartModal({ item, isOpen, onClose, onAdd }) {
  if (!isOpen || !item) return null;

  // ============================================================================
  // SETUP & INITIALIZATION
  // ============================================================================

  const basePrice = Number(item.basePrice ?? item.price ?? item.base_price ?? 0);

  // THREE SEPARATE SYSTEMS
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const addonGroups = Array.isArray(item.addonGroups) ? item.addonGroups : [];
  const families = Array.isArray(item.families) ? item.families : [];

  // Separate family types
  const variantFamilies = families.filter((f) => f.type === "variant");
  const addonFamilies = families.filter((f) => f.type === "addon");

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedFamilyVariants, setSelectedFamilyVariants] = useState({});
  const [selectedAddons, setSelectedAddons] = useState({});
  const [selectedFamilyAddons, setSelectedFamilyAddons] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState(null);

  // ============================================================================
  // AUTO-LOCK PACKAGING ON MOUNT
  // ============================================================================

  useEffect(() => {
    if (!isOpen) return;

    // Reset validation error when modal opens
    setValidationError(null);

    // Auto-select packaging from addon groups
    addonGroups.forEach((group) => {
      (group.options || []).forEach((opt) => {
        if (/packag/i.test(opt.name) && opt.locked) {
          setSelectedAddons((prev) => ({
            ...prev,
            [group.id]: {
              ...prev[group.id],
              [opt.id]: opt
            }
          }));
        }
      });
    });

    // Auto-select packaging from family addons
    addonFamilies.forEach((family) => {
      (family.options || []).forEach((opt) => {
        if (/packag/i.test(opt.name) && opt.locked) {
          setSelectedFamilyAddons((prev) => ({
            ...prev,
            [family.id]: {
              ...prev[family.id],
              [opt.id]: opt
            }
          }));
        }
      });
    });
  }, [isOpen]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // SELECT VARIANT (from variants table - can deselect by clicking again)
  const selectVariant = (variant) => {
    if (selectedVariant?.id === variant.id) {
      setSelectedVariant(null);
    } else {
      setSelectedVariant(variant);
    }
  };

  // SELECT FAMILY VARIANT (radio - can deselect by clicking again)
  const selectFamilyVariant = (familyId, option) => {
    if (selectedFamilyVariants[familyId]?.id === option.id) {
      const newState = { ...selectedFamilyVariants };
      delete newState[familyId];
      setSelectedFamilyVariants(newState);
    } else {
      setSelectedFamilyVariants((prev) => ({ ...prev, [familyId]: option }));
    }
    // Clear validation error when user makes a selection
    setValidationError(null);
  };

  // TOGGLE ADDON (from addons table - checkboxes)
  const toggleAddon = (groupId, option) => {
    if (/packag/i.test(option.name) && option.locked) {
      return;
    }

    setSelectedAddons((prev) => {
      const group = prev[groupId] || {};
      const exists = group[option.id];

      const updatedGroup = { ...group };
      if (exists) delete updatedGroup[option.id];
      else updatedGroup[option.id] = option;

      return { ...prev, [groupId]: updatedGroup };
    });
  };

  // TOGGLE FAMILY ADDON (checkboxes)
  const toggleFamilyAddon = (familyId, option) => {
    if (/packag/i.test(option.name) && option.locked) {
      return;
    }

    setSelectedFamilyAddons((prev) => {
      const fam = prev[familyId] || {};
      const exists = fam[option.id];

      const updatedFamily = { ...fam };
      if (exists) delete updatedFamily[option.id];
      else updatedFamily[option.id] = option;

      return { ...prev, [familyId]: updatedFamily };
    });
    // Clear validation error when user makes a selection
    setValidationError(null);
  };

  // ============================================================================
  // PRICE CALCULATIONS
  // ============================================================================

  const unitPrice = useMemo(() => {
    let total = basePrice;

    if (selectedVariant) {
      total += Number(selectedVariant.priceDelta || 0);
    }

    for (const familyId in selectedFamilyVariants) {
      const opt = selectedFamilyVariants[familyId];
      total += Number(opt.priceDelta || 0);
    }

    for (const groupId in selectedAddons) {
      const group = selectedAddons[groupId];
      for (const optId in group) {
        total += Number(group[optId].priceDelta || 0);
      }
    }

    for (const famId in selectedFamilyAddons) {
      const group = selectedFamilyAddons[famId];
      for (const optId in group) {
        total += Number(group[optId].priceDelta || 0);
      }
    }

    return total;
  }, [basePrice, selectedVariant, selectedFamilyVariants, selectedAddons, selectedFamilyAddons]);

  const finalTotal = unitPrice * quantity;

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateFamilies = () => {
    const missingFamilies = [];

    // Check variant families
    variantFamilies.forEach((family) => {
      if (!selectedFamilyVariants[family.id]) {
        missingFamilies.push(family);
      }
    });

    // Check addon families (excluding packaging which is auto-locked)
    addonFamilies.forEach((family) => {
      // Check if this family has any selected options
      const hasSelection = selectedFamilyAddons[family.id] && 
                          Object.keys(selectedFamilyAddons[family.id]).length > 0;
      
      // Check if all options in this family are packaging (auto-locked)
      const allOptionsArePackaging = family.options.every(opt => 
        /packag/i.test(opt.name) && opt.locked
      );

      // Only require selection if family has non-packaging options
      if (!hasSelection && !allOptionsArePackaging) {
        missingFamilies.push(family);
      }
    });

    return missingFamilies;
  };

  // ============================================================================
  // SUBMIT HANDLER
  // ============================================================================

  const handleAdd = () => {
    // Validate families
    const missingFamilies = validateFamilies();

    if (missingFamilies.length > 0) {
      // Build error message
      const familyNames = missingFamilies.map(f => {
        const optionNames = f.options.map(o => o.name).join(", ");
        return `${f.name} (${optionNames})`;
      });

      setValidationError({
        message: missingFamilies.length === 1
          ? `Please select: ${familyNames[0]}`
          : `Please select:\n${familyNames.map(n => `• ${n}`).join('\n')}`,
        familyIds: missingFamilies.map(f => f.id)
      });

      return; // Don't add to cart
    }

    // Validation passed, proceed with adding to cart
    const variantList = [];
    if (selectedVariant) variantList.push(selectedVariant);
    variantList.push(...Object.values(selectedFamilyVariants));

    const addonList = [
      ...Object.values(selectedAddons).flatMap((g) => Object.values(g)),
      ...Object.values(selectedFamilyAddons).flatMap((g) => Object.values(g))
    ];

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
    onClose();
  };

  // ============================================================================
  // IMAGE URL HANDLING
  // ============================================================================

  const imageUrl = item.imageUrl
    ? `${CDN_BASE}${item.imageUrl}`
    : "/images/placeholder-dish.jpg";

  // ============================================================================
  // HELPER: Check if option is locked (packaging)
  // ============================================================================

  const isLocked = (option) => {
    return /packag/i.test(option.name) && option.locked;
  };

  // ============================================================================
  // HELPER: Check if family has error
  // ============================================================================

  const hasFamilyError = (familyId) => {
    return validationError?.familyIds?.includes(familyId);
  };

  // ============================================================================
  // RENDER: MAIN MODAL
  // ============================================================================

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl relative flex flex-col overflow-hidden h-[85vh] md:h-auto md:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON - ALWAYS VISIBLE */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 p-2 md:p-3 rounded-full text-white transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {/* SCROLL AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto [-webkit-overflow-scrolling:touch] overscroll-contain touch-pan-y">

          {/* HEADER IMAGE */}
          {item.imageUrl && (
            <div className="w-full h-48 md:h-64 bg-neutral-800 rounded-t-2xl overflow-hidden">
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

          {/* ALL MODAL CONTENT STARTS HERE */}
          <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">

            {/* TITLE & DESCRIPTION */}
            <div className="pr-12">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {item.name}
              </h2>
              {item.description && (
                <p className="text-neutral-400 text-sm mt-2">
                  {item.description}
                </p>
              )}
              <p className="text-orange-400 text-lg md:text-xl mt-2 font-semibold">
                ₹{basePrice.toFixed(0)}
                <span className="text-neutral-500 text-xs ml-2">base price</span>
              </p>
            </div>

          {/* VARIANTS FROM VARIANTS TABLE (Optional) */}
          {variants.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3">
                Variants <span className="text-neutral-500 text-sm font-normal">(Optional)</span>
              </h3>
              <div className="space-y-2">
                {variants.map((variant) => (
                  <label
                    key={variant.id}
                    onClick={() => selectVariant(variant)}
                    className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedVariant?.id === variant.id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-neutral-700 hover:border-neutral-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="variant"
                        checked={selectedVariant?.id === variant.id}
                        onChange={() => {}}
                        className="w-5 h-5 text-orange-500 cursor-pointer"
                      />
                      <span className="text-white text-sm md:text-base">
                        {variant.name}
                      </span>
                    </div>
                    {variant.priceDelta > 0 && (
                      <span className="text-orange-400 font-semibold text-sm md:text-base">
                        +₹{variant.priceDelta}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* VARIANT FAMILIES (REQUIRED) */}
          {variantFamilies.length > 0 && (
            <div className="space-y-4">
              {variantFamilies.map((family) => (
                <div key={family.id}>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-3">
                    {family.name} <span className="text-red-400">*</span>
                  </h3>

                  <div className="space-y-2">
                    {family.options.map((opt) => (
                      <label
                        key={opt.id}
                        onClick={() => selectFamilyVariant(family.id, opt)}
                        className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 cursor-pointer transition ${
                          selectedFamilyVariants[family.id]?.id === opt.id
                            ? "border-orange-500 bg-orange-500/10"
                            : hasFamilyError(family.id)
                            ? "border-red-500 hover:border-red-400"
                            : "border-neutral-700 hover:border-neutral-600"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`family-variant-${family.id}`}
                            checked={selectedFamilyVariants[family.id]?.id === opt.id}
                            onChange={() => {}}
                            className="w-5 h-5 text-orange-500 cursor-pointer"
                          />
                          <span className="text-white text-sm md:text-base">
                            {opt.name}
                          </span>
                        </div>
                        {opt.priceDelta > 0 && (
                          <span className="text-orange-400 font-semibold text-sm md:text-base">
                            +₹{opt.priceDelta}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ADDONS FROM ADDONS TABLE (Optional) */}
          {addonGroups.length > 0 && (
            <div className="space-y-4">
              {addonGroups.map((group) => (
                <div key={group.id}>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-3">
                    {group.name || "Add-ons"}
                  </h3>

                  <div className="space-y-2">
                    {(group.options || []).map((opt) => {
                      const selected = selectedAddons[group.id]?.[opt.id] !== undefined;
                      const locked = isLocked(opt);

                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 ${
                            locked 
                              ? "cursor-not-allowed bg-neutral-800/50 border-neutral-600" 
                              : "cursor-pointer"
                          } transition ${
                            selected
                              ? "border-orange-500 bg-orange-500/10"
                              : "border-neutral-700 hover:border-neutral-600"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleAddon(group.id, opt)}
                              disabled={locked}
                              className={`w-5 h-5 text-orange-500 ${
                                locked ? "cursor-not-allowed" : "cursor-pointer"
                              }`}
                            />
                            <span className={`text-sm md:text-base ${
                              locked ? "text-neutral-400" : "text-white"
                            }`}>
                              {opt.name}
                              {locked && (
                                <span className="ml-2 text-xs text-neutral-500">(Required)</span>
                              )}
                            </span>
                          </div>
                          {opt.priceDelta > 0 && (
                            <span className="text-orange-400 font-semibold text-sm md:text-base">
                              +₹{opt.priceDelta}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ADDON FAMILIES (REQUIRED - except packaging) */}
          {addonFamilies.length > 0 && (
            <div className="space-y-4">
              {addonFamilies.map((family) => {
                const allPackaging = family.options.every(opt => isLocked(opt));
                
                return (
                  <div key={family.id}>
                    <h3 className="text-base md:text-lg font-semibold text-white mb-3">
                      {family.name}
                      {!allPackaging && <span className="text-red-400"> *</span>}
                    </h3>

                    <div className="space-y-2">
                      {family.options.map((opt) => {
                        const selected = selectedFamilyAddons[family.id]?.[opt.id] !== undefined;
                        const locked = isLocked(opt);

                        return (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 ${
                              locked 
                                ? "cursor-not-allowed bg-neutral-800/50 border-neutral-600" 
                                : "cursor-pointer"
                            } transition ${
                              selected
                                ? "border-orange-500 bg-orange-500/10"
                                : hasFamilyError(family.id) && !locked
                                ? "border-red-500 hover:border-red-400"
                                : "border-neutral-700 hover:border-neutral-600"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleFamilyAddon(family.id, opt)}
                                disabled={locked}
                                className={`w-5 h-5 text-orange-500 ${
                                  locked ? "cursor-not-allowed" : "cursor-pointer"
                                }`}
                              />
                              <span className={`text-sm md:text-base ${
                                locked ? "text-neutral-400" : "text-white"
                              }`}>
                                {opt.name}
                                {locked && (
                                  <span className="ml-2 text-xs text-neutral-500">(Required)</span>
                                )}
                              </span>
                            </div>
                            {opt.priceDelta > 0 && (
                              <span className="text-orange-400 font-semibold text-sm md:text-base">
                                +₹{opt.priceDelta}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* QUANTITY SELECTOR */}
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-3">
              Quantity
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 md:w-10 md:h-10 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center justify-center text-white transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl md:text-xl text-white font-bold flex-1 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 md:w-10 md:h-10 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center justify-center text-white transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PRICE BREAKDOWN */}
          <div className="p-3 md:p-4 bg-neutral-800 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between text-neutral-400">
              <span>Base Price</span>
              <span>₹{basePrice.toFixed(0)}</span>
            </div>

            {selectedVariant && (
              <div className="flex justify-between text-neutral-400">
                <span>{selectedVariant.name}</span>
                <span>+₹{selectedVariant.priceDelta}</span>
              </div>
            )}

            {Object.values(selectedFamilyVariants).map((v) => (
              <div key={v.id} className="flex justify-between text-neutral-400">
                <span>{v.name}</span>
                <span>+₹{v.priceDelta}</span>
              </div>
            ))}

            {Object.values(selectedAddons)
              .flatMap((g) => Object.values(g))
              .map((a) => (
                <div key={a.id} className="flex justify-between text-neutral-400">
                  <span>{a.name}</span>
                  <span>+₹{a.priceDelta}</span>
                </div>
              ))}

            {Object.values(selectedFamilyAddons)
              .flatMap((g) => Object.values(g))
              .map((a) => (
                <div key={a.id} className="flex justify-between text-neutral-400">
                  <span>{a.name}</span>
                  <span>+₹{a.priceDelta}</span>
                </div>
              ))}

            <div className="border-t border-neutral-700 my-2" />

            <div className="flex justify-between text-lg md:text-base font-bold text-white">
              <span>Price per item</span>
              <span className="text-orange-500">₹{unitPrice.toFixed(0)}</span>
            </div>

            {quantity > 1 && (
              <div className="flex justify-between text-sm text-neutral-400">
                <span>×{quantity}</span>
                <span>= ₹{finalTotal.toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* VALIDATION ERROR MESSAGE */}
          {validationError && (
            <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-500 font-semibold text-sm md:text-base whitespace-pre-line">
                  {validationError.message}
                </p>
              </div>
            </div>
          )}

          {/* ADD TO CART BUTTON */}
          <button
            onClick={handleAdd}
            className="w-full py-4 md:py-3 h-12 md:h-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 active:from-orange-700 active:to-red-700 text-white font-bold rounded-lg md:rounded-xl shadow-lg hover:shadow-xl transition-all text-base md:text-sm flex items-center justify-center gap-2"
            aria-label="Add item to cart"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>
              Add {quantity} to Cart — ₹{finalTotal.toFixed(0)}
            </span>
          </button>
        </div> 
      </div>   
    </div>     
  </div>       
  );
}