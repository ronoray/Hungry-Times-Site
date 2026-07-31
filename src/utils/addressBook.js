// src/utils/addressBook.js
//
// Also holds the one copy of the address-book HTTP calls. Profile.jsx and
// Order.jsx each carried their own hand-rolled fetch for list/create/update/
// delete/set-default, which is how they drifted apart in the first place — same
// endpoints, different error handling, and two different names for the same
// legacy row. The pages keep their own state and their own UX (toasts here,
// inline banners there); only the wire calls are shared.
// Shared rules for a customer's saved addresses.
//
// These used to be three different answers to the same question. The website
// went by isDefault and pre-selected NOTHING when no address carried the flag —
// a customer with two unflagged addresses reached "Please select a delivery
// address" on a full address book. The WhatsApp bot went by whatever address was
// on the most recent order, read off online_orders rather than the address book.
// The POS went by isDefault, then whichever row came back first.
//
// One rule now, everywhere: default → most recently ordered to → newest.

import API_BASE from '../config/api.js';

export const LEGACY_ADDRESS_ID = 'legacy';

// ── HTTP ────────────────────────────────────────────────────────────────────

const authToken = (token) => token || localStorage.getItem('customerToken');

/**
 * One request shape for every address call.
 * Throws an Error carrying the server's own message so each page can surface it
 * however it likes — a toast at checkout, an inline banner on the profile.
 */
async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}/customer/addresses${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${authToken(token)}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    // A failed call does not always carry JSON (502s, HTML error pages).
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

/** @returns {Promise<Array>} the customer's saved addresses, server-ordered. */
export async function listAddresses(token) {
  const data = await request('', { token });
  return data.addresses || [];
}

export const createAddress = (body, token) => request('', { method: 'POST', body, token });

export const updateAddress = (id, body, token) =>
  request(`/${id}`, { method: 'PUT', body, token });

export const deleteAddress = (id, token) => request(`/${id}`, { method: 'DELETE', token });

export const setDefaultAddress = (id, token) =>
  request(`/${id}/default`, { method: 'PATCH', token });

/** Ask the server to geocode a saved address that has no pin. Never throws. */
export async function resolveAddressPin(id, token) {
  try {
    return await request(`/${id}/resolve`, { method: 'POST', token });
  } catch {
    return { resolved: false, latitude: null, longitude: null };
  }
}

/**
 * Label used for the synthetic row we fabricate from the legacy
 * customers.address column when the address book is empty.
 *
 * Profile called it "Primary Address" and checkout called it "My Address" for
 * the same underlying row, so the customer saw their address renamed depending
 * on which page they opened. "My Address" wins because that is what the
 * registration path (server/routes/auth.js) writes when it creates the real row.
 */
export const LEGACY_ADDRESS_LABEL = 'My Address';

/** Build the synthetic address row from legacy customer fields, or null. */
export function legacyAddressFrom(customer) {
  if (!customer?.address) return null;
  return {
    id: LEGACY_ADDRESS_ID,
    name: LEGACY_ADDRESS_LABEL,
    fullAddress: customer.address,
    latitude: customer.latitude ?? null,
    longitude: customer.longitude ?? null,
    isDefault: true,
    isLegacy: true,
  };
}

/** Newest-first comparator that tolerates missing/garbage timestamps. */
function newerFirst(a, b) {
  const t = (v) => {
    const ms = Date.parse(v ?? '');
    return Number.isNaN(ms) ? 0 : ms;
  };
  return t(b) - t(a);
}

/**
 * The one address to offer first.
 *
 * @param {Array} addresses
 * @returns {object|null} null only when the list is empty
 */
export function pickPreferredAddress(addresses) {
  const list = Array.isArray(addresses) ? addresses.filter(Boolean) : [];
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];

  const flagged = list.find((a) => a.isDefault || a.is_default === 1);
  if (flagged) return flagged;

  // No default set. Prefer the address the customer has most recently ordered
  // to; lastUsedAt is null for every address that predates the tracking, in
  // which case this falls through to createdAt.
  const used = list.filter((a) => a.lastUsedAt);
  if (used.length > 0) {
    return [...used].sort((a, b) => newerFirst(a.lastUsedAt, b.lastUsedAt))[0];
  }

  return [...list].sort((a, b) => newerFirst(a.createdAt, b.createdAt))[0];
}
