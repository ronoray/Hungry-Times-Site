// utils/geo.js — shared geocoding helpers (Google first, OpenStreetMap fallback)

export const RESTAURANT_LOCATION = {
  latitude: 22.506243716455923,
  longitude: 88.36730591294373,
};

// Strip unit-level noise (flat/floor/apartment/room/block, newlines) from a
// free-text address so the geocoder gets a resolvable street+locality. Detailed
// multiline Indian addresses like "56, Dhakuria Station Road,\n2nd Floor,\nKolkata
// 700 031" fail both providers verbatim → null coords → wrong delivery fee
// (a ≤2km free address was floored to ₹70, order #234). Mirrors the server's
// simplifyAddress in server/whatsapp/geocoder.js — keep the two in sync.
export function simplifyAddress(address) {
  return String(address || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s && !/\b(flat|floor|fl|apt|apartment|room|unit|block|no\.?\s*\d|\d+(st|nd|rd|th)\s*floor)\b/i.test(s))
    .join(', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalise the locality tail so the city appears exactly once, unadorned.
// Blindly appending ', Kolkata, India' to an address that already ended in a
// locality+pincode produced "33, South End Park, Kolkata - 29, Kolkata, India",
// which Nominatim answers NULL for — while "33, South End Park, Kolkata, India"
// resolves fine. Mirrors normalizeLocalityTail in server/whatsapp/geocoder.js —
// keep the two in sync.
export function normalizeLocalityTail(address) {
  return String(address || '')
    .replace(/\bkolkata\b\s*[-–—]?\s*\d{2,3}(\s*\d{3})?\b/gi, 'Kolkata')
    .replace(/\b7\d{2}\s?\d{3}\b/g, '')
    .replace(/\s*,\s*(?=,)/g, '')
    .replace(/\s*,\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dropHouseNumber(address) {
  return String(address || '').replace(/^[^,]*\d[^,]*,\s*/, '').trim();
}

function withCityContext(query) {
  return /\bkolkata\b/i.test(query) ? `${query}, India` : `${query}, Kolkata, India`;
}

// Ordered, de-duplicated query forms, broadest fidelity first. Mirrors
// buildGeocodeCandidates in server/whatsapp/geocoder.js — keep the two in sync.
export function buildGeocodeCandidates(address) {
  const clean = String(address || '').replace(/\s+/g, ' ').trim();
  const simple = simplifyAddress(address);

  const raw = [
    clean,
    normalizeLocalityTail(clean),
    simple,
    normalizeLocalityTail(simple),
    dropHouseNumber(normalizeLocalityTail(simple)),
  ];

  const seen = new Set();
  const out = [];
  for (const c of raw) {
    const v = String(c || '').replace(/\s+/g, ' ').trim();
    if (v.length < 5) continue;
    const q = withCityContext(v);
    if (seen.has(q.toLowerCase())) continue;
    seen.add(q.toLowerCase());
    out.push(q);
  }
  return out;
}

async function geocodeOnce(query) {
  try {
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({
        address: query,
        componentRestrictions: { country: 'IN' },
      });
      if (result.results?.length > 0) {
        const loc = result.results[0].geometry.location;
        return { lat: loc.lat(), lng: loc.lng() };
      }
    }
  } catch { /* fall through to OSM */ }
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`,
      { headers: { 'User-Agent': 'HungryTimes/1.0 (ronoray@gmail.com)' } }
    );
    const data = await resp.json();
    if (data.length > 0 && data[0].lat && data[0].lon) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* ignore */ }
  return null;
}

// Resolve coordinates for a free-text address. Returns { lat, lng } or null.
// Last-resort only: checkout asks the server first (POST /addresses/:id/resolve),
// which has the API key and persists what it finds. This runs when that call
// itself fails. Walks the same candidate ladder as the server.
export async function geocodeFreeAddress(fullAddress) {
  if (!fullAddress) return null;
  for (const query of buildGeocodeCandidates(fullAddress)) {
    const hit = await geocodeOnce(query);
    if (hit) return hit;
  }
  return null;
}

// Reverse-geocode GPS coords → a human address. Google → OSM → coord label.
export async function reverseGeocode(lat, lng) {
  try {
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      if (result.results?.length > 0) return result.results[0].formatted_address;
    }
  } catch { /* fall through to OSM */ }
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'HungryTimes/1.0 (ronoray@gmail.com)' } }
    );
    const data = await resp.json();
    if (data?.display_name) return data.display_name;
  } catch { /* ignore */ }
  return `Pinned location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}
