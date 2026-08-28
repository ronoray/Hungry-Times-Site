// site/src/pages/Order.jsx - COMPLETE WITH OFFERS SYSTEM
// ✅ Smart address selection (auto-select single, choose from multiple)
// ✅ Add new address during checkout
// ✅ Customer instructions field
// ✅ Redirect to order details after successful payment
// ✅ Active offers system with automatic discount application
// ✅ Persistent banner showing active offers

import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import AddToCartModal from "../components/AddToCartModal";
import CartDrawer from "../components/CartDrawer";
import GoogleMapsAutocomplete from "../components/GoogleMapsAutocomplete";
import PinConfirmMap from "../components/PinConfirmMap";
import { loadRazorpay } from "../utils/scriptLoaders";
import AuthModal from "../components/AuthModal";
import { ShoppingCart, MapPin, MessageSquare, Loader, Plus, Check, Edit2, Trash2, X, AlertCircle, Minus, Truck, UtensilsCrossed } from "lucide-react";
import { useToast } from "../components/Toast";
import OffersPanel from "../components/OffersPanel";
import { trackBeginCheckout, trackPurchase } from "../utils/analytics";

import './Order.css';
import API_BASE from '../config/api.js';
import { visibleAddons, lineUnitPrice, isPackagingAddon } from '../utils/cartLine';
import { useNoStackItems, cartHasNoStack } from '../hooks/useNoStackItems';
import { useFulfilmentRules, cartFulfilmentBlock } from '../hooks/useFulfilmentRules';
import {
  pickPreferredAddress,
  legacyAddressFrom,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../utils/addressBook';
import AddressLabelPicker from '../components/AddressLabelPicker';
import { round2, money, toPaise } from '../lib/money';
import { gstIncludedNote } from '../lib/billTotals.js';
import { useOfferFloor } from '../hooks/useOfferFloor';

// Offers & loyalty points require an order subtotal ≥ the server's
// `min_order_for_offer` floor. Item-restricted combos are exempt (deliberate
// sub-floor bundles).
//
// This used to be a hardcoded `const OFFER_MIN_ORDER = 500`. The floor is
// admin-tunable from the ops panel, so a baked copy here meant raising it to
// ₹1000 would still let checkout apply a code on a ₹700 order — which the
// server then refuses — and lowering it would suppress discounts that are
// perfectly valid. The live value now arrives with the offers feed and lives in
// component state (`offerFloor`), which BOTH the totals memo and the JSX can
// read. FALLBACK_MIN_ORDER is only for a failed request; it is never the source
// of truth (see lib/discountRules.js).

// Restaurant location for delivery radius calculation
const RESTAURANT_LOCATION = {
  latitude: 22.506243716455923,
  longitude: 88.36730591294373
};

// Maximum delivery radius in km
const MAX_DELIVERY_RADIUS_KM = 8;

// Fallback delivery charge tiers (used when Borzo estimate unavailable)
function calculateDeliveryCharge(distanceKm) {
  if (distanceKm == null) return 0;
  if (distanceKm <= 2) return 0;
  if (distanceKm <= 4) return 70;
  if (distanceKm <= 6) return 100;
  if (distanceKm <= 8) return 130;
  return -1; // outside service area
}

// Strip unit-level noise (flat/floor/apartment/room/block, newlines) so the
// geocoder gets a resolvable street+locality. Messy multiline addresses like
// "56, Dhakuria Station Road,\n2nd Floor,\nKolkata 700 031" fail both providers
// verbatim → null coords → wrong delivery fee (≤2km free address floored to
// ₹70, order #234). Mirrors server/whatsapp/geocoder.js simplifyAddress.
function simplifyAddress(address) {
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

// Resolve coordinates for a free-text address (Google Geocoder → OpenStreetMap).
// Returns { lat, lng } or null. Used so a typed address still gets a pin without
// forcing the customer to pick from Google's autocomplete dropdown. Tries the
// address as typed, then a simplified form (flat/floor lines dropped).
async function geocodeFreeAddress(fullAddress) {
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

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Order() {

  // Scroll to top when component mounts or cart changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editOrderId = searchParams.get('editOrderId');
  const { isAuthenticated, customer } = useAuth();
  const { lines, clearCart, addLine, removeLine, updateQty, orderMode, updateOrderMode } = useCart();
  const showToast = useToast();

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editOrderData, setEditOrderData] = useState(null);

  // Detect edit mode from URL
  useEffect(() => {
    if (!editOrderId || !isAuthenticated) return;

    const fetchEditOrder = async () => {
      try {
        const token = localStorage.getItem('customerToken');
        const response = await fetch(`${API_BASE}/customer/orders/${editOrderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Order not found');
        const data = await response.json();
        const order = data.order;

        // Verify editable
        if (!['pending', 'confirmed', 'preparing'].includes(order.status) || order.payment_mode !== 'COD') {
          showToast('This order cannot be edited', 'error');
          navigate(`/orders/${editOrderId}`);
          return;
        }

        setIsEditMode(true);
        setEditOrderData(order);
      } catch (err) {
        console.error('Failed to load order for editing:', err);
        showToast('Failed to load order for editing', 'error');
        navigate('/orders');
      }
    };

    fetchEditOrder();
  }, [editOrderId, isAuthenticated]);

  // UI State
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Order type — seeded from CartContext orderMode on mount
  const [orderType, setOrderType] = useState('delivery');
  const isDineIn = orderType === 'dine_in';

  // Sync from CartContext orderMode (set on Home/Menu pages) once on mount
  useEffect(() => {
    if (orderMode === 'dine_in') {
      setOrderType('dine_in');
    } else if (orderMode === 'pickup') {
      setOrderType('pickup');
    } else {
      setOrderType('delivery');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Address State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddressData, setNewAddressData] = useState({
    name: '',
    fullAddress: '',
    latitude: null,
    longitude: null
  });

  // Edit Address State
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editAddressData, setEditAddressData] = useState({
    name: '',
    fullAddress: '',
    latitude: null,
    longitude: null
  });

  // Geocoded coordinates for addresses that have no GPS pin
  // { [addrId]: { lat, lng } | 'pending' | 'failed' }
  const [geocodedCoords, setGeocodedCoords] = useState({});

  // Last-resort pin prompt. Only opens when BOTH the stored pin and the server
  // geocode came up empty — for the overwhelming majority of customers this
  // never appears. `pinSkipped` is the deliberate second-tap escape: we still
  // refuse to strand anyone who genuinely cannot drop a pin.
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinPromptCoords, setPinPromptCoords] = useState(null);
  const [pinPromptSaving, setPinPromptSaving] = useState(false);
  // Refs, not state: the prompt resumes the order handler immediately after the
  // customer acts, and a setState wouldn't have landed by the time the handler
  // re-runs validateDeliveryArea.
  const pinSkippedRef = useRef(false);
  const pinResumeRef = useRef(null);

  // Borzo live delivery quote: { charge: number|null, loading: bool }
  // Cache keyed by addressId so we don't re-fetch on every render
  const [borzoQuote, setBorzoQuote] = useState({ charge: null, loading: false });
  const borzoQuoteCache = useState({})[0]; // stable cache ref
  const [useBorzoDelivery, setUseBorzoDelivery] = useState(false);

  // Form State
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Scheduled order state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  // Surface errors loudly — scroll the message into view so a failed "Place Order"
  // is never silent (customers were retrying because nothing visibly happened).
  const paymentErrorRef = useRef(null);
  useEffect(() => {
    if (paymentError && paymentErrorRef.current) {
      paymentErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [paymentError]);

  // Razorpay redirect mode bounces a failed or cancelled payment back here as
  // /order?payment=failed. Without this the customer returns to a checkout page
  // that looks untouched and has no idea the payment did not go through.
  // Strip the param so a later reload does not resurrect the banner.
  useEffect(() => {
    if (searchParams.get('payment') !== 'failed') return;
    setPaymentError('Payment was not completed. No charges were made — please try again.');
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }, []);

  // Loyalty Points State
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const loyaltyPoints = customer?.loyaltyPoints || 0;

  // ============================================================================
  // FETCH ADDRESSES ON LOAD
  // ============================================================================
  // Refetch addresses when auth state changes OR when customer profile updates (e.g. after registration)
  useEffect(() => {
    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isAuthenticated, customer?.id, customer?.address]);

  // ============================================================================
  // FETCH BORZO DELIVERY ESTIMATE WHEN ADDRESS CHANGES
  // ============================================================================
  useEffect(() => {
    setUseBorzoDelivery(false);
    if (orderType !== 'delivery' || !selectedAddressId) {
      setBorzoQuote({ charge: null, loading: false });
      return;
    }
    const addr = addresses.find(a => a.id === selectedAddressId);
    if (!addr || !addr.fullAddress) return;

    // Use cached result if available
    if (borzoQuoteCache[selectedAddressId] != null) {
      setBorzoQuote({ charge: borzoQuoteCache[selectedAddressId], loading: false });
      return;
    }

    const lat = addr.latitude || geocodedCoords[selectedAddressId]?.lat || null;
    const lng = addr.longitude || geocodedCoords[selectedAddressId]?.lng || null;

    setBorzoQuote({ charge: null, loading: true });
    const token = localStorage.getItem('customerToken');
    fetch(`${API_BASE}/customer/delivery/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ address: addr.fullAddress, lat, lng }),
    })
      .then(r => r.json())
      .then(data => {
        const charge = data.deliveryCharge != null ? data.deliveryCharge : null;
        borzoQuoteCache[selectedAddressId] = charge;
        setBorzoQuote({ charge, loading: false });
      })
      .catch(() => {
        setBorzoQuote({ charge: null, loading: false });
      });
  }, [selectedAddressId, orderType, addresses, geocodedCoords]);

  // ============================================================================
  // FETCH ACTIVE OFFERS ON LOAD
  // ============================================================================

  // Active Offers State
  const [activeOffers, setActiveOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);

  // The server's minimum-order floor for offers and loyalty. Component scope so
  // the totals memo and the JSX both read the same value — the memo lists it as
  // a dependency, or a floor arriving after the first render would leave the
  // totals priced against the fallback.
  //
  // Fetched WITHOUT a phone on purpose: fetchActiveOffers below returns early
  // for a signed-out visitor, and a guest checkout still has to price against
  // the real floor.
  const offerFloor = useOfferFloor();

  // Apply Code State
  const [codeExpanded, setCodeExpanded] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [appliedCode, setAppliedCode] = useState(null); // { code, type, ... }

  useEffect(() => {
    fetchActiveOffers();
  }, [isAuthenticated, customer?.phone]);

  const fetchActiveOffers = async () => {
    if (!isAuthenticated || !customer?.phone) {
      setActiveOffers([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/offers/active?phone=${customer.phone}`);
      if (!response.ok) throw new Error('Failed to fetch offers');

      const data = await response.json();
      const offers = data.offers || [];

      setActiveOffers(offers);

      const autoOffer = offers.find(o => o.apply_automatically);
      if (autoOffer) {
        setAppliedOffer(autoOffer);
      }
    } catch (err) {
      console.error('[Order] Error fetching offers:', err);
    }
  };

  // ============================================================================
  // APPLY CODE HANDLER
  // ============================================================================
  const handleApplyCode = async (codeArg, opts = {}) => {
    const code = (typeof codeArg === 'string' ? codeArg : codeInput).trim();
    if (!code) return;
    const silent = !!opts.silent;

    setCodeValidating(true);
    setCodeError('');
    try {
      // Send the cart so the server can enforce item-restricted offers (e.g. COMBO50)
      const cartItemsPayload = lines.map(l => ({
        itemId: l.itemId,
        basePrice: l.basePrice,
        variants: l.variants || [],
        addons: l.addons || [],
        quantity: l.qty || 1,
      }));
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);
      const response = await fetch(`${API_BASE}/offers/validate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code, customerPhone: customer?.phone, channel: 'web', orderValue: cartTotal, items: cartItemsPayload,
          deliveryAddress: orderType === 'delivery' ? (selectedAddr?.fullAddress || null) : null,
        }),
      });
      const data = await response.json();

      if (data.valid) {
        // Override any auto-applied or panel offer with the code-based offer
        setAppliedCode(data);
        setAppliedOffer({
          id: data.offer_id || null,
          title: data.title,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          max_discount: data.max_discount,
          min_order_value: data.min_order_value,
          applicable_item_ids: data.applicable_item_ids || null,
        });
        setPointsToRedeem(0);
        setSelectedOfferSource('code');
        setCodeExpanded(false);
        showToast(`Code "${code}" applied!`, 'success');
      } else if (!silent) {
        setCodeError(data.error || 'Invalid code');
      }
    } catch {
      if (!silent) setCodeError('Failed to validate code');
    } finally {
      setCodeValidating(false);
    }
  };

  // Track where the current offer came from: 'auto' | 'panel' | 'code'
  const [selectedOfferSource, setSelectedOfferSource] = useState('auto');

  // ── Auto-apply ?promo= (or the combo landing page's stored code) once cart is ready ──
  const autoPromoTried = useRef(false);

  // Drops the stored landing-page promo so the auto-apply effect cannot bring
  // back a code the customer has removed. Called from every remove path.
  const forgetStoredPromo = () => {
    autoPromoTried.current = true;
    try { sessionStorage.removeItem('ht_promo'); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (autoPromoTried.current) return;
    if (!lines.length) return;                 // wait for cart to load
    if (appliedCode) { autoPromoTried.current = true; return; } // user already chose an offer
    let promo = null;
    try {
      promo = new URLSearchParams(window.location.search).get('promo')
        || sessionStorage.getItem('ht_promo');
    } catch { /* ignore */ }
    if (!promo) return;
    autoPromoTried.current = true;
    setCodeInput(promo);
    // silent: if the cart has no qualifying item yet, just prefill — no error toast
    handleApplyCode(promo, { silent: true });
  }, [lines, appliedCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemoveCode = () => {
    // Removing must be permanent for this session. `ht_promo` is what the
    // auto-apply effect reads, so leaving it behind meant the code the customer
    // just removed came back on the next visit to checkout — the "it applies
    // itself" complaint. Mark the effect as spent too, for this mount.
    forgetStoredPromo();
    setAppliedCode(null);
    setCodeInput('');
    setCodeError('');
    setSelectedOfferSource('auto');
    // Re-apply auto offer if available
    const autoOffer = activeOffers.find(o => o.apply_automatically);
    setAppliedOffer(autoOffer || null);
  };

  // Panel offer handlers
  const handlePanelApplyOffer = (offer) => {
    setAppliedCode({ code: offer.code, type: offer.source });
    setAppliedOffer({
      id: offer.offer_id || null,
      title: offer.title,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value,
      max_discount: offer.max_discount,
      min_order_value: offer.min_order_value,
      applicable_item_ids: offer.applicable_item_ids || null,
    });
    setPointsToRedeem(0);
    setSelectedOfferSource('panel');
    setCodeExpanded(false);
    setCodeError('');
  };

  const handleUsePoints = () => {
    setPointsToRedeem(Math.min(loyaltyPoints, maxRedeemablePoints));
    setAppliedCode(null);
    setAppliedOffer(null);
    setCodeInput('');
    setCodeError('');
    setSelectedOfferSource('auto');
  };

  const handlePanelRemoveOffer = () => {
    forgetStoredPromo();
    setAppliedCode(null);
    setSelectedOfferSource('auto');
    // Restore auto-apply if available
    const autoOffer = activeOffers.find(o => o.apply_automatically);
    setAppliedOffer(autoOffer || null);
  };

  const fetchAddresses = async () => {
    try {
      const token = localStorage.getItem("customerToken");
      const response = await fetch(`${API_BASE}/customer/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch addresses");

      const data = await response.json();
      let fetchedAddresses = data.addresses || [];
      
      // ✅ LEGACY FALLBACK: If customer_addresses is empty but customer has legacy address
      if (fetchedAddresses.length === 0 && customer?.address && customer?.latitude && customer?.longitude) {
        console.log('[Order] No addresses in customer_addresses table, using legacy address from customer profile');

        // Shared builder — Profile used to label this same row "Primary Address"
        // while checkout called it "My Address", so the customer saw their
        // address renamed depending on which page they opened.
        const legacy = legacyAddressFrom(customer);
        if (legacy) fetchedAddresses = [legacy];
      }
      
      setAddresses(fetchedAddresses);

      // Pre-select an address. This used to give up when a customer had 2+
      // addresses and none was flagged default — nothing was selected, and the
      // customer hit "Please select a delivery address" on a populated address
      // book with no indication of what was wrong. Fall through the shared
      // precedence rule instead: default, else most recently ordered to, else
      // newest. There is always an answer when the book is not empty.
      if (fetchedAddresses.length > 0) {
        setSelectedAddressId(pickPreferredAddress(fetchedAddresses).id);
      }
    } catch (error) {
      console.error("[Order] Error fetching addresses:", error);
    }
  };

  // ============================================================================
  // GEOCODE UNPINNED ADDRESSES (Nominatim fallback for old customers)
  // ============================================================================
  // Ask the SERVER to resolve a pinless address, not the browser.
  //
  // The old browser-side path (Google JS Geocoder → Nominatim) was a dice roll:
  // browsers strip the custom User-Agent Nominatim wants and it throttles
  // anonymous callers, so the same address resolved on one attempt and failed on
  // the next — order #241 got coords, #242/#243 six minutes later did not. And a
  // success only lived in this state object, so it was re-rolled next visit.
  //
  // The server has the Google key, no CORS, no stripped headers, and it PERSISTS
  // the result onto the address. Browser geocoding stays only as a last resort
  // for when the API call itself fails.
  const geocodeAddress = async (addrId, fullAddress) => {
    if (!fullAddress) return;
    setGeocodedCoords(prev => ({ ...prev, [addrId]: 'pending' }));

    try {
      const token = localStorage.getItem('customerToken');
      const res = await fetch(`${API_BASE}/customer/addresses/${addrId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();

      if (data?.resolved && data.latitude != null && data.longitude != null) {
        setGeocodedCoords(prev => ({
          ...prev,
          [addrId]: { lat: data.latitude, lng: data.longitude },
        }));
        // The server persisted it — mirror that locally so the pin shows on the
        // address card immediately, without a refetch.
        setAddresses(prev => prev.map(a =>
          a.id === addrId ? { ...a, latitude: data.latitude, longitude: data.longitude } : a
        ));
        return;
      }
    } catch {
      /* server unreachable — fall through to the browser attempt */
    }

    // Last resort: try in the browser. Tries the address as typed, then a
    // simplified form (flat/floor/newlines stripped) for messy multiline
    // addresses — otherwise a ≤2km free address gets floored to ₹70 (order #234).
    try {
      const coords = await geocodeFreeAddress(fullAddress);
      setGeocodedCoords(prev => ({
        ...prev,
        [addrId]: coords ? { lat: coords.lat, lng: coords.lng } : 'failed',
      }));
    } catch {
      setGeocodedCoords(prev => ({ ...prev, [addrId]: 'failed' }));
    }
  };

  // Trigger geocoding when a pinless address is selected
  useEffect(() => {
    // "I'll confirm on the call" was accepted for ONE address — switching to a
    // different one must ask again rather than silently inheriting the skip.
    pinSkippedRef.current = false;
    if (!selectedAddressId) return;
    const addr = addresses.find(a => a.id === selectedAddressId);
    if (!addr || addr.latitude || addr.longitude) return; // has coords — no need
    if (geocodedCoords[selectedAddressId]) return; // already done or in progress
    geocodeAddress(selectedAddressId, addr.fullAddress);
  }, [selectedAddressId, addresses]);

  // ============================================================================
  // LAST-RESORT PIN PROMPT
  // ============================================================================
  // Reached only when the stored pin, the save-time geocode AND the checkout
  // geocode all came up empty. One drag (or one "use my location" tap) fixes the
  // address permanently — the coords are saved onto it, so this never asks twice.
  const handlePinPromptConfirm = async () => {
    if (!pinPromptCoords || !selectedAddressId) return;
    setPinPromptSaving(true);
    try {
      const token = localStorage.getItem('customerToken');
      const res = await fetch(`${API_BASE}/customer/addresses/${selectedAddressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          latitude: pinPromptCoords.lat,
          longitude: pinPromptCoords.lng,
        }),
      });
      if (!res.ok) throw new Error('Could not save your pin');

      // Reflect it locally so the fee recomputes without a refetch.
      setAddresses(prev => prev.map(a =>
        a.id === selectedAddressId
          ? { ...a, latitude: pinPromptCoords.lat, longitude: pinPromptCoords.lng }
          : a
      ));
      setGeocodedCoords(prev => ({
        ...prev,
        [selectedAddressId]: { lat: pinPromptCoords.lat, lng: pinPromptCoords.lng },
      }));

      setPinPromptOpen(false);
      showToast('Location saved — thanks!', 'success');
      // Carry straight on with the order the customer was already placing.
      const resume = pinResumeRef.current;
      pinResumeRef.current = null;
      if (resume) setTimeout(() => resume(), 0);
    } catch (err) {
      showToast(err.message || 'Could not save your pin', 'error');
    } finally {
      setPinPromptSaving(false);
    }
  };

  // The deliberate second tap. We never hard-block an order on a pin — but the
  // order goes through flagged, and ops sees "no map pin" before dispatch.
  const handlePinPromptSkip = () => {
    pinSkippedRef.current = true;
    setPinPromptOpen(false);
    const resume = pinResumeRef.current;
    pinResumeRef.current = null;
    if (resume) setTimeout(() => resume(), 0);
  };

  // ============================================================================
  // ADD NEW ADDRESS
  // ============================================================================
  const handleAddNewAddress = async (e) => {
    e.preventDefault();

    if (!newAddressData.fullAddress?.trim()) {
      showToast("Please enter your delivery address", "warning");
      return;
    }

    // No map pin? Resolve coords from the typed address in the background.
    // If that also fails we still save — staff confirms the area (we're hyperlocal).
    let payload = newAddressData;
    if (!newAddressData.latitude) {
      const coords = await geocodeFreeAddress(newAddressData.fullAddress);
      if (coords) payload = { ...newAddressData, latitude: coords.lat, longitude: coords.lng };
    }

    try {
      const data = await createAddress(payload);

      // Refresh addresses list
      await fetchAddresses();

      // Auto-select the newly added address
      setSelectedAddressId(data.address.id);
      
      // Close form and reset
      setShowAddAddressForm(false);
      setNewAddressData({ name: '', fullAddress: '', latitude: null, longitude: null });
      
      showToast("Address added successfully!", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  // ============================================================================
  // DELETE ADDRESS
  // ============================================================================
  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await deleteAddress(addressId);

      // Refresh addresses list
      await fetchAddresses();
      
      // If deleted address was selected, clear selection
      if (selectedAddressId === addressId) {
        setSelectedAddressId(null);
      }

      showToast('Address deleted', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // ============================================================================
  // START EDITING ADDRESS
  // ============================================================================
  const handleStartEdit = (addr) => {
    setEditingAddressId(addr.id);
    setEditAddressData({
      name: addr.name || '',
      fullAddress: addr.fullAddress,
      latitude: addr.latitude,
      longitude: addr.longitude
    });
  };

  // ============================================================================
  // CANCEL EDITING
  // ============================================================================
  const handleCancelEdit = () => {
    setEditingAddressId(null);
    setEditAddressData({ name: '', fullAddress: '', latitude: null, longitude: null });
  };

  // ============================================================================
  // SAVE EDITED ADDRESS
  // ============================================================================
  const handleSaveEdit = async (addressId) => {
    if (!editAddressData.fullAddress?.trim()) {
      showToast('Please enter your delivery address', 'warning');
      return;
    }

    // No map pin? Resolve coords from the typed address; save regardless if it fails.
    let payload = editAddressData;
    if (!editAddressData.latitude) {
      const coords = await geocodeFreeAddress(editAddressData.fullAddress);
      if (coords) payload = { ...editAddressData, latitude: coords.lat, longitude: coords.lng };
    }

    try {
      await updateAddress(addressId, payload);

      // Refresh addresses list
      await fetchAddresses();

      // Clear edit state
      setEditingAddressId(null);
      setEditAddressData({ name: '', fullAddress: '', latitude: null, longitude: null });

      showToast('Address updated', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // ============================================================================
  // SET DEFAULT ADDRESS
  // ============================================================================
  const handleSetDefault = async (addressId) => {
    try {
      // This used to send PUT to /:id/default. The server only registers PATCH
      // on that path (routes/customerAddressRoutes.js), so setting a default
      // from checkout never worked — it fell through to a 404 and surfaced as
      // "Failed to set default address". The shared helper sends PATCH.
      await setDefaultAddress(addressId);

      // Refresh addresses list
      await fetchAddresses();
      
      showToast('Default address updated', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // ============================================================================
  // GET DELIVERY STATUS FOR ANY ADDRESS
  // ============================================================================
  const getDeliveryStatus = (address) => {
    let lat = address.latitude;
    let lng = address.longitude;

    if (!lat || !lng) {
      const geocoded = geocodedCoords[address.id];
      if (!geocoded || geocoded === 'pending') {
        return { canDeliver: null, distance: null, message: "Checking delivery area..." };
      }
      if (geocoded === 'failed') {
        // Couldn't auto-locate. Never waive delivery: quote the default floor —
        // the pin prompt at checkout replaces this with the real tiered fee as
        // soon as the customer drops a pin (near addresses are usually free).
        return { canDeliver: true, distance: null, deliveryCharge: 70, message: "Delivery: ₹70 — add a map pin for the exact fee" };
      }
      lat = geocoded.lat;
      lng = geocoded.lng;
    }

    const distance = calculateDistance(
      RESTAURANT_LOCATION.latitude,
      RESTAURANT_LOCATION.longitude,
      lat,
      lng
    );

    if (distance > MAX_DELIVERY_RADIUS_KM) {
      return {
        canDeliver: false,
        distance: distance.toFixed(1),
        deliveryCharge: -1,
        message: `Outside delivery area (${distance.toFixed(1)}km away). Please call +91-8420822919`
      };
    }

    const charge = calculateDeliveryCharge(distance);
    return {
      canDeliver: true,
      distance: distance.toFixed(1),
      deliveryCharge: charge,
      message: charge === 0
        ? `Free delivery (${distance.toFixed(1)}km away)`
        : `Delivery: ₹${charge} (${distance.toFixed(1)}km away)`
    };
  };

  // ============================================================================
  // CALCULATE TOTALS WITH DISCOUNT
  // ============================================================================
  // Compute delivery charge for selected address
  const deliveryStatus = useMemo(() => {
    const addr = addresses.find(a => a.id === selectedAddressId);
    if (!addr) return null;
    return getDeliveryStatus(addr);
  }, [addresses, selectedAddressId]);

  // Use Borzo quote only when the customer explicitly opts in; otherwise use tiered distance pricing
  const deliveryCharge = (orderType === 'pickup' || orderType === 'dine_in')
    ? 0
    : (useBorzoDelivery && borzoQuote.charge != null
        ? borzoQuote.charge
        : (deliveryStatus?.deliveryCharge > 0 ? deliveryStatus.deliveryCharge : 0));

  // Fixed-price bundles in the cart. Component scope, not memo-internal — the
  // JSX below reads it, and reaching into a memo's internals is what took
  // checkout down on 2026-07-25.
  const noStackIds = useNoStackItems();
  const hasNoStackItem = useMemo(
    () => cartHasNoStack(lines, noStackIds),
    [lines, noStackIds]
  );

  // Items that can't be packed, and items that can't travel alone. Checked here
  // so the customer learns while they can still fix the cart — the server gate
  // would otherwise reject the whole order at payment, which reads as a crash.
  const fulfilmentRules = useFulfilmentRules();
  // orderType, NOT the cart context's orderMode. This page owns the choice and
  // the customer can change it here, so orderMode is only the seed value — a
  // cart assembled in dine-in mode and then switched to delivery at checkout
  // would otherwise keep dine-in's exemption and sail straight through.
  const fulfilmentBlock = useMemo(
    () => cartFulfilmentBlock(lines, orderType, fulfilmentRules),
    [lines, orderType, fulfilmentRules]
  );

  // Authoritative discount from the server — see the note inside the memo.
  // { promoDiscount, loyaltyDiscount, rejected, autoItemOffers, offerTitle }
  const [serverQuote, setServerQuote] = useState(null);

  const { cartTotal, discountAmount, pointsDiscount, maxRedeemablePoints, gstAmount, gstOnTop, finalTotal, packagingDeduction } = useMemo(() => {
    let total = 0;
    let pkgTotal = 0;
    lines.forEach((line) => {
      const linePkg = (line.addons || [])
        .filter(isPackagingAddon)
        .reduce((s, a) => s + (Number(a.priceDelta) || 0), 0);
      pkgTotal += linePkg * (line.qty || 1);
      const unitPrice =
        (line.basePrice || 0) +
        (line.variants?.reduce((sum, v) => sum + (v.priceDelta || 0), 0) || 0) +
        (line.addons?.reduce((sum, a) => sum + (a.priceDelta || 0), 0) || 0);
      total += unitPrice * (line.qty || 1);
    });
    if (isDineIn) total -= pkgTotal;

  // Item-restricted combos are exempt from the floor (deliberate sub-floor
  // bundles). Manual/staff discounts don't exist here. `offerFloor` is component
  // state and IS in this memo's dependency list — see the note at the top.
  const isComboOffer = !!(appliedOffer && appliedOffer.applicable_item_ids);
  // A fixed-price bundle in the cart forbids EVERY code and all loyalty
  // redemption — the bundle price already carries the saving. Mirrors the
  // server's cartHasNoStackItem guard, which was previously invisible here: the
  // page offered the loyalty slider and showed a discount that the server then
  // silently discarded, charging the customer more than the total they approved.
  // Blocks the isComboOffer floor-exemption too, or an item-restricted code
  // would still slip past.
  //
  // The floor is measured on the PRE-DISCOUNT BILL TOTAL — cart plus delivery —
  // matching computeOrderDiscounts. Menu prices are GST-inclusive on the
  // undiscounted branch, so cart + delivery is exactly the total quoted before
  // anything comes off. Testing the cart alone told a customer looking at a ₹519
  // bill to "add ₹40 more", which is both wrong and impossible to act on once
  // they realise the fee already counted. Delivery lifts an order OVER the floor
  // but is never itself discounted, and never widens the 20% loyalty cap below.
  const floorBasis = total + (Number(deliveryCharge) || 0);
  const offersAllowed = floorBasis >= offerFloor && !hasNoStackItem;

  // Apply offer discount
  let discount = 0;
  if (!hasNoStackItem && appliedOffer && total >= (appliedOffer.min_order_value || 0) && (offersAllowed || isComboOffer)) {
    // Item-restricted offers (e.g. COMBO50): the discount applies to the
    // qualifying items' value only, not the whole cart.
    // applicable_item_ids may arrive as an array (validate-code) or CSV string (offer list).
    const restrictRaw = appliedOffer.applicable_item_ids;
    const restrictIds = Array.isArray(restrictRaw)
      ? restrictRaw
      : (typeof restrictRaw === 'string' && restrictRaw.trim()
          ? restrictRaw.split(',').map(s => s.trim()).filter(Boolean)
          : null);
    let base = total;
    if (restrictIds && restrictIds.length) {
      const allow = new Set(restrictIds.map(String));
      base = lines.reduce((sum, line) => {
        if (!allow.has(String(line.itemId))) return sum;
        const unit =
          (line.basePrice || 0) +
          (line.variants?.reduce((s, v) => s + (v.priceDelta || 0), 0) || 0) +
          (line.addons?.reduce((s, a) => s + (a.priceDelta || 0), 0) || 0);
        return sum + unit * (line.qty || 1);
      }, 0);
    }

    if (appliedOffer.discount_type === 'percent') {
      discount = base * (appliedOffer.discount_value / 100);
    } else {
      discount = Math.min(appliedOffer.discount_value, base);
    }

    // Apply max discount cap if set
    if (appliedOffer.max_discount && discount > appliedOffer.max_discount) {
      discount = appliedOffer.max_discount;
    }
  }

    // ── The server is the authority on the discount ────────────────────────
    // Everything above is a local ESTIMATE, kept only so the page renders
    // instantly and still works if the quote call fails. Once /offers/quote
    // answers, its numbers win outright.
    //
    // This exists because the local rules could not express an item-scoped
    // automatic offer: they applied the ₹500 floor (these offers are exempt),
    // read applicable_item_ids but not applicable_category_ids, chose a single
    // apply_automatically offer when two are live, and knew nothing of the
    // whole-cart suppression. On 28 Aug 2026 a ₹310 Meifoon cart therefore
    // showed a server-issued "20% OFF" badge next to a browser-computed ₹310
    // total. Re-implementing the engine here is what caused that; asking the
    // engine is the fix.
    //
    // quotedDiscount/quotedPoints are null until the first response, so the
    // estimate is what shows for that instant, and null again on failure.
    if (serverQuote) {
      discount = serverQuote.promoDiscount;
    }

    const subtotalAfterDiscount = Math.max(0, total - discount);
    // Points redemption: max 20% of subtotalAfterDiscount, min 50 points.
    // Blocked entirely below the offer floor (matches the server).
    const maxPts = offersAllowed ? Math.min(loyaltyPoints, Math.floor(subtotalAfterDiscount * 0.2)) : 0;
    let pointsDiscount = pointsToRedeem > 0 ? Math.min(pointsToRedeem, maxPts) : 0;
    if (serverQuote) {
      // The server zeroes points on a suppressed cart. Honour that here, or the
      // page offers a slider whose value the order path will silently discard.
      pointsDiscount = serverQuote.loyaltyDiscount;
    }
    const afterPoints = Math.max(0, subtotalAfterDiscount - pointsDiscount);

    // GST: added ON TOP only when a discount applied; otherwise it is already
    // inside the menu price and is merely extracted for accounting, leaving the
    // total unchanged. This branch existed on POS and WhatsApp but never here,
    // so every non-discounted website order showed (and charged) 5% too much.
    // The Mid-Week Combo made it constant: at ₹449 it sits below the ₹500 offer
    // floor, so it can never take a discount and always lands on this path.
    // The delivery charge is part of the taxable supply and sits in the GST base
    // alongside the food — added on top when discounted, already inside the
    // amount charged when not. Mirror of server/utils/gst.js in the ops repo;
    // if these drift the customer approves a total the server won't charge.
    // Rounded to the paise, not the rupee: the server settles on toFixed(2), so
    // Math.round here showed the customer a total that differed from the one
    // charged (₹959 approved vs ₹959.71 billed on a discounted delivery order).
    const hasDiscount = (discount + pointsDiscount) > 0;
    const gstBase = afterPoints + deliveryCharge;
    const gst = hasDiscount
      ? round2(gstBase * 0.05)
      : round2(gstBase - gstBase / 1.05);

    return {
      cartTotal: round2(total),
      discountAmount: round2(discount),
      pointsDiscount,
      maxRedeemablePoints: maxPts,
      gstAmount: gst,
      gstOnTop: hasDiscount,
      // Non-discounted: GST is already inside the price, so it is not added.
      finalTotal: round2(afterPoints + deliveryCharge + (hasDiscount ? gst : 0)),
      packagingDeduction: round2(pkgTotal),
    };
  }, [lines, appliedOffer, deliveryCharge, pointsToRedeem, loyaltyPoints, orderType, hasNoStackItem, offerFloor, serverQuote]);

  // Ask the server to price the cart. Same call order creation makes, so the
  // quoted total and the charged total come from one implementation.
  useEffect(() => {
    if (!lines.length) { setServerQuote(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/offers/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subtotal: cartTotal,
            deliveryFee: deliveryCharge,
            appliedCode: appliedCode?.code || null,
            pointsToRedeem: pointsToRedeem || 0,
            customerPhone: customer?.phone || null,
            items: lines.map((l) => ({
              itemId: l.itemId,
              basePrice: l.basePrice || 0,
              variants: l.variants || [],
              addons: l.addons || [],
              quantity: l.qty || 1,
            })),
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setServerQuote(data);
      } catch {
        // Leave the local estimate in place rather than blocking checkout. The
        // order path recomputes server-side regardless, so a failed quote costs
        // accuracy in the preview, never correctness in the charge.
        if (!cancelled) setServerQuote(null);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [lines, cartTotal, deliveryCharge, appliedCode, pointsToRedeem, customer?.phone]);

  // Component-scope twin of the memo's internal `offersAllowed`, for the JSX.
  // The memo's copy is local to its callback — reaching for it from the render
  // tree is what took checkout down on 2026-07-25.
  // Must stay in step with the memo's version, including the no-stack term and
  // the delivery charge in the basis, or the "add ₹X more" hint appears on a
  // cart whose problem isn't the floor.
  const offerFloorBasis = cartTotal + (Number(deliveryCharge) || 0);
  const offersAllowed = offerFloorBasis >= offerFloor && !hasNoStackItem;

  // The code the ORDER payload may carry — not the same thing as the code the
  // customer typed. computeOrderDiscounts (server) rejects the whole order with
  // a 400 when a code arrives on a cart below the offer floor, so a code that
  // earned nothing here must not be sent: otherwise "no discount below ₹500"
  // silently becomes "you cannot place this order at all", with no way out
  // except emptying the cart. A code that did earn a discount is still sent, so
  // combos (floor-exempt) and normal above-floor orders are unaffected.
  const outboundCode = discountAmount > 0 ? (appliedCode?.code || null) : null;

  // Adding a combo to a cart that already had points or a code selected must
  // clear both. The totals memo ignores them either way, but the payload sends
  // the raw pointsToRedeem state, and leaving a code applied would keep an
  // "Offer Discount" row on screen that the server never honours.
  useEffect(() => {
    if (!hasNoStackItem) return;
    setPointsToRedeem(0);
    setAppliedCode(null);
    setAppliedOffer(null);
    setCodeInput('');
    setCodeError('');
    setCodeExpanded(false);
  }, [hasNoStackItem]);

  const cartCount = lines.reduce((sum, line) => sum + (line.qty || 1), 0);

  // Get selected address object
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);

  // True while Nominatim is resolving coordinates for the selected address
  const geocodingPending = selectedAddressId &&
    selectedAddress && !selectedAddress.latitude && !selectedAddress.longitude &&
    geocodedCoords[selectedAddressId] === 'pending';

  // ============================================================================
  // VALIDATE DELIVERY AREA
  // ============================================================================
  const validateDeliveryArea = () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) return { valid: false, message: "Please select a delivery address" };

    let lat = selectedAddress.latitude;
    let lng = selectedAddress.longitude;

    if (!lat || !lng) {
      const geocoded = geocodedCoords[selectedAddressId];
      if (geocoded === 'pending') {
        return { valid: false, message: "Checking your delivery area, please wait..." };
      }
      if (!geocoded || geocoded === 'failed') {
        // Neither a stored pin nor the server geocode could place this address.
        // Ask for a pin — without one the fee is a guess AND the rider has no map
        // link to find the door. Not a hard block: `pinSkipped` is set by the
        // customer's own second tap on "I'll confirm on the call", which lets the
        // order through flagged as unverified for staff to chase.
        if (pinSkippedRef.current) return { valid: true, unverified: true };
        return {
          valid: false,
          needsPin: true,
          message: "We couldn't locate this address on the map. Drop a pin so your rider finds you.",
        };
      }
      lat = geocoded.lat;
      lng = geocoded.lng;
    }

    const distance = calculateDistance(
      RESTAURANT_LOCATION.latitude,
      RESTAURANT_LOCATION.longitude,
      lat,
      lng
    );

    if (distance > MAX_DELIVERY_RADIUS_KM) {
      return {
        valid: false,
        message: `Sorry, we only deliver within ${MAX_DELIVERY_RADIUS_KM}km radius. Your address is ${distance.toFixed(1)}km away.`
      };
    }

    return { valid: true };
  };

  // ============================================================================
  // RAZORPAY PAYMENT HANDLER
  // ============================================================================
  const handleRazorpayPayment = async () => {
    if (paymentProcessing) return; // guard against re-entry / rapid duplicate submits
    if (orderType === 'dine_in' && (!scheduledDate || !scheduledTime)) {
      setPaymentError("Please select your arrival date and time to continue.");
      return;
    }

    if (orderType === 'delivery') {
      const validation = validateDeliveryArea();
      if (!validation.valid) {
        // Address we simply couldn't place → open the map instead of dead-ending
        // on an error message the customer can do nothing about.
        if (validation.needsPin) {
          pinResumeRef.current = handleRazorpayPayment;
          setPinPromptCoords(null);
          setPinPromptOpen(true);
          return;
        }
        setPaymentError(validation.message);
        return;
      }
      if (!selectedAddressId) {
        setPaymentError("Please select a delivery address");
        return;
      }
    }

    if (lines.length === 0) {
      setPaymentError("Your cart is empty");
      return;
    }

    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      setPaymentError("Please select a date and time for your scheduled order.");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");
    trackBeginCheckout(lines, finalTotal);

    try {
      const token = localStorage.getItem("customerToken");
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);

      // Only delivery needs a saved address; pickup & dine-in don't.
      if (orderType === 'delivery' && !selectedAddr) {
        throw new Error("Please select a delivery address");
      }

      const orderItems = lines.map(line => ({
        itemId: line.itemId,                    // ✅ needed for item-restricted offers (COMBO50)
        itemName: line.itemName || line.name,  // ✅ Add fallback
        quantity: line.qty || 1,
        base_price: line.basePrice || 0,
        basePrice: line.basePrice || 0,  // ✅ Include both formats
        variants: line.variants || [],
        addons: visibleAddons(line, isDineIn),
      }));

      // Ad attribution — UTM campaign from the landing page.
      // The stored `ht_promo` is deliberately NOT used as a fallback applied_code:
      // it is a landing-page hint, not a validated offer, and sending it made the
      // server reject orders for a code the customer had never applied and could
      // not remove from the UI. See `outboundCode`.
      const utm = (() => {
        try { return JSON.parse(sessionStorage.getItem('ht_utm') ?? '{}'); } catch { return {}; }
      })();

      // ✅ STEP 1: INITIATE order (creates Razorpay order only, NO database order yet!)
      console.log('🔄 Step 1: Initiating payment...');

      const response = await fetch(`${API_BASE}/customer/orders/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: orderItems,
          order_type: orderType,
          delivery_address: isDineIn ? 'Dine-in' : orderType === 'pickup' ? 'Pickup' : selectedAddr?.fullAddress,
          delivery_latitude: orderType === 'pickup' ? null : (selectedAddr?.latitude || geocodedCoords[selectedAddressId]?.lat || null),
          delivery_longitude: orderType === 'pickup' ? null : (selectedAddr?.longitude || geocodedCoords[selectedAddressId]?.lng || null),
          // Lets the server pin THIS exact saved address when it resolves coords,
          // instead of guessing which row the address text belongs to.
          delivery_address_id: orderType === 'pickup' ? null : (selectedAddressId || null),
          delivery_instructions: deliveryInstructions,
          discount: discountAmount,
          delivery_charge: deliveryCharge,
          use_borzo: useBorzoDelivery,
          offer_id: appliedOffer?.id || null,
          offer_title: appliedOffer?.title || null,
          applied_code: outboundCode,
          applied_code_type: outboundCode ? (appliedCode?.type || null) : null,
          utm_campaign: utm.campaign || undefined,
          points_to_redeem: pointsToRedeem > 0 ? pointsToRedeem : 0,
          is_scheduled: isDineIn ? true : (isScheduled && scheduledDate && scheduledTime),
          scheduled_date: (isDineIn || isScheduled) ? scheduledDate : null,
          scheduled_time: (isDineIn || isScheduled) ? scheduledTime : null,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = {};
        }

        if (response.status === 401) {
          throw new Error("Authentication failed. Please logout and login again.");
        }

        // 403 = business rejection (ordering hours, ordering disabled) — not a code error
        if (response.status !== 403) {
          console.error("Payment initiate failed:", response.status, errorData);
        }

        throw new Error(errorData.error || "Failed to initiate payment");
      }

      const data = await response.json();
      const { razorpayOrderId, razorpayKey, amount, dbOrderId } = data;

      console.log('✅ Step 1 complete: Razorpay order created:', razorpayOrderId, 'dbOrderId:', dbOrderId);

      // Load Razorpay SDK if not loaded
      await loadRazorpay();

      // ✅ STEP 2: Open Razorpay modal
      console.log('🔄 Step 2: Opening Razorpay...');

      // When the site runs as an installed PWA (standalone WebView), the Razorpay
      // popup + UPI-intent deeplink is blocked by the WebView — checkout hangs on
      // "Processing" and times out (payment_timed_out, no VPA). Use Razorpay
      // redirect mode there: a full-page nav to the hosted page escapes the
      // WebView so the UPI app opens. The server callback confirms + redirects.
      const isStandalone =
        (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;

      const options = {
        key: razorpayKey,
        amount: toPaise(amount),
        currency: "INR",
        name: "Hungry Times",
        description: "Order Payment",
        order_id: razorpayOrderId,
        handler: async function (paymentResponse) {
          // Payment was captured by Razorpay — money has been taken.
          // The order record already exists in the DB (created at /initiate).
          // We now call /verify to confirm it. If the server is briefly restarting
          // (e.g. during a deploy), we retry before giving up.
          console.log('🔄 Step 3: Verifying payment...', paymentResponse.razorpay_payment_id);

          const verifyBody = JSON.stringify({
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpaySignature: paymentResponse.razorpay_signature,
          });

          let result = null;
          let lastError = null;
          const MAX_RETRIES = 4;
          const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000]; // ~30s total wait

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            if (attempt > 0) {
              console.log(`⏳ Verify retry ${attempt}/${MAX_RETRIES - 1} in ${RETRY_DELAYS_MS[attempt - 1] / 1000}s...`);
              await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
            }
            try {
              const verifyResponse = await fetch(`${API_BASE}/customer/orders/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: verifyBody,
              });

              if (verifyResponse.ok) {
                result = await verifyResponse.json();
                break;
              }

              // 4xx = definitive error (bad signature, auth failure), don't retry
              if (verifyResponse.status < 500) {
                const err = await verifyResponse.json().catch(() => ({}));
                throw new Error(err.error || `Verification failed (${verifyResponse.status})`);
              }

              // 5xx = server error, retry
              lastError = new Error(`Server error ${verifyResponse.status}`);
              console.warn('[VERIFY] 5xx on attempt', attempt + 1, '— will retry');

            } catch (fetchErr) {
              // Network error (server restarting) — retry
              lastError = fetchErr;
              // If it's not a network/server error, rethrow immediately
              if (fetchErr.message && !fetchErr.message.includes('5') &&
                  !fetchErr.message.includes('fetch') && !fetchErr.message.includes('network') &&
                  !fetchErr.message.includes('Server error') && !fetchErr.message.includes('Failed to fetch')) {
                throw fetchErr;
              }
              console.warn('[VERIFY] Network error on attempt', attempt + 1, '— will retry:', fetchErr.message);
            }
          }

          if (result) {
            const confirmedOrderId = result.orderId || dbOrderId;
            console.log('✅ Payment verified! Order confirmed:', confirmedOrderId);
            trackPurchase(confirmedOrderId, finalTotal, 'razorpay', lines);
            clearCart();
            // replace, not push: the cart is cleared, so back must not return the
            // customer into a checkout form with nothing in it.
            navigate(`/order-success/${confirmedOrderId}?type=online`, { replace: true });
          } else {
            // All retries exhausted. Money was taken. Order IS in DB (DB-first).
            // Razorpay webhook will confirm it. Do NOT say "payment failed."
            console.error('❌ Verify retries exhausted. Payment captured, order pending webhook confirmation.');
            clearCart();
            // Navigate to orders page — the order will appear once webhook fires
            if (dbOrderId) {
              navigate(`/order-success/${dbOrderId}?type=online&pending=1&pid=${paymentResponse.razorpay_payment_id}`, { replace: true });
            } else {
              setPaymentError(
                `Your payment of ₹${money(finalTotal)} was received. Your order is being confirmed. ` +
                `Check your orders page in a minute. Payment ID: ${paymentResponse.razorpay_payment_id}`
              );
              setTimeout(() => navigate('/orders'), 5000);
              setPaymentProcessing(false);
            }
          }
        },
        prefill: {
          name: customer?.name || "",
          email: customer?.email || "",
          contact: customer?.phone || "",
        },
        theme: {
          color: "#f97316",
        },
        modal: {
          ondismiss: function () {
            console.log('⚠️ Payment cancelled by user');
            // Cancel the pending order so it doesn't linger in the customer's order history
            if (dbOrderId) {
              fetch(`${API_BASE}/customer/orders/${dbOrderId}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => {}); // fire-and-forget
            }
            setPaymentProcessing(false);
            setPaymentError("Payment cancelled. No charges were made.");
          },
        },
      };

      // In a standalone PWA, switch to redirect mode. The JS handler/ondismiss
      // below will NOT fire (page navigates away); the server callback confirms
      // the order and 302s to /order-success. Non-standalone keeps the popup.
      if (isStandalone) {
        options.redirect = true;
        // Same origin the customer is already on — the apex 301s to
        // home.hungrytimes.in, so a hard-coded apex URL sent the PWA out of its
        // own scope on the way back and dropped the customer into a browser tab.
        options.callback_url = `${window.location.origin}/api/customer/payments/razorpay/callback`;
        console.log('🔄 Standalone PWA detected — using Razorpay redirect mode');
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (error) {
      // Don't log business rejections (ordering hours, disabled) as errors
      const isBusinessRejection = error.message.includes('12:00 PM') ||
        error.message.includes('currently unavailable') ||
        error.message.includes('online orders');
      if (!isBusinessRejection) {
        console.error('Payment error:', error);
      }
      setPaymentError(error.message);
      setPaymentProcessing(false);
    }
  };

  // ============================================================================
  // COD PAYMENT HANDLER
  // ============================================================================
  const handleCODPayment = async () => {
    if (paymentProcessing) return; // guard against re-entry / rapid duplicate submits
    if (orderType === 'dine_in' && (!scheduledDate || !scheduledTime)) {
      setPaymentError("Please select your arrival date and time to continue.");
      return;
    }

    if (orderType === 'delivery') {
      const validation = validateDeliveryArea();
      if (!validation.valid) {
        // Address we simply couldn't place → open the map instead of dead-ending
        // on an error message the customer can do nothing about.
        if (validation.needsPin) {
          pinResumeRef.current = handleCODPayment;
          setPinPromptCoords(null);
          setPinPromptOpen(true);
          return;
        }
        setPaymentError(validation.message);
        return;
      }
      if (!selectedAddressId) {
        setPaymentError("Please select a delivery address");
        return;
      }
    }

    if (lines.length === 0) {
      setPaymentError("Your cart is empty");
      return;
    }

    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      setPaymentError("Please select a date and time for your scheduled order.");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");

    try {
      const token = localStorage.getItem("customerToken");
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);

      // Only delivery needs a saved address; pickup & dine-in don't.
      if (orderType === 'delivery' && !selectedAddr) {
        throw new Error("Please select a delivery address");
      }

      const orderItems = lines.map(line => ({
        itemId: line.itemId,                    // ✅ needed for item-restricted offers (COMBO50)
        itemName: line.itemName || line.name,
        quantity: line.qty || 1,
        base_price: line.basePrice || 0,
        variants: line.variants || [],
        addons: visibleAddons(line, isDineIn),
      }));

      // Ad attribution — UTM campaign only; `ht_promo` is a landing-page hint,
      // never an applied code (see the initiate path and `outboundCode`).
      const utm = (() => {
        try { return JSON.parse(sessionStorage.getItem('ht_utm') ?? '{}'); } catch { return {}; }
      })();

      const orderPayload = {
        items: orderItems,
        orderType,
        order_type: orderType,
        delivery_address: isDineIn ? 'Dine-in' : orderType === 'pickup' ? 'Pickup' : selectedAddr?.fullAddress,
        delivery_latitude: orderType === 'pickup' ? null : (selectedAddr?.latitude || geocodedCoords[selectedAddressId]?.lat || null),
        delivery_longitude: orderType === 'pickup' ? null : (selectedAddr?.longitude || geocodedCoords[selectedAddressId]?.lng || null),
        // Lets the server pin THIS exact saved address when it resolves coords.
        delivery_address_id: orderType === 'pickup' ? null : (selectedAddressId || null),
        delivery_instructions: deliveryInstructions,
        paymentMethod: "COD",
        discount: discountAmount,
        delivery_charge: deliveryCharge,
        use_borzo: useBorzoDelivery,
        offer_id: appliedOffer?.id || null,
        offer_title: appliedOffer?.title || null,
        applied_code: outboundCode,
        applied_code_type: outboundCode ? (appliedCode?.type || null) : null,
        utm_campaign: utm.campaign || undefined,
        points_to_redeem: pointsToRedeem > 0 ? pointsToRedeem : 0,
        is_scheduled: isDineIn ? true : (isScheduled && scheduledDate && scheduledTime),
        scheduled_date: (isDineIn || isScheduled) ? scheduledDate : null,
        scheduled_time: (isDineIn || isScheduled) ? scheduledTime : null,
      };

      const url = isEditMode
        ? `${API_BASE}/customer/orders/${editOrderId}`
        : `${API_BASE}/customer/orders`;
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = {};
        }

        if (response.status === 401) {
          throw new Error("Authentication failed. Please logout and login again to continue.");
        }

        throw new Error(errorData.error || errorData.message || `Failed to ${isEditMode ? 'update' : 'create'} order`);
      }

      const data = await response.json();
      const resultOrderId = data.orderId || editOrderId;

      console.log(`✅ COD Order ${isEditMode ? 'updated' : 'created'}:`, resultOrderId);
      if (!isEditMode) {
        trackPurchase(resultOrderId, finalTotal, 'cod', lines);
      }

      clearCart();
      if (isEditMode) {
        showToast('Order updated successfully!', 'success');
        navigate(`/orders/${resultOrderId}`);
      } else {
        navigate(`/order-success/${resultOrderId}?type=cod`, { replace: true });
      }
    } catch (error) {
      setPaymentError(error.message);
      setPaymentProcessing(false);
    }
  };

  // ============================================================================
  // PERSISTENT OFFER BANNER COMPONENT
  // ============================================================================

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 md:mb-6">
          {isEditMode ? `Update Order #${editOrderId}` : 'Place Your Order'}
        </h1>
        {isEditMode && (
          <div className="bg-yellow-600/20 border border-yellow-500/40 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <span className="text-yellow-300 text-sm font-medium">
              You are editing Order #{editOrderId}. Delivery address is locked.
            </span>
            <button
              onClick={() => navigate(`/orders/${editOrderId}`)}
              className="text-yellow-200 hover:text-white text-sm underline"
            >
              Cancel Edit
            </button>
          </div>
        )}

        {/* 🎉 PERSISTENT OFFER BANNER */}

        {/* Empty Cart Message */}
        {lines.length === 0 && (
          <div className="bg-neutral-800 rounded-lg p-8 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-neutral-600 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Your cart is empty</h2>
            <p className="text-neutral-400 mb-6">
              Add some delicious items from our menu to get started!
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              Browse Menu
            </button>
          </div>
        )}


        {/* Cart Items Display */}
        {lines.length > 0 && (
          <div className="bg-neutral-800 rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-white font-bold text-xl mb-4">
              Your Cart ({cartCount} items)
            </h3>
            <div className="space-y-3">
              {lines.map((line, idx) => {
                // Dine-in carries no packaging charge — see utils/cartLine.js.
                const shownAddons = visibleAddons(line, isDineIn);
                const unitPrice = lineUnitPrice(line, isDineIn);
                const lineTotal = unitPrice * (line.qty || 1);

                return (
                  <div key={idx} className="bg-neutral-800 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-base">
                          {line.itemName || line.name || "Item"}
                        </h4>
                        <p className="text-sm text-neutral-400 mt-1">
                          ₹{unitPrice} each
                        </p>
                        {line.variants && line.variants.length > 0 && (
                          <p className="text-xs text-neutral-500 mt-1">
                            {line.variants.map(v => v.name).join(', ')}
                          </p>
                        )}
                        {shownAddons.length > 0 && (
                          <p className="text-xs text-neutral-500">
                            Add-ons: {shownAddons.map(a => a.name).join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-bold text-lg">₹{lineTotal}</p>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-700">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQty(line.key, line.qty - 1)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            line.qty === 1
                              ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                              : 'bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-white'
                          }`}
                          aria-label={line.qty === 1 ? 'Remove from cart' : 'Decrease quantity'}
                        >
                          {line.qty === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </button>

                        <span className="text-white font-semibold text-base min-w-[2rem] text-center">
                          {line.qty}
                        </span>

                        <button
                          onClick={() => updateQty(line.key, line.qty + 1)}
                          className="w-9 h-9 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 rounded-lg flex items-center justify-center text-white transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeLine(line.key)}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LOGIN PROMPT — shown prominently at top when not logged in */}
        {lines.length > 0 && !isAuthenticated && (
          <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 border-2 border-orange-500/50 rounded-xl p-6 mb-6 text-center">
            <div className="text-3xl mb-3">🔐</div>
            <h2 className="text-xl font-bold text-white mb-2">Login to Place Your Order</h2>
            <p className="text-neutral-300 mb-4 text-sm">
              Create an account or login to add your delivery address and pay online or choose cash on delivery.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-8 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl transition-colors text-lg shadow-lg shadow-orange-500/25"
            >
              Login / Sign Up
            </button>
          </div>
        )}

        {/* Order Form */}
        {lines.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* LEFT: Delivery Details */}
            <div className="md:col-span-2 space-y-6">

              {/* Order Type Toggle */}
              {!isEditMode && (
                <div className="bg-neutral-800 rounded-lg p-4 sm:p-6">
                  <h3 className="text-white font-bold text-lg mb-3">How would you like your order?</h3>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <button
                      onClick={() => { setOrderType('dine_in'); updateOrderMode('dine_in'); setIsScheduled(false); setScheduledDate(''); setScheduledTime(''); }}
                      className={`flex flex-col items-center gap-1.5 sm:gap-2 py-3 sm:py-4 rounded-xl border-2 font-semibold transition-all text-sm sm:text-base ${
                        orderType === 'dine_in'
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-neutral-600 text-neutral-400 hover:border-neutral-500'
                      }`}
                    >
                      <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>Dine-in</span>
                    </button>
                    <button
                      onClick={() => { setOrderType('pickup'); updateOrderMode('pickup'); }}
                      className={`flex flex-col items-center gap-1.5 sm:gap-2 py-3 sm:py-4 rounded-xl border-2 font-semibold transition-all text-sm sm:text-base ${
                        orderType === 'pickup'
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-neutral-600 text-neutral-400 hover:border-neutral-500'
                      }`}
                    >
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>Pickup</span>
                    </button>
                    <button
                      onClick={() => { setOrderType('delivery'); updateOrderMode('delivery'); }}
                      className={`flex flex-col items-center gap-1.5 sm:gap-2 py-3 sm:py-4 rounded-xl border-2 font-semibold transition-all text-sm sm:text-base ${
                        orderType === 'delivery'
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-neutral-600 text-neutral-400 hover:border-neutral-500'
                      }`}
                    >
                      <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>Delivery</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Delivery Address / Pickup Info / Dine-in Info */}
              {orderType === 'dine_in' ? (
                <div className="bg-neutral-800 rounded-lg p-4 sm:p-6 space-y-5">
                  <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-orange-400" />
                    Dine-in Details
                  </h3>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                    <p className="text-orange-300 font-semibold mb-1">Hungry Times</p>
                    <p className="text-neutral-300 text-sm">32/12A, Gariahat Road South, Kolkata 700 031</p>
                    {packagingDeduction > 0 && (
                      <p className="text-green-400 text-sm mt-2 font-medium">
                        ✓ No packaging charge — saves ₹{money(packagingDeduction)}
                      </p>
                    )}
                  </div>
                  {/* Arrival time picker — required for dine-in */}
                  <div>
                    <p className="text-white font-semibold mb-1">
                      When would you like to arrive?{' '}
                      <span className="text-red-400 text-sm">*</span>
                    </p>
                    <p className="text-neutral-500 text-xs mb-3">We'll have everything ready at this time.</p>
                    {(() => {
                      const nowIST = new Date(Date.now() + 330 * 60 * 1000);
                      const todayStr = nowIST.toISOString().slice(0, 10);
                      const maxDate = new Date(nowIST);
                      maxDate.setUTCDate(maxDate.getUTCDate() + 2);
                      const maxDateStr = maxDate.toISOString().slice(0, 10);
                      return (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <label className="text-neutral-400 text-xs mb-1 block">Date</label>
                              <input
                                type="date"
                                value={scheduledDate}
                                min={todayStr}
                                max={maxDateStr}
                                onChange={e => { setScheduledDate(e.target.value); setScheduledTime(''); }}
                                className="w-full px-3 py-2.5 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-neutral-400 text-xs mb-1 block">Arrival time (12 PM – 11 PM)</label>
                            {!scheduledDate ? (
                              <p className="text-neutral-500 text-xs px-1 py-2">Pick a date above first.</p>
                            ) : (() => {
                              const isToday = scheduledDate === todayStr;
                              const nowMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
                              const OPEN = 12 * 60, CLOSE = 23 * 60, LEAD = 10;
                              const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
                              const label12 = (t) => {
                                const [h, mn] = t.split(':').map(Number);
                                const ap = h < 12 ? 'AM' : 'PM';
                                const h12 = h % 12 === 0 ? 12 : h % 12;
                                return `${h12}:${String(mn).padStart(2, '0')} ${ap}`;
                              };
                              // ASAP = next 15-min mark after a short lead (walk-in diner arriving now)
                              const asapMins = isToday ? Math.ceil((nowMins + LEAD) / 15) * 15 : null;
                              const showAsap = asapMins != null && asapMins >= OPEN && asapMins <= CLOSE;
                              const asapTime = showAsap ? fmt(asapMins) : null;
                              const slots = [];
                              for (let m = OPEN; m <= CLOSE; m += 15) {
                                if (isToday && asapMins != null && m <= asapMins) continue; // ASAP covers the earliest slot
                                if (isToday && asapMins == null && m < nowMins + LEAD) continue;
                                slots.push(fmt(m));
                              }
                              if (!showAsap && slots.length === 0) {
                                return <p className="text-neutral-500 text-xs px-1 py-2">No slots left today — pick tomorrow above.</p>;
                              }
                              return (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {showAsap && (
                                    <button
                                      type="button"
                                      onClick={() => setScheduledTime(asapTime)}
                                      className={`rounded-lg border px-2 py-2 text-xs font-semibold transition flex flex-col items-center leading-tight ${
                                        scheduledTime === asapTime
                                          ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                                          : 'border-orange-500/50 bg-orange-500/5 text-orange-200 hover:border-orange-500'
                                      }`}
                                    >
                                      <span>⚡ ASAP</span>
                                      <span className="text-[10px] opacity-80">~{label12(asapTime)}</span>
                                    </button>
                                  )}
                                  {slots.map(t => {
                                    const on = scheduledTime === t;
                                    return (
                                      <button
                                        key={t}
                                        type="button"
                                        onClick={() => setScheduledTime(t)}
                                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                                          on
                                            ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                                            : 'border-neutral-600 bg-neutral-700 text-neutral-200 hover:border-neutral-500'
                                        }`}
                                      >
                                        {label12(t)}
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                          {scheduledDate && scheduledTime ? (
                            <div className="bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-sm text-green-300">
                              We'll be ready for you on {scheduledDate} at {scheduledTime} 🍽️
                            </div>
                          ) : (
                            <p className="text-neutral-500 text-xs">Select a date and arrival time to continue.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : orderType === 'pickup' ? (
                <div className="bg-neutral-800 rounded-lg p-4 sm:p-6">
                  <h3 className="text-white font-bold text-xl mb-4">
                    <MapPin className="w-5 h-5 inline mr-2" />
                    Pickup Details
                  </h3>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <p className="text-green-300 font-semibold text-base mb-1">Ready in ~30 minutes</p>
                    <p className="text-neutral-300 text-sm">
                      Your order will be ready for pickup at our restaurant. We'll call if it takes a bit longer.
                    </p>
                    <p className="text-neutral-400 text-sm mt-3">
                      <span className="font-medium text-white">Location:</span> 32/12A, Gariahat Road South, Kolkata 700 031
                    </p>
                  </div>
                </div>
              ) : (
              <div className="bg-neutral-800 rounded-lg p-4 sm:p-6">
                <h3 className="text-white font-bold text-xl mb-4">
                  <MapPin className="w-5 h-5 inline mr-2" />
                  Delivery Address
                </h3>

                {!isAuthenticated ? (
                  <div className="text-center py-6">
                    <p className="text-neutral-400">
                      Please login above to add your delivery address
                    </p>
                  </div>
                ) : (
                  <>
                    {addresses.length === 0 && !showAddAddressForm ? (
                      <div className="text-center py-6">
                        <p className="text-neutral-400 mb-4">No saved addresses found</p>
                        <button
                          onClick={() => setShowAddAddressForm(true)}
                          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5 inline mr-2" />
                          Add Your First Address
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {addresses.map((addr) => {
                            const isSelected = selectedAddressId === addr.id;
                            const isEditing = editingAddressId === addr.id;

                            return (
                              <div
                                key={addr.id}
                                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-neutral-600 hover:border-neutral-500'
                                }`}
                              >
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-neutral-300 text-sm mb-1">
                                        Label (Optional)
                                      </label>
                                      <AddressLabelPicker
                                        value={editAddressData.name}
                                        onChange={(name) => setEditAddressData({ ...editAddressData, name })}
                                        inputClassName="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded text-white text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-neutral-300 text-sm mb-1">
                                        Address *
                                      </label>
                                      <GoogleMapsAutocomplete
                                        onSelect={(result) => {
                                          setEditAddressData({
                                            ...editAddressData,
                                            fullAddress: result.address,
                                            latitude: result.latitude,
                                            longitude: result.longitude
                                          });
                                        }}
                                        defaultValue={editAddressData.fullAddress}
                                        defaultCoords={{ latitude: editAddressData.latitude, longitude: editAddressData.longitude }}
                                      />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                      <button
                                        onClick={handleCancelEdit}
                                        className="flex-1 px-4 py-3 md:py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-base md:text-sm rounded-lg font-medium"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveEdit(addr.id)}
                                        className="flex-1 px-4 py-3 md:py-2 bg-orange-500 hover:bg-orange-600 text-white text-base md:text-sm rounded-lg font-semibold"
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div onClick={() => setSelectedAddressId(addr.id)}>
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        {isSelected && (
                                          <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                        )}
                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {addr.name && (
                                              <span className="text-white font-medium">{addr.name}</span>
                                            )}
                                            {addr.isDefault && (
                                              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                                                Default
                                              </span>
                                            )}
                                            {addr.isLegacy && (
                                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded" title="This is your registration address. Add more addresses below.">
                                                Primary
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-neutral-300 text-sm mt-1">{addr.fullAddress}</p>
                                          
                                          {/* Delivery Status Badge */}
                                          {(() => {
                                            const status = getDeliveryStatus(addr);
                                            if (status.canDeliver === null) {
                                              return (
                                                <div className="mt-2 px-2 py-1 rounded text-xs inline-flex items-center gap-1 bg-neutral-700/50 text-neutral-400 border border-neutral-600">
                                                  <Loader className="w-3 h-3 animate-spin" />
                                                  Checking area…
                                                </div>
                                              );
                                            }
                                            return (
                                              <div className={`mt-2 px-2 py-1 rounded text-xs inline-flex items-center gap-1 ${
                                                status.canDeliver
                                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                              }`}>
                                                {status.canDeliver ? (
                                                  <>
                                                    <Check className="w-3 h-3" />
                                                    {status.message}
                                                  </>
                                                ) : (
                                                  <>
                                                    <AlertCircle className="w-3 h-3" />
                                                    {status.message}
                                                  </>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        {!addr.isLegacy && (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(addr);
                                              }}
                                              className="p-3 md:p-2 text-neutral-400 hover:text-blue-400 transition-colors"
                                              title="Edit"
                                            >
                                              <Edit2 className="w-5 h-5 md:w-4 md:h-4" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteAddress(addr.id);
                                              }}
                                              className="p-3 md:p-2 text-neutral-400 hover:text-red-400 transition-colors"
                                              title="Delete"
                                            >
                                              <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                                            </button>
                                          </>
                                        )}
                                        {!addr.isDefault && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSetDefault(addr.id);
                                            }}
                                            className="p-2 text-xs text-neutral-400 hover:text-orange-400 transition-colors"
                                            title="Set as default"
                                          >
                                            ★
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {addresses.length < 5 && (
                          <button
                            onClick={() => setShowAddAddressForm(true)}
                            className="w-full py-2 mt-3 border-2 border-dashed border-neutral-600 hover:border-orange-500 text-neutral-400 hover:text-orange-500 rounded-lg font-medium transition-colors"
                          >
                            <Plus className="w-5 h-5 inline mr-2" />
                            Add New Address
                          </button>
                        )}
                      </>
                    )}

                    {/* Add Address Form */}
                    {showAddAddressForm && (
                      <form onSubmit={handleAddNewAddress} className="space-y-4 mt-4 pt-4 border-t border-neutral-700">
                        <div>
                          <label className="block text-neutral-300 text-sm mb-2">
                            Label (Optional)
                          </label>
                          <AddressLabelPicker
                            value={newAddressData.name}
                            onChange={(name) => setNewAddressData({ ...newAddressData, name })}
                            inputClassName="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-neutral-300 text-sm mb-2">
                            Address *
                          </label>
                          <GoogleMapsAutocomplete
                            onSelect={(result) => {
                              setNewAddressData({
                                ...newAddressData,
                                fullAddress: result.address,
                                latitude: result.latitude,
                                longitude: result.longitude
                              });
                            }}
                            defaultValue={newAddressData.fullAddress}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddAddressForm(false);
                              setNewAddressData({ name: '', fullAddress: '', latitude: null, longitude: null });
                            }}
                            className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium"
                          >
                            Save Address
                          </button>
                        </div>
                      </form>
                    )}

                    {!selectedAddressId && addresses.length > 0 && !showAddAddressForm && (
                      <p className="text-red-400 text-sm mt-2">
                        ⚠ Please select an address to continue
                      </p>
                    )}
                  </>
                )}
              </div>
              )}

              {/* Special Instructions */}
              <div className="bg-neutral-800 rounded-lg p-4 sm:p-6">
                <label className="block text-white font-bold text-lg mb-2">
                  <MessageSquare className="w-5 h-5 inline mr-2" />
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={deliveryInstructions}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setDeliveryInstructions(e.target.value);
                    }
                  }}
                  placeholder="Any special requests? (e.g., extra spicy, no onions, gate code)"
                  className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-neutral-500"
                  rows="3"
                  maxLength={200}
                />
                <p className="text-neutral-500 text-xs mt-1 text-right">
                  {deliveryInstructions.length}/200 characters
                </p>
              </div>

              {/* Schedule Order — hidden for dine-in (uses arrival time picker instead) */}
              {orderType !== 'dine_in' && (
              <div className="bg-neutral-800 rounded-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-bold text-lg leading-tight">Schedule for later</p>
                    <p className="text-neutral-400 text-sm">
                      {isScheduled ? "We'll start preparing at the time you chose" : "Order will be placed immediately"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIsScheduled(!isScheduled); setScheduledDate(""); setScheduledTime(""); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isScheduled ? "bg-orange-500" : "bg-neutral-600"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isScheduled ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                </div>
                {isScheduled && (() => {
                  const nowIST = new Date(Date.now() + 330 * 60 * 1000);
                  const todayStr = nowIST.toISOString().slice(0, 10);
                  const maxDate = new Date(nowIST);
                  maxDate.setUTCDate(maxDate.getUTCDate() + 2);
                  const maxDateStr = maxDate.toISOString().slice(0, 10);
                  return (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="text-neutral-400 text-xs mb-1 block">Date</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            min={todayStr}
                            max={maxDateStr}
                            onChange={e => { setScheduledDate(e.target.value); setScheduledTime(""); }}
                            className="w-full px-3 py-2.5 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-neutral-400 text-xs mb-1 block">Time (12 PM – 11 PM)</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            min="12:00"
                            max="23:00"
                            onChange={e => setScheduledTime(e.target.value)}
                            className="w-full px-3 py-2.5 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                      {scheduledDate && scheduledTime && (
                        <div className="bg-orange-900/30 border border-orange-700 rounded-lg px-3 py-2 text-sm text-orange-300">
                          We'll start preparing on {scheduledDate} at {scheduledTime}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              )}

            </div>

            {/* RIGHT: Order Summary & Payment */}
            <div className="md:col-span-1">
              <div className="bg-neutral-800 rounded-lg p-4 sm:p-6 md:sticky md:top-6">
                <h3 className="text-white font-bold text-xl mb-4">Order Summary</h3>
                
                {/* Price Summary with Discount */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal</span>
                    <span className="text-white font-medium">₹{money(cartTotal)}</span>
                  </div>
                  
                  {/* Fixed-price bundle in the cart: no code and no loyalty can
                      apply. Stated up front rather than discovered — the server
                      zeroes both silently, so without this the customer picks
                      points, watches a discount appear, and is then charged the
                      full amount. */}
                  {hasNoStackItem && cartTotal > 0 && (
                    <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded px-3 py-2 leading-relaxed">
                      Promo codes and loyalty points can't be used with a combo — its
                      price already includes the saving. Your points stay in your balance.
                    </p>
                  )}

                  {/* YOUR OFFERS PANEL */}
                  {!hasNoStackItem && isAuthenticated && customer?.phone && (
                    <OffersPanel
                      cartTotal={cartTotal}
                      customerPhone={customer.phone}
                      cartItemIds={lines.map(l => l.itemId)}
                      onApplyOffer={handlePanelApplyOffer}
                      onRemoveOffer={handlePanelRemoveOffer}
                      appliedCode={appliedCode}
                    />
                  )}

                  {/* Welcome-code hint for new customers (WELCOME15 replaced FIRST30
                      on 2026-07-25). Hidden below the offer floor — pre-filling a code
                      the server will refuse just wastes a tap. */}
                  {isAuthenticated && loyaltyPoints === 0 && !appliedCode && offersAllowed && (
                    <button
                      onClick={() => { setCodeInput('WELCOME15'); setCodeExpanded(true); }}
                      className="w-full py-2 text-sm text-green-400 bg-green-500/10 rounded text-center font-medium"
                    >
                      New customer? Use <span className="font-bold">WELCOME15</span> for 15% off your first order
                    </button>
                  )}

                  {/* Offer floor, stated before the customer tries a code. The server
                      refuses sub-floor codes anyway; this is so the rule is visible
                      rather than discovered as an error. */}
                  {/* When the server has a reason of its own — an automatic item
                      offer already on the cart, or a fixed-price bundle — show
                      THAT instead. The floor nudge would be actively wrong there:
                      it tells a customer to spend ₹190 more to unlock a discount
                      they are already receiving, and which no extra spend can
                      stack onto. */}
                  {serverQuote?.rejected ? (
                    <p className="text-xs text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/25 rounded px-3 py-2 leading-relaxed">
                      {serverQuote.rejected}
                    </p>
                  ) : !appliedCode && !offersAllowed && cartTotal > 0 && !serverQuote?.autoItemOffers ? (
                    <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded px-3 py-2 leading-relaxed">
                      Add ₹{Math.ceil(Math.max(0, offerFloor - offerFloorBasis))} more to use a promo code or your
                      loyalty points — discounts start at a ₹{offerFloor} bill. Ordering now is fine too.
                    </p>
                  ) : null}

                  {/* The saving, named. An automatic offer with an unexplained
                      deduction reads as a pricing error; this says which offer. */}
                  {serverQuote?.autoItemOffers?.titles?.length > 0 && (
                    <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded px-3 py-2 leading-relaxed">
                      {serverQuote.autoItemOffers.titles.join(' · ')} — applied automatically.
                    </p>
                  )}

                  {/* APPLY CODE SECTION — hidden entirely when a fixed-price
                      bundle is in the cart; every code would be refused. */}
                  {hasNoStackItem ? null : !appliedCode ? (
                    <div className="py-1">
                      {!codeExpanded ? (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button
                            onClick={() => setCodeExpanded(true)}
                            className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                          >
                            {isAuthenticated && customer?.phone ? 'Have a different code?' : 'Have a code?'}
                          </button>
                          <Link
                            to="/offers"
                            className="text-xs text-neutral-400 hover:text-neutral-200 underline underline-offset-2 transition-colors"
                          >
                            See all offers &amp; how discounts work
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={codeInput}
                              onChange={e => setCodeInput(e.target.value.toUpperCase())}
                              onKeyDown={e => e.key === 'Enter' && handleApplyCode()}
                              placeholder="Enter code"
                              className="flex-1 bg-neutral-700 border border-neutral-600 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-orange-500"
                              autoFocus
                            />
                            <button
                              onClick={handleApplyCode}
                              disabled={codeValidating || !codeInput.trim()}
                              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-600 text-white text-sm font-bold rounded transition-colors"
                            >
                              {codeValidating ? <Loader className="w-4 h-4 animate-spin" /> : 'Apply'}
                            </button>
                            <button
                              onClick={() => { setCodeExpanded(false); setCodeError(''); }}
                              className="p-2 text-neutral-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {codeError && (
                            <p className="text-red-400 text-xs">{codeError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`-mx-6 px-6 py-2 rounded ${discountAmount > 0 ? 'bg-orange-500/10' : 'bg-neutral-700/40'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${discountAmount > 0 ? 'text-orange-400' : 'text-neutral-400'}`}>
                          Code: {appliedCode.code}
                          {discountAmount === 0 && <span className="ml-2 text-xs">(not applied)</span>}
                        </span>
                        <button
                          onClick={handleRemoveCode}
                          className="text-neutral-400 hover:text-red-400 text-xs underline"
                        >
                          Remove
                        </button>
                      </div>
                      {/* A code that earns nothing is no longer a dead end: the order
                          goes through at full price. Saying so here is the difference
                          between "add ₹X more" reading as advice and reading as a
                          blocked checkout. */}
                      {discountAmount === 0 && !offersAllowed && (
                        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                          Discounts start at a ₹{offerFloor} bill — add ₹{Math.ceil(Math.max(0, offerFloor - offerFloorBasis))} more to use it.
                          You can place this order now without it.
                        </p>
                      )}
                    </div>
                  )}

                  {/* 💚 DISCOUNT ROW */}
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center bg-green-500/10 -mx-6 px-6 py-2 rounded">
                      <span className="text-green-400 font-medium text-sm">
                        Offer Discount ({appliedOffer?.discount_value}{appliedOffer?.discount_type === 'percent' ? '%' : '₹'})
                      </span>
                      <span className="text-green-400 font-bold">- ₹{money(discountAmount)}</span>
                    </div>
                  )}

                  {/* 🍽️ DINE-IN PACKAGING WAIVER — a NOTE, not a deduction row.
                      The server strips packaging addons for dine-in before it
                      prices anything (utils/packaging.js normalizePackaging), and
                      the memo above does the same, so the Subtotal shown here is
                      ALREADY net of packaging. Printing it as a "- ₹X" line in
                      the column subtracted it a second time: a ₹500 cart with ₹20
                      packaging read Subtotal ₹480, No packaging -₹20, Total ₹480,
                      which does not add up. The saving is real and still worth
                      saying — it just isn't arithmetic. */}
                  {isDineIn && packagingDeduction > 0 && (
                    <div className="bg-green-500/10 -mx-6 px-6 py-2 rounded">
                      <span className="text-green-400 font-medium text-sm">
                        ✓ No packaging charge on dine-in — saves ₹{money(packagingDeduction)}
                      </span>
                    </div>
                  )}

                  {/* 🎯 LOYALTY POINTS REDEMPTION */}
                  {isAuthenticated && loyaltyPoints >= 30 && maxRedeemablePoints >= 30 && (
                    <div className="bg-purple-500/10 -mx-6 px-6 py-3 rounded space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-400 font-medium text-sm">
                          Loyalty Points ({loyaltyPoints} available)
                        </span>
                        {pointsToRedeem > 0 && (
                          <button
                            onClick={() => setPointsToRedeem(0)}
                            className="text-neutral-400 hover:text-red-400 text-xs underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {pointsToRedeem === 0 ? (
                        <button
                          onClick={handleUsePoints}
                          className="w-full py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm font-medium rounded transition-colors"
                        >
                          Use {Math.min(loyaltyPoints, maxRedeemablePoints)} points (save ₹{Math.min(loyaltyPoints, maxRedeemablePoints)})
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="range"
                            min={30}
                            max={maxRedeemablePoints}
                            step={10}
                            value={pointsToRedeem}
                            onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                            className="w-full accent-purple-500"
                          />
                          <div className="flex justify-between text-xs text-purple-300">
                            <span>30 pts</span>
                            <span className="font-bold">Using {pointsToRedeem} pts (- ₹{pointsDiscount})</span>
                            <span>{maxRedeemablePoints} pts</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Points discount display */}
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between items-center bg-purple-500/10 -mx-6 px-6 py-2 rounded">
                      <span className="text-purple-400 font-medium text-sm">
                        Points Discount
                      </span>
                      <span className="text-purple-400 font-bold">- ₹{money(pointsDiscount)}</span>
                    </div>
                  )}

                  {/* GST appears in the column ONLY when it was added on top of
                      a discounted value. With no discount it is already inside
                      the menu price and nothing was added, so a column line
                      makes the figures overshoot the Total by 5% however it is
                      labelled — it is stated below the Total instead. Same rule
                      and same wording as lib/billTotals.js, which drives the
                      confirmation and order-details pages. */}
                  {gstOnTop && (
                    <div className="flex justify-between text-neutral-400">
                      <span>GST (5%)</span>
                      <span className="text-white">₹{money(gstAmount)}</span>
                    </div>
                  )}

                  {/* Borzo delivery partner toggle — only shown when quote is available */}
                  {orderType === 'delivery' && borzoQuote.charge != null && (
                    <div className="bg-neutral-800/60 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-neutral-400 font-medium">Delivery partner</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setUseBorzoDelivery(false)}
                          className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${!useBorzoDelivery ? 'bg-orange-500 text-white' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                        >
                          Standard · ₹{deliveryStatus?.deliveryCharge > 0 ? deliveryStatus.deliveryCharge : 'Free'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseBorzoDelivery(true)}
                          className={`flex-1 py-2 px-3 rounded text-xs font-medium transition-colors ${useBorzoDelivery ? 'bg-orange-500 text-white' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                        >
                          Borzo · ₹{borzoQuote.charge}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delivery Charge / Pickup */}
                  <div className="flex justify-between text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      {orderType === 'pickup' ? <MapPin className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                      {orderType === 'pickup' ? 'Pickup' : 'Delivery'}
                    </span>
                    {orderType === 'pickup' ? (
                      <span className="text-green-400 font-medium">FREE</span>
                    ) : borzoQuote.loading ? (
                      <span className="flex items-center gap-1 text-neutral-400 text-sm"><Loader className="w-3.5 h-3.5 animate-spin" /> Calculating...</span>
                    ) : deliveryCharge > 0 ? (
                      <span className="text-white">₹{money(deliveryCharge)}</span>
                    ) : (
                      <span className="text-green-400 font-medium">FREE</span>
                    )}
                  </div>

                  <div className="border-t border-neutral-700 pt-2 mt-2 flex justify-between">
                    <span className="text-lg font-bold text-white">Total</span>
                    <span className="text-xl font-bold text-orange-500">₹{money(finalTotal)}</span>
                  </div>
                  {!gstOnTop && (
                    <p className="text-neutral-500 text-xs text-right">{gstIncludedNote(gstAmount)}</p>
                  )}

                  {/* 🎊 SAVINGS MESSAGE */}
                  {(discountAmount > 0 || pointsDiscount > 0) && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center mt-2">
                      <p className="text-green-400 font-semibold text-sm">
                        🎊 Yay! You saved ₹{discountAmount + pointsDiscount} on this order!
                      </p>
                    </div>
                  )}
                </div>

                {paymentError && (
                  <div ref={paymentErrorRef} className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {paymentError}
                  </div>
                )}

                {/* Delivery Area Warning */}
                {orderType === 'delivery' && selectedAddress && (() => {
                  const status = getDeliveryStatus(selectedAddress);
                  if (status.canDeliver === null) {
                    return (
                      <div className="mb-4 p-3 bg-neutral-700/50 border border-neutral-600 rounded-lg flex items-center gap-2 text-neutral-300 text-sm">
                        <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
                        Checking delivery area for your address…
                      </div>
                    );
                  }
                  if (status.canDeliver === false) {
                    return (
                      <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-red-400 font-semibold mb-1">
                              ⚠️ Outside Delivery Area
                            </p>
                            <p className="text-red-300 text-sm mb-2">
                              {status.message}
                            </p>
                            <p className="text-neutral-300 text-sm">
                              Please call us at <a href="tel:+918420822919" className="text-orange-400 hover:text-orange-300 font-semibold">+91-8420822919</a> to place your order.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* An item that can't be packed, or a cart that is only dips.
                    Shown above the buttons and the buttons disabled, so the
                    customer fixes it here rather than meeting a rejection at
                    payment. */}
                {fulfilmentBlock && (
                  <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/50 rounded-lg text-amber-300 text-sm">
                    {fulfilmentBlock.message}
                  </div>
                )}

                {/* Payment buttons */}
                <div className="space-y-2">
                  {!isEditMode && (
                    <button
                      onClick={handleRazorpayPayment}
                      disabled={paymentProcessing || lines.length === 0 || !!fulfilmentBlock || (orderType === 'delivery' && (!selectedAddressId || geocodingPending))}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                    >
                      {paymentProcessing ? (
                        <>
                          <Loader className="w-4 h-4 inline animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        "💳 Pay Online - Razorpay"
                      )}
                    </button>
                  )}

                  <button
                    onClick={handleCODPayment}
                    disabled={paymentProcessing || lines.length === 0 || !!fulfilmentBlock || (orderType === 'delivery' && (!selectedAddressId || geocodingPending))}
                    className={`w-full py-3 ${isEditMode ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors`}
                  >
                    {paymentProcessing ? (
                      <>
                        <Loader className="w-4 h-4 inline animate-spin mr-2" />
                        {isEditMode ? 'Updating...' : 'Processing...'}
                      </>
                    ) : isEditMode ? (
                      `Update Order #${editOrderId}`
                    ) : (
                      "💵 Cash on Delivery"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Mobile cart drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        lines={lines}
        cartTotal={cartTotal}
        discountAmount={discountAmount}
        pointsDiscount={pointsDiscount}
        gstAmount={gstAmount}
        gstOnTop={gstOnTop}
        deliveryCharge={deliveryCharge}
        finalTotal={finalTotal}
        deliveryAddress={selectedAddress?.fullAddress || ''}
        setDeliveryAddress={() => {}}
        specialNotes={deliveryInstructions}
        setSpecialNotes={setDeliveryInstructions}
        paymentError={paymentError}
        paymentProcessing={paymentProcessing}
        orderType={orderType}
        onCODPayment={handleCODPayment}
        onRazorpayPayment={handleRazorpayPayment}
      />

      {/* Add to cart modal */}
      {selectedItemForModal && (
        <AddToCartModal
          item={selectedItemForModal}
          isOpen={true}
          isDineIn={isDineIn}
          onClose={() => setSelectedItemForModal(null)}
          onAdd={(lineItem) => {
            addLine(lineItem);
            setSelectedItemForModal(null);
          }}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          // Refresh addresses after successful login
          fetchAddresses();
        }}
      />

      {/* Last-resort delivery pin prompt — only when every automatic attempt failed */}
      {pinPromptOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-neutral-900 border border-neutral-700 rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                Where should we deliver?
              </h3>
              <button
                type="button"
                onClick={() => setPinPromptOpen(false)}
                className="text-neutral-400 hover:text-white shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-3">
              We couldn't find this address on the map. Drop a pin so your rider reaches
              you directly — you only have to do this once.
            </p>

            <p className="text-xs text-neutral-500 mb-3 break-words">
              {selectedAddress?.fullAddress}
            </p>

            <PinConfirmMap
              lat={pinPromptCoords?.lat ?? null}
              lng={pinPromptCoords?.lng ?? null}
              onChange={(lat, lng) => setPinPromptCoords({ lat, lng })}
              hint="Tap the map or drag the pin to your gate"
            />

            <button
              type="button"
              onClick={handlePinPromptConfirm}
              disabled={!pinPromptCoords || pinPromptSaving}
              className="mt-3 w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pinPromptSaving
                ? 'Saving…'
                : pinPromptCoords
                  ? 'Confirm location & continue'
                  : 'Drop a pin to continue'}
            </button>

            {/* Never strand anyone: an explicit second tap places the order anyway,
                flagged so staff call before dispatch. */}
            <button
              type="button"
              onClick={handlePinPromptSkip}
              className="mt-2 w-full py-2 text-xs text-neutral-400 underline underline-offset-2 hover:text-neutral-200"
            >
              I can't pin it — confirm my address on the call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}