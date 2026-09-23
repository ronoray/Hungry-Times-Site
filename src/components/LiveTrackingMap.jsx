import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
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

// A rider who has gone quiet for this long is reported as quiet. The server
// drops the position entirely at ten minutes; this is the earlier, softer line
// where the map stops implying the dot is current.
const QUIET_AFTER_MS = 90 * 1000;

// How long the marker takes to walk from the old fix to the new one. Long
// enough to read as motion, short enough that it has always arrived before the
// next fix lands.
const GLIDE_MS = 900;

// Beyond this, a new fix is a correction (or the first one), not travel —
// gliding across it would draw a scooter sailing over the city.
const SNAP_OVER_KM = 1.5;

// Straight line to road distance. Kolkata's grid is not kind; 1.3 is the usual
// working figure and it is only ever used for the "minutes away" text.
const ROAD_FACTOR = 1.3;

// Speed bounds for the ETA, in km/h. A rider stopped at a light must not read
// as "arriving never", and a GPS spike must not read as "arriving now".
const MIN_SPEED_KMH = 8;
const MAX_SPEED_KMH = 40;
const DEFAULT_SPEED_KMH = 18;

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

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Fit both pins once, then leave the map alone.
 *
 * This used to re-fit on every update. With a fix arriving every few seconds
 * the map re-zoomed and re-centred continuously, so a customer who pinched in to
 * see which lane the rider was on had it snatched back before they could look.
 * Now: fit on the first render that has something to show, and again only when
 * asked. `onUserMoved` reports the first pan or zoom the customer makes.
 */
function FitBounds({ points, recenterKey, onUserMoved }) {
  const map = useMap();
  const fitted = useRef(false);
  const hasPoints = points.length > 0;
  // Read inside the effect without making it a dependency — the array is new on
  // every render, and re-fitting on every fix is the behaviour being removed.
  const pointsRef = useRef(points);
  pointsRef.current = points;

  // A drag is always the customer. Zoom is not — our own fitBounds fires
  // zoomstart too — so the gestures are read off the container instead.
  useMapEvents({ dragstart: () => onUserMoved?.() });

  useEffect(() => {
    const el = map.getContainer();
    const flag = () => onUserMoved?.();
    el.addEventListener('wheel', flag, { passive: true });
    el.addEventListener('touchstart', flag, { passive: true });
    el.addEventListener('dblclick', flag);
    return () => {
      el.removeEventListener('wheel', flag);
      el.removeEventListener('touchstart', flag);
      el.removeEventListener('dblclick', flag);
    };
  }, [map, onUserMoved]);

  useEffect(() => {
    const current = pointsRef.current;
    if (!current.length) return;
    if (fitted.current && recenterKey === 0) return;
    if (current.length >= 2) {
      map.fitBounds(L.latLngBounds(current), { padding: [50, 50], maxZoom: 16 });
    } else {
      map.setView(current[0], 15);
    }
    fitted.current = true;
    // Fits once when there is something to show, and again only when the
    // customer taps Recentre.
  }, [map, recenterKey, hasPoints]);

  return null;
}

function timeSince(ms) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

/**
 * The rider's position, pushed over a WebSocket with polling as the safety net.
 *
 * Polling alone meant the dot was up to a full interval behind before it even
 * started moving. The socket carries each fix as it arrives; if it cannot be
 * opened — a proxy that blocks upgrades, a captive-portal network — the poll
 * keeps the page working exactly as it did before.
 */
function useRiderLocation(token) {
  const [location, setLocation] = useState(null);
  const [live, setLive] = useState(false);
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!token) return undefined;
    // Scoped to THIS effect run, not a ref shared across them. A ref is reset by
    // the next mount before the previous socket's close event fires, and that
    // close then schedules a reconnect the new run knows nothing about — two
    // sockets for one delivery, which React's double-mount in development
    // reproduces every time.
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/delivery/location/${token}`);
        const data = await res.json();
        setLocation(data.location ?? null);
      } catch { /* keep the last position; the next tick may succeed */ }
    };

    const startPolling = () => {
      if (pollRef.current) return;
      poll();
      pollRef.current = setInterval(poll, 8000);
    };

    const stopPolling = () => {
      if (!pollRef.current) return;
      clearInterval(pollRef.current);
      pollRef.current = null;
    };

    const connect = () => {
      if (cancelled) return;
      let ws;
      try {
        const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        // Same origin: the API and this page share a host in production, and in
        // dev the Vite proxy forwards it.
        ws = new WebSocket(`${scheme}://${window.location.host}/api/delivery/ws/${token}`);
      } catch {
        startPolling();
        return;
      }
      socketRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setLive(true);
        // The socket sends the current position on connect, so the poll has
        // nothing left to do.
        stopPolling();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'location') setLocation(msg.location ?? null);
        } catch { /* ignore a frame we do not understand */ }
      };

      const fallBack = () => {
        setLive(false);
        socketRef.current = null;
        if (cancelled) return;
        // Keep the page working while we try again, backing off to 30s.
        startPolling();
        retryRef.current += 1;
        const wait = Math.min(30000, 1000 * 2 ** Math.min(retryRef.current, 5));
        setTimeout(connect, wait);
      };

      ws.onclose = fallBack;
      ws.onerror = () => { try { ws.close(); } catch { /* onclose handles it */ } };
    };

    // Poll immediately so something is on screen even if the socket is slow.
    startPolling();
    connect();

    return () => {
      cancelled = true;
      stopPolling();
      try { socketRef.current?.close(); } catch { /* already gone */ }
      socketRef.current = null;
    };
  }, [token]);

  return { location, live };
}

