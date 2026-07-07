// components/PinConfirmMap.jsx — draggable delivery-pin confirmation map.
// OSM tiles via react-leaflet (already used by LiveTrackingMap) — no Google cost.
// Customer can drag the pin or tap the map to set their exact location.
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RESTAURANT_LOCATION } from '../utils/geo';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:34px;height:44px;">
    <svg viewBox="0 0 24 24" width="34" height="44" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
      <path fill="#f97316" stroke="#fff" stroke-width="1.2"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.8" fill="#fff"/>
    </svg>
  </div>`,
  iconSize: [34, 44],
  iconAnchor: [17, 42],
});

function MapController({ lat, lng }) {
  const map = useMap();
  const last = useRef(null);
  useEffect(() => {
    const key = `${lat},${lng}`;
    if (lat != null && lng != null && last.current !== key) {
      last.current = key;
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
    }
  }, [lat, lng, map]);
  return null;
}

function TapToSet({ onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * PinConfirmMap
 * @param {number|null} lat - current pin latitude (null = no pin yet)
 * @param {number|null} lng - current pin longitude
 * @param {function} onChange - (lat, lng) called when customer drags pin or taps map
 * @param {string} hint - optional helper text under the map
 */
export default function PinConfirmMap({ lat, lng, onChange, hint }) {
  const hasPin = lat != null && lng != null;
  const center = hasPin
    ? [lat, lng]
    : [RESTAURANT_LOCATION.latitude, RESTAURANT_LOCATION.longitude];

  return (
    <div className="space-y-1.5">
      <div className="rounded-xl overflow-hidden border border-neutral-700" style={{ height: 220 }}>
        <MapContainer
          center={center}
          zoom={hasPin ? 16 : 14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController lat={lat} lng={lng} />
          <TapToSet onChange={onChange} />
          {hasPin && (
            <Marker
              position={[lat, lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  onChange(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-neutral-400">
        {hint || (hasPin
          ? '📍 Drag the pin (or tap the map) to your exact building — helps our rider find you.'
          : '📍 Tap the map to drop your delivery pin.')}
      </p>
    </div>
  );
}
