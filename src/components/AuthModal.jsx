// src/components/AuthModal.jsx - COMPLETE AUTH FLOW WITH PASSWORD CONFIRMATION
import { useState } from 'react';
import { X, Phone, Lock, User, Mail, MapPin, Check, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleMapsAutocomplete from './GoogleMapsAutocomplete';

const STEPS = {
  // Returning user
  LOGIN: 'login',
  FORGOT_PASSWORD: 'forgot_password',
  FORGOT_PASSWORD_VERIFY_OTP: 'forgot_password_verify_otp',
  FORGOT_PASSWORD_CONFIRM: 'forgot_password_confirm',
  
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState(null);
  const [tempToken, setTempToken] = useState('');
  const [serviceAreaData, setServiceAreaData] = useState(null);
  const [forgotPasswordCustomer, setForgotPasswordCustomer] = useState(null);

  const auth = useAuth();

  if (!isOpen) return null;

  const resetForm = () => {
    setStep(STEPS.LOGIN);
    setPhone('');
    setOtp('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setName('');
    setEmail('');
    setAddress(null);
    setTempToken('');
    setError('');
    setServiceAreaData(null);
    setForgotPasswordCustomer(null);
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
  // PASSWORD VALIDATION HELPERS
  // ============================================
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, text: '' };
    if (pwd.length < 6) return { strength: 1, text: 'Too short', color: 'text-red-400' };
    if (pwd.length < 8) return { strength: 2, text: 'Weak', color: 'text-yellow-400' };
    if (pwd.length < 12) return { strength: 3, text: 'Good', color: 'text-blue-400' };
    return { strength: 4, text: 'Strong', color: 'text-green-400' };
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordValid = password.length >= 6 && confirmPassword.length >= 6;
  const canResetPassword = passwordsMatch && passwordValid;

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
      console.log('Verifying OTP for phone:', phone);
      const result = await auth.verifyOTP(phone, otp);
      console.log('OTP Verify Result:', result);
      
      setTempToken(result.tempToken);
      
      if (result.isNewUser) {
        console.log('New user detected, moving to SET_CREDENTIALS');
        setStep(STEPS.SET_CREDENTIALS);
      } else {
        console.log('Returning user, completing login');
        handleSuccess();
      }
    } catch (err) {
      console.error('OTP Verification Error:', err);
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
  // FORGOT PASSWORD: Step 1 - Send OTP
  // ============================================
  const handleForgotPasswordSendOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending OTP to:', phone);
      await auth.sendForgotPasswordOTP(phone);
      
      setStep(STEPS.FORGOT_PASSWORD_VERIFY_OTP);
      console.log('Moved to OTP verify screen');
    } catch (err) {
      console.error('Error:', err.message);
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FORGOT PASSWORD: Step 2 - Verify OTP
  // ============================================
  const handleForgotPasswordVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying OTP');
      const result = await auth.verifyForgotPasswordOTP(phone, otp);
      
      setTempToken(result.tempToken);
      setForgotPasswordCustomer(result.customer);
      
      console.log('OTP verified, got customer:', result.customer.username);
      
      setStep(STEPS.FORGOT_PASSWORD_CONFIRM);
      
    } catch (err) {
      console.error('OTP Verification Error:', err);
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FORGOT PASSWORD: Step 3 - Reset Password
  // ============================================
  const handleResetPassword = async (e) => {
  e.preventDefault();
  setError('');

  if (!password || !confirmPassword) {
    setError('Both password fields are required');
    return;
  }

  if (password.length < 6) {
    setError('Password must be at least 6 characters');
    return;
  }

  if (password !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  setLoading(true);
  try {
    console.log('Resetting password');
    const result = await auth.resetForgotPassword(tempToken, password, confirmPassword);
    
    console.log('Password reset successfully');
    console.log('Customer auto-logged in:', result.customer);
    
    setError('');
    
    // ✅ CALL handleSuccess TO CLOSE MODAL AND TRIGGER ONLOGIN (NEW)
    handleSuccess();  // This closes the modal and calls onSuccess callback
    
  } catch (err) {
    console.error('Reset Error:', err);
    setError(err.message || 'Failed to reset password');
  } finally {
    setLoading(false);
  }
};

  // ============================================
  // PASSWORD INPUT COMPONENT
  // ============================================
  const renderPasswordInput = (
    value,
    onChange,
    placeholder,
    showPassword,
    toggleShowPassword,
    label,
    showStrength = false,
    matchStatus = null
  ) => {
    const strength = showStrength ? getPasswordStrength(value) : null;

    return (
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          {label} <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full pl-10 pr-12 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
            autoFocus={label === 'Password'}
          />
          <button
            type="button"
            onClick={toggleShowPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {showStrength && strength && strength.strength > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  strength.strength === 1
                    ? 'w-1/4 bg-red-500'
                    : strength.strength === 2
                    ? 'w-1/2 bg-yellow-500'
                    : strength.strength === 3
                    ? 'w-3/4 bg-blue-500'
                    : 'w-full bg-green-500'
                }`}
              />
            </div>
            <span className={`text-xs font-medium ${strength.color}`}>
              {strength.text}
            </span>
          </div>
        )}

        {/* Match Status Indicator */}
        {matchStatus !== null && (
          <div className="mt-2 flex items-center gap-2">
            {matchStatus === 'match' ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-400">Passwords match</span>
              </>
            ) : matchStatus === 'mismatch' ? (
              <>
                <X className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-400">Passwords don't match</span>
              </>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderLogin = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Hungry Times</h1>
        <p className="text-neutral-400">Welcome back!</p>
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-neutral-900 text-neutral-400">Or</span>
        </div>
      </div>

      <button
        onClick={() => {
          setStep(STEPS.PHONE_ENTRY);
          setError('');
        }}
        className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl transition-colors"
      >
        Create New Account
      </button>

      <button
        onClick={() => {
          setStep(STEPS.FORGOT_PASSWORD);
          setError('');
        }}
        className="w-full py-2 text-neutral-400 hover:text-orange-400 transition-colors text-sm"
      >
        Forgot Password?
      </button>
    </div>
  );

  const renderPhoneEntry = () => (
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
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </button>
      </form>
    </div>
  );

  const renderOTPVerify = () => (
    <div className="space-y-6">
      <button
        onClick={() => {
          setStep(STEPS.PHONE_ENTRY);
          setOtp('');
          setError('');
        }}
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
        <p className="text-orange-400 font-semibold">+91 {phone}</p>
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
            placeholder="000000"
            maxLength="6"
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-2xl tracking-widest font-mono"
            required
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
          className="w-full py-2 text-neutral-400 hover:text-white transition-colors text-sm disabled:opacity-50"
          disabled={loading}
        >
          Didn't receive code? Resend
        </button>
      </form>
    </div>
  );

  const renderSetCredentials = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Create Username & Password</h2>
        <p className="text-neutral-400">These will be used to log in</p>
      </div>

      <form onSubmit={handleSetCredentials} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Username <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>
        </div>

        {renderPasswordInput(
          password,
          (e) => setPassword(e.target.value),
          'Create a strong password',
          showPassword,
          () => setShowPassword(!showPassword),
          'Password',
          true
        )}

        {renderPasswordInput(
          confirmPassword,
          (e) => setConfirmPassword(e.target.value),
          'Confirm your password',
          showConfirmPassword,
          () => setShowConfirmPassword(!showConfirmPassword),
          'Confirm Password',
          false,
          password && confirmPassword
            ? passwordsMatch
              ? 'match'
              : 'mismatch'
            : null
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !passwordsMatch || !passwordValid}
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
        <h2 className="text-2xl font-bold text-white mb-2">Profile Information</h2>
        <p className="text-neutral-400">Help us know you better</p>
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
                  ? 'Within Delivery Area' 
                  : 'Outside Delivery Area'}
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

  // ============================================
  // FORGOT PASSWORD SCREENS
  // ============================================

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
        <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-neutral-400">Enter your phone number to get started</p>
      </div>

      <form onSubmit={handleForgotPasswordSendOTP} className="space-y-4">
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
              autoFocus
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
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </button>
      </form>
    </div>
  );

  const renderForgotPasswordVerifyOTP = () => (
    <div className="space-y-6">
      <button
        onClick={() => {
          setStep(STEPS.FORGOT_PASSWORD);
          setOtp('');
          setError('');
        }}
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
        <p className="text-orange-400 font-semibold">+91 {phone}</p>
      </div>

      <form onSubmit={handleForgotPasswordVerifyOTP} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            OTP Code
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength="6"
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-2xl tracking-widest font-mono"
            required
            autoFocus
          />
          <p className="text-xs text-neutral-500 mt-2">
            Enter the 6-digit code from your SMS
          </p>
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
          onClick={handleForgotPasswordSendOTP}
          className="w-full py-2 text-neutral-400 hover:text-white transition-colors text-sm disabled:opacity-50"
          disabled={loading}
        >
          Didn't receive code? Resend
        </button>
      </form>
    </div>
  );

  const renderForgotPasswordConfirm = () => (
    <div className="space-y-6">
      <button
        onClick={() => {
          setStep(STEPS.FORGOT_PASSWORD_VERIFY_OTP);
          setPassword('');
          setConfirmPassword('');
          setError('');
        }}
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Create New Password</h2>
        <p className="text-neutral-400 mb-4">Account verified for password reset</p>
        
        <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 mb-6">
          <p className="text-sm text-neutral-400 mb-1">Username</p>
          <p className="text-lg font-semibold text-orange-400">
            {forgotPasswordCustomer?.username || 'Loading...'}
          </p>
        </div>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        {renderPasswordInput(
          password,
          (e) => setPassword(e.target.value),
          'Enter new password',
          showPassword,
          () => setShowPassword(!showPassword),
          'Password',
          true
        )}

        {renderPasswordInput(
          confirmPassword,
          (e) => setConfirmPassword(e.target.value),
          'Confirm your password',
          showConfirmPassword,
          () => setShowConfirmPassword(!showConfirmPassword),
          'Confirm Password',
          false,
          password && confirmPassword
            ? passwordsMatch
              ? 'match'
              : 'mismatch'
            : null
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canResetPassword}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
        >
          {loading ? 'Resetting Password...' : 'Reset Password'}
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
      case STEPS.FORGOT_PASSWORD:
        return renderForgotPassword();
      case STEPS.FORGOT_PASSWORD_VERIFY_OTP:
        return renderForgotPasswordVerifyOTP();
      case STEPS.FORGOT_PASSWORD_CONFIRM:
        return renderForgotPasswordConfirm();
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
      default:
        return renderLogin();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4" onClick={step !== STEPS.SUCCESS ? handleClose : undefined}>
      <div 
        className="bg-neutral-900 w-full md:max-w-md rounded-t-2xl md:rounded-2xl relative border-0 md:border border-neutral-800 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {step !== STEPS.SUCCESS && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-6 md:p-8">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}