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
    const encoded = encodeURIComponent(query + ', Kolkata, India');
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`,
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
// Used so a typed address still gets a pin without forcing the customer to
// pick from Google's autocomplete dropdown. Tries the address as typed, then
// a simplified form (flat/floor lines dropped) that recovers messy multiline
// addresses both providers reject verbatim.
export async function geocodeFreeAddress(fullAddress) {
  if (!fullAddress) return null;
  const asTyped = String(fullAddress).replace(/\s+/g, ' ').trim();
  const full = await geocodeOnce(asTyped);
  if (full) return full;
  const simple = simplifyAddress(fullAddress);
  if (simple && simple.length >= 5 && simple !== asTyped) {
    const retry = await geocodeOnce(simple);
    if (retry) return retry;
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
