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
import { reorderIntoCart } from '../utils/reorder';

// Date grouping helper
const getDateGroup = (dateString) => {
  if (!dateString) return 'Earlier';
  const istDate = dateString.includes('Z') || dateString.includes('+')
    ? dateString
    : dateString.replace(' ', 'T') + '+05:30';
  const date = new Date(istDate);
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
  
  const istDate = dateString.includes('Z') || dateString.includes('+')
    ? dateString
    : dateString.replace(' ', 'T') + '+05:30';
  
  return new Date(istDate).toLocaleString('en-IN', {
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
  pending: 'bg-ht-gold2/60 text-ht-gold3 border-ht-gold/30',
  confirmed: 'bg-ht-gold2/60 text-ht-red border-ht-ink/15',
  preparing: 'bg-ht-red/10 text-ht-red border-ht-red/30',
  out_for_delivery: 'bg-ht-gold2/60 text-ht-red2 border-ht-gold/50',
  delivered: 'bg-ht-veg/10 text-ht-veg border-ht-veg/30',
  cancelled: 'bg-ht-red/10 text-ht-red border-ht-red/30',
  rejected: 'bg-ht-red/10 text-ht-red border-ht-red/30'
};

export default function Orders() {
  const { isAuthenticated, customer, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { lines, addLine, clearCart } = useCart();
  const showToast = useToast();

  const [reordering, setReordering] = useState(false);

  const handleReorder = async (order) => {
    if (reordering) return;
    setReordering(true);
    try {
      const ok = await reorderIntoCart(order, {
        cartLines: lines,
        clearCart,
        addLine,
        showToast,
      });
      if (ok) {
        trackReorder(order.id);
        navigate('/order');
      }
    } finally {
      setReordering(false);
    }
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
    // Same cold-load race as OrderSuccess: auth resolves async, and the Razorpay
    // callback can land here directly, so bouncing before it settles throws a
    // logged-in customer out to the menu.
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/menu');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, navigate, authLoading]);

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
      <div className="min-h-screen bg-ht-paper pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-ht-ink text-lg">Loading your orders...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ht-paper pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-ht-red/10 border border-ht-red/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-ht-red flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-ht-red font-bold text-lg mb-2">Error Loading Orders</h3>
                <p className="text-ht-red">{error}</p>
                <button
                  onClick={fetchOrders}
                  className="mt-4 px-4 py-2 bg-ht-red hover:bg-ht-red2 text-white rounded-lg transition-colors"
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
    <div className="min-h-screen bg-ht-paper pt-20 pb-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-normal text-ht-ink mb-2">
            My Orders
          </h1>
          <p className="text-ht-mute">
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
                    ? 'bg-ht-red text-white border-ht-red'
                    : 'bg-ht-ivory text-ht-mute border-ht-ink/15 hover:border-ht-ink/25'
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
            <Package className="w-16 h-16 text-ht-mute/80 mx-auto mb-4" />
            <p className="text-ht-mute text-lg mb-2">No orders yet</p>
            <p className="text-ht-mute text-sm mb-6">
              Start ordering from our delicious menu!
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="px-6 py-3 bg-ht-red hover:bg-ht-red2 text-white rounded-lg transition-colors font-medium"
            >
              Browse Menu
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-ht-mute/80 mx-auto mb-3" />
            <p className="text-ht-mute">No {statusFilter} orders</p>
            <button
              onClick={() => setStatusFilter('all')}
              className="mt-3 text-ht-red hover:text-ht-red text-sm font-medium"
            >
              Show all orders
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {DATE_GROUP_ORDER.filter(g => groupedOrders[g]).map(group => (
              <div key={group}>
                <h2 className="text-ht-mute text-sm font-semibold uppercase tracking-wider mb-3">{group}</h2>
                <div className="space-y-4">
            {groupedOrders[group].map((order) => {
              const StatusIcon = STATUS_ICONS[order.status] || Clock;
              const items = parseItems(order.items_json);
              
              return (
                <div
                  key={order.id}
                  className="bg-ht-ivory rounded-lg border border-ht-ink/10 overflow-hidden hover:border-ht-red/30 transition-colors"
                >
                  <div className="p-4 md:p-6">
                    {/* Order Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="text-ht-ink font-bold text-lg">
                          Order #{order.id}
                        </h3>
                        <p className="text-ht-mute text-sm">
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
                      <h4 className="text-ht-mute text-sm font-medium mb-2">Items:</h4>
                      {items.length > 0 ? (
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="text-ht-ink text-sm">
                              {item.quantity}x {item.itemName}
                              {item.variants && item.variants.length > 0 && (
                                <span className="text-ht-mute text-xs ml-1">
                                  ({item.variants.map(v => v.name).join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-ht-gold3 text-sm">No items found</p>
                      )}
                    </div>

                    {/* Order Details */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-ht-ink/10">
                      <div>
                        <p className="text-ht-mute text-xs mb-1">Total</p>
                        <p className="text-ht-red font-bold text-lg">₹{order.total}</p>
                      </div>
                      <div>
                        <p className="text-ht-mute text-xs mb-1">Payment</p>
                        <p className="text-ht-ink font-medium">{order.payment_mode}</p>
                        {order.status === 'delivered' ? (
                            <p className="text-xs text-ht-veg">✓ Paid</p>
                        ) : order.status === 'cancelled' || order.status === 'rejected' ? (
                            <p className="text-xs text-ht-mute">N/A</p>
                        ) : order.payment_status === 'paid' ? (
                            <p className="text-xs text-ht-veg">✓ Paid</p>
                        ) : (
                            <p className="text-xs text-ht-gold3">Payment Pending</p>
                        )}
                      </div>             
                      <div className="ml-auto flex items-center gap-3">
                        {(order.status === 'delivered' || order.status === 'cancelled') && (
                          <button
                            onClick={() => handleReorder(order)}
                            disabled={reordering}
                            className="flex items-center gap-1.5 text-ht-veg hover:text-ht-veg disabled:opacity-50 text-sm font-medium"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${reordering ? 'animate-spin' : ''}`} />
                            Reorder
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-ht-red hover:text-ht-red text-sm font-medium"
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
        <div className="fixed inset-0 bg-ht-ink/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ht-ivory rounded-lg border border-ht-ink/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-ht-ivory border-b border-ht-ink/10 p-4 md:p-6 flex items-center justify-between">
              <div>
                <h2 className="text-ht-ink text-xl md:text-2xl font-bold">
                  Order #{selectedOrder.id}
                </h2>
                <p className="text-ht-mute text-sm">
                  {formatOrderDate(selectedOrder.created_at, 'long')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="text-ht-mute hover:text-ht-red text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 md:p-6 space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-ht-mute text-sm font-medium mb-2">Order Status</h3>
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
                <h3 className="text-ht-mute text-sm font-medium mb-3">Order Items</h3>
                <div className="space-y-3">
                  {parseItems(selectedOrder.items_json).map((item, idx) => (
                    <div key={idx} className="bg-ht-paper rounded-lg p-3 border border-ht-ink/15">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <p className="text-ht-ink font-medium">{item.quantity}x {item.itemName}</p>
                          {item.variants && item.variants.length > 0 && (
                            <p className="text-ht-mute text-xs mt-1">
                              Variants: {item.variants.map(v => v.name).join(', ')}
                            </p>
                          )}
                          {item.addons && item.addons.length > 0 && (
                            <p className="text-ht-mute text-xs mt-1">
                              Add-ons: {item.addons.map(a => a.name).join(', ')}
                            </p>
                          )}
                        </div>
                        <p className="text-ht-ink font-medium ml-4">₹{item.total || (item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              {selectedOrder.delivery_address && (
                <div>
                  <h3 className="text-ht-mute text-sm font-medium mb-2">Delivery Address</h3>
                  <div className="bg-ht-paper rounded-lg p-3 border border-ht-ink/15">
                    <p className="text-ht-ink text-sm">{selectedOrder.delivery_address}</p>
                  </div>
                </div>
              )}

              {/* Delivery Instructions */}
              {selectedOrder.delivery_instructions && (
                <div>
                  <h3 className="text-ht-mute text-sm font-medium mb-2">Delivery Instructions</h3>
                  <div className="bg-ht-red/10 border border-ht-red/30 rounded-lg p-3">
                    <p className="text-ht-red text-sm italic">"{selectedOrder.delivery_instructions}"</p>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              <div>
                <h3 className="text-ht-mute text-sm font-medium mb-3">Payment Information</h3>
                <div className="bg-ht-paper rounded-lg p-4 border border-ht-ink/15 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-ht-mute text-sm">Payment Method:</span>
                    <span className="text-ht-ink font-medium">{selectedOrder.payment_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ht-mute text-sm">Payment Status:</span>
                    {selectedOrder.status === 'delivered' ? (
                      <span className="text-ht-veg font-medium">✓ Paid</span>
                    ) : selectedOrder.status === 'cancelled' || selectedOrder.status === 'rejected' ? (
                      <span className="text-ht-mute">N/A</span>
                    ) : selectedOrder.payment_status === 'paid' ? (
                      <span className="text-ht-veg font-medium">✓ Paid</span>
                    ) : (
                      <span className="text-ht-gold3 font-medium">Pending</span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-ht-ink/15 flex justify-between items-center">
                    <span className="text-ht-ink font-semibold">Total Amount:</span>
                    <span className="text-ht-red text-xl font-bold">₹{selectedOrder.total}</span>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              {(selectedOrder.status === 'cancelled' || selectedOrder.status === 'rejected') && selectedOrder.cancellation_reason && (
                <div>
                  <h3 className="text-ht-mute text-sm font-medium mb-2">
                    {selectedOrder.status === 'cancelled' ? 'Cancellation' : 'Rejection'} Reason
                  </h3>
                  <div className="bg-ht-red/10 border border-ht-red/30 rounded-lg p-3">
                    <p className="text-ht-red text-sm">{selectedOrder.cancellation_reason}</p>
                  </div>
                </div>
              )}

              {/* What happened to the money. A cancelled order shows "N/A" for
                  payment status above, which says nothing about a refund — so
                  say it here. 'refunded' is only written once the money has
                  actually settled; an accepted refund reads 'processing', and
                  Razorpay takes 5-7 working days to land it. Promising it has
                  arrived when it has not is how a refund turns into a complaint. */}
              {CANCELLED_STATUSES.includes(selectedOrder.status) && selectedOrder.refund_status && (
                <div>
                  <h3 className="text-ht-mute text-sm font-medium mb-2">Refund</h3>
                  <div className="bg-ht-paper border border-ht-ink/15 rounded-lg p-3">
                    {selectedOrder.refund_status === 'refunded' ? (
                      <p className="text-ht-veg text-sm">
                        ₹{Number(selectedOrder.refund_amount || 0).toFixed(2)} has been refunded to your original payment method.
                      </p>
                    ) : selectedOrder.refund_status === 'processing' ? (
                      <p className="text-ht-veg text-sm">
                        ₹{Number(selectedOrder.refund_amount || 0).toFixed(2)} is on its way back to your original
                        payment method. It usually takes 5–7 working days to appear.
                      </p>
                    ) : (
                      <p className="text-ht-ink text-sm">
                        Please contact us about the payment on this order.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Loyalty points move when an order is cancelled — points it
                  earned come off, points it spent go back — and until now
                  nothing told the customer, so a balance simply changed. */}
              {CANCELLED_STATUSES.includes(selectedOrder.status) &&
                (Number(selectedOrder.points_earned) > 0 || Number(selectedOrder.points_redeemed) > 0) && (
                <div>
                  <h3 className="text-ht-mute text-sm font-medium mb-2">Loyalty Points</h3>
                  <div className="bg-ht-paper border border-ht-ink/15 rounded-lg p-3 space-y-1">
                    {Number(selectedOrder.points_redeemed) > 0 && (
                      <p className="text-ht-veg text-sm">
                        {selectedOrder.points_redeemed} points you spent on this order have been returned to your balance.
                      </p>
                    )}
                    {Number(selectedOrder.points_earned) > 0 && (
                      <p className="text-ht-ink text-sm">
                        {selectedOrder.points_earned} points this order earned have been reversed.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-ht-ivory border-t border-ht-ink/10 p-4 md:p-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="w-full px-4 py-3 bg-ht-red hover:bg-ht-red2 text-white rounded-lg transition-colors font-medium"
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