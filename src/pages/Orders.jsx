// site/src/pages/Orders.jsx
// Customer's order history page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/Toast';
import { Package, Clock, CheckCircle, XCircle, Truck, ChefHat, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import API_BASE from '../config/api.js';
import { trackReorder } from '../utils/analytics';

// Date grouping helper
const getDateGroup = (dateString) => {
  if (!dateString) return 'Earlier';
  const utcDate = dateString.includes('Z') || dateString.includes('+')
    ? dateString
    : dateString.replace(' ', 'T') + 'Z';
  const date = new Date(utcDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This Week';
  return 'Earlier';
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery'];
const DONE_STATUSES = ['delivered'];
const CANCELLED_STATUSES = ['cancelled', 'rejected'];

// Helper to format date in IST, forcing UTC interpretation
const formatOrderDate = (dateString, style = 'medium') => {
  if (!dateString) return '—';
  
  // Force UTC interpretation by adding 'Z' if missing
  const utcDate = dateString.includes('Z') || dateString.includes('+')
    ? dateString 
    : dateString.replace(' ', 'T') + 'Z';
  
  return new Date(utcDate).toLocaleString('en-IN', {
    dateStyle: style === 'long' ? 'long' : 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
};

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
  const { addLine, clearCart } = useCart();
  const showToast = useToast();

  const handleReorder = (order) => {
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
    trackReorder(order.id);
    showToast('Items added to cart', 'success');
    navigate('/order');
  };
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter + group orders
  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ACTIVE_STATUSES.includes(o.status);
    if (statusFilter === 'delivered') return DONE_STATUSES.includes(o.status);
    if (statusFilter === 'cancelled') return CANCELLED_STATUSES.includes(o.status);
    return true;
  });

  const groupedOrders = filteredOrders.reduce((groups, order) => {
    const group = getDateGroup(order.created_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(order);
    return groups;
  }, {});
  const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'];

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

        {/* Status Filter Tabs */}
        {orders.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                  statusFilter === tab.key
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:border-neutral-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

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
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400">No {statusFilter} orders</p>
            <button
              onClick={() => setStatusFilter('all')}
              className="mt-3 text-orange-500 hover:text-orange-400 text-sm font-medium"
            >
              Show all orders
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {DATE_GROUP_ORDER.filter(g => groupedOrders[g]).map(group => (
              <div key={group}>
                <h2 className="text-neutral-500 text-sm font-semibold uppercase tracking-wider mb-3">{group}</h2>
                <div className="space-y-4">
            {groupedOrders[group].map((order) => {
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
                          {formatOrderDate(order.created_at)}
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
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-neutral-800">
                      <div>
                        <p className="text-neutral-500 text-xs mb-1">Total</p>
                        <p className="text-orange-500 font-bold text-lg">₹{order.total}</p>
                      </div>
                      <div>
                        <p className="text-neutral-500 text-xs mb-1">Payment</p>
                        <p className="text-white font-medium">{order.payment_mode}</p>
                        {order.status === 'delivered' ? (
                            <p className="text-xs text-green-500">✓ Paid</p>
                        ) : order.status === 'cancelled' || order.status === 'rejected' ? (
                            <p className="text-xs text-neutral-500">N/A</p>
                        ) : order.payment_status === 'paid' ? (
                            <p className="text-xs text-green-500">✓ Paid</p>
                        ) : (
                            <p className="text-xs text-yellow-500">Payment Pending</p>
                        )}
                      </div>             
                      <div className="ml-auto flex items-center gap-3">
                        {(order.status === 'delivered' || order.status === 'cancelled') && (
                          <button
                            onClick={() => handleReorder(order)}
                            className="flex items-center gap-1.5 text-green-500 hover:text-green-400 text-sm font-medium"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reorder
                          </button>
                        )}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-4 md:p-6 flex items-center justify-between">
              <div>
                <h2 className="text-white text-xl md:text-2xl font-bold">
                  Order #{selectedOrder.id}
                </h2>
                <p className="text-neutral-400 text-sm">
                  {formatOrderDate(selectedOrder.created_at, 'long')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="text-neutral-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 md:p-6 space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-neutral-400 text-sm font-medium mb-2">Order Status</h3>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${STATUS_COLORS[selectedOrder.status]}`}>
                  {(() => {
                    const StatusIcon = STATUS_ICONS[selectedOrder.status] || Clock;
                    return <StatusIcon className="w-5 h-5" />;
                  })()}
                  <span className="font-semibold">{formatStatus(selectedOrder.status)}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-neutral-400 text-sm font-medium mb-3">Order Items</h3>
                <div className="space-y-3">
                  {parseItems(selectedOrder.items_json).map((item, idx) => (
                    <div key={idx} className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <p className="text-white font-medium">{item.quantity}x {item.itemName}</p>
                          {item.variants && item.variants.length > 0 && (
                            <p className="text-neutral-500 text-xs mt-1">
                              Variants: {item.variants.map(v => v.name).join(', ')}
                            </p>
                          )}
                          {item.addons && item.addons.length > 0 && (
                            <p className="text-neutral-500 text-xs mt-1">
                              Add-ons: {item.addons.map(a => a.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <p className="text-white font-medium ml-4">₹{item.total || (item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              {selectedOrder.delivery_address && (
                <div>
                  <h3 className="text-neutral-400 text-sm font-medium mb-2">Delivery Address</h3>
                  <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                    <p className="text-white text-sm">{selectedOrder.delivery_address}</p>
                  </div>
                </div>
              )}

              {/* Delivery Instructions */}
              {selectedOrder.delivery_instructions && (
                <div>
                  <h3 className="text-neutral-400 text-sm font-medium mb-2">Delivery Instructions</h3>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <p className="text-orange-300 text-sm italic">"{selectedOrder.delivery_instructions}"</p>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div>
                <h3 className="text-neutral-400 text-sm font-medium mb-3">Payment Information</h3>
                <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-400 text-sm">Payment Method:</span>
                    <span className="text-white font-medium">{selectedOrder.payment_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400 text-sm">Payment Status:</span>
                    {selectedOrder.status === 'delivered' ? (
                      <span className="text-green-500 font-medium">✓ Paid</span>
                    ) : selectedOrder.status === 'cancelled' || selectedOrder.status === 'rejected' ? (
                      <span className="text-neutral-500">N/A</span>
                    ) : selectedOrder.payment_status === 'paid' ? (
                      <span className="text-green-500 font-medium">✓ Paid</span>
                    ) : (
                      <span className="text-yellow-500 font-medium">Pending</span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-neutral-700 flex justify-between items-center">
                    <span className="text-white font-semibold">Total Amount:</span>
                    <span className="text-orange-500 text-xl font-bold">₹{selectedOrder.total}</span>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              {(selectedOrder.status === 'cancelled' || selectedOrder.status === 'rejected') && selectedOrder.cancellation_reason && (
                <div>
                  <h3 className="text-neutral-400 text-sm font-medium mb-2">
                    {selectedOrder.status === 'cancelled' ? 'Cancellation' : 'Rejection'} Reason
                  </h3>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-red-300 text-sm">{selectedOrder.cancellation_reason}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-4 md:p-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}