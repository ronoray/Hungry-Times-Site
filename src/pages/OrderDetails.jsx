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
import { reorderIntoCart } from '../utils/reorder';
import { buildTotalsLines, totalsArgsFromOrder } from '../lib/billTotals.js';
import { money } from '../lib/money.js';

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
  const { lines, addLine, clearCart } = useCart();
  const showToast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // No /login route exists — Profile shows the login prompt
      navigate('/profile', { state: { from: `/orders/${orderId}` } });
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

  const [reordering, setReordering] = useState(false);

  const handleReorder = async () => {
    if (reordering) return;
    setReordering(true);
    try {
      const ok = await reorderIntoCart(order, {
        cartLines: lines,
        clearCart,
        addLine,
        showToast,
      });
      if (ok) navigate('/order');
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ht-ivory flex items-center justify-center">
        <div className="text-ht-ink text-lg">Loading order details...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-ht-ivory flex items-center justify-center p-4">
        <div className="bg-ht-red/10 border border-ht-red/30 rounded-lg p-6 max-w-md">
          <h2 className="text-ht-red text-xl font-bold mb-2">Error</h2>
          <p className="text-ht-red">{error || 'Order not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-ht-red text-white rounded-lg hover:bg-ht-red"
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
    <div className="min-h-screen bg-ht-ivory py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/orders')}
            className="text-ht-red hover:text-ht-red mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> My Orders
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-normal text-ht-ink mb-1">Order #{order.id}</h1>
              <p className="text-ht-mute text-sm">
                {new Date(
                  order.created_at?.includes('Z') || order.created_at?.includes('+')
                    ? order.created_at
                    : (order.created_at || '').replace(' ', 'T') + '+05:30'
                ).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                })}
              </p>
            </div>
            {/* Reorder button */}
            {(order.status === 'delivered' || isCancelled) && (
              <button
                onClick={handleReorder}
                className="flex items-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red text-white font-semibold rounded-lg text-sm"
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
          <div className="bg-ht-paper rounded-xl p-6 mb-6">
            {/* ETA */}
            {/* Only the order's own estimate — no generic fallback time
                (DNA §7: no delivery time until Ops supplies one). */}
            {order.status !== 'delivered' && order.eta_min && order.eta_max && (
              <div className="text-center mb-6">
                <p className="font-display text-3xl text-ht-ink">
                  {`${order.eta_min}-${order.eta_max} min`}
                </p>
                <p className="text-ht-mute text-sm">Estimated delivery time</p>
              </div>
            )}

            {/* Steps */}
            <div className="flex items-center justify-between relative">
              {/* Connecting line (behind steps) */}
              <div className="absolute top-5 left-8 right-8 h-0.5 bg-ht-ink/10" />
              <div
                className="absolute top-5 left-8 h-0.5 bg-ht-veg transition-all duration-500"
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
                          ? 'bg-ht-veg border-ht-veg text-white'
                          : isCurrent
                            ? 'bg-ht-veg border-ht-veg text-white animate-pulse'
                            : 'bg-ht-paper border-ht-ink/25 text-ht-mute'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] mt-1.5 font-medium ${
                      isCompleted || isCurrent ? 'text-ht-veg' : 'text-ht-mute'
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
          <div className="bg-ht-red/10 border-2 border-ht-red/30 rounded-xl p-6 mb-6 text-center">
            <XCircle className="w-12 h-12 text-ht-red mx-auto mb-2" />
            <h2 className="text-xl font-bold text-ht-red">
              Order {order.status === 'cancelled' ? 'Cancelled' : 'Rejected'}
            </h2>
            {order.cancellation_reason && (
              <p className="text-ht-red mt-1 text-sm">{order.cancellation_reason}</p>
            )}
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Delivery Address */}
          {order.delivery_address && (
            <div className="bg-ht-paper rounded-lg p-5">
              <h3 className="text-ht-ink font-bold mb-2 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-ht-red" />
                Delivery Address
              </h3>
              <p className="text-ht-ink text-sm">{order.delivery_address}</p>
              {order.delivery_instructions && (
                <p className="text-ht-mute text-xs mt-1 italic">
                  Note: {order.delivery_instructions}
                </p>
              )}
            </div>
          )}

          {/* Payment Info */}
          <div className="bg-ht-paper rounded-lg p-5">
            <h3 className="text-ht-ink font-bold mb-2 flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-ht-red" />
              Payment
            </h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ht-mute uppercase">{order.payment_mode}</span>
              <span className={order.payment_status === 'paid' ? 'text-ht-veg font-medium' : 'text-ht-gold3'}>
                {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-ht-paper rounded-lg p-5 mb-6">
          <h3 className="text-ht-ink font-bold mb-3 text-sm">Order Items</h3>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start border-b border-ht-ink/15 pb-3 last:border-0">
                <div className="flex-1">
                  <p className="text-ht-ink font-medium text-sm">{item.itemName}</p>
                  <p className="text-ht-mute text-xs">Qty: {item.quantity}</p>
                  {item.variants?.length > 0 && (
                    <p className="text-ht-mute text-xs">
                      {item.variants.map(v => v.name).join(', ')}
                    </p>
                  )}
                  {item.addons?.length > 0 && (
                    <p className="text-ht-mute text-xs">
                      + {item.addons.map(a => a.name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-ht-ink font-medium text-sm">₹{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-ht-paper rounded-lg p-5 mb-6">
          <h3 className="text-ht-ink font-bold mb-3 text-sm">Order Summary</h3>
          {/* Totals from lib/billTotals.js, shared with OrderSuccess, the
              checkout and the cart drawer. This block used to print Delivery
              ABOVE the GST line (every other surface prints it below, because
              delivery is never discounted), omit the loyalty redemption line
              entirely, and show the inclusive GST inside the column where it
              reads as an extra charge the Total then fails to include. */}
          <div className="space-y-1.5 text-sm">
            {buildTotalsLines(totalsArgsFromOrder(order)).map((ln) => {
              if (ln.kind === 'note') {
                return (
                  <p key={ln.key} className="text-ht-mute text-xs text-right">
                    {ln.text}
                  </p>
                );
              }
              if (ln.kind === 'total') {
                return (
                  <div key={ln.key} className="border-t border-ht-ink/15 pt-2 mt-2 flex justify-between text-ht-ink font-bold text-lg">
                    <span>{ln.label}</span>
                    <span className="text-ht-red">₹{money(ln.value)}</span>
                  </div>
                );
              }
              const tone =
                ln.tone === 'discount' ? 'text-ht-veg'
                  : ln.tone === 'points' ? 'text-ht-red2'
                    : 'text-ht-mute';
              return (
                <div key={ln.key} className={`flex justify-between ${tone}`}>
                  <span>{ln.label}</span>
                  {ln.free
                    ? <span className="text-ht-veg">FREE</span>
                    : <span>{ln.value < 0 ? '-' : ''}₹{money(Math.abs(ln.value))}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Update / Cancel Buttons (COD orders not yet out for delivery) */}
        {(['pending', 'confirmed', 'preparing'].includes(order.status)) && (
          <div className="space-y-3 mb-6">
            {order.payment_mode === 'COD' && (
              <>
                {order.status === 'preparing' && (
                  <div className="bg-ht-gold2/60 border border-ht-gold/30 rounded-lg px-4 py-2 text-ht-gold3 text-xs text-center">
                    Kitchen has started — changes may cause a slight delay.
                  </div>
                )}
                <button
                  onClick={() => {
                    const orderItems = parseItems(order.items_json);
                    clearCart();
                    orderItems.forEach(item => {
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
                      }, { silent: true }); // the order being edited, not new adds
                    });
                    navigate(`/order?editOrderId=${order.id}`);
                  }}
                  className="w-full py-3 bg-ht-red hover:bg-ht-red text-white font-bold rounded-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Update Order
                </button>
              </>
            )}
            {/* The button appears only where the server will actually accept it.
                It used to be shown on 'preparing' too, where the API refuses —
                so its entire behaviour there was to fail with "Order cannot be
                cancelled in current status". can_self_cancel is computed by the
                same function the API enforces, so the two cannot disagree. */}
            {order.can_self_cancel && (
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

                    const data = await response.json().catch(() => ({}));

                    if (response.ok) {
                      // A prepaid cancellation refunds automatically; say so, and
                      // say how long it takes, or the money looks lost.
                      showToast(data.message || 'Order cancelled', 'success');
                      fetchOrderDetails();
                    } else {
                      showToast(data.error || 'Failed to cancel order', 'error');
                    }
                  } catch (err) {
                    showToast('Error cancelling order', 'error');
                  }
                }}
                className="w-full py-3 bg-ht-red hover:bg-ht-red2 text-white font-bold rounded-lg"
              >
                Cancel Order
              </button>
            )}

            {/* Not cancellable from here — tell them what to do instead of
                leaving a dead end or, worse, a button that fails. */}
            {!order.can_self_cancel && order.self_cancel_reason && (
              <div className="bg-ht-paper border border-ht-ink/15 rounded-lg px-4 py-3">
                <p className="text-ht-ink text-sm text-center">{order.self_cancel_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
