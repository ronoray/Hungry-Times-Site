// src/components/AuthModal.jsx - COMPLETE AUTH FLOW
import { useState } from 'react';
import { X, Phone, Lock, User, Mail, MapPin, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleMapsAutocomplete from './GoogleMapsAutocomplete';

const STEPS = {
  // Returning user
  LOGIN: 'login',
  FORGOT_PASSWORD: 'forgot_password',
  
  // New user registration
  PHONE_ENTRY: 'phone_entry',
  OTP_VERIFY: 'otp_verify',
  SET_CREDENTIALS: 'set_credentials',
  PROFILE_INFO: 'profile_info',
  ADDRESS_ENTRY: 'address_entry',
  SUCCESS: 'success',
};

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(STEPS.LOGIN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState(null);
  const [tempToken, setTempToken] = useState('');
  const [serviceAreaData, setServiceAreaData] = useState(null);

  const auth = useAuth();

  if (!isOpen) return null;

  const resetForm = () => {
    setStep(STEPS.LOGIN);
    setPhone('');
    setOtp('');
    setUsername('');
    setPassword('');
    setName('');
    setEmail('');
    setAddress(null);
    setTempToken('');
    setError('');
    setServiceAreaData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSuccess = () => {
    resetForm();
    if (onSuccess) onSuccess();
    onClose();
  };

  // ============================================
  // RETURNING USER: Login with Username/Password
  // ============================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await auth.loginWithPassword(username, password);
      handleSuccess();
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // NEW USER: Step 1 - Send OTP
  // ============================================
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await auth.sendOTP(phone);
      setStep(STEPS.OTP_VERIFY);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // NEW USER: Step 2 - Verify OTP
  // ============================================
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Verifying OTP for phone:', phone);
      const result = await auth.verifyOTP(phone, otp);
      console.log('✅ OTP Verify Result:', result);
      console.log('📝 isNewUser:', result.isNewUser);
      console.log('🎫 tempToken:', result.tempToken ? 'Present' : 'Missing');
      
      setTempToken(result.tempToken);
      
      if (result.isNewUser) {
        console.log('🆕 New user detected, moving to SET_CREDENTIALS');
        setStep(STEPS.SET_CREDENTIALS);
      } else {
        console.log('👤 Returning user, completing login');
        // Returning user verified via OTP, complete login
        handleSuccess();
      }
    } catch (err) {
      console.error('❌ OTP Verification Error:', err);
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // NEW USER: Step 3 - Set Username & Password
  // ============================================
  const handleSetCredentials = async (e) => {
    e.preventDefault();
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await auth.setCredentials(tempToken, username, password);
      setStep(STEPS.PROFILE_INFO);
    } catch (err) {
      setError(err.message || 'Failed to set credentials');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // NEW USER: Step 4 - Complete Profile
  // ============================================
  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    setLoading(true);
    try {
      await auth.completeProfile(tempToken, name, email);
      setStep(STEPS.ADDRESS_ENTRY);
    } catch (err) {
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // NEW USER: Step 5 - Set Address
  // ============================================
  const handleSetAddress = async () => {
    setError('');

    if (!address || !address.address) {
      setError('Please select an address');
      return;
    }

    setLoading(true);
    try {
      const result = await auth.setAddress(
        tempToken,
        address.address,
        address.latitude,
        address.longitude
      );

      // Store service area data
      setServiceAreaData({
        withinServiceArea: result.customer.withinServiceArea,
        distanceKm: result.customer.distanceKm,
      });

      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.message || 'Failed to set address');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FORGOT PASSWORD: Send OTP
  // ============================================
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await auth.sendForgotPasswordOTP(phone);
      setStep(STEPS.OTP_VERIFY);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderLogin = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back!</h2>
        <p className="text-neutral-400">Login to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="text-center space-y-2">
        <button
          onClick={() => {
            setError('');
            setStep(STEPS.FORGOT_PASSWORD);
          }}
          className="text-orange-400 hover:text-orange-300 text-sm"
        >
          Forgot Password?
        </button>
        <div className="text-neutral-400 text-sm">
          Don't have an account?{' '}
          <button
            onClick={() => {
              setError('');
              setStep(STEPS.PHONE_ENTRY);
            }}
            className="text-orange-400 hover:text-orange-300 font-medium"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );

  const renderPhoneEntry = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-neutral-400">Enter your phone number to get started</p>
      </div>

      <form onSubmit={handleSendOTP} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
              maxLength={10}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">We'll send you a verification code</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || phone.length !== 10}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send OTP'}
        </button>
      </form>

      <div className="text-center text-neutral-400 text-sm">
        Already have an account?{' '}
        <button
          onClick={() => {
            setError('');
            setStep(STEPS.LOGIN);
          }}
          className="text-orange-400 hover:text-orange-300 font-medium"
        >
          Login
        </button>
      </div>
    </div>
  );

  const renderOTPVerify = () => (
    <div className="space-y-6">
      <button
        onClick={() => setStep(STEPS.PHONE_ENTRY)}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Verify OTP</h2>
        <p className="text-neutral-400">Enter the 6-digit code sent to</p>
        <p className="text-white font-medium">+91 {phone}</p>
      </div>

      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            OTP Code
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit OTP"
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-center text-2xl tracking-widest placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
            maxLength={6}
            autoFocus
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>

        <button
          type="button"
          onClick={handleSendOTP}
          className="w-full text-sm text-orange-400 hover:text-orange-300"
        >
          Didn't receive code? Resend OTP
        </button>
      </form>
    </div>
  );

  const renderSetCredentials = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Create Login</h2>
        <p className="text-neutral-400">Set your username and password</p>
      </div>

      <form onSubmit={handleSetCredentials} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="Choose a username"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
              minLength={3}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">Lowercase letters, numbers, and underscores only</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
              minLength={6}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">At least 6 characters</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  );

  const renderProfileInfo = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Details</h2>
        <p className="text-neutral-400">Tell us a bit about yourself</p>
      </div>

      <form onSubmit={handleCompleteProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Full Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Email Address <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  );

  const renderAddressEntry = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Delivery Address</h2>
        <p className="text-neutral-400">Where should we deliver your order?</p>
      </div>

      <GoogleMapsAutocomplete
        onSelect={(selectedAddress) => {
          setAddress(selectedAddress);
          setError('');
        }}
      />

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSetAddress}
        disabled={loading || !address}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
      >
        {loading ? 'Completing Registration...' : 'Complete Registration'}
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
        <Check className="w-10 h-10 text-green-500" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Hungry Times!</h2>
        <p className="text-neutral-400">Your account has been created successfully</p>
      </div>

      {/* Service Area Status */}
      {serviceAreaData && (
        <div className={`p-4 rounded-xl border-2 ${
          serviceAreaData.withinServiceArea
            ? 'bg-green-500/10 border-green-500/50'
            : 'bg-yellow-500/10 border-yellow-500/50'
        }`}>
          <div className="flex items-start gap-3">
            {serviceAreaData.withinServiceArea ? (
              <Check className="w-6 h-6 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            )}
            <div className="text-left">
              <h3 className={`font-semibold mb-1 ${
                serviceAreaData.withinServiceArea ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {serviceAreaData.withinServiceArea 
                  ? '✅ Within Delivery Area' 
                  : '⚠️ Outside Delivery Area'}
              </h3>
              <p className="text-sm text-neutral-300">
                {serviceAreaData.withinServiceArea ? (
                  <>You can place orders online. Your address is {serviceAreaData.distanceKm}km from our restaurant.</>
                ) : (
                  <>Your address is {serviceAreaData.distanceKm}km away. Please call us at <a href="tel:8420822919" className="text-orange-400 font-medium">8420822919</a> to place orders.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSuccess}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all"
      >
        Start Browsing Menu
      </button>
    </div>
  );

  const renderForgotPassword = () => (
    <div className="space-y-6">
      <button
        onClick={() => setStep(STEPS.LOGIN)}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </button>

      <div className="text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
        <p className="text-neutral-400">Enter your phone number to reset</p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
              maxLength={10}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || phone.length !== 10}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Reset Code'}
        </button>
      </form>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  const renderStep = () => {
    switch (step) {
      case STEPS.LOGIN:
        return renderLogin();
      case STEPS.PHONE_ENTRY:
        return renderPhoneEntry();
      case STEPS.OTP_VERIFY:
        return renderOTPVerify();
      case STEPS.SET_CREDENTIALS:
        return renderSetCredentials();
      case STEPS.PROFILE_INFO:
        return renderProfileInfo();
      case STEPS.ADDRESS_ENTRY:
        return renderAddressEntry();
      case STEPS.SUCCESS:
        return renderSuccess();
      case STEPS.FORGOT_PASSWORD:
        return renderForgotPassword();
      default:
        return renderLogin();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-8 relative border border-neutral-800 max-h-[90vh] overflow-y-auto">
        {/* Close Button (hidden on success screen) */}
        {step !== STEPS.SUCCESS && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {renderStep()}
      </div>
    </div>
  );
}