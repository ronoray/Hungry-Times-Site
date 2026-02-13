import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardCheck, CheckCircle, ChefHat, Truck, Package, Phone } from 'lucide-react';
import API_BASE from '../config/api';

const STEPS = [
  { key: 'pending', label: 'Placed', icon: ClipboardCheck },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: ChefHat },
  { key: 'out_for_delivery', label: 'On the Way', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
];

const STATUS_INDEX = {};
STEPS.forEach((s, i) => { STATUS_INDEX[s.key] = i; });

export default function TrackOrder() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery/track/${token}`);
      if (!res.ok) {
        setError('Order not found');
        return;
      }
      const data = await res.json();
      setOrder(data.order);
      setError(null);
    } catch (e) {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [token]);

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

  const currentIdx = STATUS_INDEX[order.status] ?? 0;
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  let items = [];
  try { items = JSON.parse(order.items_json || '[]'); } catch (e) {}

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-1">Track Order #{order.id}</h1>
      <p className="text-neutral-500 text-sm mb-6">
        {new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      </p>

      {isCancelled ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400 font-semibold">Order Cancelled</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="relative mb-8">
            {/* Track line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-neutral-700" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-orange-500 transition-all duration-700"
              style={{ width: `${Math.max(0, currentIdx / (STEPS.length - 1)) * (100 - 8)}%` }}
            />

            <div className="relative flex justify-between">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = i <= currentIdx;
                const active = i === currentIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center w-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-neutral-800 border-neutral-600 text-neutral-500'
                    } ${active ? 'ring-2 ring-orange-500/40' : ''}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] mt-1.5 text-center leading-tight ${
                      done ? 'text-white' : 'text-neutral-500'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ETA */}
          {order.estimated_delivery_time && !isDelivered && (
            <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-3 mb-4 text-center">
              <p className="text-neutral-400 text-xs">Estimated delivery</p>
              <p className="text-white font-semibold">{order.estimated_delivery_time}</p>
            </div>
          )}

          {isDelivered && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4 text-center">
              <p className="text-emerald-400 font-semibold">Your order has been delivered!</p>
            </div>
          )}
        </>
      )}

      {/* Delivery partner */}
      {order.delivery_partner_name && (
        <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-neutral-500 text-xs">Delivery partner</p>
            <p className="text-white font-medium">{order.delivery_partner_name}</p>
          </div>
          {order.delivery_partner_phone && (
            <a
              href={`tel:${order.delivery_partner_phone}`}
              className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
            </a>
          )}
        </div>
      )}

      {/* Items */}
      {items.length > 0 && (
        <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4">
          <p className="text-neutral-400 text-xs font-medium mb-2">Items</p>
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-neutral-300">
                  {item.quantity}x {item.itemName}
                </span>
                <span className="text-neutral-400">₹{item.total || (item.itemPrice * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-700 flex justify-between font-semibold">
            <span className="text-white">Total</span>
            <span className="text-orange-500">₹{order.total}</span>
          </div>
        </div>
      )}
    </div>
  );
}
