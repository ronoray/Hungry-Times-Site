// pages/Profile.jsx - COMPLETE CUSTOMER PROFILE
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, MapPin, Phone, Mail, Edit2, Plus, Trash2, 
  Save, X, Check, AlertCircle, LogOut, Key 
} from 'lucide-react';
import GoogleMapsAutocomplete from '../components/GoogleMapsAutocomplete';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export default function Profile() {
  const { customer, isAuthenticated, logout, token } = useAuth();
  const navigate = useNavigate();

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    username: ''
  });

  // Address management
  const [addresses, setAddresses] = useState([]);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address: '',
    latitude: null,
    longitude: null
  });

  // Phone change
  const [changingPhone, setChangingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState('enter'); // 'enter' | 'verify'
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');

  // Password change
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

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
      
      // Load addresses
      loadAddresses();
    }
  }, [customer, isAuthenticated, navigate]);

  const loadAddresses = async () => {
    // For now, just show the primary address
    // Later you can add a backend endpoint to manage multiple addresses
    if (customer?.address) {
      setAddresses([{
        id: 1,
        address: customer.address,
        latitude: customer.latitude,
        longitude: customer.longitude,
        distanceKm: customer.distanceKm,
        withinServiceArea: customer.withinServiceArea,
        isPrimary: true
      }]);
    }
  };

  // ============================================
  // PROFILE UPDATE
  // ============================================
  const handleSaveProfile = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/customer/auth/update-profile`, {
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

      setSuccess('Profile updated successfully!');
      setEditingProfile(false);
      
      // Refresh customer data
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ADDRESS UPDATE/ADD
  // ============================================
  const handleSaveAddress = async () => {
    if (!addressForm.address.trim()) {
      setError('Please enter an address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/customer/auth/update-address`, {
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

      const data = await res.json();
      
      setSuccess(
        data.customer.withinServiceArea 
          ? 'Address updated successfully!' 
          : 'Address updated! Note: Outside delivery area (>3.5km)'
      );
      
      setEditingAddress(null);
      setAddingAddress(false);
      
      // Refresh
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PHONE CHANGE WITH OTP
  // ============================================
  const handleSendPhoneOTP = async () => {
    if (!/^\d{10}$/.test(newPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/customer/auth/change-phone/send-otp`, {
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
    if (!phoneOtp || phoneOtp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/customer/auth/change-phone/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPhone, otp: phoneOtp })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to verify OTP');
      }

      setSuccess('Phone number updated successfully!');
      setChangingPhone(false);
      setPhoneStep('enter');
      setNewPhone('');
      setPhoneOtp('');
      
      // Refresh
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PASSWORD CHANGE
  // ============================================
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/customer/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully!');
      setChangingPassword(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !customer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/menu')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors text-sm"
            >
              <span>Back to Menu</span>
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/menu');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-400 text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-green-400 text-sm">{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                Basic Information
              </h2>
              {!editingProfile && (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
            </div>

            {editingProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={profileData.username}
                    disabled
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Username cannot be changed</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileData({
                        name: customer.name || '',
                        email: customer.email || '',
                        username: customer.username || ''
                      });
                    }}
                    className="px-6 py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-400">Name</p>
                    <p className="text-white font-medium">{customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400">Username</p>
                    <p className="text-white font-medium">@{customer.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400">Email</p>
                    <p className="text-white font-medium">{customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400">Phone</p>
                    <p className="text-white font-medium">{customer.phone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Address Card */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                Delivery Address
              </h2>
              {!editingAddress && !addingAddress && (
                <button
                  onClick={() => {
                    if (addresses.length > 0) {
                      // Edit existing address
                      setEditingAddress(addresses[0]);
                      setAddingAddress(false);
                      setAddressForm({
                        address: addresses[0]?.address || '',
                        latitude: addresses[0]?.latitude ?? null,
                        longitude: addresses[0]?.longitude ?? null
                      });
                    } else {
                      // No address yet – start adding a new one
                      setEditingAddress(null);
                      setAddingAddress(true);
                      setAddressForm({
                        address: '',
                        latitude: null,
                        longitude: null
                      });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{addresses.length > 0 ? 'Edit Address' : 'Add Address'}</span>
                </button>
              )}
            </div>

            {editingAddress || addingAddress ? (
              <div className="space-y-4">
                <GoogleMapsAutocomplete
                  onSelect={(selected) => {
                    setAddressForm({
                      address: selected.address,
                      latitude: selected.latitude,
                      longitude: selected.longitude
                    });
                  }}
                />

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Complete Address
                  </label>
                  <textarea
                    value={addressForm.address}
                    onChange={(e) => setAddressForm({...addressForm, address: e.target.value})}
                    placeholder="Enter your complete delivery address"
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white"
                    rows={3}
                  />
                </div>

                {addressForm.latitude && addressForm.longitude && (
                  <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
                    ✓ Location pinned on map
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveAddress}
                    disabled={loading}
                    className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Address'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingAddress(null);
                      setAddingAddress(false);
                      setAddressForm({ address: '', latitude: null, longitude: null });
                    }}
                    className="px-6 py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.length === 0 && (
                  <p className="text-sm text-neutral-400">
                    No delivery address saved yet. Click “Add Address” to save one.
                  </p>
                )}
                {addresses.map((addr) => (
                  <div key={addr.id} className="p-4 bg-neutral-800 rounded-xl">
                    <p className="text-white mb-2">{addr.address}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {addr.distanceKm !== null && (
                        <span className="text-neutral-400">
                          📍 {addr.distanceKm} km from restaurant
                        </span>
                      )}
                      {addr.withinServiceArea ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs">
                          ✓ Within Delivery Area
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs">
                          ⚠️ Outside Delivery Area
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phone Change Card */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-orange-500" />
                Phone Number
              </h2>
              {!changingPhone && (
                <button
                  onClick={() => setChangingPhone(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Change</span>
                </button>
              )}
            </div>

            {changingPhone ? (
              <div className="space-y-4">
                {phoneStep === 'enter' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        New Phone Number
                      </label>
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white"
                        maxLength={10}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSendPhoneOTP}
                        disabled={loading || newPhone.length !== 10}
                        className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50"
                      >
                        {loading ? 'Sending...' : 'Send OTP'}
                      </button>
                      <button
                        onClick={() => {
                          setChangingPhone(false);
                          setNewPhone('');
                        }}
                        className="px-6 py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Enter OTP sent to {newPhone}
                      </label>
                      <input
                        type="text"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit OTP"
                        className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-center text-2xl tracking-widest"
                        maxLength={6}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleVerifyPhoneOTP}
                        disabled={loading || phoneOtp.length !== 6}
                        className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50"
                      >
                        {loading ? 'Verifying...' : 'Verify OTP'}
                      </button>
                      <button
                        onClick={() => {
                          setPhoneStep('enter');
                          setPhoneOtp('');
                        }}
                        className="px-6 py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700"
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div>
                <p className="text-white font-medium text-lg">{customer.phone}</p>
                <p className="text-sm text-neutral-400 mt-1">
                  Change your phone number with OTP verification
                </p>
              </div>
            )}
          </div>

          {/* Password Change Card */}
          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-500" />
                Password
              </h2>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Change</span>
                </button>
              )}
            </div>

            {changingPassword ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
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
                    className="px-6 py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-white font-medium">••••••••</p>
                <p className="text-sm text-neutral-400 mt-1">
                  Change your password for security
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}