// site/src/pages/Order.jsx - COMPLETE WITH ADDRESS MANAGEMENT
// ✅ Smart address selection (auto-select single, choose from multiple)
// ✅ Add new address during checkout
// ✅ Customer instructions field
// ✅ Redirect to order details after successful payment

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import AddToCartModal from "../components/AddToCartModal";
import CartDrawer from "../components/CartDrawer";
import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";
import { ShoppingCart, MapPin, MessageSquare, Loader, Plus, Check, Edit2 } from "lucide-react";

import API_BASE from '../config/api.js';

export default function Order() {
  const navigate = useNavigate();
  const { isAuthenticated, customer } = useAuth();
  const { lines, clearCart, addLine, removeLine } = useCart();

  // UI State
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Address State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddressData, setNewAddressData] = useState({
    name: '',
    fullAddress: '',
    latitude: null,
    longitude: null
  });

  // Form State
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // ============================================================================
  // FETCH ADDRESSES ON LOAD
  // ============================================================================
  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated]);

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch(`${API_BASE}/customer/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch addresses");

      const data = await response.json();
      const fetchedAddresses = data.addresses || [];
      setAddresses(fetchedAddresses);

      // Auto-select if only one address
      if (fetchedAddresses.length === 1) {
        setSelectedAddressId(fetchedAddresses[0].id);
      } else if (fetchedAddresses.length > 1) {
        // Auto-select default address
        const defaultAddr = fetchedAddresses.find(a => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      }
    } catch (error) {
      console.error("[Order] Error fetching addresses:", error);
    }
  };

  // ============================================================================
  // ADD NEW ADDRESS
  // ============================================================================
  const handleAddNewAddress = async (e) => {
    e.preventDefault();

    if (!newAddressData.fullAddress || !newAddressData.latitude) {
      alert("Please select a valid address from the map");
      return;
    }

    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch(`${API_BASE}/customer/addresses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAddressData),
      });

      if (!response.ok) throw new Error("Failed to add address");

      const data = await response.json();
      
      // Refresh addresses list
      await fetchAddresses();
      
      // Auto-select the newly added address
      setSelectedAddressId(data.address.id);
      
      // Close form and reset
      setShowAddAddressForm(false);
      setNewAddressData({ name: '', fullAddress: '', latitude: null, longitude: null });
      
      alert("Address added successfully!");
    } catch (error) {
      alert(error.message);
    }
  };

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

  // Get selected address object
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);

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

    if (!selectedAddressId || !selectedAddress) {
      setPaymentError("Please select a delivery address");
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
          deliveryAddressId: selectedAddressId,
          deliveryAddress: selectedAddress.fullAddress,
          deliveryInstructions: deliveryInstructions.trim() || null,
          paymentMethod: paymentMethod || "pending",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
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

      // Success - redirect to order details
      clearCart();
      navigate(`/orders/${orderId}`);
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

            // Success - redirect to order details
            clearCart();
            navigate(`/orders/${orderId}`);
          } catch (error) {
            console.error("[Order] ❌ Verification Error:", error);
            setPaymentError(error.message || "Payment verification failed");
            setPaymentProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentError("Payment cancelled");
            setPaymentProcessing(false);
          },
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
  // RENDER
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-neutral-400 mb-6">You need to be logged in to place an order</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 pb-32 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-6">Checkout</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* LEFT: Cart Items */}
          <div className="md:col-span-2 space-y-6">
            {/* Cart Items */}
            <div className="bg-neutral-800 rounded-lg p-6">
              <h2 className="text-white font-bold text-xl mb-4">Your Cart ({cartCount} items)</h2>
              
              {lines.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-neutral-700 pb-3">
                      <div className="flex-1">
                        <p className="text-white font-medium">{line.name}</p>
                        <p className="text-neutral-400 text-sm">Qty: {line.qty}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">₹{((line.basePrice || 0) * line.qty)}</p>
                        <button
                          onClick={() => removeLine(idx)}
                          className="text-red-500 text-sm hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Address Selection */}
            <div className="bg-neutral-800 rounded-lg p-6">
              <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-orange-500" />
                Delivery Address
              </h2>

              {addresses.length === 0 && !showAddAddressForm && (
                <div className="text-center py-8">
                  <p className="text-neutral-400 mb-4">No saved addresses</p>
                  <button
                    onClick={() => setShowAddAddressForm(true)}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Add Address
                  </button>
                </div>
              )}

              {addresses.length > 0 && !showAddAddressForm && (
                <>
                  <div className="space-y-3 mb-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {addr.name && (
                                <span className="text-white font-medium">{addr.name}</span>
                              )}
                              {addr.isDefault && (
                                <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-neutral-300 text-sm">{addr.fullAddress}</p>
                            <p className="text-neutral-500 text-xs mt-1">
                              📍 {addr.distanceKm} km • {addr.withinServiceArea ? '✓ Deliverable' : '⚠ Out of range'}
                            </p>
                          </div>
                          {selectedAddressId === addr.id && (
                            <Check className="w-6 h-6 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {addresses.length < 5 && (
                    <button
                      onClick={() => setShowAddAddressForm(true)}
                      className="w-full py-2 border-2 border-dashed border-neutral-600 hover:border-orange-500 text-neutral-400 hover:text-orange-500 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-5 h-5 inline mr-2" />
                      Add New Address
                    </button>
                  )}
                </>
              )}

              {/* Add Address Form */}
              {showAddAddressForm && (
                <form onSubmit={handleAddNewAddress} className="space-y-4">
                  <div>
                    <label className="block text-neutral-300 text-sm mb-2">
                      Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={newAddressData.name}
                      onChange={(e) => setNewAddressData({ ...newAddressData, name: e.target.value })}
                      placeholder="e.g., Home, Office"
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-300 text-sm mb-2">
                      Address *
                    </label>
                    <GoogleMapsAutocomplete
                      onSelect={(result) => {
                        setNewAddressData({
                          ...newAddressData,
                          fullAddress: result.address,
                          latitude: result.latitude,
                          longitude: result.longitude
                        });
                      }}
                      defaultValue={newAddressData.fullAddress}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddAddressForm(false);
                        setNewAddressData({ name: '', fullAddress: '', latitude: null, longitude: null });
                      }}
                      className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}

              {!selectedAddressId && addresses.length > 0 && !showAddAddressForm && (
                <p className="text-red-400 text-sm mt-2">
                  ⚠ Please select an address to continue
                </p>
              )}
            </div>

            {/* Special Instructions */}
            <div className="bg-neutral-800 rounded-lg p-6">
              <label className="block text-white font-bold text-lg mb-2">
                <MessageSquare className="w-5 h-5 inline mr-2" />
                Special Instructions (Optional)
              </label>
              <textarea
                value={deliveryInstructions}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setDeliveryInstructions(e.target.value);
                  }
                }}
                placeholder="Any special requests? (e.g., extra spicy, no onions, gate code)"
                className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-neutral-500"
                rows="3"
                maxLength={200}
              />
              <p className="text-neutral-500 text-xs mt-1 text-right">
                {deliveryInstructions.length}/200 characters
              </p>
            </div>
          </div>

          {/* RIGHT: Order Summary & Payment */}
          <div className="md:col-span-1">
            <div className="bg-neutral-800 rounded-lg p-6 sticky top-6">
              <h3 className="text-white font-bold text-xl mb-4">Order Summary</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>GST (5%)</span>
                  <span>₹{gstAmount}</span>
                </div>
                <div className="border-t border-neutral-700 pt-2 mt-2 flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span className="text-orange-500">₹{finalTotal}</span>
                </div>
              </div>

              {paymentError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {paymentError}
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleRazorpayPayment}
                  disabled={paymentProcessing || lines.length === 0 || !selectedAddressId}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
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
                  disabled={paymentProcessing || lines.length === 0 || !selectedAddressId}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                >
                  {paymentProcessing ? (
                    <>
                      <Loader className="w-4 h-4 inline animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "💵 Cash on Delivery"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile cart drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        lines={lines}
        cartTotal={cartTotal}
        gstAmount={gstAmount}
        finalTotal={finalTotal}
        deliveryAddress={selectedAddress?.fullAddress || ''}
        setDeliveryAddress={() => {}}
        specialNotes={deliveryInstructions}
        setSpecialNotes={setDeliveryInstructions}
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