// site/src/pages/Orders.jsx
// Customer's order history page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Clock, CheckCircle, XCircle, Truck, ChefHat, AlertCircle } from 'lucide-react';
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
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  preparing: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  out_for_delivery: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/30',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/30'
};

export default function Orders() {
  const { isAuthenticated, customer, token } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/menu');
      return;
    }
    
    fetchOrders();
  }, [isAuthenticated, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/customer/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setError(null);
    } catch (err) {
      console.error('Fetch orders error:', err);
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
      <div className="min-h-screen bg-[#0B0B0B] pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-white text-lg">Loading your orders...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-red-500 font-bold text-lg mb-2">Error Loading Orders</h3>
                <p className="text-red-400">{error}</p>
                <button
                  onClick={fetchOrders}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] pt-20 pb-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            My Orders
          </h1>
          <p className="text-neutral-400">
            Track your order history and current deliveries
          </p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400 text-lg mb-2">No orders yet</p>
            <p className="text-neutral-500 text-sm mb-6">
              Start ordering from our delicious menu!
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const StatusIcon = STATUS_ICONS[order.status] || Clock;
              const items = parseItems(order.items_json);
              
              return (
                <div
                  key={order.id}
                  className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden hover:border-orange-500/30 transition-colors"
                >
                  <div className="p-4 md:p-6">
                    {/* Order Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          Order #{order.id}
                        </h3>
                        <p className="text-neutral-400 text-sm">
                          {new Date(order.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${STATUS_COLORS[order.status]}`}>
                        <StatusIcon className="w-5 h-5" />
                        <span className="font-semibold">{formatStatus(order.status)}</span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="mb-4">
                      <h4 className="text-neutral-400 text-sm font-medium mb-2">Items:</h4>
                      {items.length > 0 ? (
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="text-white text-sm">
                              {item.quantity}x {item.itemName}
                              {item.variants && item.variants.length > 0 && (
                                <span className="text-neutral-500 text-xs ml-1">
                                  ({item.variants.map(v => v.name).join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-yellow-500 text-sm">No items found</p>
                      )}
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-800">
                      <div>
                        <p className="text-neutral-500 text-xs mb-1">Payment</p>
                        <p className="text-white font-medium">{order.payment_mode}</p>
                        {/* ✅ Auto-show paid for delivered COD orders */}
                        {order.status === 'delivered' ? (
                            <p className="text-xs text-green-500">✓ Paid</p>
                        ) : order.status === 'delivered' && order.payment_status === 'paid' ? (
                            <p className="text-xs text-green-500">✓ Paid</p>
                        ) : order.status === 'cancelled' || order.status === 'rejected' ? (
                            <p className="text-xs text-neutral-500">N/A</p>
                        ) : order.payment_status === 'paid' ? (
                            <p className="text-xs text-green-500">✓ Paid</p>
                        ) : (
                            <p className="text-xs text-yellow-500">Payment Pending</p>
                        )}
                      </div>             
                      <div className="md:text-right">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-orange-500 hover:text-orange-400 text-sm font-medium"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}