// pages/Profile.jsx - FIXED: Proper token persistence after address update
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
  const { customer, isAuthenticated, logout, token, login } = useAuth();
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
        isPrimary: true
      }]);
    }
  };

  // ============================================
  // UPDATE ADDRESS - WITH TOKEN PERSISTENCE FIX
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
      
      // ✅ FIX: Store updated customer data and token
      if (data.customer && data.token) {
        console.log('✅ [Profile] Storing token after address update');
        login(data.customer, data.token);
        localStorage.setItem('customerToken', data.token);
      }
      
      setSuccess(
        data.customer.withinServiceArea 
          ? 'Address updated successfully!' 
          : 'Address updated! Note: Outside delivery area (>3.5km)'
      );
      
      setEditingAddress(null);
      setAddingAddress(false);
      
      // Don't reload - token is now in localStorage, just update state
      setAddresses([{
        id: 1,
        address: addressForm.address,
        latitude: addressForm.latitude,
        longitude: addressForm.longitude,
        isPrimary: true
      }]);
      
      setAddressForm({ address: '', latitude: null, longitude: null });
      
    } catch (err) {
      setError(err.message);
      console.error('Address save error:', err);
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
    if (!phoneOtp) {
      setError('Please enter OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/customer/auth/change-phone/verify-otp`, {
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
      
      // Reload to get updated customer data
      setTimeout(() => window.location.reload(), 1500);
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
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError('Please fill all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
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
        throw new Error(err.error || 'Password change failed');
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

  // ============================================
  // PROFILE UPDATE
  // ============================================
  const handleUpdateProfile = async () => {
    setError('');
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
      
      // Reload to get updated customer data
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your account information and preferences</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300">{success}</p>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
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
                <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Username</label>
                <input
                  type="text"
                  value={profileData.username}
                  disabled
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save'}
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
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">Full Name</p>
                <p className="text-white font-medium">{customer?.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white font-medium">{customer?.email || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Username</p>
                <p className="text-white font-medium">@{customer?.username || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-white font-medium">{customer?.phone || 'Not set'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Address Management */}
        <div className="bg-neutral-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Delivery Address
            </h2>
            {!addingAddress && (
              <button
                onClick={() => setAddingAddress(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            )}
          </div>

          {addingAddress ? (
            <div className="space-y-4">
              <GoogleMapsAutocomplete
                value={addressForm.address}
                onChange={(address, lat, lng) => setAddressForm({
                  address,
                  latitude: lat,
                  longitude: lng
                })}
              />

              <div className="flex gap-3">
                <button
                  onClick={handleSaveAddress}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  onClick={() => {
                    setAddingAddress(false);
                    setAddressForm({ address: '', latitude: null, longitude: null });
                  }}
                  className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.length > 0 ? (
                addresses.map((addr, idx) => (
                  <div key={idx} className="p-4 bg-neutral-700 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">{addr.address}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {addr.latitude?.toFixed(4)}, {addr.longitude?.toFixed(4)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingAddress(idx);
                          setAddressForm(addr);
                        }}
                        className="text-orange-400 hover:text-orange-300"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No address saved yet</p>
              )}
            </div>
          )}
        </div>

        {/* Phone Management */}
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

        {/* Password Management */}
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

        {/* Logout Button */}
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