/**
 * Walk the marker from where it is drawn to the newest fix.
 *
 * Porter and Uber do not receive a position every millisecond either — they
 * animate between the fixes they do get. Without this the marker teleports every
 * few seconds, which reads as a broken map rather than a moving scooter.
 */
function useGlidingPosition(target) {
  const [drawn, setDrawn] = useState(target);
  // Where the marker is actually drawn right now. A new fix mid-glide starts
  // from here, not from the fix that glide was heading for, so the marker never
  // jumps backwards to pick up its next leg.
  const drawnRef = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    if (!target) {
      drawnRef.current = null;
      setDrawn(null);
      return undefined;
    }

    const from = drawnRef.current;
    // First fix, or a correction too big to be travel — place it, don't fly it.
    if (!from || haversineKm(from.lat, from.lng, target.lat, target.lng) > SNAP_OVER_KM) {
      drawnRef.current = target;
      setDrawn(target);
      return undefined;
    }

    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / GLIDE_MS);
      const next = {
        lat: from.lat + (target.lat - from.lat) * t,
        lng: from.lng + (target.lng - from.lng) * t,
      };
      drawnRef.current = next;
      setDrawn(next);
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target?.lat, target?.lng]);

  return drawn;
}

/**
 * LiveTrackingMap — customer pin + live delivery person pin
 * @param {string}  token        - tracking token (used to subscribe to live location)
 * @param {number}  customerLat  - customer's GPS lat (from order, may be null)
 * @param {number}  customerLng  - customer's GPS lng (from order, may be null)
 */
export default function LiveTrackingMap({ token, customerLat, customerLng }) {
  const { location, live } = useRiderLocation(token);
  const drawn = useGlidingPosition(location ? { lat: location.lat, lng: location.lng } : null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [userMoved, setUserMoved] = useState(false);
  // Re-render once a second so "updated 12s ago" actually counts up.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hasCustomer = customerLat != null && customerLng != null;
  const hasDelivery = drawn != null;
  const quiet = location ? Date.now() - location.updatedAt > QUIET_AFTER_MS : false;

  // Distance and ETA. The rider's own speed when the phone reports it, his
  // recent speed when it does not, and a city average when neither is usable —
  // never a number pulled out of nowhere.
  const eta = useMemo(() => {
    if (!hasDelivery || !hasCustomer) return null;
    const km = haversineKm(drawn.lat, drawn.lng, customerLat, customerLng) * ROAD_FACTOR;
    const reported = location?.speed != null ? location.speed * 3.6 : null;
    const speed = Math.min(
      MAX_SPEED_KMH,
      Math.max(MIN_SPEED_KMH, reported && reported > MIN_SPEED_KMH ? reported : DEFAULT_SPEED_KMH)
    );
    return { km, minutes: Math.max(1, Math.round((km / speed) * 60)) };
  }, [hasDelivery, hasCustomer, drawn?.lat, drawn?.lng, customerLat, customerLng, location?.speed]);

  const handleUserMoved = useCallback(() => setUserMoved(true), []);

  // Need at least one point to render a map
  if (!hasCustomer && !hasDelivery) {
    return (
      <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-4 text-center">
        <p className="text-neutral-500 text-sm">Waiting for delivery person's location...</p>
      </div>
    );
  }

  const center = hasDelivery ? [drawn.lat, drawn.lng] : [customerLat, customerLng];

  const fitPoints = [
    ...(hasDelivery ? [[drawn.lat, drawn.lng]] : []),
    ...(hasCustomer ? [[customerLat, customerLng]] : []),
  ];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <p className="text-neutral-400 text-xs font-medium">
          Live Tracking
          {live && !quiet && (
            <span className="ml-2 inline-flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              live
            </span>
          )}
        </p>

        {location && !quiet && (
          <p className="text-neutral-500 text-xs">Updated {timeSince(location.updatedAt)}</p>
        )}
        {location && quiet && (
          // Say what is actually happening. A frozen dot with a confident label
          // is worse than no dot: the rider's phone has simply stopped reporting,
          // usually because the screen went off.
          <p className="text-amber-500 text-xs">
            Rider's phone stopped updating · last seen {timeSince(location.updatedAt)}
          </p>
        )}
        {!location && (
          <p className="text-amber-500 text-xs">Waiting for delivery person...</p>
        )}
      </div>

      {eta && !quiet && (
        <p className="text-sm text-neutral-200 mb-2">
          <span className="font-semibold text-orange-400">≈ {eta.minutes} min away</span>
          <span className="text-neutral-500"> · {eta.km.toFixed(1)} km by road</span>
        </p>
      )}

      <div className="relative rounded-xl overflow-hidden border border-neutral-700" style={{ height: 260 }}>
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
          <FitBounds points={fitPoints} recenterKey={recenterKey} onUserMoved={handleUserMoved} />

          {hasCustomer && (
            <Marker position={[customerLat, customerLng]} icon={customerIcon}>
              <Popup>Your location</Popup>
            </Marker>
          )}

          {hasDelivery && (
            <Marker position={[drawn.lat, drawn.lng]} icon={deliveryIcon}>
              <Popup>Delivery person</Popup>
            </Marker>
          )}
        </MapContainer>

        {userMoved && fitPoints.length > 0 && (
          <button
            type="button"
            onClick={() => { setRecenterKey((n) => n + 1); setUserMoved(false); }}
            className="absolute bottom-3 right-3 z-[1000] px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-neutral-600 text-xs text-neutral-100 shadow-lg"
          >
            Recentre
          </button>
        )}
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
