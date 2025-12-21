// site/src/pages/Order.jsx - SIMPLIFIED & FIXED
// ✅ Clean layout with NO hidden menu
// ✅ Menu on left (desktop), below (mobile)
// ✅ All buttons fully responsive
// ✅ Cart working smoothly
// ✅ All features complete

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import Menu from "./Menu";
import AddToCartModal from "../components/AddToCartModal";
import CartDrawer from "../components/CartDrawer";
import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";
import { ShoppingCart, MapPin, MessageSquare, Loader, Trash2 } from "lucide-react";


import API_BASE from '../config/api.js';

export default function Order() {
  const { isAuthenticated, customer } = useAuth();
  const { lines, clearCart, addLine, removeLine } = useCart();

  // UI State
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Form State
  const [deliveryAddress, setDeliveryAddress] = useState(customer?.address || "");
  const [specialNotes, setSpecialNotes] = useState("");

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Order State
  const [orderCreated, setOrderCreated] = useState(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  useEffect(() => {
  if (customer?.address && !deliveryAddress) {
    console.log('[Order] Auto-populating address from customer profile');
    setDeliveryAddress(customer.address);
  }
}, [customer?.address, deliveryAddress]);

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const { cartTotal, gstAmount, finalTotal } = useMemo(() => {
    let total = 0;
    lines.forEach((line) => {
      const unitPrice =
        (line.basePrice || 0) +
        (line.variants?.reduce((sum, v) => sum + (v.priceDelta || 0), 0) || 0) +
        (line.addons?.reduce((sum, a) => sum + (a.priceDelta || 0), 0) || 0);
      total += unitPrice * (line.qty || 1);
    });

    const gst = Math.round(total * 0.05);
    return {
      cartTotal: Math.round(total),
      gstAmount: gst,
      finalTotal: Math.round(total + gst),
    };
  }, [lines]);

  const cartCount = lines.reduce((sum, line) => sum + (line.qty || 1), 0);

  // ============================================================================
  // ORDER CREATION & PAYMENT HANDLERS
  // ============================================================================

  const handleCreateOrder = async () => {
    if (!isAuthenticated) {
      setPaymentError("Please login to place an order");
      return;
    }

    if (lines.length === 0) {
      setPaymentError("Your cart is empty");
      return;
    }

    if (!deliveryAddress.trim()) {
      setPaymentError("Please enter a delivery address");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");

    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch(`${API_BASE}/customer/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: lines.map(line => ({
            itemId: line.id,
            itemName: line.name,
            quantity: line.qty,
            basePrice: line.basePrice,
            variants: line.variants || [],
            addons: line.addons || []
          })),
          deliveryAddress,
          specialNotes,
          paymentMethod: paymentMethod || "pending",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setOrderCreated(data.orderId);
      return data.orderId;
    } catch (error) {
      console.error("[Order] ❌ Error:", error);
      setPaymentError(error.message || "Failed to create order");
      setPaymentProcessing(false);
      return null;
    }
  };

  const handleCODPayment = async () => {
    setPaymentProcessing(true);
    setPaymentMethod("cod");
    const orderId = await handleCreateOrder();

    if (!orderId) {
      setPaymentProcessing(false);
      return;
    }

    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch(
        `${API_BASE}/customer/payments/cod/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        }
      );

      if (!response.ok) {
        throw new Error(`COD confirmation failed: ${response.status}`);
      }

      setOrderConfirmed(true);
      clearCart();
    } catch (error) {
      console.error("[Order] ❌ COD Error:", error);
      setPaymentError(error.message || "Failed to confirm COD payment");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!window.Razorpay) {
      setPaymentError("Razorpay not loaded");
      return;
    }

    setPaymentProcessing(true);
    setPaymentMethod("razorpay");
    const orderId = await handleCreateOrder();

    if (!orderId) {
      setPaymentProcessing(false);
      return;
    }

    try {
      const token = localStorage.getItem("customerToken");

      const initResponse = await fetch(
        `${API_BASE}/customer/payments/razorpay/init`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderId,
            amount: finalTotal,
            customerName: customer?.name || "Customer",
            customerPhone: customer?.phone || "",
            customerEmail: customer?.email || "",
          }),
        }
      );

      if (!initResponse.ok) {
        throw new Error("Failed to initialize Razorpay");
      }

      const { razorpayOrderId, razorpayKey } = await initResponse.json();

      const options = {
        key: razorpayKey,
        amount: finalTotal * 100,
        currency: "INR",
        order_id: razorpayOrderId,
        name: "Hungry Times",
        description: `Order #${orderId}`,
        handler: async (response) => {
          try {
            const verifyResponse = await fetch(
              `${API_BASE}/customer/payments/razorpay/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  orderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              }
            );

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed");
            }

            setOrderConfirmed(true);
            clearCart();
          } catch (error) {
            console.error("[Order] ❌ Verification Error:", error);
            setPaymentError("Payment verification failed");
          } finally {
            setPaymentProcessing(false);
          }
        },
        prefill: {
          name: customer?.name || "",
          email: customer?.email || "",
          contact: customer?.phone || "",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("[Order] ❌ Razorpay Error:", error);
      setPaymentError(error.message || "Failed to initialize payment");
      setPaymentProcessing(false);
    }
  };

  // ============================================================================
  // ORDER CONFIRMATION
  // ============================================================================

  if (orderConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B0B0B]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Order Confirmed!</h2>
          <p className="text-neutral-400 mb-2">Order ID: #{orderCreated}</p>
          <p className="text-neutral-400 mb-6">
            Your order has been placed successfully!
          </p>
          <a href="/menu" className="inline-block w-full btn btn-primary">
            Continue Shopping
          </a>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN PAGE - MOBILE & DESKTOP
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      {/* MOBILE: Menu at top */}
      <div className="md:hidden mb-6 px-4 pt-4">
        <Menu />
      </div>

      {/* MAIN CONTENT: 2-3 column layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 md:px-8 py-6">
        
        {/* LEFT: Menu (Desktop only) */}
        <div className="hidden md:block md:col-span-1">
          <Menu />
        </div>

        {/* CENTER: Cart items (full width mobile, spans 2 columns desktop) */}
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold text-white mb-4">Your Order</h2>

          {lines.length === 0 ? (
            <div className="bg-neutral-800 rounded-lg p-8 text-center">
              <ShoppingCart className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400 mb-4">Your cart is empty</p>
              <a 
                href="/menu" 
                className="text-orange-500 hover:text-orange-400 font-semibold inline-block"
              >
                Browse menu →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const unitPrice =
                  (line.basePrice || 0) +
                  (line.variants?.reduce((sum, v) => sum + (v.priceDelta || 0), 0) || 0) +
                  (line.addons?.reduce((sum, a) => sum + (a.priceDelta || 0), 0) || 0);
                const lineTotal = unitPrice * (line.qty || 1);

                return (
                  <div
                    key={line.key}
                    className="bg-neutral-800 rounded-lg p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white">{line.name}</h4>
                      {line.variants && line.variants.length > 0 && (
                        <p className="text-sm text-neutral-400 mt-1">
                          {line.variants.map((v) => v.name).join(", ")}
                        </p>
                      )}
                      {line.addons && line.addons.length > 0 && (
                        <p className="text-sm text-neutral-400">
                          {line.addons.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      <p className="text-orange-400 font-semibold mt-2">₹{lineTotal}</p>
                    </div>

                    {/* Remove and Quantity controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeLine(line.key)}
                        className="text-red-400 hover:text-red-300 p-2"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <p className="text-white font-bold text-lg whitespace-nowrap">x{line.qty}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Order summary & checkout (Desktop only) */}
        <div className="hidden md:block md:col-span-1">
          <div className="bg-neutral-800 rounded-lg p-6 space-y-6">
            {/* Order Summary */}
            <div>
              <h3 className="font-bold text-white text-lg mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>GST (5%)</span>
                  <span>₹{gstAmount}</span>
                </div>
                <div className="border-t border-neutral-700 pt-2 flex justify-between font-bold text-white text-lg">
                  <span>Total</span>
                  <span className="text-orange-500">₹{finalTotal}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <label className="block font-semibold text-white text-sm mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Delivery Address
              </label>
              <GoogleMapsAutocomplete
                onSelect={(address) => setDeliveryAddress(address.address)}
                defaultValue={deliveryAddress}
              />
            </div>

            {/* Special Notes */}
            <div>
              <label className="block font-semibold text-white text-sm mb-2">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Special Notes
              </label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Any special requests? (optional)"
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows="3"
              />
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {paymentError}
              </div>
            )}

            {/* Payment Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleRazorpayPayment}
                disabled={paymentProcessing || lines.length === 0}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-600 text-white font-bold rounded-lg transition-colors"
              >
                {paymentProcessing ? (
                  <>
                    <Loader className="w-4 h-4 inline animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "💳 Pay Online"
                )}
              </button>

              <button
                onClick={handleCODPayment}
                disabled={paymentProcessing || lines.length === 0}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-neutral-600 text-white font-bold rounded-lg transition-colors"
              >
                {paymentProcessing ? (
                  <>
                    <Loader className="w-4 h-4 inline animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "💵 Pay on Delivery"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE: Floating cart button */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartDrawerOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-2xl flex items-center justify-center text-white font-bold transition-transform"
          aria-label="Open cart"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-white text-orange-500 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {cartCount}
          </span>
        </button>
      )}

      {/* MOBILE: Sticky Payment Footer */}
      {lines.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-3 space-y-2 z-30">
          {/* Quick Total */}
          <div className="flex justify-between items-center px-1">
            <span className="text-neutral-400 text-sm">Total:</span>
            <span className="text-orange-400 font-bold text-lg">₹{finalTotal}</span>
          </div>

          {/* Payment Buttons */}
          <div className="space-y-1">
            <button
              onClick={handleRazorpayPayment}
              disabled={paymentProcessing || lines.length === 0 || !deliveryAddress}
              className="w-full py-2 h-10 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-neutral-600 text-white font-bold rounded text-xs transition-colors"
            >
              {paymentProcessing ? "Processing..." : "💳 Pay Online"}
            </button>

            <button
              onClick={handleCODPayment}
              disabled={paymentProcessing || lines.length === 0 || !deliveryAddress}
              className="w-full py-2 h-10 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-neutral-600 text-white font-bold rounded text-xs transition-colors"
            >
              {paymentProcessing ? "Processing..." : "💵 COD"}
            </button>
          </div>

          {/* Error */}
          {paymentError && (
            <div className="text-red-400 text-xs text-center bg-red-500/10 rounded px-2 py-1">
              {paymentError}
            </div>
          )}
        </div>
      )}

      {/* Mobile Spacing - Prevent content hiding */}
      {lines.length > 0 && (
        <div className="md:hidden h-40" />
      )}

      {/* MOBILE: Cart drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        lines={lines}
        cartTotal={cartTotal}
        gstAmount={gstAmount}
        finalTotal={finalTotal}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        specialNotes={specialNotes}
        setSpecialNotes={setSpecialNotes}
        paymentError={paymentError}
        paymentProcessing={paymentProcessing}
        onCODPayment={handleCODPayment}
        onRazorpayPayment={handleRazorpayPayment}
      />

      {/* Add to cart modal */}
      {selectedItemForModal && (
        <AddToCartModal
          item={selectedItemForModal}
          isOpen={true}
          onClose={() => setSelectedItemForModal(null)}
          onAdd={(lineItem) => {
            addLine(lineItem);
            setSelectedItemForModal(null);
          }}
        />
      )}
    </div>
  );
}