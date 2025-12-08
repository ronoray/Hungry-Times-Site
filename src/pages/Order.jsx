// site/src/pages/Order.jsx - WITH PAYMENT INTEGRATION
// Added payment method selection to existing checkout
import { useEffect, useState, useMemo } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import AddToCartModal from "../components/AddToCartModal";
import API_BASE from "../config/api";
import { ShoppingCart, Minus, Plus, X, ChevronRight, Loader, AlertCircle } from "lucide-react";

function Money({ value }) {
  return <span>₹{Number(value || 0).toFixed(0)}</span>;
}

export default function Order() {
  const { customer, isAuthenticated } = useAuth();
  const { lines, addLine, removeLine, updateQty, clearCart, calcUnit } = useCart();

  // Menu state
  const [menuData, setMenuData] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);

  // Cart visibility (mobile)
  const [showCart, setShowCart] = useState(false);

  // Checkout state
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 🆕 Payment state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [orderCreated, setOrderCreated] = useState(null);

  // Load menu
  useEffect(() => {
    loadMenu();
    
    // 🆕 Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
  }, []);

  // Auto-scroll to cart if items exist on mount or when navigating with items
  useEffect(() => {
    if (lines.length > 0) {
      setTimeout(() => {
        const cartElement = document.getElementById('cart-section');
        if (cartElement) {
          cartElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // On mobile, also show the cart overlay
          if (window.innerWidth < 768) {
            setShowCart(true);
          }
        }
      }, 300);
    }
  }, [lines.length]);

  // Auto-select first master and subcategory
  useEffect(() => {
    if (menuData && menuData.topCategories && menuData.topCategories.length > 0) {
      if (!selectedMaster) {
        const firstMaster = menuData.topCategories[0];
        setSelectedMaster(firstMaster.id);
        
        if (firstMaster.subcategories && firstMaster.subcategories.length > 0) {
          setSelectedSubcategory(firstMaster.subcategories[0].id);
        }
      }
    }
  }, [menuData, selectedMaster]);

  const loadMenu = async () => {
    try {
      setError(null);
      
      const url = `${API_BASE}/public/menu`;
      console.log('Loading menu from:', url);
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Menu loaded successfully:', data);
      setMenuData(data);
    } catch (err) {
      console.error("Failed to load menu:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get current master category
  const currentMaster = useMemo(() => {
    if (!menuData || !selectedMaster) return null;
    return menuData.topCategories?.find(m => m.id === selectedMaster);
  }, [menuData, selectedMaster]);

  // Get current subcategory
  const currentSubcategory = useMemo(() => {
    if (!currentMaster || !selectedSubcategory) return null;
    return currentMaster.subcategories?.find(s => s.id === selectedSubcategory);
  }, [currentMaster, selectedSubcategory]);

  // Get current items
  const currentItems = useMemo(() => {
    return currentSubcategory?.items || [];
  }, [currentSubcategory]);

  // Calculate cart totals
  const cartTotal = useMemo(() => {
    return lines.reduce((sum, line) => sum + calcUnit(line) * line.qty, 0);
  }, [lines, calcUnit]);

  const deliveryFee = deliveryType === "delivery" ? 30 : 0;
  const finalTotal = cartTotal + deliveryFee;
  const cartCount = lines.reduce((sum, line) => sum + line.qty, 0);

  // Handle master category change
  const handleMasterChange = (masterId) => {
    setSelectedMaster(masterId);
    const master = menuData.topCategories?.find(m => m.id === masterId);
    if (master && master.subcategories && master.subcategories.length > 0) {
      setSelectedSubcategory(master.subcategories[0].id);
    } else {
      setSelectedSubcategory(null);
    }
  };

  // Handle item click
  const handleItemClick = (item) => {
    if (item.families && item.families.length > 0) {
      setSelectedItem(item);
      setShowAddToCartModal(true);
    } else {
      addLine({
        itemId: item.id,
        name: item.name,
        basePrice: item.basePrice,
        variants: [],
        addons: [],
        qty: 1,
      });
    }
  };

  // 🆕 Handle payment method selection
  const handlePaymentMethod = async (paymentMethod) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (lines.length === 0) {
      setPaymentError("Your cart is empty!");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError(null);

    try {
      // Step 1: Create order using your existing endpoint
      const orderData = {
        items: lines.map(line => ({
          itemId: line.itemId,
          itemName: line.name,
          basePrice: line.basePrice,
          quantity: line.qty,
          variants: line.variants || [],
          addons: line.addons || []
        })),
        customer: {
          name: customer.name || "Guest",
          phone: customer.phone
        },
        paymentMethod: paymentMethod === 'COD' ? 'Cash' : paymentMethod,
        deliveryInstructions: orderNotes,
        deliveryType,
        subtotal: cartTotal,
        deliveryFee,
        total: finalTotal,
      };

      console.log("[PAYMENT] Creating order:", orderData);

      const token = localStorage.getItem("customerToken");
      if (!token) {
        setPaymentError("Please log in first");
        setShowAuthModal(true);
        return;
      }

      const orderRes = await fetch(`${API_BASE}/customer/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const orderDataRes = await orderRes.json();
      
      if (!orderRes.ok) {
        throw new Error(orderDataRes.error || "Failed to create order");
      }

      const orderId = orderDataRes.orderId;
      setOrderCreated(orderId);
      console.log(`✅ Order created: #${orderId}`);

      // Step 2: Process payment
      if (paymentMethod === 'COD') {
        // Cash on Delivery
        await fetch(`${API_BASE}/payments/cod/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId })
        });

        alert(`✅ Order #${orderId} placed successfully!\nPayment method: Cash on Delivery`);
        clearCart();
        setTimeout(() => {
          window.location.href = `/order-confirmation/${orderId}`;
        }, 2000);
      } else if (paymentMethod === 'RAZORPAY') {
        // Razorpay payment
        await initiateRazorpay(orderId, finalTotal);
      } else if (paymentMethod === 'GOOGLE_PAY') {
        // Google Pay
        await initiateGooglePay(orderId, finalTotal);
      } else if (paymentMethod === 'PHONEPE') {
        // PhonePe
        await initiatePhonePe(orderId, finalTotal);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError(err.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // 🆕 Razorpay payment
  const initiateRazorpay = async (orderId, amount) => {
    try {
      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      if (!razorpayKeyId) {
        throw new Error('Razorpay not configured');
      }

      const initRes = await fetch(`${API_BASE}/payments/razorpay/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          amount: Math.round(amount * 100),
        })
      });

      if (!initRes.ok) {
        throw new Error('Failed to initialize Razorpay');
      }

      const { razorpayOrderId } = await initRes.json();

      const options = {
        key: razorpayKeyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'Hungry Times',
        description: `Order #${orderId}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          await verifyRazorpayPayment(orderId, response);
        },
        prefill: {
          name: customer?.name,
          email: customer?.email,
          contact: customer?.phone
        },
        notes: {
          order_id: orderId
        },
        theme: { color: '#FF6B35' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

      rzp.on('payment.failed', (response) => {
        setPaymentError('Payment failed: ' + response.error.description);
      });
    } catch (err) {
      console.error('Razorpay error:', err);
      setPaymentError(err.message);
    }
  };

  // 🆕 Verify Razorpay payment
  const verifyRazorpayPayment = async (orderId, response) => {
    try {
      const verifyRes = await fetch(`${API_BASE}/payments/razorpay/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amount: finalTotal
        })
      });

      if (!verifyRes.ok) {
        throw new Error('Payment verification failed');
      }

      alert(`✅ Payment successful!\nOrder #${orderId} confirmed.`);
      clearCart();
      setTimeout(() => {
        window.location.href = `/order-confirmation/${orderId}`;
      }, 2000);
    } catch (err) {
      console.error('Verification error:', err);
      setPaymentError(err.message);
    }
  };

  // 🆕 Google Pay payment
  const initiateGooglePay = async (orderId, amount) => {
    try {
      const initRes = await fetch(`${API_BASE}/payments/google-pay/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          amount: Math.round(amount * 100),
        })
      });

      if (!initRes.ok) throw new Error('Failed to initialize Google Pay');

      const { paymentUrl } = await initRes.json();
      window.location.href = paymentUrl;
    } catch (err) {
      console.error('Google Pay error:', err);
      setPaymentError(err.message);
    }
  };

  // 🆕 PhonePe payment
  const initiatePhonePe = async (orderId, amount) => {
    try {
      const initRes = await fetch(`${API_BASE}/payments/phonepe/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          amount: Math.round(amount * 100),
        })
      });

      if (!initRes.ok) throw new Error('Failed to initialize PhonePe');

      const { paymentUrl } = await initRes.json();
      window.location.href = paymentUrl;
    } catch (err) {
      console.error('PhonePe error:', err);
      setPaymentError(err.message);
    }
  };

  // 🆕 Handle original checkout (without payment - kept for backward compatibility)
  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (lines.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        items: lines.map(line => ({
          itemId: line.itemId,
          itemName: line.name,
          basePrice: line.basePrice,
          quantity: line.qty,
          variants: line.variants || [],
          addons: line.addons || []
        })),
        customer: {
          name: customer.name || "Guest",
          phone: customer.phone
        },
        paymentMethod: "Cash",
        deliveryInstructions: orderNotes,
        deliveryType,
        subtotal: cartTotal,
        deliveryFee,
        total: finalTotal,
      };

      console.log("[ORDER] Sending request body:", orderData);

      const token = localStorage.getItem("customerToken");
      if (!token) {
        alert("Please log in first");
        setShowAuthModal(true);
        return;
      }

      const res = await fetch(`${API_BASE}/customer/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();
      
      if (!res.ok) {
        console.error("[ORDER] Backend error response:", {
          status: res.status,
          error: data.error || data.message,
          body: data
        });
        alert(`Error: ${data.error || data.message || "Failed to place order"}`);
        return;
      }

      console.log("[ORDER] Success response:", data);
      clearCart();
      alert(`✅ Order placed successfully!\nOrder ID: ${data.orderId}\nTotal: ₹${data.total}`);
      
    } catch (err) {
      console.error("[ORDER] Request failed:", err);
      alert(`Failed to place order: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading menu...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Menu</h2>
          <p className="text-neutral-400 mb-4">{error}</p>
          <button
            onClick={loadMenu}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      {/* Header */}
      <div className="bg-neutral-800 border-b border-neutral-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-orange-500">Order Now</h1>
            
            {/* Mobile Cart Toggle */}
            <button
              onClick={() => setShowCart(!showCart)}
              className="md:hidden relative p-3 bg-orange-500 rounded-full hover:bg-orange-600 transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT: MENU SECTION (2/3 width on desktop) */}
          <div className="md:col-span-2 space-y-4">
            
            {/* Master Categories - Horizontal Scroll */}
            <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-orange-500">▶</span> Categories
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {menuData?.topCategories?.map((master) => (
                  <button
                    key={master.id}
                    onClick={() => handleMasterChange(master.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedMaster === master.id
                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                        : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                    }`}
                  >
                    {master.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategories - Pills */}
            {currentMaster && currentMaster.subcategories && currentMaster.subcategories.length > 0 && (
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <h3 className="text-sm font-semibold mb-3 text-neutral-400 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  {currentMaster.name} → Subcategories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentMaster.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubcategory(sub.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedSubcategory === sub.id
                          ? "bg-orange-500 text-white"
                          : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentItems.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <div className="text-neutral-500 text-lg">No items in this category</div>
                  <p className="text-neutral-600 text-sm mt-2">Try selecting a different category</p>
                </div>
              ) : (
                currentItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden hover:border-orange-500 transition-colors cursor-pointer group"
                    onClick={() => handleItemClick(item)}
                  >
                    {item.imageUrl && (
                      <div className="relative h-40 bg-neutral-700 overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                      
                      {item.description && (
                        <p className="text-sm text-neutral-400 mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-orange-500 font-bold text-lg">
                          <Money value={item.basePrice} />
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg font-medium text-sm transition-all shadow-lg"
                        >
                          Add +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: CART & CHECKOUT SECTION (1/3 width on desktop) */}
          <div id="cart-section" className={`${showCart ? 'fixed inset-0 bg-black/80 z-50 md:relative md:bg-transparent' : 'hidden'} md:block`}>
            <div className={`${showCart ? 'fixed right-0 top-0 bottom-0 w-80 bg-neutral-800 shadow-2xl overflow-y-auto' : ''} md:sticky md:top-24 md:h-fit space-y-4`}>
              
              {/* Mobile Close Button */}
              {showCart && (
                <button
                  onClick={() => setShowCart(false)}
                  className="md:hidden absolute top-4 right-4 p-2 bg-neutral-700 rounded-full hover:bg-neutral-600 z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Cart Items */}
              <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-orange-500" />
                    Your Cart ({cartCount})
                  </h2>
                  {lines.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-red-400 hover:text-red-300 text-sm font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {lines.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-400 mb-1">Your cart is empty</p>
                    <p className="text-sm text-neutral-500">Add items from the menu</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {lines.map((line) => (
                      <div
                        key={line.key}
                        className="bg-neutral-700/50 rounded-lg p-3 space-y-2 border border-neutral-600"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-white">{line.name}</p>
                            
                            {line.variants && line.variants.length > 0 && (
                              <p className="text-xs text-orange-400">
                                {line.variants.map(v => v.name).join(", ")}
                              </p>
                            )}
                            
                            {line.addons && line.addons.length > 0 && (
                              <p className="text-xs text-neutral-400">
                                + {line.addons.map(a => a.name).join(", ")}
                              </p>
                            )}
                          </div>
                          
                          <button
                            onClick={() => removeLine(line.key)}
                            className="text-red-400 hover:text-red-300 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 bg-neutral-600 rounded-lg">
                            <button
                              onClick={() => updateQty(line.key, line.qty - 1)}
                              className="p-1.5 hover:bg-neutral-500 rounded transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">{line.qty}</span>
                            <button
                              onClick={() => updateQty(line.key, line.qty + 1)}
                              className="p-1.5 hover:bg-neutral-500 rounded transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <span className="font-semibold text-orange-400">
                            <Money value={calcUnit(line) * line.qty} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cart Totals */}
                {lines.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-neutral-600 space-y-2">
                    <div className="flex justify-between text-neutral-300">
                      <span>Subtotal:</span>
                      <Money value={cartTotal} />
                    </div>
                    <div className="flex justify-between text-neutral-300">
                      <span>Delivery Fee:</span>
                      <Money value={deliveryFee} />
                    </div>
                    <div className="flex justify-between text-xl font-bold text-orange-500 pt-2 border-t border-neutral-600">
                      <span>Total:</span>
                      <Money value={finalTotal} />
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Section */}
              {lines.length > 0 && (
                <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700 space-y-4">
                  <h3 className="font-bold text-lg">Checkout</h3>

                  {/* Delivery Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Delivery Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDeliveryType("delivery")}
                        className={`py-2 rounded-lg font-medium transition-all ${
                          deliveryType === "delivery"
                            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                            : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                        }`}
                      >
                        🚚 Delivery
                      </button>
                      <button
                        onClick={() => setDeliveryType("pickup")}
                        className={`py-2 rounded-lg font-medium transition-all ${
                          deliveryType === "pickup"
                            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                            : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                        }`}
                      >
                        🏪 Pickup
                      </button>
                    </div>
                  </div>

                  {/* Order Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Special Instructions</label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Any special requests?"
                      className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 text-white rounded-lg placeholder-neutral-500 focus:outline-none focus:border-orange-500 text-sm"
                      rows={3}
                    />
                  </div>

                  {/* Payment Error Message */}
                  {paymentError && (
                    <div className="p-3 bg-red-500/10 border border-red-500 text-red-400 rounded-lg flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {paymentError}
                    </div>
                  )}

                  {/* 🆕 Payment Method Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <div className="space-y-2">
                      {/* Razorpay */}
                      <button
                        onClick={() => handlePaymentMethod('RAZORPAY')}
                        disabled={paymentProcessing || submitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {paymentProcessing ? <Loader className="w-4 h-4 animate-spin" /> : '💳'}
                        Card & UPI (Razorpay)
                      </button>

                      {/* Google Pay */}
                      <button
                        onClick={() => handlePaymentMethod('GOOGLE_PAY')}
                        disabled={paymentProcessing || submitting}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🔵 Google Pay
                      </button>

                      {/* PhonePe */}
                      <button
                        onClick={() => handlePaymentMethod('PHONEPE')}
                        disabled={paymentProcessing || submitting}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        💜 PhonePe
                      </button>

                      {/* Cash on Delivery */}
                      <button
                        onClick={() => handlePaymentMethod('COD')}
                        disabled={paymentProcessing || submitting}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        💵 Cash on Delivery
                      </button>
                    </div>
                  </div>

                  {/* Legacy Checkout Button (for backward compatibility) */}
                  <button
                    onClick={handleCheckout}
                    disabled={submitting || paymentProcessing}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Processing..." : "Place Order (No Payment)"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {showAddToCartModal && selectedItem && (
        <AddToCartModal
          item={selectedItem}
          isOpen={showAddToCartModal}
          onClose={() => setShowAddToCartModal(false)}
          onAdd={(lineItem) => {
            addLine(lineItem);
            setShowAddToCartModal(false);
          }}
        />
      )}
    </div>
  );
}