// site/src/components/CartDrawer.jsx - FIXED
// ✅ Mobile only (hidden on desktop)
// ✅ Proper scrolling with internal footer
// ✅ No cursor responsiveness issues
// ✅ Footer not pushed down
// ✅ All functionality preserved

import { X, Minus, Plus, Trash2, MapPin, MessageSquare } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useBackableOverlay } from "../hooks/useBackableOverlay";
import GoogleMapsAutocomplete from "./GoogleMapsAutocomplete";
import { lineUnitPrice } from "../utils/cartLine";
import { money } from "../lib/money";
import { gstIncludedNote } from "../lib/billTotals.js";
import { codAllowed, COD_MAX_TOTAL, RESTAURANT_PHONE, RESTAURANT_PHONE_DISPLAY } from "../utils/paymentPolicy";

export default function CartDrawer({
  isOpen,
  onClose,
  lines,
  cartTotal,
  discountAmount = 0,
  pointsDiscount = 0,
  gstAmount,
  gstOnTop = true,
  deliveryCharge = 0,
  finalTotal,
  deliveryAddress,
  setDeliveryAddress,
  specialNotes,
  setSpecialNotes,
  paymentError,
  paymentProcessing,
  onCODPayment,
  onRazorpayPayment,
  orderType,
}) {
  const { removeLine, updateQty } = useCart();
  // Back button closes the drawer instead of popping the checkout route.
  const closeDrawer = useBackableOverlay(isOpen, onClose);
  // Use the orderType prop, not the cart context's orderMode: Order.jsx owns the
  // selection on this screen and passes it down, and the two can drift.
  const isDineIn = orderType === 'dine_in';

  // ✅ Only show on mobile (hidden on desktop with md:hidden)
  if (!isOpen) return null;

  return (
    <>
      {/* ====================================================================== */}
      {/* BACKDROP - Mobile only */}
      {/* ====================================================================== */}
      <div
        className="fixed inset-0 bg-ht-ink/60 z-40 md:hidden"
        onClick={closeDrawer}
        aria-label="Close cart"
      />

      {/* ====================================================================== */}
      {/* DRAWER - Mobile only, slides from right */}
      {/* ✅ FIXED: Use flex column layout with proper scrolling */}
      {/* ====================================================================== */}
      <div className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-ht-ivory border-l border-ht-ink/10 z-50 md:hidden flex flex-col">
        
        {/* HEADER - Sticky at top */}
        <div className="flex items-center justify-between p-4 border-b border-ht-ink/10 flex-shrink-0">
          <h2 className="text-xl font-bold text-ht-ink">Your Cart</h2>
          <button
            onClick={closeDrawer}
            className="p-2 hover:bg-ht-paper rounded-[14px] transition-colors text-ht-ink"
            aria-label="Close cart"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT - Scrollable middle section */}
        <div className="flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            // Empty Cart
            <div className="p-8 text-center text-ht-mute mt-8">
              <p className="text-lg">Your cart is empty</p>
            </div>
          ) : (
            // Cart Items List
            <div className="p-4 space-y-3">
              {lines.map((line, idx) => {
                // Dine-in carries no packaging charge — see utils/cartLine.js.
                // This drawer used to price every addon regardless of mode, so a
                // dine-in cart showed a packaging charge the checkout then didn't
                // apply.
                const unitPrice = lineUnitPrice(line, isDineIn);
                const lineTotal = unitPrice * (line.qty || 1);

                return (
                  <div
                    key={idx}
                    className="bg-ht-paper p-3 rounded-[14px] space-y-2"
                  >
                    {/* Item Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ht-ink text-sm">
                          {line.name}
                        </p>
                        <p className="text-xs text-ht-mute">
                          ₹{unitPrice} each
                        </p>
                        {line.variants && line.variants.length > 0 && (
                          <p className="text-xs text-ht-mute mt-1 truncate">
                            {line.variants.map((v) => v.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('[CartDrawer] 🗑️ Removing line with key:', line.key);
                          removeLine(line.key);
                        }}
                        className="text-ht-red hover:text-ht-red p-1 flex-shrink-0 relative z-10"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => {
                          // ✅ UPDATED: Remove item when quantity becomes 0
                          updateQty(line.key, line.qty - 1);
                        }}
                        className={`w-8 h-8 rounded flex items-center justify-center text-white transition-colors ${
                          line.qty === 1 
                            ? 'bg-red-600 hover:bg-red-700 active:bg-red-800' 
                            : 'bg-ht-ink/10 hover:bg-ht-ink/15 active:bg-ht-ink/20'
                        }`}
                        aria-label={line.qty === 1 ? 'Remove from cart' : 'Decrease quantity'}
                      >
                        {line.qty === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="flex-1 text-center text-ht-ink font-semibold text-sm">
                        {line.qty}
                      </span>
                      <button
                        onClick={() => updateQty(line.key, line.qty + 1)}
                        className="w-8 h-8 bg-ht-ink/10 rounded hover:bg-ht-ink/15 active:bg-ht-ink/20 flex items-center justify-center text-ht-ink transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right text-ht-red font-semibold text-sm">
                      ₹{lineTotal}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ====================================================================== */}
        {/* FOOTER - Sticky at bottom (inside drawer, not fixed to viewport) */}
        {/* ====================================================================== */}
        {lines.length > 0 && (
          <div className="border-t border-ht-ink/10 bg-ht-ivory p-4 space-y-3 flex-shrink-0">
            
            {/* Order Summary — every line that moves the total must be shown, else
                the total reads as broken maths (delivery was silently omitted). */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ht-mute">
                <span>Subtotal</span>
                <span>₹{money(cartTotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-ht-veg">
                  <span>Discount</span>
                  <span>-₹{money(discountAmount)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-ht-red2">
                  <span>Points Discount</span>
                  <span>-₹{money(pointsDiscount)}</span>
                </div>
              )}
              {/* GST appears in the column ONLY when it was added on top of a
                  discounted value. With no discount it is already inside the
                  menu price, so a column line makes the figures overshoot the
                  Total by 5% — it is stated below the Total instead. Same rule
                  and same wording as lib/billTotals.js, which drives the
                  confirmation and order-details pages. */}
              {gstOnTop && (
                <div className="flex justify-between text-ht-mute">
                  <span>GST (5%)</span>
                  <span>₹{money(gstAmount)}</span>
                </div>
              )}
              {orderType !== 'pickup' && orderType !== 'dine_in' && (
                <div className="flex justify-between text-ht-mute">
                  <span>Delivery</span>
                  {deliveryCharge > 0
                    ? <span>₹{money(deliveryCharge)}</span>
                    : <span className="text-ht-veg font-medium">FREE</span>}
                </div>
              )}
              <div className="flex justify-between font-bold text-ht-ink text-base border-t border-ht-ink/15 pt-2">
                <span>Total</span>
                <span className="text-ht-red">₹{money(finalTotal)}</span>
              </div>
              {!gstOnTop && (
                <p className="text-ht-mute text-xs text-right">{gstIncludedNote(gstAmount)}</p>
              )}
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <label className="block text-ht-ink text-sm font-semibold">
                <MapPin className="w-4 h-4 inline mr-1" />
                Delivery Address
              </label>
              <GoogleMapsAutocomplete
                onSelect={(address) => setDeliveryAddress(address.address)}
                defaultValue={deliveryAddress}
              />
            </div>

            {/* Special Notes */}
            <div className="space-y-2">
              <label className="block text-ht-ink text-sm font-semibold">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Special Notes
              </label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Any special requests? (optional)"
                className="w-full px-3 py-2 bg-ht-paper border border-ht-ink/15 rounded-[14px] text-ht-ink text-sm focus:outline-none focus:ring-2 focus:ring-ht-red resize-none"
                rows="2"
              />
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="bg-ht-red/10 border border-red-500/50 rounded-[14px] p-2 text-ht-red text-xs">
                {paymentError}
              </div>
            )}

            {/* Payment Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={onRazorpayPayment}
                disabled={paymentProcessing || lines.length === 0}
                className="w-full py-3 bg-ht-red hover:bg-ht-red2 active:bg-ht-red2 disabled:bg-ht-ink/15 text-white font-bold rounded-[14px] transition-colors text-sm"
              >
                {paymentProcessing ? "Processing..." : "💳 Pay Online"}
              </button>

              {orderType === 'delivery' ? (
                <div className="w-full py-3 px-3 bg-ht-paper border border-ht-ink/15 rounded-[14px] text-ht-mute text-xs text-center leading-relaxed">
                  💵 Want to pay cash?{' '}
                  <a href="tel:+918420822919" className="text-ht-red font-medium underline">Call +91 84208 22919</a>
                  {' '}and we'll try to arrange our own delivery.
                </div>
              ) : !codAllowed(finalTotal) ? (
                <div className="w-full py-3 px-3 bg-ht-paper border border-ht-ink/15 rounded-[14px] text-ht-mute text-xs text-center leading-relaxed">
                  Orders above ₹{COD_MAX_TOTAL} must be paid online. To arrange it differently, call{' '}
                  <a href={`tel:${RESTAURANT_PHONE}`} className="text-ht-red font-medium underline">{RESTAURANT_PHONE_DISPLAY}</a>.
                </div>
              ) : (
                <button
                  onClick={onCODPayment}
                  disabled={paymentProcessing || lines.length === 0}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-ht-ink/15 text-white font-bold rounded-[14px] transition-colors text-sm"
                >
                  {paymentProcessing ? "Processing..." : "💵 Pay on Delivery"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}