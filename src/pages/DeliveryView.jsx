import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, MapPin, Navigation, Package, CheckCircle } from 'lucide-react';
import API_BASE from '../config/api';

export default function DeliveryView() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [completed, setCompleted] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery/view/${token}`);
      if (!res.ok) {
        setError('Order not found');
        return;
      }
      const data = await res.json();
      setOrder(data.order);

      if (data.order.status === 'delivered') {
        setCompleted(true);
      }
    } catch (e) {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [token]);

  const handleStatusUpdate = async (newStatus) => {
    const label = newStatus === 'picked_up' ? 'Picked Up' : 'Delivered';
    if (!confirm(`Mark order as ${label}?`)) return;

    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/delivery/update/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Update failed');
        return;
      }

      if (newStatus === 'delivered') {
        setCompleted(true);
      }
      await fetchOrder();
    } catch (e) {
      alert('Failed to update: ' + e.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <p className="text-neutral-400 text-lg">{error || 'Order not found'}</p>
      </div>
    );
  }

  // Delivery complete state
  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Delivery Complete!</h1>
        <p className="text-neutral-400">Order #{order.id} has been delivered.</p>
      </div>
    );
  }

  let items = [];
  try { items = JSON.parse(order.items_json || '[]'); } catch (e) {}

  const isCOD = order.payment_mode === 'COD';
  const isPaid = order.payment_status === 'paid';
  const canPickUp = ['pending', 'confirmed', 'preparing'].includes(order.status);
  const canDeliver = order.status === 'out_for_delivery';

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-1">Delivery — Order #{order.id}</h1>
      <p className="text-neutral-500 text-sm mb-6">
        {new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      </p>

      {/* Customer Info */}
      <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4">
        <p className="text-neutral-400 text-xs font-medium mb-2">Customer</p>
        <p className="text-white font-semibold text-lg">{order.customer_name}</p>
        {order.phone && (
          <a
            href={`tel:${order.phone}`}
            className="mt-2 flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg font-medium text-base"
          >
            <Phone className="w-5 h-5" />
            Call {order.phone}
          </a>
        )}
      </div>

      {/* Address */}
      <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4">
        <p className="text-neutral-400 text-xs font-medium mb-2">Delivery Address</p>
        <p className="text-white text-sm mb-2">{order.delivery_address || 'Not provided'}</p>

        {order.delivery_latitude && order.delivery_longitude && (
          <a
            href={`https://maps.google.com/?q=${order.delivery_latitude},${order.delivery_longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-3 rounded-lg font-medium text-base"
          >
            <Navigation className="w-5 h-5" />
            Open in Google Maps
          </a>
        )}

        {order.delivery_instructions && (
          <div className="mt-3 p-2 bg-neutral-700/50 rounded-lg">
            <p className="text-neutral-400 text-xs">Instructions</p>
            <p className="text-white text-sm">{order.delivery_instructions}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4">
        <p className="text-neutral-400 text-xs font-medium mb-2">Items</p>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-neutral-300">{item.quantity}x {item.itemName}</span>
              <span className="text-neutral-400">₹{item.total || (item.itemPrice * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className={`rounded-xl p-4 mb-6 border ${
        isCOD && !isPaid
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-emerald-500/10 border-emerald-500/30'
      }`}>
        {isCOD && !isPaid ? (
          <div className="text-center">
            <p className="text-amber-400 text-sm font-medium">Cash on Delivery</p>
            <p className="text-white text-2xl font-bold mt-1">Collect ₹{order.total}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-emerald-400 text-sm font-medium">Paid Online</p>
            <p className="text-white text-xl font-bold mt-1">₹{order.total}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {canPickUp && (
          <button
            onClick={() => handleStatusUpdate('picked_up')}
            disabled={updating}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5" />
            {updating ? 'Updating...' : 'Picked Up'}
          </button>
        )}

        {canDeliver && (
          <button
            onClick={() => handleStatusUpdate('delivered')}
            disabled={updating}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {updating ? 'Updating...' : 'Delivered'}
          </button>
        )}
      </div>
    </div>
  );
}
