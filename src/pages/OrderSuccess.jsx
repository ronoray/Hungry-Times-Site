// site/src/pages/OrderSuccess.jsx
// Order confirmation success page
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Package, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import API_BASE from '../config/api.js';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const paymentType = searchParams.get('type'); // 'online' or 'cod'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchOrderDetails();
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