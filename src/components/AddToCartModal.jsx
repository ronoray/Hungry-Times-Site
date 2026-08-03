// site/src/components/AddToCartModal.jsx - WITH FAMILY VALIDATION
// ✅ Handles VARIANTS (from variants table) - OPTIONAL
// ✅ Handles ADDONS (from addons table) - OPTIONAL (except packaging auto-locked)
// ✅ Handles FAMILIES (from option_families table) - ALWAYS REQUIRED
// ✅ Validation: Cannot add to cart without selecting family options
// ✅ Radio buttons can be deselected
// ✅ Close X button always visible
// ✅ Mobile responsive

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { trackAddToCart } from "../utils/analytics";
import { X, Plus, Minus, ShoppingCart, AlertCircle } from "lucide-react";

const CDN_BASE = import.meta.env.VITE_CDN_BASE || "http://localhost:5000";

export default function AddToCartModal({ item, isOpen, onClose, onAdd, isDineIn = false }) {
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

  // The variants table holds TWO different things and the API serves them as one
  // flat list:
  //   SIZE  — "Large", priced per item (₹40–180 depending on the dish)
  //   STYLE — Szechwan, Green Chilli, Chili Garlic, Hong Kong, Singapore,
  //           Burnt Garlic; one global price each, noodle/rice dishes only
  //
  // They combine: a Large Egg Chowmein can be a Large Szechwan Egg Chowmein.
  // Two styles never combine — Szechwan plus Chili Garlic is not a dish.
  //
  // This modal used to hold a single `selectedVariant`, so choosing Large
  // deselected Szechwan and a Large Szechwan Egg Chowmein could not be ordered
  // online at all, while the POS (which keeps an array) sold them happily.
  //
  // "Large" is matched by name because that is what distinguishes the two —
  // a size carries a per-item price override, a style does not. The ops admin
  // (AddonVariantManager.jsx, isLargeVariant) and the server
  // (server/utils/menuOptions.js, SIZE_VARIANT_NAMES) hardcode the same string.
  // A second size means updating all three.
  const isSizeVariant = (v) => String(v?.name || "").trim().toLowerCase() === "large";
  const sizeVariants = variants.filter(isSizeVariant);
  const styleVariants = variants.filter((v) => !isSizeVariant(v));

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
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

    // Auto-select packaging — skip when dine-in (no packaging charged, no need to add)
    if (!isDineIn) {
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
    }
  }, [isOpen, isDineIn]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // SELECT SIZE / STYLE (from the variants table). Independent of each other,
  // one pick each, and clicking the current pick clears it — both groups are
  // optional, and with no selection the item is added at base price.
  const selectSize = (variant) => {
    setSelectedSize((prev) => (prev?.id === variant.id ? null : variant));
  };

  const selectStyle = (variant) => {
    setSelectedStyle((prev) => (prev?.id === variant.id ? null : variant));
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

  // TOGGLE FAMILY ADDON
  //
  // maxSelect caps how many members of one family may be held at once. It is a
  // real column that POS already enforces (Sales.jsx getUnmetVariantFamilies),
  // and every family is currently maxSelect=1 — so this must replace rather
  // than accumulate, or a customer could hold "Two Parathas" and "Three
  // Parathas" together and be charged for both.
  const toggleFamilyAddon = (familyId, option) => {
    if (/packag/i.test(option.name) && option.locked) {
      return;
    }

    const family = addonFamilies.find((f) => f.id === familyId);
    const maxSelect = Number(family?.maxSelect);
    const singleChoice = Number.isFinite(maxSelect) && maxSelect === 1;

    setSelectedFamilyAddons((prev) => {
      const fam = prev[familyId] || {};
      const exists = fam[option.id];

      if (singleChoice) {
        // Tapping the held option clears it; anything else replaces it. Locked
        // packaging members are returned above and never reach here, so they
        // cannot be displaced.
        return { ...prev, [familyId]: exists ? {} : { [option.id]: option } };
      }

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

    if (selectedSize) {
      total += Number(selectedSize.priceDelta || 0);
    }

    if (selectedStyle) {
      total += Number(selectedStyle.priceDelta || 0);
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
  }, [basePrice, selectedSize, selectedStyle, selectedFamilyVariants, selectedAddons, selectedFamilyAddons]);

  const finalTotal = unitPrice * quantity;

  // ============================================================================
  // VALIDATION
  // ============================================================================

  // Whether a family MUST be answered is stored per family in the database
  // (option_families.required / minSelect), and the counter already obeys it —
  // salesController reads those columns and Sales.jsx enforces them. This modal
  // used to ignore what the API sent and treat every variant-type family as
  // mandatory, so the website demanded a choice that POS let staff skip.
  //
  // Fall back to "variant families are required" only when the API sends
  // nothing, which keeps older payloads behaving as before.
  const familyIsRequired = (family) => {
    if (typeof family?.required === "boolean") return family.required;
    if (family?.required != null) return Number(family.required) === 1;
    if (family?.minSelect != null) return Number(family.minSelect) > 0;
    return String(family?.type).toLowerCase() === "variant";
  };

  const validateFamilies = () => {
    const missingFamilies = [];

    // Check variant families
    variantFamilies.forEach((family) => {
      if (familyIsRequired(family) && !selectedFamilyVariants[family.id]) {
        missingFamilies.push(family);
      }
    });

    // Check addon families (excluding packaging which is auto-locked)
    addonFamilies.forEach((family) => {
      if (!familyIsRequired(family)) return;

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
    // Size and style are both plain variants on the cart line — the split is a
    // selection rule, not a data model. Keep them in one array so the server,
    // the bill and the KOT need no special case.
    const variantList = [];
    if (selectedSize) variantList.push(selectedSize);
    if (selectedStyle) variantList.push(selectedStyle);
    variantList.push(...Object.values(selectedFamilyVariants));

    const addonList = [
      ...Object.values(selectedAddons).flatMap((g) => Object.values(g)),
      ...Object.values(selectedFamilyAddons).flatMap((g) => Object.values(g))
    ];

    const lineItem = {
      itemId: item.id,
      itemName: item.name,
      name: item.name,  // ✅ ADD THIS - for display in cart
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
        locked: a.locked || false,
      })),
      qty: quantity,
    };

    trackAddToCart(item, quantity);

    // Fire-and-forget: log cart add to our DB for ops panel visibility
    fetch('/api/site-activity/cart-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: item.id,
        item_name: item.name,
        price: basePrice,
        customer_id: null, // anonymous — Order.jsx can pass if known
        session_id: sessionStorage.getItem('ht_session_id') || null,
      }),
    }).catch(() => {}); // never block the cart action

    onAdd(lineItem);
    onClose();
  };

  // ============================================================================
  // IMAGE URL HANDLING
  // ============================================================================

  const imageUrl = item.imageUrl || "/images/placeholder-dish.jpg";

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
  // SWIPE-TO-DISMISS (mobile only)
  // ============================================================================

  const sheetRef = useRef(null);
  const dragStartY = useRef(null);
  const dragDelta = useRef(0);
  const [sheetTranslateY, setSheetTranslateY] = useState(0);
  const [sheetAnimating, setSheetAnimating] = useState(true); // for slide-up entrance

  useEffect(() => {
    // Trigger slide-up entrance
    setSheetTranslateY(0);
    setSheetAnimating(true);
  }, [isOpen]);

  const handleTouchStart = useCallback((e) => {
    // Only start drag from the drag indicator area (top 32px)
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return;
    const touchY = e.touches[0].clientY;
    if (touchY - rect.top > 32) return; // Only drag from top handle
    dragStartY.current = touchY;
    dragDelta.current = 0;
    setSheetAnimating(false);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta < 0) return; // Don't allow dragging up
    dragDelta.current = delta;
    setSheetTranslateY(delta);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    setSheetAnimating(true);
    if (dragDelta.current > 120) {
      // Dismiss
      setSheetTranslateY(window.innerHeight);
      setTimeout(onClose, 200);
    } else {
      setSheetTranslateY(0);
    }
    dragDelta.current = 0;
  }, [onClose]);

  // ============================================================================
  // RENDER: MAIN MODAL
  // ============================================================================

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] p-0 md:p-4 pb-16 md:pb-0"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="bg-neutral-900 w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl relative flex flex-col overflow-hidden h-[calc(85vh-64px)] md:h-auto md:max-h-[85vh]"
        style={{
          transform: `translateY(${sheetTranslateY}px)`,
          transition: sheetAnimating ? 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* DRAG INDICATOR (mobile) */}
        <div className="md:hidden flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-neutral-600 rounded-full" />
        </div>

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
          <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-4">

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

          {/* SIZE and STYLE — two independent optional groups.
              One pick each, and they combine (Large + Szechwan). Rendering them
              as one radio pool is what made "Large Szechwan Egg Chowmein"
              impossible to order online. */}
          {sizeVariants.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3">
                Size
              </h3>
              <div className="space-y-2">
                <label
                  onClick={() => setSelectedSize(null)}
                  className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedSize === null
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-neutral-700 hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="variant-size"
                      checked={selectedSize === null}
                      onChange={() => {}}
                      className="w-5 h-5 text-orange-500 cursor-pointer"
                    />
                    <span className="text-white text-sm md:text-base">Regular</span>
                  </div>
                  <span className="text-neutral-400 text-sm">base price</span>
                </label>

                {sizeVariants.map((variant) => (
                  <label
                    key={variant.id}
                    onClick={() => selectSize(variant)}
                    className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedSize?.id === variant.id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-neutral-700 hover:border-neutral-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="variant-size"
                        checked={selectedSize?.id === variant.id}
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

          {styleVariants.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3">
                Style
                <span className="text-neutral-500 text-xs font-normal ml-2">optional</span>
              </h3>
              <div className="space-y-2">
                <label
                  onClick={() => setSelectedStyle(null)}
                  className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedStyle === null
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-neutral-700 hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="variant-style"
                      checked={selectedStyle === null}
                      onChange={() => {}}
                      className="w-5 h-5 text-orange-500 cursor-pointer"
                    />
                    <span className="text-white text-sm md:text-base">No style</span>
                  </div>
                  <span className="text-neutral-400 text-sm">as listed</span>
                </label>

                {styleVariants.map((variant) => (
                  <label
                    key={variant.id}
                    onClick={() => selectStyle(variant)}
                    className={`flex items-center justify-between p-3 md:p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedStyle?.id === variant.id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-neutral-700 hover:border-neutral-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="variant-style"
                        checked={selectedStyle?.id === variant.id}
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
                    {family.name}{" "}
                    {familyIsRequired(family) ? (
                      <span className="text-red-400">*</span>
                    ) : (
                      <span className="text-neutral-500 text-xs font-normal">optional</span>
                    )}
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
                          {isDineIn && locked ? (
                            <span className="text-green-400 text-xs font-medium">Free · Dine-in</span>
                          ) : opt.priceDelta > 0 ? (
                            <span className="text-orange-400 font-semibold text-sm md:text-base">
                              +₹{opt.priceDelta}
                            </span>
                          ) : null}
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
                      {!allPackaging && familyIsRequired(family) && (
                        <span className="text-red-400"> *</span>
                      )}
                      {!allPackaging && !familyIsRequired(family) && (
                        <span className="text-neutral-500 text-xs font-normal"> optional</span>
                      )}
                    </h3>

                    <div className="space-y-2">
                      {family.options.map((opt) => {
                        const selected = selectedFamilyAddons[family.id]?.[opt.id] !== undefined;
                        const locked = isLocked(opt);
                        // A maxSelect of 1 is a pick-one group, so it must look
                        // like one. Showing checkboxes for a group that only
                        // ever holds a single answer invites the customer to
                        // tick "Two Parathas" and "Three Parathas" together.
                        const singleChoice = Number(family?.maxSelect) === 1;

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
                                type={singleChoice && !locked ? "radio" : "checkbox"}
                                name={singleChoice ? `family-addon-${family.id}` : undefined}
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
                            {isDineIn && locked ? (
                              <span className="text-green-400 text-xs font-medium">Free · Dine-in</span>
                            ) : opt.priceDelta > 0 ? (
                              <span className="text-orange-400 font-semibold text-sm md:text-base">
                                +₹{opt.priceDelta}
                              </span>
                            ) : null}
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

            {selectedSize && (
              <div className="flex justify-between text-neutral-400">
                <span>{selectedSize.name}</span>
                <span>+₹{selectedSize.priceDelta}</span>
              </div>
            )}

            {selectedStyle && (
              <div className="flex justify-between text-neutral-400">
                <span>{selectedStyle.name}</span>
                <span>+₹{selectedStyle.priceDelta}</span>
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

        </div>
      </div>

        {/* STICKY FOOTER — outside scroll area */}
        <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 p-4 md:p-4 space-y-3">
          {/* VALIDATION ERROR MESSAGE */}
          {validationError && (
            <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-500 font-semibold text-sm whitespace-pre-line">
                {validationError.message}
              </p>
            </div>
          )}

          {/* ADD TO CART BUTTON */}
          <button
            onClick={handleAdd}
            className="w-full py-4 md:py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 active:from-orange-700 active:to-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2"
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
  );
}