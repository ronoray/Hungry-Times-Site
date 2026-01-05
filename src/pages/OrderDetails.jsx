// site/src/pages/OrderDetails.jsx
// Customer-facing order tracking page
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, MapPin, CreditCard, Clock, CheckCircle, XCircle, Truck, ChefHat } from 'lucide-react';
import API_BASE from '../config/api.js';

const STATUS_ICONS = {
  pending: Clock,
  confirmed: CheckCircle,
  preparing: ChefHat,
  out_for_delivery: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  rejected: XCircle
};

const STATUS_COLORS = {
  pending: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
  confirmed: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  preparing: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  out_for_delivery: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  delivered: 'text-green-500 bg-green-500/10 border-green-500/30',
  cancelled: 'text-red-500 bg-red-500/10 border-red-500/30',
  rejected: 'text-red-500 bg-red-500/10 border-red-500/30'
};

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

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

  const formatStatus = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const parseItems = (itemsJson) => {
    try {
      return JSON.parse(itemsJson || '[]');
    } catch {
      return [];
    }
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

  const StatusIcon = STATUS_ICONS[order.status] || Clock;
  const items = parseItems(order.items_json);

  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-orange-500 hover:text-orange-400 mb-4"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Order #{order.id}</h1>
          <p className="text-neutral-400">
            Placed on {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        {/* Status Card */}
        <div className={`rounded-lg border-2 p-6 mb-6 ${STATUS_COLORS[order.status]}`}>
          <div className="flex items-center gap-3 mb-2">
            <StatusIcon className="w-8 h-8" />
            <h2 className="text-2xl font-bold">{formatStatus(order.status)}</h2>
          </div>
          <p className="text-sm opacity-90">
            {order.status === 'pending' && 'Your order is being reviewed by the restaurant'}
            {order.status === 'confirmed' && '🎉 Your order has been accepted by the restaurant! Estimated delivery: 30-40 minutes'}
            {order.status === 'preparing' && 'Our chefs are preparing your delicious meal'}
            {order.status === 'out_for_delivery' && 'Your order is on its way!'}
            {order.status === 'delivered' && 'Your order has been delivered. Enjoy!'}
            {order.status === 'cancelled' && 'This order has been cancelled'}
            {order.status === 'rejected' && 'This order was rejected. Please contact support.'}
          </p>
        </div>

        {/* Order Details Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Customer Info */}
          <div className="bg-neutral-800 rounded-lg p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Customer Details
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-neutral-400">Name:</span>
                <span className="text-white ml-2">{order.customer_name}</span>
              </div>
              <div>
                <span className="text-neutral-400">Phone:</span>
                <span className="text-white ml-2">{order.phone}</span>
              </div>
              {order.email && (
                <div>
                  <span className="text-neutral-400">Email:</span>
                  <span className="text-white ml-2">{order.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-neutral-800 rounded-lg p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-neutral-400">Method:</span>
                <span className="text-white ml-2 uppercase">{order.payment_mode}</span>
              </div>
              <div>
                <span className="text-neutral-400">Status:</span>
                <span className={`ml-2 ${order.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                  {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.delivery_address && (
          <div className="bg-neutral-800 rounded-lg p-6 mb-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Delivery Address
            </h3>
            <p className="text-white">{order.delivery_address}</p>
          </div>
        )}

        {/* Special Instructions */}
        {order.delivery_instructions && (
          <div className="bg-neutral-800 rounded-lg p-6 mb-6">
            <h3 className="text-white font-bold mb-4">Special Instructions</h3>
            <p className="text-neutral-300 italic">"{order.delivery_instructions}"</p>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <h3 className="text-white font-bold mb-4">Order Items</h3>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start border-b border-neutral-700 pb-3 last:border-0">
                <div className="flex-1">
                  <p className="text-white font-medium">{item.itemName}</p>
                  <p className="text-neutral-400 text-sm">Quantity: {item.quantity}</p>
                  
                  {/* Variants */}
                  {item.variants && item.variants.length > 0 && (
                    <div className="mt-1 text-xs text-neutral-500">
                      Variants: {item.variants.map(v => v.name).join(', ')}
                    </div>
                  )}
                  
                  {/* Addons */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="mt-1 text-xs text-neutral-500">
                      Addons: {item.addons.map(a => a.name).join(', ')}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">₹{item.total}</p>
                  <p className="text-neutral-400 text-sm">₹{item.itemPrice} × {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-neutral-800 rounded-lg p-6">
          <h3 className="text-white font-bold mb-4">Order Summary</h3>
          <div className="space-y-2">
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
            <div className="flex justify-between text-neutral-400">
              <span>Tax (GST)</span>
              <span>₹{order.tax}</span>
            </div>
            <div className="border-t border-neutral-700 pt-2 mt-2 flex justify-between text-white font-bold text-xl">
              <span>Total</span>
              <span className="text-orange-500">₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Cancel Button (only for pending orders) */}
        {order.status === 'pending' && (
          <div className="mt-6">
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
                    alert('Order cancelled successfully');
                    fetchOrderDetails();
                  } else {
                    alert('Failed to cancel order');
                  }
                } catch (err) {
                  alert('Error cancelling order');
                }
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              Cancel Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}