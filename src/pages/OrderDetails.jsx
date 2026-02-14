// site/src/pages/OrderDetails.jsx
// Customer-facing order tracking page with progress bar
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import {
  Package, MapPin, CreditCard, Clock, CheckCircle, XCircle,
  Truck, ChefHat, ClipboardCheck, RefreshCw, ArrowLeft
} from 'lucide-react';
import API_BASE from '../config/api.js';

// Progress bar steps
const STEPS = [
  { key: 'pending', label: 'Placed', icon: ClipboardCheck },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'out_for_delivery', label: 'On the Way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
];

const STATUS_INDEX = {};
STEPS.forEach((s, i) => { STATUS_INDEX[s.key] = i; });

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addLine, clearCart } = useCart();
  const showToast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/orders/${orderId}` } });
      return;
    }

    fetchOrderDetails();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchOrderDetails, 10000);
    return () => clearInterval(interval);
  }, [orderId, isAuthenticated]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      const response = await fetch(`${API_BASE}/customer/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 404) {
        // Order was deleted — redirect to orders list
        navigate('/orders', { replace: true });
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch order details');

      const data = await response.json();
      setOrder(data.order);
      setError(null);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseItems = (itemsJson) => {
    try { return JSON.parse(itemsJson || '[]'); }
    catch { return []; }
  };

  const handleReorder = () => {
    const items = parseItems(order.items_json);
    clearCart();
    items.forEach(item => {
      addLine({
        itemId: item.itemId,
        itemName: item.itemName,
        name: item.itemName,
        basePrice: item.basePrice || 0,
        variants: (item.variants || []).map(v => ({
          id: v.id, name: v.name, priceDelta: v.priceDelta || v.price || 0,
        })),
        addons: (item.addons || []).map(a => ({
          id: a.id, name: a.name, priceDelta: a.priceDelta || a.price || 0,
        })),
        qty: item.quantity || 1,
      });
    });
    showToast('Items added to cart', 'success');
    navigate('/order');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
          <h2 className="text-red-500 text-xl font-bold mb-2">Error</h2>
          <p className="text-red-400">{error || 'Order not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const items = parseItems(order.items_json);
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';
  const currentStepIdx = STATUS_INDEX[order.status] ?? -1;
  const isActive = !isCancelled && currentStepIdx >= 0;

  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/orders')}
            className="text-orange-500 hover:text-orange-400 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> My Orders
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Order #{order.id}</h1>
              <p className="text-neutral-400 text-sm">
                {new Date(order.created_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            {/* Reorder button */}
            {(order.status === 'delivered' || isCancelled) && (
              <button
                onClick={handleReorder}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Order Again
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* PROGRESS BAR (Domino's-style)                                */}
        {/* ============================================================ */}
        {isActive && (
          <div className="bg-neutral-800 rounded-xl p-6 mb-6">
            {/* ETA */}
            {order.status !== 'delivered' && (
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-white">
                  {order.eta_min && order.eta_max
                    ? `${order.eta_min}-${order.eta_max} min`
                    : '30-45 min'}
                </p>
                <p className="text-neutral-400 text-sm">Estimated delivery time</p>
              </div>
            )}

            {/* Steps */}
            <div className="flex items-center justify-between relative">
              {/* Connecting line (behind steps) */}
              <div className="absolute top-5 left-8 right-8 h-0.5 bg-neutral-700" />
              <div
                className="absolute top-5 left-8 h-0.5 bg-green-500 transition-all duration-500"
                style={{
                  width: `${Math.max(0, currentStepIdx / (STEPS.length - 1)) * (100 - 16)}%`
                }}
              />

              {STEPS.map((step, i) => {
                const isCompleted = i < currentStepIdx;
                const isCurrent = i === currentStepIdx;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isCurrent
                            ? 'bg-green-500 border-green-400 text-white animate-pulse'
                            : 'bg-neutral-800 border-neutral-600 text-neutral-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] mt-1.5 font-medium ${
                      isCompleted || isCurrent ? 'text-green-400' : 'text-neutral-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled/Rejected banner */}
        {isCancelled && (
          <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-6 mb-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <h2 className="text-xl font-bold text-red-500">
              Order {order.status === 'cancelled' ? 'Cancelled' : 'Rejected'}
            </h2>
            {order.cancellation_reason && (
              <p className="text-red-400 mt-1 text-sm">{order.cancellation_reason}</p>
            )}
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Delivery Address */}
          {order.delivery_address && (
            <div className="bg-neutral-800 rounded-lg p-5">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-orange-500" />
                Delivery Address
              </h3>
              <p className="text-neutral-300 text-sm">{order.delivery_address}</p>
              {order.delivery_instructions && (
                <p className="text-neutral-500 text-xs mt-1 italic">
                  Note: {order.delivery_instructions}
                </p>
              )}
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-neutral-800 rounded-lg p-5">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-orange-500" />
              Payment
            </h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400 uppercase">{order.payment_mode}</span>
              <span className={order.payment_status === 'paid' ? 'text-green-500 font-medium' : 'text-yellow-500'}>
                {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-neutral-800 rounded-lg p-5 mb-6">
          <h3 className="text-white font-bold mb-3 text-sm">Order Items</h3>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start border-b border-neutral-700 pb-3 last:border-0">
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{item.itemName}</p>
                  <p className="text-neutral-500 text-xs">Qty: {item.quantity}</p>
                  {item.variants?.length > 0 && (
                    <p className="text-neutral-500 text-xs">
                      {item.variants.map(v => v.name).join(', ')}
                    </p>
                  )}
                  {item.addons?.length > 0 && (
                    <p className="text-neutral-500 text-xs">
                      + {item.addons.map(a => a.name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-white font-medium text-sm">₹{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-neutral-800 rounded-lg p-5 mb-6">
          <h3 className="text-white font-bold mb-3 text-sm">Order Summary</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Discount</span>
                <span>-₹{order.discount}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>Delivery</span>
                <span>₹{order.delivery_fee}</span>
              </div>
            )}
            {(order.delivery_fee === 0 || order.delivery_fee == null) && (
              <div className="flex justify-between text-neutral-400">
                <span>Delivery</span>
                <span className="text-green-400">FREE</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-400">
              <span>GST</span>
              <span>₹{order.tax}</span>
            </div>
            <div className="border-t border-neutral-700 pt-2 mt-2 flex justify-between text-white font-bold text-lg">
              <span>Total</span>
              <span className="text-orange-500">₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Cancel Button (only for pending/confirmed orders) */}
        {(order.status === 'pending' || order.status === 'confirmed') && (
          <button
            onClick={async () => {
              if (!confirm('Are you sure you want to cancel this order?')) return;

              try {
                const token = localStorage.getItem('customerToken');
                const response = await fetch(`${API_BASE}/customer/orders/${orderId}/cancel`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (response.ok) {
                  showToast('Order cancelled', 'success');
                  fetchOrderDetails();
                } else {
                  showToast('Failed to cancel order', 'error');
                }
              } catch (err) {
                showToast('Error cancelling order', 'error');
              }
            }}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg mb-6"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
