// site/src/pages/Order.jsx
// COMPLETE ORDER PAGE WITH PAYMENT MODE, OPERATING HOURS, AND FLAGGING
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import UserMenu from "../components/UserMenu";
import ServiceAreaCheck from "../components/ServiceAreaCheck";
import { useLocationStore } from "../context/LocationContext";
import API_BASE from "../config/api";

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
  
  // ✨ NEW: Payment mode popup
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  
  // ✨ NEW: Customer flagging
  const [isFlagged, setIsFlagged] = useState(false);
  const [flaggedReason, setFlaggedReason] = useState("");
  
  // ✨ NEW: Operating hours
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
  
  // ✨ NEW: Check if customer is flagged
  useEffect(() => {
    if (customer?.phone) {
      checkIfFlagged();
    }
  }, [customer]);
  
  // ✨ NEW: Check operating hours
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

  // ✨ NEW: Handle place order button click (show payment modal)
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
  
  // ✨ NEW: Handle payment mode selection and submit order
  const handlePaymentModeSelect = async (mode) => {
    setSelectedPaymentMode(mode);
    
    // If customer is flagged and tries to use COD
    if (isFlagged && mode === "COD") {
      setOrderError(`Cash on Delivery is not available. ${flaggedReason}. Please choose UPI or Card payment.`);
      return;
    }
    
    // Close modal and submit order
    setShowPaymentModal(false);
    await submitOrder(mode);
  };
  
  // ✨ UPDATED: Submit order with payment mode
  const submitOrder = async (paymentMode) => {
    setSubmitting(true);
    setOrderError("");
    
    try {
      // Prepare order payload for new API
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
        paymentMode: paymentMode,  // COD, UPI, or CARD
        deliveryType: deliveryType,
        notes: orderNotes
      };
      
      // ✨ NEW API ENDPOINT
      const response = await fetch(`${API_BASE}/api/public/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      
      {/* HEADER WITH USER MENU */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Menu</h1>
        {isAuthenticated ? (
          <UserMenu />
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            Login / Register
          </button>
        )}
      </div>

      {/* ✨ NEW: Operating Hours Warning */}
      {hoursWarning && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${
          operatingHours?.isAfterClosing 
            ? 'bg-red-900/30 border-red-500 text-red-300' 
            : 'bg-yellow-900/30 border-yellow-500 text-yellow-300'
        }`}>
          <p className="font-semibold">{hoursWarning}</p>
        </div>
      )}

      {/* ✨ NEW: Flagged Customer Warning */}
      {isFlagged && (
        <div className="mb-6 p-4 bg-orange-900/30 border-l-4 border-orange-500 rounded-lg">
          <p className="text-orange-300 font-semibold">
            ⚠️ {flaggedReason}. Prepayment required for future orders.
          </p>
        </div>
      )}

      {/* SERVICE AREA CHECK */}
      {isAuthenticated && <ServiceAreaCheck />}

      {/* ORDER SUCCESS MESSAGE */}
      {orderSuccess && (
        <div className="mb-6 p-6 bg-green-500/10 border-2 border-green-500/50 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-green-400 font-bold text-xl mb-2">Order Placed Successfully! 🎉</h3>
              <p className="text-neutral-300 mb-2">
                Order #{placedOrderId} - Thank you for your order! We've received it and will start preparing shortly.
              </p>
              {hoursWarning && operatingHours?.isBeforeOpening && (
                <p className="text-yellow-400 text-sm mt-2">
                  {hoursWarning}
                </p>
              )}
              <p className="text-sm text-neutral-400 mt-2">
                Waiting for restaurant confirmation...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MENU GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {menu.map((item) => (
          <div
            key={item.id}
            className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 hover:border-orange-500 transition-all cursor-pointer"
            onClick={() => setSelectedItem(item)}
          >
            {item.image && (
              <img
                src={`${API_BASE}${item.image}`}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h3 className="text-white font-semibold text-lg mb-2">{item.name}</h3>
              {item.description && (
                <p className="text-neutral-400 text-sm mb-3">{item.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-orange-400 font-bold text-lg">
                  <Money value={item.basePrice} />
                </span>
                <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CART SECTION */}
      {lines.length > 0 && (
        <div className="mb-8">
          <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
            <h2 className="text-2xl font-bold text-white mb-4">Your Cart</h2>
            
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between mb-4 pb-4 border-b border-neutral-700">
                <div className="flex-1">
                  <p className="text-white font-semibold">{line.itemName}</p>
                  {line.variant && (
                    <p className="text-sm text-neutral-400">{line.variant.name}</p>
                  )}
                  {line.addons && line.addons.length > 0 && (
                    <p className="text-sm text-neutral-400">
                      + {line.addons.map(a => a.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(idx, Math.max(1, line.qty - 1))}
                      className="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-white">{line.qty}</span>
                    <button
                      onClick={() => updateQty(idx, line.qty + 1)}
                      className="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-20 text-right font-semibold text-white">
                    <Money value={calcUnit(line) * line.qty} />
                  </p>
                  <button
                    onClick={() => removeLine(idx)}
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    ✕
                  </button>
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
                Placing Order...
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

      {/* ✨ NEW: Payment Mode Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-800 rounded-lg p-6 max-w-md w-full border border-neutral-700">
            <h3 className="text-2xl font-bold text-white mb-2">Choose Payment Mode</h3>
            <p className="text-neutral-300 mb-6">
              Select how you'll pay for your order:
            </p>
            
            <div className="space-y-3">
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
                      <p className="text-sm text-neutral-400">Pay with cash when your order arrives</p>
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
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-4 bg-neutral-600 hover:bg-neutral-500 text-white py-3 rounded-lg font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Item Detail Modal (if you have one - keep your existing code) */}
      {/* Add your existing selectedItem modal code here */}
      
    </div>
  );
}