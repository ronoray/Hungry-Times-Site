// utils/geo.js — shared geocoding helpers (Google first, OpenStreetMap fallback)

export const RESTAURANT_LOCATION = {
  latitude: 22.506243716455923,
  longitude: 88.36730591294373,
};

// Resolve coordinates for a free-text address. Returns { lat, lng } or null.
// Used so a typed address still gets a pin without forcing the customer to
// pick from Google's autocomplete dropdown.
export async function geocodeFreeAddress(fullAddress) {
  if (!fullAddress) return null;
  try {
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({
        address: fullAddress,
        componentRestrictions: { country: 'IN' },
      });
      if (result.results?.length > 0) {
        const loc = result.results[0].geometry.location;
        return { lat: loc.lat(), lng: loc.lng() };
      }
    }
  } catch { /* fall through to OSM */ }
  try {
    const encoded = encodeURIComponent(fullAddress + ', Kolkata, India');
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
