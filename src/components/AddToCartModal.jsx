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
import { X, Plus, Minus, AlertCircle } from "lucide-react";
import { useBackableOverlay } from "../hooks/useBackableOverlay";

const CDN_BASE = import.meta.env.VITE_CDN_BASE || "http://localhost:5000";

export default function AddToCartModal({ item, isOpen, onClose, onAdd, isDineIn = false, pushHistory = true }) {
  // Back button closes the sheet instead of popping the menu route underneath.
  // Called above the early return so hook order stays stable.
  //
  // pushHistory={false} when the sheet was opened BY the navigation rather than
  // by a tap on this page (see /menu?highlight=<id>): back should then undo the
  // whole hop and return the customer to where they came from.
  const closeModal = useBackableOverlay(isOpen && !!item, onClose, pushHistory);

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
  // Every option row below is a <label> that WRAPS its own radio, and the
  // handler sits on the RADIO — never on the label.
  //
  // The label is the one place it must not sit. Clicking the row makes the
  // browser forward the click to the radio, and that forwarded click bubbles
  // back up to the label, so a label handler runs TWICE per row click. These
  // handlers are toggles, so the second run undid the first. Cancelling the
  // forward with e.preventDefault() fixed the row but broke the radio: clicking
  // the radio directly then had its selection cancelled along with the forward,
  // which is why Regular/Large went dead when you aimed at the button itself.
  //
  // On the input there is exactly one click either way — forwarded from the row,
  // or landing on the radio directly — and nothing to cancel.
  //
  // It must be onClick, not onChange: a radio that is already checked fires no
  // change event, which would silently remove click-again-to-deselect.
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

    // Logged by CartContext.addLine; callers pass this through as the source.
    onAdd(lineItem, { source: 'item_modal' });
    // Route the success close through the backable closer too, so the history
    // entry this modal pushed is consumed instead of left orphaned.
    closeModal();
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
      setTimeout(closeModal, 200);
    } else {
      setSheetTranslateY(0);
    }
    dragDelta.current = 0;
  }, [closeModal]);

  // ============================================================================
  // RENDER: MAIN MODAL — DNA v2 bottom sheet (centred dialog from md)
  // ============================================================================

  // Numbered steps in the order they appear: "1 · SIZE", "2 · STYLE", …
  let stepNo = 0;
  const stepTitle = (label, note) => (
    <h3 className="mb-2.5 mt-5 flex items-baseline justify-between gap-3 font-mono text-xs font-semibold uppercase tracking-[.12em] text-ht-gold3">
      <span>{++stepNo} · {label}</span>
      {note && <em className="not-italic normal-case tracking-[.04em] text-ht-mute">{note}</em>}
    </h3>
  );

  // One option chip. Same handler the radio / checkbox used to call.
  const chip = ({ key, selected, error = false, locked = false, onSelect, name, price }) => (
    <button
      key={key}
      type="button"
      aria-pressed={selected}
      disabled={locked}
      onClick={onSelect}
      className={`flex h-11 items-center gap-1.5 whitespace-nowrap rounded-[10px] border-[1.5px] px-3.5 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed ${
        selected
          ? locked
            ? 'border-ht-ink/15 bg-ht-paper text-ht-mute'
            : 'border-ht-red bg-ht-red text-white'
          : error
            ? 'border-ht-red bg-white text-ht-ink'
            : 'border-ht-ink/15 bg-white text-ht-ink hover:border-ht-ink/40'
      }`}
    >
      <span>{name}</span>
      {price}
    </button>
  );
  const delta = (v, selected) => (Number(v) > 0
    ? <span className={`text-xs font-bold ${selected ? 'text-ht-gold2' : 'text-ht-red'}`}>+₹{v}</span>
    : null);
  const lockedNote = (opt) => (isDineIn
    ? <span className="text-xs font-semibold text-ht-veg">free · dine-in</span>
    : <span className="text-xs">{Number(opt.priceDelta) > 0 ? `₹${opt.priceDelta} · ` : ''}always</span>);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ht-ink/55 p-0 pb-16 md:items-center md:p-4 md:pb-0"
      onClick={closeModal}
    >
      <div
        ref={sheetRef}
        className="relative flex h-[calc(85vh-64px)] w-full flex-col overflow-hidden rounded-t-[22px] bg-ht-ivory text-ht-ink md:h-auto md:max-h-[85vh] md:max-w-xl md:rounded-[14px]"
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
        <div className="flex cursor-grab justify-center pb-1 pt-2.5 active:cursor-grabbing md:hidden">
          <div className="h-[5px] w-11 rounded-full bg-ht-ink/20" />
        </div>

        {/* CLOSE BUTTON - ALWAYS VISIBLE */}
        <button
          onClick={closeModal}
          className="absolute left-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-ht-ivory/90 text-ht-ink shadow-sm md:left-auto md:right-3"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* SCROLL AREA */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] touch-pan-y">
          <div className="relative px-5 pb-5 pt-12 md:px-6 md:pt-6">

            {/* Plate — bleeds off the sheet's right edge */}
            {item.imageUrl && (
              <img
                src={imageUrl}
                alt={item.name}
                width="150"
                height="150"
                className="plate absolute -right-7 top-2 h-[120px] w-[120px] min-[390px]:h-[150px] min-[390px]:w-[150px] md:right-12 md:top-5 md:h-[120px] md:w-[120px]"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}

            {/* TITLE & DESCRIPTION */}
            <div className={item.imageUrl ? 'pr-24 min-[390px]:pr-32 md:pr-40' : 'pr-2 md:pr-12'}>
              <h2 className="font-display text-[28px] leading-none">{item.name}</h2>
              {item.description && (
                <p className="mt-2 font-serif text-[17px] italic leading-snug text-ht-mute">
                  {item.description}
                </p>
              )}
              <p className="mt-2 text-lg font-bold text-ht-red">
                ₹{basePrice.toFixed(0)}
                <span className="ml-2 text-xs font-medium text-ht-mute">base price</span>
              </p>
            </div>

            {/* SIZE and STYLE — two independent optional groups.
                One pick each, and they combine (Large + Szechwan). Rendering them
                as one radio pool is what made "Large Szechwan Egg Chowmein"
                impossible to order online. */}
            {sizeVariants.length > 0 && (
              <div>
                {stepTitle('Size')}
                <div className="flex flex-wrap gap-2">
                  {chip({ key: 'regular', selected: selectedSize === null, onSelect: () => setSelectedSize(null), name: 'Regular' })}
                  {sizeVariants.map((variant) => chip({
                    key: variant.id,
                    selected: selectedSize?.id === variant.id,
                    onSelect: () => selectSize(variant),
                    name: variant.name,
                    price: delta(variant.priceDelta, selectedSize?.id === variant.id),
                  }))}
                </div>
              </div>
            )}

            {styleVariants.length > 0 && (
              <div>
                {stepTitle('Style', 'optional')}
                <div className="flex flex-wrap gap-2">
                  {chip({ key: 'none', selected: selectedStyle === null, onSelect: () => setSelectedStyle(null), name: 'As listed' })}
                  {styleVariants.map((variant) => chip({
                    key: variant.id,
                    selected: selectedStyle?.id === variant.id,
                    onSelect: () => selectStyle(variant),
                    name: variant.name,
                    price: delta(variant.priceDelta, selectedStyle?.id === variant.id),
                  }))}
                </div>
              </div>
            )}

            {/* VARIANT FAMILIES (REQUIRED) */}
            {variantFamilies.map((family) => (
              <div key={family.id}>
                {stepTitle(family.name, familyIsRequired(family) ? 'pick one' : 'optional')}
                <div className="flex flex-wrap gap-2">
                  {family.options.map((opt) => chip({
                    key: opt.id,
                    selected: selectedFamilyVariants[family.id]?.id === opt.id,
                    error: hasFamilyError(family.id),
                    onSelect: () => selectFamilyVariant(family.id, opt),
                    name: opt.name,
                    price: delta(opt.priceDelta, selectedFamilyVariants[family.id]?.id === opt.id),
                  }))}
                </div>
              </div>
            ))}

            {/* ADDONS FROM ADDONS TABLE (Optional) */}
            {addonGroups.map((group) => (
              <div key={group.id}>
                {stepTitle(group.name || 'Add-ons', 'optional')}
                <div className="flex flex-wrap gap-2">
                  {(group.options || []).map((opt) => {
                    const selected = selectedAddons[group.id]?.[opt.id] !== undefined;
                    const locked = isLocked(opt);
                    return chip({
                      key: opt.id,
                      selected: selected || locked,
                      locked,
                      onSelect: () => toggleAddon(group.id, opt),
                      name: opt.name,
                      price: locked ? lockedNote(opt) : delta(opt.priceDelta, selected),
                    });
                  })}
                </div>
              </div>
            ))}

            {/* ADDON FAMILIES (REQUIRED - except packaging) */}
            {addonFamilies.map((family) => {
              const allPackaging = family.options.every(opt => isLocked(opt));
              // maxSelect 1 is a pick-one group; the chip handler already
              // enforces that, the note just says so.
              const singleChoice = Number(family?.maxSelect) === 1;
              const note = allPackaging ? null
                : familyIsRequired(family) ? (singleChoice ? 'pick one' : 'required')
                : 'optional';
              return (
                <div key={family.id}>
                  {stepTitle(family.name, note)}
                  <div className="flex flex-wrap gap-2">
                    {family.options.map((opt) => {
                      const selected = selectedFamilyAddons[family.id]?.[opt.id] !== undefined;
                      const locked = isLocked(opt);
                      return chip({
                        key: opt.id,
                        selected: selected || locked,
                        locked,
                        error: hasFamilyError(family.id) && !locked,
                        onSelect: () => toggleFamilyAddon(family.id, opt),
                        name: opt.name,
                        price: locked ? lockedNote(opt) : delta(opt.priceDelta, selected),
                      });
                    })}
                  </div>
                </div>
              );
            })}

            {/* PRICE BREAKDOWN */}
            <div className="mt-6 space-y-1.5 border-t border-ht-ink/15 pt-3 text-sm tabular-nums text-ht-mute">
              <div className="flex justify-between">
                <span>Base price</span>
                <span>₹{basePrice.toFixed(0)}</span>
              </div>
              {selectedSize && (
                <div className="flex justify-between">
                  <span>{selectedSize.name}</span>
                  <span>+₹{selectedSize.priceDelta}</span>
                </div>
              )}
              {selectedStyle && (
                <div className="flex justify-between">
                  <span>{selectedStyle.name}</span>
                  <span>+₹{selectedStyle.priceDelta}</span>
                </div>
              )}
              {Object.values(selectedFamilyVariants).map((v) => (
                <div key={v.id} className="flex justify-between">
                  <span>{v.name}</span>
                  <span>+₹{v.priceDelta}</span>
                </div>
              ))}
              {Object.values(selectedAddons)
                .flatMap((g) => Object.values(g))
                .map((a) => (
                  <div key={a.id} className="flex justify-between">
                    <span>{a.name}</span>
                    <span>+₹{a.priceDelta}</span>
                  </div>
                ))}
              {Object.values(selectedFamilyAddons)
                .flatMap((g) => Object.values(g))
                .map((a) => (
                  <div key={a.id} className="flex justify-between">
                    <span>{a.name}</span>
                    <span>+₹{a.priceDelta}</span>
                  </div>
                ))}
              <div className="flex justify-between border-t-[1.5px] border-ht-ink pt-2 text-base font-extrabold text-ht-ink">
                <span>Price per item</span>
                <span>₹{unitPrice.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* STICKY FOOTER — qty stepper + add */}
        <div className="shrink-0 space-y-3 border-t border-ht-ink/10 bg-ht-ivory px-5 pb-4 pt-3">
          {validationError && (
            <div className="flex items-start gap-2.5 rounded-[10px] border-[1.5px] border-ht-red bg-ht-red/5 p-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ht-red" />
              <p className="whitespace-pre-line text-sm font-semibold text-ht-red">
                {validationError.message}
              </p>
            </div>
          )}

          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5">
            <div className="flex h-11 items-center rounded-full border-[1.5px] border-ht-red">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="grid h-11 w-10 place-items-center text-ht-red"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-base font-bold tabular-nums">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="grid h-11 w-10 place-items-center text-ht-red"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex h-[52px] min-w-0 items-center justify-center whitespace-nowrap rounded-full bg-ht-red px-4 text-base font-bold text-white transition hover:bg-ht-red2 active:scale-[.98]"
              aria-label="Add item to cart"
            >
              Add to bag · ₹{finalTotal.toFixed(0)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}