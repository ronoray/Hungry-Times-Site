// site/src/pages/OrderSuccess.jsx
// Order confirmation success page
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CheckCircle, Package, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import API_BASE from '../config/api.js';
import { trackPurchase } from '../utils/analytics';
import { buildTotalsLines, totalsArgsFromOrder } from '../lib/billTotals.js';
import { money } from '../lib/money.js';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { clearCart } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const paymentType = searchParams.get('type'); // 'online' or 'cod'
  const isPending = searchParams.get('pending') === '1'; // payment captured but webhook not yet confirmed
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(isPending);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const tracked = useRef(false);
  const pollTimer = useRef(null);
  const pollTimeout = useRef(null);
  // Read the payment ID from URL so we can show it to the customer if polling times out
  const paymentId = searchParams.get('pid') || null;

  useEffect(() => {
    // AuthContext hydrates the customer asynchronously, so isAuthenticated is
    // false for the first render of any COLD load — and Razorpay's redirect mode
    // lands here as a cold load. Deciding before that settles bounced a customer
    // who had just paid straight to the login prompt. Wait for auth to resolve.
    if (authLoading) return;

    if (!isAuthenticated) {
      // No /login route exists — Profile shows the login prompt
      navigate('/profile');
      return;
    }

    fetchOrderDetails();
  }, [orderId, isAuthenticated, authLoading]);

  // If we arrived with pending=1, poll until payment_status flips to 'paid'
  useEffect(() => {
    if (!awaitingConfirmation) return;

    const poll = async () => {
      try {
        const token = localStorage.getItem('customerToken');
        const res = await fetch(`${API_BASE}/customer/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.order?.payment_status === 'paid' || data.order?.status === 'confirmed') {
          setOrder(data.order);
          setAwaitingConfirmation(false);
          clearInterval(pollTimer.current);
          clearTimeout(pollTimeout.current);
        }
      } catch { /* ignore — transient network error */ }
    };

    pollTimer.current = setInterval(poll, 5000);
    poll(); // immediate first check

    // Safety timeout — after 3 minutes stop spinning and show a help message.
    // The reconciliation cron will still confirm the order server-side within 30 min.
    pollTimeout.current = setTimeout(() => {
      clearInterval(pollTimer.current);
      setAwaitingConfirmation(false);
      setPollTimedOut(true);
    }, 3 * 60 * 1000);

    return () => {
      clearInterval(pollTimer.current);
      clearTimeout(pollTimeout.current);
    };
  }, [awaitingConfirmation, orderId]);

  // Razorpay redirect mode navigates the page away, so Order.jsx's success
  // handler — and its clearCart() — never runs. Landing here on a paid order is
  // the only proof the checkout completed, so empty the cart now or the customer
  // finds their just-bought items still sitting in it.
  const cartCleared = useRef(false);
  useEffect(() => {
    if (!order || cartCleared.current) return;
    if (order.payment_status !== 'paid') return;
    cartCleared.current = true;
    clearCart();
  }, [order]);

  // Fire Purchase pixel event once when order loads
  useEffect(() => {
    if (!order || tracked.current) return;
    tracked.current = true;

    const items = parseItems(order.items_json);
    trackPurchase(
      order.id,
      Number(order.total) || 0,
      order.payment_mode || 'unknown',
      items.map(i => ({
        id: i.itemId || i.item_id,
        name: i.itemName || i.item_name,
        price: i.itemPrice || i.price || 0,
        quantity: i.quantity || 1,
      }))
    );
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      const response = await fetch(`${API_BASE}/customer/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 404) {
        navigate('/orders', { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseItems = (itemsJson) => {
    try {
      return JSON.parse(itemsJson || '[]');
    } catch {
      return [];
    }
  };

  if (pollTimedOut) {
    return (
      <div className="min-h-screen bg-ht-ivory flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-ht-ink mb-3">Payment Received!</h2>
          <p className="text-ht-ink mb-4">
            Your payment was successfully captured. Your order will be confirmed automatically within a few minutes.
          </p>
          <p className="text-ht-mute text-sm mb-6">
            Check your <button onClick={() => navigate('/orders')} className="text-ht-red underline font-medium">orders page</button> in a minute — it will show up there once confirmed.
          </p>
          {paymentId && (
            <p className="text-ht-mute text-xs mb-4">
              Payment ID: <span className="font-mono text-ht-mute">{paymentId}</span>
            </p>
          )}
          <p className="text-ht-mute text-xs">
            Need help? WhatsApp us: <span className="text-ht-red">+91 62904 71281</span>
          </p>
        </div>
      </div>
    );
  }

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-ht-ivory flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-ht-ink mb-3">Payment Received!</h2>
          <p className="text-ht-ink mb-4">
            Your payment was captured. We're confirming your order — this usually takes a few seconds.
          </p>
          <div className="flex items-center justify-center gap-2 text-ht-red">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Waiting for confirmation...</span>
          </div>
          <p className="text-ht-mute text-xs mt-6">
            You can also check your <button onClick={() => navigate('/orders')} className="text-ht-red underline">orders page</button>.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ht-ivory flex items-center justify-center">
        <div className="text-ht-ink text-lg">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-ht-ivory flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-ht-red mb-4">Order not found</p>
          <button
            onClick={() => navigate('/menu')}
            className="px-6 py-3 bg-ht-red text-white rounded-lg hover:bg-ht-red"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Razorpay order that was never paid — payment failed or was abandoned
  const isUnpaidRazorpay = order.payment_mode === 'RAZORPAY' && order.payment_status !== 'paid' && !awaitingConfirmation;
  if (isUnpaidRazorpay) {
    return (
      <div className="min-h-screen bg-ht-ivory flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-ht-ink mb-3">Payment Not Completed</h2>
          <p className="text-ht-ink mb-4">
            Your order was not placed because the payment did not go through. No amount has been charged.
          </p>
          <button
            onClick={() => navigate('/order')}
            className="w-full py-3 bg-ht-red hover:bg-ht-red text-white font-bold rounded-lg transition-colors mb-3"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="w-full py-3 bg-ht-paper hover:bg-ht-ink/10 text-ht-ink rounded-lg transition-colors"
          >
            Back to Menu
          </button>
          <p className="text-ht-mute text-xs mt-4">
            Need help? WhatsApp us: <span className="text-ht-red">+91 62904 71281</span>
          </p>
        </div>
      </div>
    );
  }

  const items = parseItems(order.items_json);

  return (
    <div className="min-h-screen bg-ht-ivory py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-ht-veg/10 mb-6 animate-bounce">
            <CheckCircle className="w-16 h-16 text-ht-veg" />
          </div>
          
          <h1 className="text-3xl font-display font-normal text-ht-ink mb-3">
            Thank You!
          </h1>
          
          {paymentType === 'online' ? (
            <p className="text-xl text-ht-veg mb-2">
              Your payment was successful.
            </p>
          ) : null}
          
          <p className="text-xl text-ht-ink mb-1">
            Order #{order.id} has been placed.
          </p>
          
          {paymentType === 'cod' && (
            <p className="text-lg text-ht-ink">
              Pay on delivery
            </p>
          )}
        </div>

        {/* Order Summary Card */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <h2 className="text-ht-ink font-bold text-xl mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-ht-red" />
            Order Summary
          </h2>

          {/* Items */}
          <div className="space-y-3 mb-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-ht-ink font-medium">{item.itemName}</p>
                  <p className="text-ht-mute text-sm">Qty: {item.quantity}</p>
                </div>
                <p className="text-ht-ink font-semibold">₹{item.total}</p>
              </div>
            ))}
          </div>

          {/* Totals — every line comes from lib/billTotals.js, shared with the
              checkout, the cart drawer and the order-details page. This block
              used to omit the loyalty redemption entirely, so a points order
              showed Subtotal ₹720 and Total ₹604.80 with nothing accounting for
              the difference. It also printed the inclusive GST as a column line,
              which made a Weekend Special read ₹549 + ₹26.14 = ₹549.
              online_orders exposes the fee as delivery_fee (NOT delivery_charge —
              that field is always undefined here). */}
          <div className="border-t border-ht-ink/15 pt-4">
            {buildTotalsLines(totalsArgsFromOrder(order)).map((ln) => {
              if (ln.kind === 'note') {
                return (
                  <p key={ln.key} className="text-ht-mute text-xs text-right mt-1">
                    {ln.text}
                  </p>
                );
              }
              if (ln.kind === 'total') {
                return (
                  <div key={ln.key} className="flex justify-between items-center pt-2 border-t border-ht-ink/15">
                    <span className="text-ht-ink font-bold text-lg">{ln.label}</span>
                    <span className="text-ht-red font-bold text-xl">₹{money(ln.value)}</span>
                  </div>
                );
              }
              const tone =
                ln.tone === 'discount' ? 'text-ht-veg'
                  : ln.tone === 'points' ? 'text-ht-red2'
                    : 'text-ht-mute';
              return (
                <div key={ln.key} className="flex justify-between items-center mb-2">
                  <span className={tone}>{ln.label}</span>
                  {ln.free
                    ? <span className="text-ht-veg font-medium">FREE</span>
                    : <span className={ln.tone === 'muted' ? 'text-ht-ink' : tone}>
                        {ln.value < 0 ? '-' : ''}₹{money(Math.abs(ln.value))}
                      </span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <h3 className="text-ht-ink font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-ht-red" />
            Delivery Address
          </h3>
          <p className="text-ht-ink">{order.delivery_address}</p>
        </div>

        {/* Payment Info */}
        <div className="bg-ht-paper rounded-lg p-6 mb-8">
          <h3 className="text-ht-ink font-bold mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-ht-red" />
            Payment Details
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-ht-mute">Method</span>
            <span className="text-ht-ink uppercase font-medium">{order.payment_mode}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-ht-mute">Status</span>
            <span className={`font-medium ${order.payment_status === 'paid' ? 'text-ht-veg' : 'text-ht-gold3'}`}>
              {order.payment_status === 'paid' ? 'Paid' : 'Pay on Delivery'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/my-orders/${orderId}`)}
            className="w-full py-4 bg-ht-red hover:bg-ht-red text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5" />
            View Order Details
          </button>
          
          <button
            onClick={() => navigate('/menu')}
            className="w-full py-4 bg-ht-paper hover:bg-ht-ink/10 text-ht-ink font-medium rounded-lg transition-colors"
          >
            Back to Menu
          </button>
        </div>

        {/* Info Message */}
        <div className="mt-6 p-4 bg-ht-gold2/60 border border-ht-ink/15 rounded-lg">
          <p className="text-ht-red text-sm text-center">
            📱 You will receive updates about your order via SMS and notifications
          </p>
        </div>

      </div>
    </div>
  );
}