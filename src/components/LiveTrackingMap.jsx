import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import API_BASE from '../config/api';

// Custom DivIcon markers — avoids Vite asset URL issues with default leaflet icons
const customerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#f97316;border:3px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,0.4);
    display:flex;align-items:center;justify-content:center;
    font-size:14px;line-height:1;
  ">🏠</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const deliveryIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:36px;height:36px;">
    <div style="
      position:absolute;inset:0;border-radius:50%;
      background:rgba(59,130,246,0.25);
      animation:deliveryPulse 1.8s ease-out infinite;
    "></div>
    <div style="
      position:absolute;top:4px;left:4px;right:4px;bottom:4px;
      border-radius:50%;background:#3b82f6;border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
    ">🛵</div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Inject pulse keyframes once
if (typeof document !== 'undefined' && !document.getElementById('delivery-pulse-style')) {
  const style = document.createElement('style');
  style.id = 'delivery-pulse-style';
  style.textContent = `
    @keyframes deliveryPulse {
      0%   { transform: scale(1);   opacity: 0.6; }
      70%  { transform: scale(2.4); opacity: 0;   }
      100% { transform: scale(1);   opacity: 0;   }
    }
  `;
  document.head.appendChild(style);
}

// Auto-fit bounds to show both pins
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [JSON.stringify(points)]);
  return null;
}

function timeSince(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

/**
 * LiveTrackingMap — shows customer pin + live delivery person pin
 * @param {string}  token        - tracking token (used to poll live location)
 * @param {number}  customerLat  - customer's GPS lat (from order, may be null)
 * @param {number}  customerLng  - customer's GPS lng (from order, may be null)
 */
export default function LiveTrackingMap({ token, customerLat, customerLng }) {
  const [deliveryLoc, setDeliveryLoc] = useState(null); // { lat, lng, updatedAt }
  const [lastPoll, setLastPoll] = useState(null);
  const intervalRef = useRef(null);

  const poll = async () => {
    try {
      const res = await fetch(`${API_BASE}/delivery/location/${token}`);
      const data = await res.json();
      if (data.location) setDeliveryLoc(data.location);
      setLastPoll(Date.now());
    } catch { /* silent */ }
  };

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 10000);
    return () => clearInterval(intervalRef.current);
  }, [token]);

  const hasCustomer = customerLat != null && customerLng != null;
  const hasDelivery = deliveryLoc != null;

  // Need at least one point to render a map
  if (!hasCustomer && !hasDelivery) {
    return (
      <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4 text-center">
        <p className="text-neutral-500 text-sm">Waiting for delivery person's location...</p>
      </div>
    );
  }

  const center = hasDelivery
    ? [deliveryLoc.lat, deliveryLoc.lng]
    : [customerLat, customerLng];

  const fitPoints = [
    ...(hasDelivery ? [[deliveryLoc.lat, deliveryLoc.lng]] : []),
    ...(hasCustomer ? [[customerLat, customerLng]] : []),
  ];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-neutral-400 text-xs font-medium">Live Tracking</p>
        {deliveryLoc && lastPoll && (
          <p className="text-neutral-500 text-xs">
            Updated {timeSince(deliveryLoc.updatedAt)}
          </p>
        )}
        {!hasDelivery && (
          <p className="text-amber-500 text-xs">Waiting for delivery person...</p>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-neutral-700" style={{ height: 260 }}>
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <FitBounds points={fitPoints} />

          {hasCustomer && (
            <Marker position={[customerLat, customerLng]} icon={customerIcon}>
              <Popup>Your location</Popup>
            </Marker>
          )}

          {hasDelivery && (
            <Marker position={[deliveryLoc.lat, deliveryLoc.lng]} icon={deliveryIcon}>
              <Popup>Delivery person</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="flex gap-4 mt-2 px-1">
        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Your location
        </span>
        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Delivery person
        </span>
      </div>
    </div>
  );
}
