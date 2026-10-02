// pages/Profile.jsx - COMPLETE: Existing functionality + Multiple Addresses
// ✅ Profile editing (name, email, username) - PRESERVED
// ✅ Phone change with OTP - PRESERVED  
// ✅ Password change - PRESERVED
// ✅ Single address (customer.address) - PRESERVED
// ✅ Multiple addresses (customer_addresses table) - ADDED

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  User, MapPin, Phone, Mail, Edit2, Plus, Trash2,
  Save, X, Check, AlertCircle, LogOut, Key,
  Gift, Heart, Package, RefreshCw, Loader, ChevronRight, Bell
} from 'lucide-react';
import GoogleMapsAutocomplete from '../components/GoogleMapsAutocomplete';
import AuthModal from '../components/AuthModal';
import AddressLabelPicker from '../components/AddressLabelPicker';
import { reorderIntoCart } from '../utils/reorder';
import { fetchMenuItemsById, hasRealOptions } from '../utils/menuItems';
import { useFavorites } from '../context/FavoritesContext';
import {
  legacyAddressFrom,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../utils/addressBook';

import API_BASE from '../config/api.js';

export default function Profile() {
  const { customer, isAuthenticated, logout, token, login } = useAuth();
  const { lines, addLine, clearCart, incrementSimpleItem, getSimpleItemQty } = useCart();
  const { favorites, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Favourites are bare ids in localStorage, so the cards need the menu.
  // Fetched only when there is at least one favourite — no reason to pull the
  // whole menu onto the account page otherwise.
  const [favoriteItems, setFavoriteItems] = useState([]);

  // Notification preference. Seeded from the auth payload so the switch renders
  // in the right position on first paint instead of flipping a moment later.
  const [marketingOptOut, setMarketingOptOut] = useState(!!customer?.marketingOptOut);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    username: ''
  });

  // Address management - ENHANCED for multiple addresses
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '',
    fullAddress: '',
    latitude: null,
    longitude: null
  });

  // Phone change - PRESERVED
  const [changingPhone, setChangingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState('enter'); // 'enter' | 'verify'
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');

  // Password change - PRESERVED
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Recent orders state
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Loyalty state
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-dismiss banners
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (customer) {
      setProfileData({
        name: customer.name || '',
        email: customer.email || '',
        username: customer.username || ''
      });
      
      // Load addresses from new endpoint
      loadAddresses();
      // Load recent orders
      loadRecentOrders();
      // Load loyalty data
      loadLoyaltyData();
      setMarketingOptOut(!!customer.marketingOptOut);
    }
  }, [customer, isAuthenticated, navigate]);

  // Hydrate favourite ids against the menu. Gated on having favourites so the
  // account page never pulls the full menu for nothing, and cached in a ref so
  // un-hearting an item re-filters the list instead of refetching the menu —
  // toggleFavorite mints a new Set every time, which re-runs this effect.
  const menuByIdRef = useRef(null);
  useEffect(() => {
    const ids = [...favorites];
    if (ids.length === 0) {
      setFavoriteItems([]);
      return undefined;
    }

    let cancelled = false;
    const build = (byId) => {
      if (cancelled) return;
      setFavoriteItems(ids.map(id => byId.get(id)).filter(Boolean));
    };

    if (menuByIdRef.current) {
      build(menuByIdRef.current);
    } else {
      fetchMenuItemsById().then(byId => {
        menuByIdRef.current = byId;
        build(byId);
      });
    }

    return () => { cancelled = true; };
  }, [favorites]);

  const handleToggleMarketing = async (nextOptOut) => {
    const previous = marketingOptOut;
    setMarketingOptOut(nextOptOut); // optimistic
    setSavingPrefs(true);
    try {
      const res = await fetch(`${API_BASE}/customer/auth/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ marketingOptOut: nextOptOut }),
      });
      if (!res.ok) throw new Error('Failed to save preference');
      setSuccess(nextOptOut ? 'You will no longer receive offer messages.' : 'You will receive offer messages again.');
    } catch (err) {
      setMarketingOptOut(previous); // roll back — never leave the switch lying
      setError(err.message || 'Could not update preference');
    } finally {
      setSavingPrefs(false);
    }
  };

  // ============================================
  // LOAD ADDRESSES FROM customer_addresses TABLE
  // ============================================
  const loadAddresses = async () => {
    try {
      const res = await fetch(`${API_BASE}/customer/addresses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      } else {
        // Fallback to legacy single address. Built by the shared helper so this
        // page and checkout stop showing the same row under two different names
        // ("Primary Address" here, "My Address" there).
        const legacy = legacyAddressFrom(customer);
        if (legacy) setAddresses([legacy]);
      }
    } catch (err) {
      console.error('Load addresses error:', err);
      // Fallback to legacy
      const legacy = legacyAddressFrom(customer);
      if (legacy) setAddresses([legacy]);
    }
  };

  const loadLoyaltyData = async () => {
    setLoyaltyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customer/loyalty/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoyaltyData(data);
      }
    } catch (err) {
      console.error('Load loyalty error:', err);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const loadRecentOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customer/orders?limit=3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecentOrders((data.orders || data).slice(0, 3));
      }
    } catch (err) {
      console.error('Load recent orders error:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const parseItems = (itemsJson) => {
    try { return JSON.parse(itemsJson || '[]'); }
    catch { return []; }
  };

  const handleReorder = async (order) => {
    if (reordering) return;
    setReordering(true);
    try {
      const ok = await reorderIntoCart(order, {
        cartLines: lines,
        clearCart,
        addLine,
        showToast: (msg, type) => {
          if (type === 'error') setError(msg);
          else setSuccess(msg);
        },
      });
      if (ok) navigate('/order');
    } finally {
      setReordering(false);
    }
  };

  // ============================================
  // PROFILE UPDATE - PRESERVED
  // ============================================
  const handleSaveProfile = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/customer/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update profile');
      }

      const data = await res.json();
      
      if (data.customer && data.token) {
        login(data.customer, data.token);
        localStorage.setItem('customerToken', data.token);
      }

      setSuccess('Profile updated successfully!');
      setEditingProfile(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ADDRESS MANAGEMENT - NEW (Multiple Addresses)
  // ============================================
  const handleAddAddress = async () => {
    if (!addressForm.fullAddress.trim()) {
      setError('Please enter an address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await createAddress(addressForm, token);

      setSuccess('Address added successfully!');
      setAddingAddress(false);
      setAddressForm({ name: '', fullAddress: '', latitude: null, longitude: null });
      
      await loadAddresses();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!addressForm.fullAddress.trim()) {
      setError('Please enter an address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await updateAddress(editingAddress.id, addressForm, token);

      setSuccess('Address updated successfully!');
      setEditingAddress(null);
      setAddressForm({ name: '', fullAddress: '', latitude: null, longitude: null });
      
      await loadAddresses();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    setError('');
    setLoading(true);

    try {
      await deleteAddress(addressId, token);

      setSuccess('Address deleted successfully!');
      await loadAddresses();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await setDefaultAddress(addressId, token);
      await loadAddresses();
    } catch (err) {
      setError(err.message);
    }
  };

  // ============================================
  // PHONE CHANGE WITH OTP - PRESERVED
  // ============================================
  const handleSendPhoneOTP = async () => {
    if (!/^\d{10}$/.test(newPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/customer/auth/change-phone/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPhone })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send OTP');
      }

      setPhoneStep('verify');
      setSuccess('OTP sent to ' + newPhone);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (!phoneOtp) {
      setError('Please enter OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/customer/auth/change-phone/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPhone, otp: phoneOtp })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'OTP verification failed');
      }

      setSuccess('Phone number updated successfully!');
      setChangingPhone(false);
      setPhoneStep('enter');
      setNewPhone('');
      setPhoneOtp('');
      
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PASSWORD CHANGE - PRESERVED
  // ============================================
  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/customer/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  // Not logged in — show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ht-ivory py-8 pb-24 px-4">
        <div className="max-w-md mx-auto text-center pt-16">
          <div className="w-20 h-20 bg-ht-red/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-ht-red" />
          </div>
          <h1 className="text-2xl font-display font-normal text-ht-ink mb-3">Your Account</h1>
          <p className="text-ht-mute mb-8">
            Login to view your profile, manage addresses, track orders and earn loyalty points.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full max-w-xs mx-auto py-3 bg-gradient-to-r from-ht-red to-ht-red text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-ht-red/50 transition-all"
          >
            Login or Create Account
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="mt-4 text-ht-mute hover:text-ht-red transition-colors text-sm"
          >
            Continue browsing menu
          </button>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              setShowAuthModal(false);
              window.scrollTo(0, 0);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ht-ivory py-8 pb-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-display font-normal text-ht-ink mb-8">My Profile</h1>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-ht-red/10 border border-ht-red rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-ht-red flex-shrink-0 mt-0.5" />
            <p className="text-ht-red">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-ht-veg/10 border border-ht-veg rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-ht-veg flex-shrink-0 mt-0.5" />
            <p className="text-ht-veg">{success}</p>
          </div>
        )}

        {/* Profile Information - PRESERVED */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-ht-mute mb-2">Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full bg-ht-ink/10 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink"
                />
              </div>
              <div>
                <label className="block text-sm text-ht-mute mb-2">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className="w-full bg-ht-ink/10 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink"
                />
              </div>
              <div>
                <label className="block text-sm text-ht-mute mb-2">Username (Optional)</label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                  className="w-full bg-ht-ink/10 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 px-4 py-2 bg-ht-ink/10 hover:bg-ht-ink/15 text-ht-ink rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-ht-mute">Name</p>
                <p className="text-ht-ink font-medium">{customer?.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-ht-mute">Email</p>
                <p className="text-ht-ink font-medium">{customer?.email || 'Not set'}</p>
              </div>
              {customer?.username && (
                <div>
                  <p className="text-sm text-ht-mute">Username</p>
                  <p className="text-ht-ink font-medium">{customer.username}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-ht-mute">Phone</p>
                <p className="text-ht-ink font-medium">{customer?.phone || 'Not set'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Loyalty Points Card */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-ht-red2" />
            Loyalty Points
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-ht-gold2/60 border border-ht-gold/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-ht-red2">{customer?.loyaltyPoints || 0}</p>
              <p className="text-sm text-ht-mute mt-1">Available Points</p>
              <p className="text-xs text-ht-red2 mt-1">Worth ₹{customer?.loyaltyPoints || 0}</p>
            </div>
            <div className="bg-ht-ink/10 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-ht-ink">{customer?.totalPointsEarned || 0}</p>
              <p className="text-sm text-ht-mute mt-1">Total Earned</p>
              <p className="text-xs text-ht-mute mt-1">Lifetime points</p>
            </div>
          </div>
          <p className="text-xs text-ht-mute mb-3">Earn 1 point per ₹10 spent. Redeem at checkout (min 50 pts, max 20% of order).</p>

          {/* Recent Transactions */}
          {loyaltyLoading ? (
            <div className="flex items-center gap-2 text-ht-mute text-sm">
              <Loader className="w-4 h-4 animate-spin" /> Loading history...
            </div>
          ) : loyaltyData?.transactions?.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-ht-mute mb-2">Recent Activity</h3>
              <div className="space-y-2">
                {loyaltyData.transactions.slice(0, 5).map((tx, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-ht-ink/15 last:border-0">
                    <div>
                      <span className={tx.type === 'earned' ? 'text-ht-veg' : 'text-ht-red'}>
                        {tx.type === 'earned' ? '+' : ''}{tx.points} pts
                      </span>
                      <span className="text-ht-mute ml-2 text-xs">{tx.description}</span>
                    </div>
                    <span className="text-ht-mute text-xs">{new Date(tx.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-ht-mute">Place your first order to start earning points!</p>
          )}

          {(customer?.loyaltyPoints || 0) >= 50 && (
            <button
              onClick={() => navigate('/order')}
              className="mt-4 w-full py-2 bg-ht-gold hover:bg-ht-gold3 text-ht-ink font-medium rounded-lg transition-colors text-sm"
            >
              Redeem Points at Checkout
            </button>
          )}
        </div>

        {/* Address Management - ENHANCED FOR MULTIPLE */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Saved Addresses
            </h2>
            {addresses.length < 5 && !addingAddress && !editingAddress && (
              <button
                onClick={() => setAddingAddress(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Address
              </button>
            )}
          </div>

          {/* Add/Edit Address Form */}
          {(addingAddress || editingAddress) && (
            <div className="mb-6 p-4 bg-ht-ink/10 rounded-lg">
              <h3 className="text-ht-ink font-medium mb-4">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-ht-mute mb-2">Label (Optional)</label>
                  <AddressLabelPicker
                    value={addressForm.name}
                    onChange={(name) => setAddressForm({...addressForm, name})}
                  />
                </div>

                <div>
                  <label className="block text-sm text-ht-mute mb-2">Address *</label>
                  <GoogleMapsAutocomplete
                    onSelect={(result) => {
                      setAddressForm({
                        ...addressForm,
                        fullAddress: result.address,
                        latitude: result.latitude,
                        longitude: result.longitude
                      });
                    }}
                    defaultValue={addressForm.fullAddress}
                    defaultCoords={editingAddress ? { latitude: addressForm.latitude, longitude: addressForm.longitude } : null}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : editingAddress ? 'Update' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setAddingAddress(false);
                    setEditingAddress(null);
                    setAddressForm({ name: '', fullAddress: '', latitude: null, longitude: null });
                  }}
                  className="flex-1 px-4 py-2 bg-ht-ink/15 hover:bg-ht-ink/20 text-ht-ink rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Address List */}
          <div className="space-y-3">
            {addresses.length > 0 ? (
              addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-4 rounded-lg border-2 ${
                    addr.isDefault
                      ? 'border-ht-red bg-ht-red/5'
                      : 'border-ht-ink/15 bg-ht-ink/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {addr.name && (
                          <span className="text-ht-ink font-medium">{addr.name}</span>
                        )}
                        {/* Same tag as checkout renders. This was a solid orange
                            pill with a tick here and a muted tint there, for the
                            same flag on the same address. */}
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 bg-ht-red/20 text-ht-red text-xs rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-ht-ink text-sm">{addr.fullAddress}</p>
                      {addr.latitude != null && addr.longitude != null && addr.distanceKm != null ? (
                        <p className="text-xs text-ht-mute mt-1">
                          📍 {addr.distanceKm} km away
                          {addr.withinServiceArea ? (
                            <span className="text-ht-veg ml-2">✓ Deliverable</span>
                          ) : (
                            <span className="text-ht-red ml-2">⚠ Out of range</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-ht-gold3/80 mt-1">
                          📍 No delivery pin yet — edit this address to set one
                        </p>
                      )}
                    </div>

                    {addr.id !== 'legacy' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingAddress(addr);
                            setAddressForm({
                              name: addr.name || '',
                              fullAddress: addr.fullAddress,
                              latitude: addr.latitude,
                              longitude: addr.longitude
                            });
                          }}
                          className="p-2 bg-ht-ink/15 hover:bg-ht-ink/20 text-ht-ink rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-2 bg-ht-red hover:bg-ht-red2 text-white rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {!addr.isDefault && addr.id !== 'legacy' && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="mt-2 text-sm text-ht-red hover:text-ht-red"
                    >
                      Set as default
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-ht-mute text-center py-8">No addresses saved yet</p>
            )}
          </div>

          {addresses.length >= 5 && (
            <p className="mt-4 text-center text-ht-mute text-sm">
              Maximum of 5 addresses reached
            </p>
          )}
        </div>

        {/* Recent Orders with Reorder */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2">
              <Package className="w-5 h-5 text-ht-red" />
              Recent Orders
            </h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-sm text-ht-red hover:text-ht-red"
            >
              View All
            </button>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-ht-red animate-spin" />
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map(order => {
                const items = parseItems(order.items_json);
                const itemSummary = items.slice(0, 3).map(i => `${i.quantity}x ${i.itemName}`).join(', ');
                const extra = items.length > 3 ? ` +${items.length - 3} more` : '';
                const date = new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short'
                });

                return (
                  <div key={order.id} className="bg-ht-ink/10 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-ht-mute text-xs">{date}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.status === 'delivered' ? 'bg-ht-veg/10 text-ht-veg' :
                            order.status === 'cancelled' ? 'bg-ht-red/10 text-ht-red' :
                            'bg-ht-gold2/60 text-ht-gold3'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-ht-ink text-sm truncate">{itemSummary}{extra}</p>
                        <p className="text-ht-red text-sm font-semibold mt-1">
                          ₹{order.total}
                        </p>
                      </div>
                      {(order.status === 'delivered' || order.status === 'cancelled') && (
                        <button
                          onClick={() => handleReorder(order)}
                          disabled={reordering}
                          className="flex items-center gap-1.5 px-3 py-2 bg-ht-red hover:bg-ht-red2 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${reordering ? 'animate-spin' : ''}`} />
                          Reorder
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-ht-mute text-center py-6 text-sm">No orders yet</p>
          )}
        </div>

        {/* Phone Management - PRESERVED */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Phone Number
            </h2>
            {!changingPhone && (
              <button
                onClick={() => setChangingPhone(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Change
              </button>
            )}
          </div>

          {changingPhone ? (
            <div className="space-y-4">
              {phoneStep === 'enter' ? (
                <>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="10-digit phone number"
                    className="w-full bg-ht-ink/10 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink placeholder-ht-mute/60 focus:outline-none focus:border-ht-red"
                  />
                  <button
                    onClick={handleSendPhoneOTP}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-ht-mute">Enter the OTP sent to {newPhone}</p>
                  <input
                    type="text"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    className="w-full bg-ht-ink/10 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink placeholder-ht-mute/60 focus:outline-none focus:border-ht-red"
                  />
                  <button
                    onClick={handleVerifyPhoneOTP}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setChangingPhone(false);
                  setPhoneStep('enter');
                  setNewPhone('');
                  setPhoneOtp('');
                }}
                className="w-full px-4 py-2 bg-ht-ink/10 hover:bg-ht-ink/15 text-ht-ink rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-ht-ink font-medium">{customer?.phone || 'Not set'}</p>
          )}
        </div>

        {/* Password Management - PRESERVED */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2">
              <Key className="w-5 h-5" />
              Password
            </h2>
            {!changingPassword && (
              <button
                onClick={() => setChangingPassword(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Change
              </button>
            )}
          </div>

          {changingPassword ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-ht-mute mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="w-full bg-ht-ink/10 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink placeholder-ht-mute/60 focus:outline-none focus:border-ht-red"
                  placeholder="Current password"
                />
              </div>
              <div>
                <label className="block text-sm text-ht-mute mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full bg-ht-ink/10 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink placeholder-ht-mute/60 focus:outline-none focus:border-ht-red"
                  placeholder="New password (min 6 characters)"
                />
              </div>
              <div>
                <label className="block text-sm text-ht-mute mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full bg-ht-ink/10 border border-ht-ink/25 rounded-lg px-4 py-2 text-ht-ink placeholder-ht-mute/60 focus:outline-none focus:border-ht-red"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-ht-red hover:bg-ht-red2 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-ht-ink/10 hover:bg-ht-ink/15 text-ht-ink rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-ht-mute">••••••••</p>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2 mb-4">
            Quick Links
          </h2>
          <div className="space-y-2">
            <button onClick={() => navigate('/orders')} className="w-full flex items-center gap-3 px-4 py-3 bg-ht-ink/10 hover:bg-ht-ink/10 rounded-lg transition-colors text-left">
              <Package className="w-5 h-5 text-ht-red" />
              <span className="text-ht-ink">My Orders</span>
            </button>
            <button onClick={() => navigate('/menu')} className="w-full flex items-center gap-3 px-4 py-3 bg-ht-ink/10 hover:bg-ht-ink/10 rounded-lg transition-colors text-left">
              <Heart className="w-5 h-5 text-ht-red" />
              <span className="text-ht-ink">My Favorites</span>
            </button>
            <button onClick={() => navigate('/offers')} className="w-full flex items-center gap-3 px-4 py-3 bg-ht-ink/10 hover:bg-ht-ink/10 rounded-lg transition-colors text-left">
              <Gift className="w-5 h-5 text-ht-veg" />
              <span className="text-ht-ink">Offers & Referrals</span>
            </button>
          </div>
        </div>

        {/* My Favorites — renders nothing until something is hearted on the menu */}
        {favoriteItems.length > 0 && (
          <div className="bg-ht-paper rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-ht-red" />
              My Favorites
            </h2>
            <div className="space-y-2">
              {favoriteItems.map(item => {
                const needsOptions = hasRealOptions(item);
                const inCart = getSimpleItemQty(item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 bg-ht-ink/10 rounded-lg p-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-ht-ink/10 flex items-center justify-center flex-shrink-0 text-lg">🍽️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-ht-ink text-sm font-medium truncate">{item.name}</p>
                      <p className="text-ht-red text-sm">₹{Number(item.basePrice).toFixed(0)}</p>
                    </div>

                    {/* Anything with options must go through the menu's modal —
                        that is what attaches and prices the packaging addon and
                        enforces required choices. Adding it straight from here
                        would produce a cheaper, incomplete line. */}
                    {needsOptions || item.effectiveDisabled ? (
                      <button
                        onClick={() => navigate(`/menu?highlight=${item.id}`)}
                        disabled={item.effectiveDisabled}
                        className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-ht-ink/10 hover:bg-ht-ink/15 disabled:opacity-50 text-ht-ink transition-colors"
                      >
                        {item.effectiveDisabled ? 'Unavailable' : 'Choose'}
                      </button>
                    ) : (
                      <button
                        onClick={() => incrementSimpleItem(item, { source: 'other' })}
                        className="flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg bg-ht-red hover:bg-ht-red2 text-white transition-colors"
                      >
                        {inCart > 0 ? `Add (${inCart})` : 'Add'}
                      </button>
                    )}

                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className="flex-shrink-0 p-2 text-ht-red hover:text-ht-red transition-colors"
                      aria-label={`Remove ${item.name} from favourites`}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notifications — one honest toggle. There is no push/SMS/email
            preference column in the database, so offering those switches here
            would be a promise the backend cannot keep. */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-ht-ink flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5" />
            Notifications
          </h2>
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <span className="min-w-0">
              <span className="block text-ht-ink text-sm font-medium">WhatsApp offers and updates</span>
              <span className="block text-ht-mute text-xs mt-1">
                Occasional offers and news. Order updates are sent either way.
                Replying STOP on WhatsApp does the same thing as this switch.
              </span>
            </span>
            <input
              type="checkbox"
              checked={!marketingOptOut}
              disabled={savingPrefs}
              onChange={(e) => handleToggleMarketing(!e.target.checked)}
              className="mt-1 w-5 h-5 flex-shrink-0 accent-ht-red cursor-pointer disabled:opacity-50"
            />
          </label>
        </div>

        {/* Help & Support — Contact, Feedback and Reservation have real routes
            but no mobile entry point anywhere else, so this is the only way a
            phone user reaches them without typing a URL. Low-frequency pages:
            plain rows, no cards or icons. */}
        <div className="bg-ht-paper rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-ht-ink mb-4">Help &amp; Support</h2>
          <div className="divide-y divide-ht-ink/10">
            {[
              { to: '/contact', label: 'Contact Us' },
              { to: '/feedback', label: 'Feedback' },
              { to: '/reservation', label: 'Book a Table' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center justify-between py-3 text-ht-ink hover:text-ht-red transition-colors"
              >
                <span>{link.label}</span>
                <ChevronRight className="w-4 h-4 text-ht-mute" />
              </Link>
            ))}
          </div>
        </div>

        {/* Logout Button - PRESERVED */}
        <button
          onClick={() => {
            logout();
            navigate('/menu');
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ht-red hover:bg-ht-red2 text-white rounded-lg transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}