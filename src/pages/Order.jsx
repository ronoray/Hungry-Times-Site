// site/src/pages/Order.jsx
// COMPLETE ORDER PAGE WITH RAZORPAY ONLINE PAYMENT INTEGRATION
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import UserMenu from "../components/UserMenu";
import ServiceAreaCheck from "../components/ServiceAreaCheck";
import { useLocationStore } from "../context/LocationContext";
import API_BASE from "../config/api";

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Restaurant location
const RESTAURANT_LAT = parseFloat(import.meta.env.VITE_RESTAURANT_LAT || '22.5061956');
const RESTAURANT_LNG = parseFloat(import.meta.env.VITE_RESTAURANT_LNG || '88.3673608');
const MAX_DELIVERY_DISTANCE_KM = parseFloat(import.meta.env.VITE_MAX_DELIVERY_DISTANCE_KM || '3.5');

function Money({ value }) { 
  return <span>₹ {Number(value || 0).toFixed(0)}</span>; 
}

function Required() { 
  return <span className="text-red-400">*</span>; 
}

// Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Order() {
  const { customer, isAuthenticated, loading: authLoading } = useAuth();
  const { lines, clearCart, calcUnit, removeLine, updateQty } = useCart();
  
  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Menu data
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Order state
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState(null);
  
  // Payment mode popup
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  
  // Customer flagging
  const [isFlagged, setIsFlagged] = useState(false);
  const [flaggedReason, setFlaggedReason] = useState("");
  
  // Operating hours
  const [operatingHours, setOperatingHours] = useState(null);
  const [hoursWarning, setHoursWarning] = useState("");
  
  // Location state
  const { savedAddress } = useLocationStore();

  // Load menu
  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/public/menu`);
      if (!res.ok) throw new Error("Failed to load menu");
      const data = await res.json();
      setMenu(data.menu || []);
    } catch (err) {
      console.error("Menu load error:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Check if customer is flagged
  useEffect(() => {
    if (customer?.phone) {
      checkIfFlagged();
    }
  }, [customer]);
  
  // Check operating hours
  useEffect(() => {
    checkOperatingHours();
    // Check every minute
    const interval = setInterval(checkOperatingHours, 60000);
    return () => clearInterval(interval);
  }, []);
  
  const checkIfFlagged = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/public/orders/check-flagged/${customer.phone}`);
      if (response.ok) {
        const data = await response.json();
        setIsFlagged(data.is_flagged);
        setFlaggedReason(data.flagged_reason || "");
        
        if (data.is_flagged) {
          console.log("⚠️ Customer is flagged:", data.flagged_reason);
        }
      }
    } catch (error) {
      console.error("Failed to check flagged status:", error);
    }
  };
  
  const checkOperatingHours = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/public/operating-hours`);
      if (response.ok) {
        const data = await response.json();
        setOperatingHours(data);
        
        if (data.isBeforeOpening) {
          setHoursWarning(`⏰ We open at ${data.openingTime}. Your order will be processed when we open.`);
        } else if (data.isAfterClosing) {
          setHoursWarning(`🔒 We're closed. Operating hours: ${data.openingTime} - ${data.closingTime} IST`);
        } else {
          setHoursWarning("");
        }
      }
    } catch (error) {
      console.error("Failed to check operating hours:", error);
    }
  };

  // Cart total
  const cartTotal = useMemo(() => {
    return lines.reduce((sum, line) => sum + calcUnit(line) * line.qty, 0);
  }, [lines, calcUnit]);

  // Delivery fee
  const deliveryFee = deliveryType === "delivery" ? 30 : 0;
  const finalTotal = cartTotal + deliveryFee;

  // Auth check before checkout
  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!customer.name || !customer.email || !customer.address) {
      alert("Please complete your profile before placing an order.");
      setShowAuthModal(true);
      return;
    }

    // Scroll to checkout
    document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ============================================================================
  // HANDLE PLACE ORDER BUTTON CLICK
  // ============================================================================
  const handlePlaceOrderClick = () => {
    // Check authentication
    if (!isAuthenticated || !customer) {
      setShowAuthModal(true);
      return;
    }
    
    // Check if cart is empty
    if (lines.length === 0) {
      setOrderError("Your cart is empty");
      return;
    }
    
    // Check profile completion
    if (!customer.name || !customer.email || !customer.address) {
      setOrderError("Please complete your profile");
      setShowAuthModal(true);
      return;
    }
    
    // Check if closed
    if (operatingHours?.isAfterClosing) {
      setOrderError(`We're closed. We open at ${operatingHours.openingTime} tomorrow.`);
      return;
    }
    
    // Show payment mode selection modal
    setShowPaymentModal(true);
    setOrderError("");
  };
  
  // ============================================================================
  // HANDLE PAYMENT MODE SELECTION
  // ============================================================================
  const handlePaymentModeSelect = async (mode) => {
    setSelectedPaymentMode(mode);
    
    // If customer is flagged and tries to use COD
    if (isFlagged && mode === "COD") {
      setOrderError(`Cash on Delivery is not available. ${flaggedReason}. Please choose Online Payment.`);
      return;
    }
    
    // Close modal
    setShowPaymentModal(false);
    
    // If ONLINE payment, initiate Razorpay
    if (mode === "ONLINE") {
      await handleOnlinePayment();
    } else {
      // For COD, UPI on delivery, Card on delivery - submit order directly
      await submitOrder(mode);
    }
  };
  
  // ============================================================================
  // HANDLE ONLINE PAYMENT WITH RAZORPAY
  // ============================================================================
  const handleOnlinePayment = async () => {
    setSubmitting(true);
    setOrderError("");

    try {
      // Step 1: Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay. Please try again.");
      }

      // Step 2: Create order in our database first
      const orderPayload = {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          latitude: customer.latitude || null,
          longitude: customer.longitude || null
        },
        lines: lines.map(line => ({
          itemId: line.itemId || line.id,
          name: line.itemName || line.name,
          basePrice: line.basePrice,
          qty: line.qty,
          variant: line.variant || null,
          addons: line.addons || []
        })),
        paymentMode: "ONLINE",
        deliveryType: deliveryType,
        notes: orderNotes
      };

      const orderResponse = await fetch(`${API_BASE}/api/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || "Failed to create order");
      }

      const orderData = await orderResponse.json();
      const dbOrderId = orderData.orderId;

      console.log("✅ Order created in DB:", dbOrderId);

      // Step 3: Create Razorpay order
      const razorpayOrderResponse = await fetch(`${API_BASE}/api/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalTotal,
          currency: "INR",
          receipt: `order_${dbOrderId}`
        })
      });

      if (!razorpayOrderResponse.ok) {
        throw new Error("Failed to create payment order");
      }

      const razorpayData = await razorpayOrderResponse.json();

      console.log("✅ Razorpay order created:", razorpayData.orderId);

      // Step 4: Open Razorpay checkout
      const options = {
        key: razorpayData.key,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        name: "Hungry Times",
        description: `Order #${dbOrderId}`,
        order_id: razorpayData.orderId,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone
        },
        theme: {
          color: "#f59e0b"
        },
        handler: async function (response) {
          // Payment successful - verify it
          await verifyPayment(response, dbOrderId);
        },
        modal: {
          ondismiss: function() {
            console.log("⚠️ Payment cancelled by user");
            setSubmitting(false);
            setOrderError("Payment cancelled. Please try again.");
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();

    } catch (error) {
      console.error("❌ Payment error:", error);
      setOrderError(error.message || "Failed to process payment");
      setSubmitting(false);
    }
  };

  // ============================================================================
  // VERIFY RAZORPAY PAYMENT
  // ============================================================================
  const verifyPayment = async (paymentResponse, dbOrderId) => {
    try {
      console.log("🔍 Verifying payment...", paymentResponse);

      const verifyResponse = await fetch(`${API_BASE}/api/razorpay/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          dbOrderId: dbOrderId
        })
      });

      if (!verifyResponse.ok) {
        throw new Error("Payment verification failed");
      }

      const verifyData = await verifyResponse.json();

      console.log("✅ Payment verified successfully!");

      // Success!
      setPlacedOrderId(dbOrderId);
      setOrderSuccess(true);
      clearCart();
      setOrderNotes("");
      setSubmitting(false);

      // Scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

    } catch (error) {
      console.error("❌ Payment verification error:", error);
      setOrderError("Payment verification failed. Please contact support.");
      setSubmitting(false);
    }
  };

  // ============================================================================
  // SUBMIT ORDER (For COD, UPI on Delivery, Card on Delivery)
  // ============================================================================
  const submitOrder = async (paymentMode) => {
    setSubmitting(true);
    setOrderError("");
    
    try {
      const orderPayload = {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          latitude: customer.latitude || null,
          longitude: customer.longitude || null
        },
        lines: lines.map(line => ({
          itemId: line.itemId || line.id,
          name: line.itemName || line.name,
          basePrice: line.basePrice,
          qty: line.qty,
          variant: line.variant || null,
          addons: line.addons || []
        })),
        paymentMode: paymentMode,
        deliveryType: deliveryType,
        notes: orderNotes
      };
      
      const response = await fetch(`${API_BASE}/api/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Failed to place order");
      }
      
      const result = await response.json();
      
      // Success!
      setPlacedOrderId(result.orderId);
      setOrderSuccess(true);
      clearCart();
      setOrderNotes("");
      
      // Show warning if before opening
      if (result.isBeforeOpening) {
        setHoursWarning(result.message);
      }
      
      // Scroll to top
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error("Order error:", error);
      setOrderError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Render loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-800 rounded-2xl p-8 text-center border border-neutral-700">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Order Placed Successfully!</h2>
          <p className="text-neutral-300 mb-6">
            Order #{placedOrderId}
          </p>
          
          {hoursWarning && (
            <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500 rounded-lg">
              <p className="text-yellow-300 text-sm">{hoursWarning}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="p-4 bg-neutral-700 rounded-lg">
              <p className="text-neutral-400 text-sm mb-1">Order Total</p>
              <p className="text-2xl font-bold text-orange-500">
                <Money value={finalTotal} />
              </p>
            </div>
            
            <div className="p-4 bg-neutral-700 rounded-lg text-left">
              <p className="text-neutral-400 text-sm mb-2">Delivery Address</p>
              <p className="text-white text-sm">{customer.address}</p>
            </div>
          </div>
          
          <div className="mt-8 space-y-3">
            <button
              onClick={() => {
                setOrderSuccess(false);
                setPlacedOrderId(null);
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Place Another Order
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-neutral-700 hover:bg-neutral-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Header */}
      <div className="bg-neutral-800 border-b border-neutral-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-orange-500">Complete Your Order</h1>
            {hoursWarning && (
              <p className="text-sm text-yellow-400 mt-1">{hoursWarning}</p>
            )}
          </div>
          {isAuthenticated && <UserMenu />}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Cart Items */}
        {lines.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-neutral-400 mb-4">Your cart is empty</p>
            <a href="/menu" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg transition-colors">
              Browse Menu
            </a>
          </div>
        ) : (
          <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 mb-6">
            <h2 className="text-2xl font-bold mb-4">Your Cart</h2>
            
            {lines.map((line, idx) => (
              <div key={line.key || idx} className="border-b border-neutral-700 py-4 last:border-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-white">{line.itemName || line.name}</h3>
                    {line.variant && (
                      <p className="text-sm text-neutral-400 mt-1">
                        Variant: {line.variant.name} {line.variant.priceDelta > 0 && `(+₹${line.variant.priceDelta})`}
                      </p>
                    )}
                    {line.addons && line.addons.length > 0 && (
                      <p className="text-sm text-neutral-400 mt-1">
                        Add-ons: {line.addons.map(a => `${a.name} (+₹${a.priceDelta})`).join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-neutral-700 rounded">
                      <button
                        onClick={() => updateQty(line.key, line.qty - 1)}
                        className="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
                        disabled={line.qty <= 1}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-white">{line.qty}</span>
                      <button
                        onClick={() => updateQty(line.key, line.qty + 1)}
                        className="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
                      >
                        +
                      </button>
                    </div>
                    <p className="w-20 text-right font-semibold text-white">
                      <Money value={calcUnit(line) * line.qty} />
                    </p>
                    <button
                      onClick={() => removeLine(line.key)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Cart Totals */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-neutral-300">
                <span>Subtotal:</span>
                <Money value={cartTotal} />
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Delivery Fee:</span>
                <Money value={deliveryFee} />
              </div>
              <div className="flex justify-between text-xl font-bold text-orange-500 pt-2 border-t border-neutral-700">
                <span>Total:</span>
                <Money value={finalTotal} />
              </div>
            </div>

            {/* Proceed to Checkout Button */}
            <button
              onClick={handleProceedToCheckout}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        )}

        {/* CHECKOUT SECTION */}
        {lines.length > 0 && (
          <div id="checkout-section" className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
            <h2 className="text-2xl font-bold text-white mb-6">Checkout</h2>
            
            {/* Delivery Type */}
            <div className="mb-6">
              <label className="block font-semibold text-white mb-3">Delivery Type <Required /></label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeliveryType("delivery")}
                  className={`py-3 rounded-lg font-semibold transition-all ${
                    deliveryType === "delivery"
                      ? "bg-orange-500 text-white"
                      : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                  }`}
                >
                  🚚 Delivery (₹30)
                </button>
                <button
                  onClick={() => setDeliveryType("pickup")}
                  className={`py-3 rounded-lg font-semibold transition-all ${
                    deliveryType === "pickup"
                      ? "bg-orange-500 text-white"
                      : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                  }`}
                >
                  🏪 Pickup (Free)
                </button>
              </div>
            </div>
            
            {/* Order Notes */}
            <div className="mb-6">
              <label className="block font-semibold text-white mb-2">Special Instructions</label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Any special requests? (e.g., extra spicy, no onions)"
                className="w-full bg-neutral-700 text-white rounded-lg px-4 py-3 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
              />
            </div>
            
            {/* Error Message */}
            {orderError && (
              <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300">
                {orderError}
              </div>
            )}
            
            {/* Place Order Button */}
            <button
              onClick={handlePlaceOrderClick}
              disabled={submitting || operatingHours?.isAfterClosing}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all text-lg"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </span>
              ) : (
                `Place Order - ₹${finalTotal}`
              )}
            </button>
            
            {operatingHours?.isAfterClosing && (
              <p className="text-center text-red-400 mt-2 text-sm">
                We're closed. Orders will be accepted when we reopen.
              </p>
            )}
          </div>
        )}

        {/* PAYMENT MODE MODAL */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-800 rounded-lg p-6 max-w-md w-full border border-neutral-700">
              <h3 className="text-2xl font-bold text-white mb-2">Choose Payment Mode</h3>
              <p className="text-neutral-300 mb-6">
                Select how you'll pay for your order:
              </p>
              
              <div className="space-y-3">
                {/* ONLINE Payment (Razorpay) */}
                <button
                  onClick={() => handlePaymentModeSelect("ONLINE")}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 p-4 rounded-lg text-left transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">💳</div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">Pay Online Now</p>
                      <p className="text-sm text-neutral-200">Credit/Debit Card, UPI, Net Banking</p>
                    </div>
                  </div>
                </button>

                {/* COD Option - Hidden if flagged */}
                {!isFlagged && (
                  <button
                    onClick={() => handlePaymentModeSelect("COD")}
                    className="w-full bg-neutral-700 hover:bg-neutral-600 p-4 rounded-lg text-left transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">💵</div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-lg group-hover:text-orange-400 transition-colors">Cash on Delivery</p>
                        <p className="text-sm text-neutral-400">Pay with cash when order arrives</p>
                      </div>
                    </div>
                  </button>
                )}
                
                {/* UPI Option */}
                <button
                  onClick={() => handlePaymentModeSelect("UPI")}
                  className="w-full bg-neutral-700 hover:bg-neutral-600 p-4 rounded-lg text-left transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">📱</div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg group-hover:text-orange-400 transition-colors">UPI on Delivery</p>
                      <p className="text-sm text-neutral-400">Scan QR code when order arrives</p>
                    </div>
                  </div>
                </button>
                
                {/* Card Option */}
                <button
                  onClick={() => handlePaymentModeSelect("CARD")}
                  className="w-full bg-neutral-700 hover:bg-neutral-600 p-4 rounded-lg text-left transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">💳</div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg group-hover:text-orange-400 transition-colors">Card on Delivery</p>
                      <p className="text-sm text-neutral-400">Pay with card machine on delivery</p>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Flagged Warning */}
              {isFlagged && (
                <div className="mt-4 p-3 bg-orange-900/30 border border-orange-500 rounded-lg">
                  <p className="text-orange-300 text-sm">
                    ⚠️ Cash on Delivery is not available. {flaggedReason}
                  </p>
                </div>
              )}
              
              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setOrderError("");
                }}
                className="w-full mt-4 bg-neutral-600 hover:bg-neutral-500 text-white py-3 rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal 
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)} 
          />
        )}
      </div>
    </div>
  );
}