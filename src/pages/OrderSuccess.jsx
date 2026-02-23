// site/src/pages/OrderSuccess.jsx
// Order confirmation success page
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Package, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import API_BASE from '../config/api.js';
import { trackPurchase } from '../utils/analytics';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
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
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchOrderDetails();
  }, [orderId, isAuthenticated]);

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
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-3">Payment Received!</h2>
          <p className="text-neutral-300 mb-4">
            Your payment was successfully captured. Your order will be confirmed automatically within a few minutes.
          </p>
          <p className="text-neutral-400 text-sm mb-6">
            Check your <button onClick={() => navigate('/orders')} className="text-orange-400 underline font-medium">orders page</button> in a minute — it will show up there once confirmed.
          </p>
          {paymentId && (
            <p className="text-neutral-500 text-xs mb-4">
              Payment ID: <span className="font-mono text-neutral-400">{paymentId}</span>
            </p>
          )}
          <p className="text-neutral-500 text-xs">
            Need help? WhatsApp us: <span className="text-orange-400">+91 62904 71281</span>
          </p>
        </div>
      </div>
    );
  }

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-3">Payment Received!</h2>
          <p className="text-neutral-300 mb-4">
            Your payment was captured. We're confirming your order — this usually takes a few seconds.
          </p>
          <div className="flex items-center justify-center gap-2 text-orange-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Waiting for confirmation...</span>
          </div>
          <p className="text-neutral-500 text-xs mt-6">
            You can also check your <button onClick={() => navigate('/orders')} className="text-orange-400 underline">orders page</button>.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">Order not found</p>
          <button
            onClick={() => navigate('/menu')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  const items = parseItems(order.items_json);

  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/20 mb-6 animate-bounce">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3">
            Thank You!
          </h1>
          
          {paymentType === 'online' ? (
            <p className="text-xl text-green-400 mb-2">
              Your payment was successful.
            </p>
          ) : null}
          
          <p className="text-xl text-white mb-1">
            Order #{order.id} has been placed.
          </p>
          
          {paymentType === 'cod' && (
            <p className="text-lg text-neutral-300">
              Pay on delivery
            </p>
          )}
        </div>

        {/* Order Summary Card */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            Order Summary
          </h2>

          {/* Items */}
          <div className="space-y-3 mb-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-white font-medium">{item.itemName}</p>
                  <p className="text-neutral-400 text-sm">Qty: {item.quantity}</p>
                </div>
                <p className="text-white font-semibold">₹{item.total}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t border-neutral-700 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-400">Subtotal</span>
              <span className="text-white">₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-500">Discount</span>
                <span className="text-green-500">-₹{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-400">Tax (GST)</span>
              <span className="text-white">₹{order.tax}</span>
            </div>
            {Number(order.delivery_charge) > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-400">Delivery</span>
                <span className="text-white">₹{order.delivery_charge}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-neutral-700">
              <span className="text-white font-bold text-lg">Total</span>
              <span className="text-orange-500 font-bold text-xl">₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Delivery Address
          </h3>
          <p className="text-neutral-300">{order.delivery_address}</p>
        </div>

        {/* Payment Info */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-8">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-500" />
            Payment Details
          </h3>
          <div className="flex justify-between items-center">
            <span className="text-neutral-400">Method</span>
            <span className="text-white uppercase font-medium">{order.payment_mode}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-neutral-400">Status</span>
            <span className={`font-medium ${order.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
              {order.payment_status === 'paid' ? 'Paid' : 'Pay on Delivery'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/my-orders/${orderId}`)}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5" />
            View Order Details
          </button>
          
          <button
            onClick={() => navigate('/menu')}
            className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Menu
          </button>
        </div>

        {/* Info Message */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-sm text-center">
            📱 You will receive updates about your order via SMS and notifications
          </p>
        </div>

      </div>
    </div>
  );
}