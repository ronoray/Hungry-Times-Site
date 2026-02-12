// pages/Profile.jsx - COMPLETE: Existing functionality + Multiple Addresses
// ✅ Profile editing (name, email, username) - PRESERVED
// ✅ Phone change with OTP - PRESERVED  
// ✅ Password change - PRESERVED
// ✅ Single address (customer.address) - PRESERVED
// ✅ Multiple addresses (customer_addresses table) - ADDED

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  User, MapPin, Phone, Mail, Edit2, Plus, Trash2,
  Save, X, Check, AlertCircle, LogOut, Key,
  Share2, Gift, Heart, HelpCircle, Package, RefreshCw, Loader
} from 'lucide-react';
import GoogleMapsAutocomplete from '../components/GoogleMapsAutocomplete';

import API_BASE from '../config/api.js';

export default function Profile() {
  const { customer, isAuthenticated, logout, token, login } = useAuth();
  const { addLine, clearCart } = useCart();
  const navigate = useNavigate();

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

  // Referral state
  const [referralCode, setReferralCode] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/menu');
      return;
    }

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
      // Load referral code
      loadReferralCode();
    }
  }, [customer, isAuthenticated, navigate]);

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
        // Fallback to legacy single address
        if (customer?.address) {
          setAddresses([{
            id: 'legacy',
            fullAddress: customer.address,
            latitude: customer.latitude,
            longitude: customer.longitude,
            isDefault: true,
            name: 'Primary Address'
          }]);
        }
      }
    } catch (err) {
      console.error('Load addresses error:', err);
      // Fallback to legacy
      if (customer?.address) {
        setAddresses([{
          id: 'legacy',
          fullAddress: customer.address,
          latitude: customer.latitude,
          longitude: customer.longitude,
          isDefault: true,
          name: 'Primary Address'
        }]);
      }
    }
  };

  const loadReferralCode = async () => {
    try {
      const res = await fetch(`${API_BASE}/referrals?phone=${customer?.phone}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const codes = data.codes || [];
        // Find most recent pending or active code
        const active = codes.find(c => c.status === 'active' || c.status === 'pending');
        if (active) setReferralCode(active);
      }
    } catch (err) {
      console.error('Load referral error:', err);
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

  const handleReorder = (order) => {
    const items = parseItems(order.items_json);
    clearCart();
    items.forEach(item => {
      addLine({
        itemId: item.itemId,
        itemName: item.itemName,
        name: item.itemName,
        basePrice: item.basePrice || 0,
        variants: (item.variants || []).map(v => ({
          id: v.id, name: v.name, priceDelta: v.priceDelta || v.price || 0,
        })),
        addons: (item.addons || []).map(a => ({
          id: a.id, name: a.name, priceDelta: a.priceDelta || a.price || 0,
        })),
        qty: item.quantity || 1,
      });
    });
    navigate('/order');
  };

  const handleShareReferral = () => {
    if (!referralCode) return;
    const msg = `Order from Hungry Times and get 15% off! Use my referral code: ${referralCode.code}. Order now at hungrytimes.in/offers?utm_source=whatsapp&utm_medium=referral&utm_campaign=refer_a_friend`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
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
      const res = await fetch(`${API_BASE}/customer/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add address');
      }

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
      const res = await fetch(`${API_BASE}/customer/addresses/${editingAddress.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update address');
      }

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
      const res = await fetch(`${API_BASE}/customer/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete address');
      }

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
      const res = await fetch(`${API_BASE}/customer/addresses/${addressId}/default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to set default');

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
  return (
    <div className="min-h-screen bg-neutral-900 py-8 pb-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-400">{success}</p>
          </div>
        )}

        {/* Profile Information - PRESERVED */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Username (Optional)</label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Name</p>
                <p className="text-white font-medium">{customer?.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white font-medium">{customer?.email || 'Not set'}</p>
              </div>
              {customer?.username && (
                <div>
                  <p className="text-sm text-gray-400">Username</p>
                  <p className="text-white font-medium">{customer.username}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-white font-medium">{customer?.phone || 'Not set'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Address Management - ENHANCED FOR MULTIPLE */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Saved Addresses
            </h2>
            {addresses.length < 5 && !addingAddress && !editingAddress && (
              <button
                onClick={() => setAddingAddress(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Address
              </button>
            )}
          </div>

          {/* Add/Edit Address Form */}
          {(addingAddress || editingAddress) && (
            <div className="mb-6 p-4 bg-neutral-700 rounded-lg">
              <h3 className="text-white font-medium mb-4">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Label (Optional)</label>
                  <input
                    type="text"
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({...addressForm, name: e.target.value})}
                    placeholder="e.g., Home, Office"
                    className="w-full bg-neutral-600 border border-neutral-500 rounded-lg px-4 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Address *</label>
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
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={editingAddress ? handleUpdateAddress : handleAddAddress}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
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
                  className="flex-1 px-4 py-2 bg-neutral-600 hover:bg-neutral-500 text-white rounded-lg transition-colors"
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
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-neutral-700 bg-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {addr.name && (
                          <span className="text-white font-medium">{addr.name}</span>
                        )}
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-300 text-sm">{addr.fullAddress}</p>
                      {addr.distanceKm !== undefined && (
                        <p className="text-xs text-neutral-500 mt-1">
                          📍 {addr.distanceKm} km away
                          {addr.withinServiceArea ? (
                            <span className="text-green-500 ml-2">✓ Deliverable</span>
                          ) : (
                            <span className="text-red-500 ml-2">⚠ Out of range</span>
                          )}
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
                          className="p-2 bg-neutral-600 hover:bg-neutral-500 text-white rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
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
                      className="mt-2 text-sm text-orange-500 hover:text-orange-400"
                    >
                      Set as default
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No addresses saved yet</p>
            )}
          </div>

          {addresses.length >= 5 && (
            <p className="mt-4 text-center text-neutral-400 text-sm">
              Maximum of 5 addresses reached
            </p>
          )}
        </div>

        {/* Recent Orders with Reorder */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Recent Orders
            </h2>
            <button
              onClick={() => navigate('/orders')}
              className="text-sm text-orange-400 hover:text-orange-300"
            >
              View All
            </button>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-orange-500 animate-spin" />
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
                  <div key={order.id} className="bg-neutral-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-neutral-400 text-xs">{date}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-white text-sm truncate">{itemSummary}{extra}</p>
                        <p className="text-orange-400 text-sm font-semibold mt-1">
                          ₹{order.total}
                        </p>
                      </div>
                      {(order.status === 'delivered' || order.status === 'cancelled') && (
                        <button
                          onClick={() => handleReorder(order)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reorder
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-neutral-400 text-center py-6 text-sm">No orders yet</p>
          )}
        </div>

        {/* Phone Management - PRESERVED */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Phone Number
            </h2>
            {!changingPhone && (
              <button
                onClick={() => setChangingPhone(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
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
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleSendPhoneOTP}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-400">Enter the OTP sent to {newPhone}</p>
                  <input
                    type="text"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleVerifyPhoneOTP}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
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
                className="w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-white font-medium">{customer?.phone || 'Not set'}</p>
          )}
        </div>

        {/* Password Management - PRESERVED */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5" />
              Password
            </h2>
            {!changingPassword && (
              <button
                onClick={() => setChangingPassword(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Change
              </button>
            )}
          </div>

          {changingPassword ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Current password"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="New password (min 6 characters)"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
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
                  className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">••••••••</p>
          )}
        </div>

        {/* Referral Code Section */}
        {referralCode && (
          <div className="bg-neutral-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-orange-500" />
              Your Referral Code
            </h2>
            <div className="bg-neutral-900 rounded-lg p-4 mb-4 text-center">
              <p className="text-3xl font-mono font-bold text-orange-500 tracking-widest mb-1">
                {referralCode.code}
              </p>
              <p className="text-xs text-neutral-400">
                Status: <span className={referralCode.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>
                  {referralCode.status.toUpperCase()}
                </span>
              </p>
            </div>
            <p className="text-sm text-neutral-400 mb-4">
              Share this code with friends. They get 15% off their first order, and you get 15% off your next!
            </p>
            <button
              onClick={handleShareReferral}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              <Share2 className="w-5 h-5" />
              Share via WhatsApp
            </button>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            Quick Links
          </h2>
          <div className="space-y-2">
            <button onClick={() => navigate('/orders')} className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors text-left">
              <Package className="w-5 h-5 text-orange-500" />
              <span className="text-white">My Orders</span>
            </button>
            <button onClick={() => navigate('/menu')} className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors text-left">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-white">My Favorites</span>
            </button>
            <button onClick={() => navigate('/offers')} className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors text-left">
              <Gift className="w-5 h-5 text-green-500" />
              <span className="text-white">Offers & Referrals</span>
            </button>
            <button onClick={() => navigate('/feedback')} className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors text-left">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              <span className="text-white">Feedback & Support</span>
            </button>
          </div>
        </div>

        {/* Logout Button - PRESERVED */}
        <button
          onClick={() => {
            logout();
            navigate('/menu');
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}