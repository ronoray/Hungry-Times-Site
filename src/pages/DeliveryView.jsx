import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, MapPin, Navigation, Package, CheckCircle, Radio } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import API_BASE from '../config/api';

export default function DeliveryView() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const watchIdRef = useRef(null);
  const locationIntervalRef = useRef(null);

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

  // Poll every 10s so payment status updates (QR → Paid) are reflected in real time
  useEffect(() => {
    if (completed) return;
    const interval = setInterval(() => {
      fetchOrder();
    }, 10000);
    return () => clearInterval(interval);
  }, [token, completed]);

  // GPS broadcasting — runs while order is out_for_delivery
  useEffect(() => {
    const isOFD = order?.status === 'out_for_delivery';

    if (isOFD && 'geolocation' in navigator) {
      const sendLocation = (lat, lng) => {
        fetch(`${API_BASE}/delivery/location/${token}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        }).catch(() => {});
      };

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          sendLocation(latitude, longitude);
          setSharingLocation(true);
        },
        (err) => { console.warn('GPS error:', err.message); },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );

      return () => {
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setSharingLocation(false);
      };
    } else {
      setSharingLocation(false);
    }
  }, [order?.status, token]);

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

  const isPaid = order.payment_status === 'paid';
  const advancePaid = Number(order.advance_payment || 0);
  const collectAmount = advancePaid > 0 ? Math.max(0, Number(order.total) - advancePaid) : Number(order.total);
  const upiUrl = `upi://pay?pa=8420822919@okbizaxis&pn=HungryTimes&am=${collectAmount}&tn=Order+%23${order.id}&cu=INR`;
  const canPickUp = ['pending', 'confirmed', 'preparing'].includes(order.status);
  const canDeliver = order.status === 'out_for_delivery';
  const isPickup = order.delivery_address === 'Pickup' || order.order_type?.includes('pickup');

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-white mb-1">{isPickup ? 'Pickup' : 'Delivery'} — Order #{order.id}</h1>
      <p className="text-neutral-500 text-sm mb-6">
        {new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      </p>

      {/* Customer Info */}
      <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4">
        <p className="text-neutral-400 text-xs font-medium mb-2">Customer</p>
        <p className="text-white font-semibold text-lg mb-2">{order.customer_name}</p>
        {order.phone && (
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-base flex-1">{order.phone}</span>
            <a
              href={`tel:${order.phone}`}
              className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
          </div>
        )}
      </div>

      {/* Address or Pickup Info */}
      {isPickup ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
          <p className="text-green-400 text-xs font-medium mb-1">Pickup Order</p>
          <p className="text-white font-semibold">Customer will collect from restaurant</p>
          <p className="text-neutral-400 text-sm mt-1">Ready in ~30 min. Call customer if there's a delay.</p>
          {order.delivery_instructions && (
            <div className="mt-3 p-2 bg-neutral-700/50 rounded-lg">
              <p className="text-neutral-400 text-xs">Instructions</p>
              <p className="text-white text-sm">{order.delivery_instructions}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4">
          <p className="text-neutral-400 text-xs font-medium mb-2">Delivery Address</p>
          <p className="text-white text-sm mb-3">{order.delivery_address || 'Not provided'}</p>

          {order.delivery_latitude && order.delivery_longitude ? (
            /* GPS-verified location — opens exact pin */
            <a
              href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-3 rounded-lg font-semibold text-base transition-colors"
            >
              <Navigation className="w-5 h-5" />
              Open in Google Maps
            </a>
          ) : order.delivery_address && order.delivery_address !== 'Pickup' ? (
            /* No GPS — text-based search, clearly marked as approximate */
            <div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-4 py-3 rounded-lg font-semibold text-base transition-colors"
              >
                <MapPin className="w-5 h-5" />
                Search Address on Maps
              </a>
              <p className="text-amber-500/70 text-xs mt-1.5 pl-1">
                Location not GPS-verified — confirm with customer if unsure
              </p>
            </div>
          ) : null}

          {order.delivery_instructions && (
            <div className="mt-3 p-2 bg-neutral-700/50 rounded-lg">
              <p className="text-neutral-400 text-xs">Instructions</p>
              <p className="text-white text-sm">{order.delivery_instructions}</p>
            </div>
          )}
        </div>
      )}

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
      {isPaid ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-emerald-400 text-sm font-medium">
            {order.payment_mode === 'COD' ? 'Payment Collected' : 'Paid Online'}
          </p>
          <p className="text-white text-xl font-bold mt-1">₹{order.total}</p>
        </div>
      ) : collectAmount === 0 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-emerald-400 text-sm font-medium">Advance Fully Paid</p>
          <p className="text-white text-xl font-bold mt-1">₹{order.total}</p>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          {advancePaid > 0 ? (
            <div className="mb-3 text-center">
              <p className="text-amber-400 text-sm font-medium mb-1">Collect Balance at Door</p>
              <p className="text-neutral-400 text-xs">Total ₹{order.total} — Advance paid ₹{advancePaid}</p>
              <p className="text-white text-3xl font-bold mt-1">₹{collectAmount} due</p>
            </div>
          ) : (
            <p className="text-amber-400 text-sm font-medium text-center mb-1">Collect Payment at Door</p>
          )}
          {!advancePaid && <p className="text-white text-3xl font-bold text-center mb-4">₹{collectAmount}</p>}
          {/* GPay QR */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={upiUrl} size={200} />
            </div>
            <p className="text-neutral-400 text-xs text-center">Customer scans to pay via any UPI app</p>
            <a
              href={upiUrl}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors text-base"
            >
              Open GPay / UPI App
            </a>
          </div>
        </div>
      )}

      {/* GPS sharing indicator */}
      {sharingLocation && (
        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2.5 mb-4">
          <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
          <p className="text-blue-400 text-sm font-medium">Sharing your location with the customer</p>
        </div>
      )}

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
