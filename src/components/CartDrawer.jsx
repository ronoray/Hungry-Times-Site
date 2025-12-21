// site/src/components/CartDrawer.jsx - FIXED
// ✅ Mobile only (hidden on desktop)
// ✅ Proper scrolling with internal footer
// ✅ No cursor responsiveness issues
// ✅ Footer not pushed down
// ✅ All functionality preserved

import { X, Minus, Plus, Trash2, MapPin, MessageSquare } from "lucide-react";
import { useCart } from "../context/CartContext";
import GoogleMapsAutocomplete from "./GoogleMapsAutocomplete";

export default function CartDrawer({
  isOpen,
  onClose,
  lines,
  cartTotal,
  gstAmount,
  finalTotal,
  deliveryAddress,
  setDeliveryAddress,
  specialNotes,
  setSpecialNotes,
  paymentError,
  paymentProcessing,
  onCODPayment,
  onRazorpayPayment,
}) {
  const { removeLine, updateQty } = useCart();

  // ✅ Only show on mobile (hidden on desktop with md:hidden)
  if (!isOpen) return null;

  return (
    <>
      {/* ====================================================================== */}
      {/* BACKDROP - Mobile only */}
      {/* ====================================================================== */}
      <div
        className="fixed inset-0 bg-black/60 z-40 md:hidden"
        onClick={onClose}
        aria-label="Close cart"
      />

      {/* ====================================================================== */}
      {/* DRAWER - Mobile only, slides from right */}
      {/* ✅ FIXED: Use flex column layout with proper scrolling */}
      {/* ====================================================================== */}
      <div className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-neutral-900 border-l border-neutral-800 z-50 md:hidden flex flex-col">
        
        {/* HEADER - Sticky at top */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Your Cart</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-white"
            aria-label="Close cart"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* CONTENT - Scrollable middle section */}
        <div className="flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            // Empty Cart
            <div className="p-8 text-center text-neutral-400 mt-8">
              <p className="text-lg">Your cart is empty</p>
            </div>
          ) : (
            // Cart Items List
            <div className="p-4 space-y-3">
              {lines.map((line, idx) => {
                const unitPrice =
                  (line.basePrice || 0) +
                  (line.variants?.reduce((sum, v) => sum + (v.priceDelta || 0), 0) || 0) +
                  (line.addons?.reduce((sum, a) => sum + (a.priceDelta || 0), 0) || 0);
                const lineTotal = unitPrice * (line.qty || 1);

                return (
                  <div
                    key={idx}
                    className="bg-neutral-800 p-3 rounded-lg space-y-2"
                  >
                    {/* Item Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm">
                          {line.name}
                        </p>
                        <p className="text-xs text-neutral-400">
                          ₹{unitPrice} each
                        </p>
                        {line.variants && line.variants.length > 0 && (
                          <p className="text-xs text-neutral-500 mt-1 truncate">
                            {line.variants.map((v) => v.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeLine(line.key)}
                        className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => updateQty(line.key, Math.max(1, line.qty - 1))}
                        className="w-8 h-8 bg-neutral-700 rounded hover:bg-neutral-600 active:bg-neutral-500 flex items-center justify-center text-white transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="flex-1 text-center text-white font-semibold text-sm">
                        {line.qty}
                      </span>
                      <button
                        onClick={() => updateQty(line.key, line.qty + 1)}
                        className="w-8 h-8 bg-neutral-700 rounded hover:bg-neutral-600 active:bg-neutral-500 flex items-center justify-center text-white transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right text-orange-400 font-semibold text-sm">
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
          <div className="border-t border-neutral-800 bg-neutral-900 p-4 space-y-3 flex-shrink-0">
            
            {/* Order Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>GST (5%)</span>
                <span>₹{gstAmount}</span>
              </div>
              <div className="flex justify-between font-bold text-white text-base border-t border-neutral-700 pt-2">
                <span>Total</span>
                <span className="text-orange-500">₹{finalTotal}</span>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <label className="block text-white text-sm font-semibold">
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
              <label className="block text-white text-sm font-semibold">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Special Notes
              </label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Any special requests? (optional)"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                rows="2"
              />
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-2 text-red-400 text-xs">
                {paymentError}
              </div>
            )}

            {/* Payment Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={onRazorpayPayment}
                disabled={paymentProcessing || lines.length === 0}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-neutral-600 text-white font-bold rounded-lg transition-colors text-sm"
              >
                {paymentProcessing ? "Processing..." : "💳 Pay Online"}
              </button>

              <button
                onClick={onCODPayment}
                disabled={paymentProcessing || lines.length === 0}
                className="w-full py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-neutral-600 text-white font-bold rounded-lg transition-colors text-sm"
              >
                {paymentProcessing ? "Processing..." : "💵 Pay on Delivery"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}