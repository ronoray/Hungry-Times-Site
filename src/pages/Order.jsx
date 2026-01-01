// site/src/pages/Order.jsx - COMPLETE WITH OFFERS SYSTEM
// ✅ Smart address selection (auto-select single, choose from multiple)
// ✅ Add new address during checkout
// ✅ Customer instructions field
// ✅ Redirect to order details after successful payment
// ✅ Active offers system with automatic discount application
// ✅ Persistent banner showing active offers

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import AddToCartModal from "../components/AddToCartModal";
import CartDrawer from "../components/CartDrawer";
import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";
import AuthModal from "../components/AuthModal";
import { ShoppingCart, MapPin, MessageSquare, Loader, Plus, Check, Edit2, Trash2, X } from "lucide-react";

import API_BASE from '../config/api.js';

// Restaurant location for delivery radius calculation
const RESTAURANT_LOCATION = {
  latitude: 22.5061956,
  longitude: 88.3673608
};

// Maximum delivery radius in km
const MAX_DELIVERY_RADIUS_KM = 4;

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Order() {

  // Scroll to top when component mounts or cart changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigate = useNavigate();
  const { isAuthenticated, customer } = useAuth();
  const { lines, clearCart, addLine, removeLine } = useCart();

  // UI State
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  // Edit Address State
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editAddressData, setEditAddressData] = useState({
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

  // ============================================================================
  // FETCH ACTIVE OFFERS ON LOAD
  // ============================================================================

  // Active Offers State
  const [activeOffers, setActiveOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);

  useEffect(() => {
    fetchActiveOffers();
  }, []);

  const fetchActiveOffers = async () => {
    try {
      const response = await fetch(`${API_BASE}/offers/active`);
      if (!response.ok) throw new Error('Failed to fetch offers');
      
      const data = await response.json();
      const offers = data.offers || [];
      
      setActiveOffers(offers);
      
      const autoOffer = offers.find(o => o.apply_automatically);
      if (autoOffer) {
        setAppliedOffer(autoOffer);
      }
    } catch (err) {
      console.error('[Order] Error fetching offers:', err);
    }
  };


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
  // DELETE ADDRESS
  // ============================================================================
  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      const token = localStorage.getItem('customerToken');
      const response = await fetch(`${API_BASE}/customer/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete address');
      }

      // Refresh addresses list
      await fetchAddresses();
      
      // If deleted address was selected, clear selection
      if (selectedAddressId === addressId) {
        setSelectedAddressId(null);
      }

      alert('Address deleted successfully!');
    } catch (error) {
      alert(error.message);
    }
  };

  // ============================================================================
  // START EDITING ADDRESS
  // ============================================================================
  const handleStartEdit = (addr) => {
    setEditingAddressId(addr.id);
    setEditAddressData({
      name: addr.name || '',
      fullAddress: addr.fullAddress,
      latitude: addr.latitude,
      longitude: addr.longitude
    });
  };

  // ============================================================================
  // CANCEL EDITING
  // ============================================================================
  const handleCancelEdit = () => {
    setEditingAddressId(null);
    setEditAddressData({ name: '', fullAddress: '', latitude: null, longitude: null });
  };

  // ============================================================================
  // SAVE EDITED ADDRESS
  // ============================================================================
  const handleSaveEdit = async (addressId) => {
    if (!editAddressData.fullAddress || !editAddressData.latitude) {
      alert('Please select a valid address from the map');
      return;
    }

    try {
      const token = localStorage.getItem('customerToken');
      const response = await fetch(`${API_BASE}/customer/addresses/${addressId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editAddressData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update address');
      }

      // Refresh addresses list
      await fetchAddresses();
      
      // Clear edit state
      setEditingAddressId(null);
      setEditAddressData({ name: '', fullAddress: '', latitude: null, longitude: null });

      alert('Address updated successfully!');
    } catch (error) {
      alert(error.message);
    }
  };

  // ============================================================================
  // SET DEFAULT ADDRESS
  // ============================================================================
  const handleSetDefault = async (addressId) => {
    try {
      const token = localStorage.getItem('customerToken');
      const response = await fetch(`${API_BASE}/customer/addresses/${addressId}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set default address');
      }

      // Refresh addresses list
      await fetchAddresses();
      
      alert('Default address updated!');
    } catch (error) {
      alert(error.message);
    }
  };

  // ============================================================================
  // CALCULATE TOTALS WITH DISCOUNT
  // ============================================================================
  const { cartTotal, discountAmount, gstAmount, finalTotal } = useMemo(() => {
    let total = 0;
    lines.forEach((line) => {
      const unitPrice =
        (line.basePrice || 0) +
        (line.variants?.reduce((sum, v) => sum + (v.priceDelta || 0), 0) || 0) +
        (line.addons?.reduce((sum, a) => sum + (a.priceDelta || 0), 0) || 0);
      total += unitPrice * (line.qty || 1);
    });

  // Apply offer discount
  let discount = 0;
  if (appliedOffer && total >= (appliedOffer.min_order_value || 0)) {
    if (appliedOffer.discount_type === 'percent') {
      discount = total * (appliedOffer.discount_value / 100);
    } else {
      discount = appliedOffer.discount_value;
    }
    
    // Apply max discount cap if set
    if (appliedOffer.max_discount && discount > appliedOffer.max_discount) {
      discount = appliedOffer.max_discount;
    }
  }

    const subtotalAfterDiscount = Math.max(0, total - discount);
    const gst = Math.round(subtotalAfterDiscount * 0.05);
    
    return {
      cartTotal: Math.round(total),
      discountAmount: Math.round(discount),
      gstAmount: gst,
      finalTotal: Math.round(subtotalAfterDiscount + gst),
    };
  }, [lines, appliedOffer]);

  const cartCount = lines.reduce((sum, line) => sum + (line.qty || 1), 0);

  // Get selected address object
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);

  // ============================================================================
  // VALIDATE DELIVERY AREA
  // ============================================================================
  const validateDeliveryArea = () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    
    if (!selectedAddress || !selectedAddress.latitude || !selectedAddress.longitude) {
      return { valid: false, message: "Please select a valid delivery address" };
    }

    const distance = calculateDistance(
      RESTAURANT_LOCATION.latitude,
      RESTAURANT_LOCATION.longitude,
      selectedAddress.latitude,
      selectedAddress.longitude
    );

    if (distance > MAX_DELIVERY_RADIUS_KM) {
      return {
        valid: false,
        message: `Sorry, we only deliver within ${MAX_DELIVERY_RADIUS_KM}km radius. Your address is ${distance.toFixed(1)}km away.`
      };
    }

    return { valid: true };
  };

  // ============================================================================
  // RAZORPAY PAYMENT HANDLER
  // ============================================================================
  const handleRazorpayPayment = async () => {
    const validation = validateDeliveryArea();
    if (!validation.valid) {
      setPaymentError(validation.message);
      return;
    }

    if (!selectedAddressId) {
      setPaymentError("Please select a delivery address");
      return;
    }

    if (lines.length === 0) {
      setPaymentError("Your cart is empty");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");

    try {
      const token = localStorage.getItem("customerToken");
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);

      if (!selectedAddr) {
        throw new Error("Selected address not found");
      }

      const orderItems = lines.map(line => ({
        itemName: line.itemName,
        quantity: line.qty || 1,
        base_price: line.basePrice || 0,
        variants: line.variants || [],
        addons: line.addons || []
      }));

      const response = await fetch(`${API_BASE}/customer/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: orderItems,
          delivery_address: selectedAddr.fullAddress,
          delivery_latitude: selectedAddr.latitude,
          delivery_longitude: selectedAddr.longitude,
          delivery_instructions: deliveryInstructions,
          paymentMethod: "CARD",  // Online payment via Razorpay
          discount: discountAmount,
          offer_id: appliedOffer?.id || null,
          offer_title: appliedOffer?.title || null,
        }),
      });

      if (!response.ok) {
        console.error("=== ORDER CREATION FAILED ===");
        console.error("Status:", response.status);
        console.error("Status Text:", response.statusText);
        
        let errorData;
        try {
          errorData = await response.json();
          console.error("Error data:", errorData);
        } catch (e) {
          console.error("Could not parse error response");
          errorData = {};
        }
        
        if (response.status === 401) {
          throw new Error("Authentication failed. Please logout and login again to continue.");
        }
        
        throw new Error(errorData.error || errorData.message || "Failed to create order");
      }

      const data = await response.json();
      const { orderId, razorpayOrderId, razorpayKey } = data;

      // Load Razorpay SDK if not loaded
      if (!window.Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const options = {
        key: razorpayKey,
        amount: finalTotal * 100,
        currency: "INR",
        name: "Hungry Times",
        description: "Order Payment",
        order_id: razorpayOrderId,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch(`${API_BASE}/customer/payments/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed");
            }

            clearCart();
            navigate(`/my-orders/${orderId}`);
          } catch (error) {
            setPaymentError("Payment verification failed. Please contact support.");
            setPaymentProcessing(false);
          }
        },
        prefill: {
          name: customer?.name || "",
          email: customer?.email || "",
          contact: customer?.phone || "",
        },
        theme: {
          color: "#f97316",
        },
        modal: {
          ondismiss: function () {
            setPaymentProcessing(false);
            setPaymentError("Payment cancelled");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      setPaymentError(error.message);
      setPaymentProcessing(false);
    }
  };

  // ============================================================================
  // COD PAYMENT HANDLER
  // ============================================================================
  const handleCODPayment = async () => {
    const validation = validateDeliveryArea();
    if (!validation.valid) {
      setPaymentError(validation.message);
      return;
    }

    if (!selectedAddressId) {
      setPaymentError("Please select a delivery address");
      return;
    }

    if (lines.length === 0) {
      setPaymentError("Your cart is empty");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");

    try {
      const token = localStorage.getItem("customerToken");
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);

      if (!selectedAddr) {
        throw new Error("Selected address not found");
      }

      const orderItems = lines.map(line => ({
        itemName: line.itemName,
        quantity: line.qty || 1,
        base_price: line.basePrice || 0,
        variants: line.variants || [],
        addons: line.addons || []
      }));

      const response = await fetch(`${API_BASE}/customer/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: orderItems,
          delivery_address: selectedAddr.fullAddress,
          delivery_latitude: selectedAddr.latitude,
          delivery_longitude: selectedAddr.longitude,
          delivery_instructions: deliveryInstructions,
          paymentMethod: "COD",  // Cash on Delivery
          discount: discountAmount,
          offer_id: appliedOffer?.id || null,
          offer_title: appliedOffer?.title || null,
        }),
      });

      if (!response.ok) {
        console.error("=== ORDER CREATION FAILED ===");
        console.error("Status:", response.status);
        console.error("Status Text:", response.statusText);
        
        let errorData;
        try {
          errorData = await response.json();
          console.error("Error data:", errorData);
        } catch (e) {
          console.error("Could not parse error response");
          errorData = {};
        }
        
        if (response.status === 401) {
          throw new Error("Authentication failed. Please logout and login again to continue.");
        }
        
        throw new Error(errorData.error || errorData.message || "Failed to create order");
      }

      const data = await response.json();
      
      clearCart();
      navigate(`/my-orders/${data.orderId}`);
    } catch (error) {
      setPaymentError(error.message);
      setPaymentProcessing(false);
    }
  };

  // ============================================================================
  // PERSISTENT OFFER BANNER COMPONENT
  // ============================================================================

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Place Your Order</h1>

        {/* 🎉 PERSISTENT OFFER BANNER */}

        {/* Empty Cart Message */}
        {lines.length === 0 && (
          <div className="bg-neutral-800 rounded-lg p-8 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Your cart is empty</h2>
            <p className="text-neutral-400 mb-6">
              Add some delicious items from our menu to get started!
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              Browse Menu
            </button>
          </div>
        )}


        {/* Cart Items Display */}
        {lines.length > 0 && (
          <div className="bg-neutral-800 rounded-lg p-6 mb-6">
            <h3 className="text-white font-bold text-xl mb-4">
              Your Cart ({cartCount} items)
            </h3>
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const unitPrice =
                  (line.basePrice || 0) +
                  (line.variants?.reduce((sum, v) => sum + (v.priceDelta || 0), 0) || 0) +
                  (line.addons?.reduce((sum, a) => sum + (a.priceDelta || 0), 0) || 0);
                const lineTotal = unitPrice * (line.qty || 1);

                return (
                  <div key={idx} className="flex items-start justify-between py-3 border-b border-neutral-700 last:border-0">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{line.itemName || line.name || "Item"}</h4>
                      <p className="text-sm text-neutral-400">Qty: {line.qty}</p>
                      {line.variants && line.variants.length > 0 && (
                        <p className="text-xs text-neutral-500 mt-1">
                          {line.variants.map(v => v.name).join(', ')}
                        </p>
                      )}
                      {line.addons && line.addons.length > 0 && (
                        <p className="text-xs text-neutral-500">
                          Add-ons: {line.addons.map(a => a.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-white font-medium">₹{lineTotal}</p>
                      <button
                        onClick={() => removeLine(line.key)}
                        className="text-red-400 hover:text-red-300 text-sm mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Form */}
        {lines.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* LEFT: Delivery Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Delivery Address */}
              <div className="bg-neutral-800 rounded-lg p-6">
                <h3 className="text-white font-bold text-xl mb-4">
                  <MapPin className="w-5 h-5 inline mr-2" />
                  Delivery Address
                </h3>

                {!isAuthenticated ? (
                  <div className="text-center py-8">
                    <p className="text-neutral-400 mb-4">
                      Please login to continue with your order
                    </p>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
                    >
                      Login / Sign Up
                    </button>
                  </div>
                ) : (
                  <>
                    {addresses.length === 0 && !showAddAddressForm ? (
                      <div className="text-center py-6">
                        <p className="text-neutral-400 mb-4">No saved addresses found</p>
                        <button
                          onClick={() => setShowAddAddressForm(true)}
                          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 inline mr-2" />
                          Add Your First Address
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {addresses.map((addr) => {
                            const isSelected = selectedAddressId === addr.id;
                            const isEditing = editingAddressId === addr.id;

                            return (
                              <div
                                key={addr.id}
                                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-neutral-600 hover:border-neutral-500'
                                }`}
                              >
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-neutral-300 text-sm mb-1">
                                        Label (Optional)
                                      </label>
                                      <input
                                        type="text"
                                        value={editAddressData.name}
                                        onChange={(e) => setEditAddressData({ ...editAddressData, name: e.target.value })}
                                        placeholder="e.g., Home, Office"
                                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-neutral-300 text-sm mb-1">
                                        Address *
                                      </label>
                                      <GoogleMapsAutocomplete
                                        key={`edit-${editingAddressId}`}
                                        onSelect={(result) => {
                                          setEditAddressData({
                                            ...editAddressData,
                                            fullAddress: result.address,
                                            latitude: result.latitude,
                                            longitude: result.longitude
                                          });
                                        }}
                                        defaultValue={editAddressData.fullAddress}
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={handleCancelEdit}
                                        className="flex-1 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm rounded"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveEdit(addr.id)}
                                        className="flex-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded font-medium"
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div onClick={() => setSelectedAddressId(addr.id)}>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        {isSelected && (
                                          <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                        )}
                                        <div>
                                          <div className="flex items-center gap-2">
                                            {addr.name && (
                                              <span className="text-white font-medium">{addr.name}</span>
                                            )}
                                            {addr.isDefault && (
                                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                                                Default
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-neutral-300 text-sm mt-1">{addr.fullAddress}</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartEdit(addr);
                                          }}
                                          className="p-2 text-neutral-400 hover:text-blue-400 transition-colors"
                                          title="Edit"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteAddress(addr.id);
                                          }}
                                          className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                        {!addr.isDefault && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSetDefault(addr.id);
                                            }}
                                            className="p-2 text-xs text-neutral-400 hover:text-orange-400 transition-colors"
                                            title="Set as default"
                                          >
                                            ★
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {addresses.length < 5 && (
                          <button
                            onClick={() => setShowAddAddressForm(true)}
                            className="w-full py-2 mt-3 border-2 border-dashed border-neutral-600 hover:border-orange-500 text-neutral-400 hover:text-orange-500 rounded-lg font-medium transition-colors"
                          >
                            <Plus className="w-5 h-5 inline mr-2" />
                            Add New Address
                          </button>
                        )}
                      </>
                    )}

                    {/* Add Address Form */}
                    {showAddAddressForm && (
                      <form onSubmit={handleAddNewAddress} className="space-y-4 mt-4 pt-4 border-t border-neutral-700">
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
                            key="new-address-form"
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
                  </>
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
                
                {/* Price Summary with Discount */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal</span>
                    <span className="text-white font-medium">₹{cartTotal}</span>
                  </div>
                  
                  {/* 💚 DISCOUNT ROW */}
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center bg-green-500/10 -mx-6 px-6 py-2 rounded">
                      <span className="text-green-400 font-medium text-sm">
                        Offer Discount ({appliedOffer?.discount_value}{appliedOffer?.discount_type === 'percent' ? '%' : '₹'})
                      </span>
                      <span className="text-green-400 font-bold">- ₹{discountAmount}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-neutral-400">
                    <span>GST (5%)</span>
                    <span className="text-white">₹{gstAmount}</span>
                  </div>
                  
                  <div className="border-t border-neutral-700 pt-2 mt-2 flex justify-between">
                    <span className="text-lg font-bold text-white">Total</span>
                    <span className="text-xl font-bold text-orange-500">₹{finalTotal}</span>
                  </div>
                  
                  {/* 🎊 SAVINGS MESSAGE */}
                  {discountAmount > 0 && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center mt-2">
                      <p className="text-green-400 font-semibold text-sm">
                        🎊 Yay! You saved ₹{discountAmount} on this order!
                      </p>
                    </div>
                  )}
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
                      "💳 Pay Online - Razorpay"
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
        )}
      </div>

      {/* Mobile cart drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        lines={lines}
        cartTotal={cartTotal}
        discountAmount={discountAmount}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          // Refresh addresses after successful login
          fetchAddresses();
        }}
      />
    </div>
  );
}