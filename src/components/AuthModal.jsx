// src/components/AuthModal.jsx - REDESIGNED AUTH FLOW
import { useState, useEffect, useRef } from 'react';
import { X, Phone, Lock, User, Mail, MapPin, Check, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleMapsAutocomplete from './GoogleMapsAutocomplete';
import { trackCompleteRegistration } from '../utils/analytics';

const STEPS = {
  // Returning user
  LOGIN: 'login',
  FORGOT_PASSWORD: 'forgot_password',
  FORGOT_PASSWORD_VERIFY_OTP: 'forgot_password_verify_otp',
  FORGOT_PASSWORD_CONFIRM: 'forgot_password_confirm',

  // New user registration
  PHONE_ENTRY: 'phone_entry',
  OTP_VERIFY: 'otp_verify',
  COMPLETE_REGISTRATION: 'complete_registration',
  SUCCESS: 'success',
};

// ── Step progress bar ────────────────────────────────────────────
const REG_STEPS = [STEPS.PHONE_ENTRY, STEPS.OTP_VERIFY, STEPS.COMPLETE_REGISTRATION];

// ── OTP Split Boxes ──────────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const refs = useRef([]);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const digitArr = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (idx, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    const newArr = [...digitArr];
    newArr[idx] = raw[raw.length - 1];
    onChange(newArr.join(''));
    if (idx < 5) setTimeout(() => refs.current[idx + 1]?.focus(), 0);
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newArr = [...digitArr];
      if (newArr[idx]) {
        newArr[idx] = '';
        onChange(newArr.join(''));
      } else if (idx > 0) {
        newArr[idx - 1] = '';
        onChange(newArr.join(''));
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  useEffect(() => {
    const firstEmpty = digitArr.findIndex(d => !d);
    refs.current[firstEmpty === -1 ? 5 : firstEmpty]?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex gap-2 sm:gap-3 justify-center my-2">
      {digitArr.map((d, i) => (
        <input
          key={i}
          ref={el => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => { setFocusedIdx(i); refs.current[i]?.select(); }}
          onBlur={() => setFocusedIdx(-1)}
          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl outline-none transition-all duration-150 text-white"
          style={{
            fontFamily: 'monospace, monospace',
            background: d ? 'rgba(245,158,11,0.12)' : '#161d2e',
            border: `2px solid ${focusedIdx === i ? '#F59E0B' : d ? 'rgba(245,158,11,0.45)' : '#2a3352'}`,
            boxShadow: focusedIdx === i ? '0 0 0 3px rgba(245,158,11,0.15)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

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

  // OTP Rate Limiting & Bot Protection
  const [otpCooldown, setOtpCooldown] = useState(0); // Seconds remaining
  const [otpCooldownTimer, setOtpCooldownTimer] = useState(null);

  const auth = useAuth();
  // Ref for scrollable container
  const scrollContainerRef = useRef(null);

  // ============================================
  // OTP COOLDOWN TIMER - MUST BE BEFORE EARLY RETURN
  // ============================================
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => {
        setOtpCooldown(otpCooldown - 1);
      }, 1000);
      setOtpCooldownTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Check for existing cooldown on mount
  useEffect(() => {
    if (!isOpen) return; // Skip if modal is closed

    const checkCooldown = (key) => {
      const cooldownEnd = localStorage.getItem(key);
      if (cooldownEnd) {
        const remaining = Math.floor((parseInt(cooldownEnd) - Date.now()) / 1000);
        if (remaining > 0) {
          setOtpCooldown(remaining);
        } else {
          localStorage.removeItem(key);
        }
      }
    };

    if (step === STEPS.PHONE_ENTRY) {
      checkCooldown('otp_cooldown_register');
    } else if (step === STEPS.FORGOT_PASSWORD) {
      checkCooldown('otp_cooldown_forgot');
    }
  }, [step, isOpen]);
  // Scroll to top when step changes - with multiple attempts to override autofocus
  useEffect(() => {
    // Immediate scroll
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    // Multiple delayed scrolls to override address field autofocus
    const scrollTimers = [
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 50),
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 150),
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 300),
      // Final aggressive scroll after keyboard might open (mobile)
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 500)
    ];

    return () => scrollTimers.forEach(timer => clearTimeout(timer));
  }, [step]);

  const startOtpCooldown = (type) => {
    const cooldownSeconds = 600; // 10 minutes
    const cooldownEnd = Date.now() + (cooldownSeconds * 1000);
    const key = type === 'register' ? 'otp_cooldown_register' : 'otp_cooldown_forgot';
    localStorage.setItem(key, cooldownEnd.toString());
    setOtpCooldown(cooldownSeconds);
  };

  // Early return AFTER all hooks
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

    // Check frontend cooldown
    if (otpCooldown > 0) {
      setError(`Please wait ${Math.floor(otpCooldown / 60)} minutes ${otpCooldown % 60} seconds before requesting another OTP`);
      return;
    }

    setLoading(true);
    try {
      await auth.sendOTP(phone);
      startOtpCooldown('register');
      setStep(STEPS.OTP_VERIFY);
    } catch (err) {
      const errorMsg = err.message || 'Failed to send OTP';

      // Handle rate limit errors from backend
      if (errorMsg.includes('cooldown') || errorMsg.includes('wait')) {
        // Extract minutes from error message if present
        const match = errorMsg.match(/(\d+)\s*minute/i);
        if (match) {
          const minutes = parseInt(match[1]);
          startOtpCooldown('register');
          setOtpCooldown(minutes * 60);
        }
      }

      setError(errorMsg);
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
        console.log('New user detected, moving to COMPLETE_REGISTRATION');
        setStep(STEPS.COMPLETE_REGISTRATION);
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
  // NEW USER: Complete Registration (All-in-One)
  // ============================================
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');

    // Validate username
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate name
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate email
    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    // Validate address
    if (!address || !address.address) {
      setError('Please select an address');
      return;
    }

    setLoading(true);
    try {
      console.log('[Registration] Step 1: Setting credentials...');
      await auth.setCredentials(tempToken, username, password);

      console.log('[Registration] Step 2: Completing profile...');
      await auth.completeProfile(tempToken, name, email);

      console.log('[Registration] Step 3: Setting address...');
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

      console.log('[Registration] Complete! Moving to success screen');
      trackCompleteRegistration('otp');
      setStep(STEPS.SUCCESS);
    } catch (err) {
      console.error('[Registration] Error:', err);
      setError(err.message || 'Registration failed');
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

    // Check frontend cooldown
    if (otpCooldown > 0) {
      setError(`Please wait ${Math.floor(otpCooldown / 60)} minutes ${otpCooldown % 60} seconds before requesting another OTP`);
      return;
    }

    setLoading(true);
    try {
      console.log('Sending OTP to:', phone);
      await auth.sendForgotPasswordOTP(phone);
      startOtpCooldown('forgot');

      setStep(STEPS.FORGOT_PASSWORD_VERIFY_OTP);
      console.log('Moved to OTP verify screen');
    } catch (err) {
      console.error('Error:', err.message);
      const errorMsg = err.message || 'Failed to send OTP';

      // Handle rate limit errors from backend
      if (errorMsg.includes('cooldown') || errorMsg.includes('wait')) {
        const match = errorMsg.match(/(\d+)\s*minute/i);
        if (match) {
          const minutes = parseInt(match[1]);
          startOtpCooldown('forgot');
          setOtpCooldown(minutes * 60);
        }
      }

      setError(errorMsg);
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
  // SHARED STYLE TOKENS
  // ============================================
  const inputClass = "w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-white/25 outline-none transition-colors text-sm";
  const inputStyle = { background: '#161d2e', border: '1.5px solid #2a3352' };
  const inputFocusStyle = (e) => {
    e.target.style.borderColor = '#F59E0B';
    e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.12)';
  };
  const inputBlurStyle = (e) => {
    e.target.style.borderColor = '#2a3352';
    e.target.style.boxShadow = 'none';
  };
  const inputWithRightPad = "w-full pl-11 pr-11 py-3.5 rounded-xl text-white placeholder-white/25 outline-none transition-colors text-sm";
  const primaryBtn = "w-full py-4 text-white font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm tracking-wide";
  const primaryBtnStyle = { background: '#E02424' };
  const secondaryBtn = "w-full py-3.5 text-white font-medium rounded-xl border transition-all text-sm";
  const secondaryBtnStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
  const labelClass = "block text-xs font-medium text-white/45 mb-1.5";
  const fieldCard = "rounded-2xl p-4 space-y-4";
  const fieldCardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
  const errorClass = "p-3 rounded-xl text-red-400 text-sm flex items-center gap-2";
  const errorStyle = { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' };
  const cooldownClass = "p-3 rounded-xl text-amber-400 text-sm flex items-center gap-2";
  const cooldownStyle = { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' };

  // ============================================
  // STEP PROGRESS INDICATOR
  // ============================================
  const renderStepProgress = () => {
    const currentIdx = REG_STEPS.indexOf(step);
    if (currentIdx === -1) return null;
    return (
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {REG_STEPS.map((s, i) => (
          <div
            key={s}
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: currentIdx >= i ? '2rem' : '1.25rem',
              background: currentIdx >= i ? '#F59E0B' : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>
    );
  };

  // ============================================
  // PASSWORD INPUT COMPONENT
  // ============================================
  const renderPasswordInput = (
    value,
    onChange,
    placeholder,
    showPwd,
    toggleShowPwd,
    label,
    showStrength = false,
    matchStatus = null
  ) => {
    const strength = showStrength ? getPasswordStrength(value) : null;

    return (
      <div>
        <label className={labelClass}>{label} <span className="text-red-400">*</span></label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={inputWithRightPad}
            style={inputStyle}
            onFocus={inputFocusStyle}
            onBlur={inputBlurStyle}
            required
            autoFocus={label === 'Password'}
          />
          <button
            type="button"
            onClick={toggleShowPwd}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Password Strength */}
        {showStrength && strength && strength.strength > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full transition-all rounded-full"
                style={{
                  width: `${strength.strength * 25}%`,
                  background: strength.strength === 1 ? '#ef4444' : strength.strength === 2 ? '#eab308' : strength.strength === 3 ? '#3b82f6' : '#22c55e',
                }}
              />
            </div>
            <span className={`text-xs font-medium ${strength.color}`}>{strength.text}</span>
          </div>
        )}

        {/* Match Status */}
        {matchStatus !== null && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {matchStatus === 'match' ? (
              <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-400">Passwords match</span></>
            ) : matchStatus === 'mismatch' ? (
              <><X className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-red-400">Passwords don&apos;t match</span></>
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
    <div className="space-y-5">
      {/* Brand header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🍛</div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Hungry Times</h1>
        <p className="text-white/35 text-sm">Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-3">
        <div>
          <label className={labelClass}>Username</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className={inputClass}
              style={inputStyle}
              onFocus={inputFocusStyle}
              onBlur={inputBlurStyle}
              required
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={inputClass}
              style={inputStyle}
              onFocus={inputFocusStyle}
              onBlur={inputBlurStyle}
              required
            />
          </div>
        </div>

        {error && (
          <div className={errorClass} style={errorStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={primaryBtn}
          style={primaryBtnStyle}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <span className="text-white/25 text-xs">or</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>

      <button
        onClick={() => { setStep(STEPS.PHONE_ENTRY); setError(''); }}
        className={secondaryBtn}
        style={secondaryBtnStyle}
      >
        Create New Account
      </button>

      <button
        onClick={() => { setStep(STEPS.FORGOT_PASSWORD); setError(''); }}
        className="w-full py-2 text-white/30 hover:text-amber-400 transition-colors text-sm"
      >
        Forgot Password?
      </button>
    </div>
  );

  const renderPhoneEntry = () => (
    <div className="space-y-5">
      <button
        onClick={() => setStep(STEPS.LOGIN)}
        className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {renderStepProgress()}

      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Phone className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Create Account</h2>
        <p className="text-white/35 text-sm">Enter your mobile number to get started</p>
      </div>

      <form onSubmit={handleSendOTP} className="space-y-3">
        <div>
          <label className={labelClass}>Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className={inputClass}
              style={inputStyle}
              onFocus={inputFocusStyle}
              onBlur={inputBlurStyle}
              required
              maxLength={10}
            />
          </div>
        </div>

        {error && (
          <div className={errorClass} style={errorStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {otpCooldown > 0 && (
          <div className={cooldownClass} style={cooldownStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Wait {Math.floor(otpCooldown / 60)}:{String(otpCooldown % 60).padStart(2, '0')} before requesting another OTP</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || phone.length !== 10 || otpCooldown > 0}
          className={primaryBtn}
          style={primaryBtnStyle}
        >
          {loading ? 'Sending…' : otpCooldown > 0 ? `Wait ${Math.floor(otpCooldown / 60)}:${String(otpCooldown % 60).padStart(2, '0')}` : 'Send OTP'}
        </button>
      </form>
    </div>
  );

  const renderOTPVerify = () => (
    <div className="space-y-5">
      <button
        onClick={() => { setStep(STEPS.PHONE_ENTRY); setOtp(''); setError(''); }}
        className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {renderStepProgress()}

      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Lock className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Verify Code</h2>
        <p className="text-white/35 text-sm">Enter the 6-digit code sent to</p>
        <p className="text-amber-400 font-semibold text-sm mt-0.5">+91 {phone}</p>
      </div>

      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div>
          <label className={`${labelClass} text-center`}>One-Time Password</label>
          <OTPInput value={otp} onChange={setOtp} />
        </div>

        {error && (
          <div className={errorClass} style={errorStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className={primaryBtn}
          style={primaryBtnStyle}
        >
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>

        <button
          type="button"
          onClick={handleSendOTP}
          className="w-full py-2 text-white/30 hover:text-amber-400 transition-colors text-sm disabled:opacity-50"
          disabled={loading}
        >
          Didn&apos;t receive it? Resend
        </button>
      </form>
    </div>
  );

  const renderCompleteRegistration = () => (
    <div className="space-y-4">
      <button
        onClick={() => { setStep(STEPS.OTP_VERIFY); setError(''); }}
        className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {renderStepProgress()}

      <div className="text-center mb-1">
        <h2 className="text-xl font-bold text-white mb-1">Complete Profile</h2>
        <p className="text-white/35 text-sm">A few details to finish setting up</p>
      </div>

      <form onSubmit={handleCompleteRegistration} className="space-y-3">
        {/* Login Credentials */}
        <div className={fieldCard} style={fieldCardStyle}>
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Login Credentials
          </p>

          <div>
            <label className={labelClass}>Username <span className="text-red-400">*</span></label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className={inputClass}
                style={inputStyle}
                onFocus={inputFocusStyle}
                onBlur={inputBlurStyle}
                required
              />
            </div>
          </div>

          {renderPasswordInput(
            password,
            (e) => setPassword(e.target.value),
            'Create a password (min 6 characters)',
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
              ? passwordsMatch ? 'match' : 'mismatch'
              : null
          )}
        </div>

        {/* Personal Info */}
        <div className={fieldCard} style={fieldCardStyle}>
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <User className="w-3 h-3" /> Personal Info
          </p>

          <div>
            <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
                style={inputStyle}
                onFocus={inputFocusStyle}
                onBlur={inputBlurStyle}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email <span className="text-red-400">*</span></label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
                style={inputStyle}
                onFocus={inputFocusStyle}
                onBlur={inputBlurStyle}
                required
              />
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className={fieldCard} style={fieldCardStyle}>
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Delivery Address
          </p>

          <div>
            <label className={labelClass}>Address <span className="text-red-400">*</span></label>
            <GoogleMapsAutocomplete
              onSelect={(selectedAddress) => {
                setAddress(selectedAddress);
                setError('');
              }}
            />
          </div>

          {address && (
            <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-green-400 text-sm break-words leading-snug">{address.address}</p>
            </div>
          )}
        </div>

        {error && (
          <div className={errorClass} style={errorStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={primaryBtn}
          style={primaryBtnStyle}
        >
          {loading ? 'Creating Account…' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-6 text-center py-4">
      <div className="relative inline-flex">
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)' }}>
          <Check className="w-10 h-10 text-green-400" />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-1">You&apos;re in!</h2>
        <p className="text-white/35 text-sm">Account created successfully</p>
      </div>

      {serviceAreaData && (
        <div className={`p-4 rounded-2xl ${serviceAreaData.withinServiceArea ? '' : ''}`} style={{
          background: serviceAreaData.withinServiceArea ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${serviceAreaData.withinServiceArea ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
        }}>
          <div className="flex items-start gap-3 text-left">
            {serviceAreaData.withinServiceArea ? (
              <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className={`font-semibold text-sm mb-1 ${serviceAreaData.withinServiceArea ? 'text-green-400' : 'text-amber-400'}`}>
                {serviceAreaData.withinServiceArea ? 'Within Delivery Area' : 'Outside Delivery Area'}
              </h3>
              <p className="text-sm text-white/50">
                {serviceAreaData.withinServiceArea
                  ? `You can order online. ${serviceAreaData.distanceKm}km from our restaurant.`
                  : <>Your address is {serviceAreaData.distanceKm}km away. Call <a href="tel:8420822919" className="text-amber-400 font-medium">8420822919</a> to order.</>
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSuccess}
        className={primaryBtn}
        style={primaryBtnStyle}
      >
        Browse Menu
      </button>
    </div>
  );

  // ============================================
  // FORGOT PASSWORD SCREENS
  // ============================================

  const renderForgotPassword = () => (
    <div className="space-y-5">
      <button
        onClick={() => setStep(STEPS.LOGIN)}
        className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </button>

      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Lock className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Reset Password</h2>
        <p className="text-white/35 text-sm">Enter your registered phone number</p>
      </div>

      <form onSubmit={handleForgotPasswordSendOTP} className="space-y-3">
        <div>
          <label className={labelClass}>Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className={inputClass}
              style={inputStyle}
              onFocus={inputFocusStyle}
              onBlur={inputBlurStyle}
              required
              maxLength={10}
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className={errorClass} style={errorStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {otpCooldown > 0 && (
          <div className={cooldownClass} style={cooldownStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Wait {Math.floor(otpCooldown / 60)}:{String(otpCooldown % 60).padStart(2, '0')}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || phone.length !== 10 || otpCooldown > 0}
          className={primaryBtn}
          style={primaryBtnStyle}
        >
          {loading ? 'Sending…' : otpCooldown > 0 ? `Wait ${Math.floor(otpCooldown / 60)}:${String(otpCooldown % 60).padStart(2, '0')}` : 'Send OTP'}
        </button>
      </form>
    </div>
  );

  const renderForgotPasswordVerifyOTP = () => (
    <div className="space-y-5">
      <button
        onClick={() => { setStep(STEPS.FORGOT_PASSWORD); setOtp(''); setError(''); }}
        className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Lock className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Verify Code</h2>
        <p className="text-white/35 text-sm">Code sent to</p>
        <p className="text-amber-400 font-semibold text-sm mt-0.5">+91 {phone}</p>
      </div>

      <form onSubmit={handleForgotPasswordVerifyOTP} className="space-y-4">
        <div>
          <label className={`${labelClass} text-center`}>One-Time Password</label>
          <OTPInput value={otp} onChange={setOtp} />
          <p className="text-center text-xs text-white/25 mt-2">Enter the 6-digit code from SMS</p>
        </div>

        {error && (
          <div className={errorClass} style={errorStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className={primaryBtn}
          style={primaryBtnStyle}
        >
          {loading ? 'Verifying…' : 'Verify Code'}
        </button>

        <button
          type="button"
          onClick={handleForgotPasswordSendOTP}
          className="w-full py-2 text-white/30 hover:text-amber-400 transition-colors text-sm disabled:opacity-50"
          disabled={loading}
        >
          Didn&apos;t receive it? Resend
        </button>
      </form>
    </div>
  );

  const renderForgotPasswordConfirm = () => (
    <div className="space-y-5">
      <button
        onClick={() => { setStep(STEPS.FORGOT_PASSWORD_VERIFY_OTP); setPassword(''); setConfirmPassword(''); setError(''); }}
        className="flex items-center gap-1.5 text-white/35 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <Check className="w-7 h-7 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">New Password</h2>
        <p className="text-white/35 text-sm mb-4">Identity verified</p>

        <div className="rounded-xl px-4 py-3 inline-block" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs text-white/30 mb-0.5">Account</p>
          <p className="text-amber-400 font-semibold">{forgotPasswordCustomer?.username || '…'}</p>
        </div>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-3">
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
            ? passwordsMatch ? 'match' : 'mismatch'
            : null
        )}

        {error && (
          <div className={errorClass} style={errorStyle}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !canResetPassword}
          className={primaryBtn}
          style={primaryBtnStyle}
        >
          {loading ? 'Resetting…' : 'Reset Password'}
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
      case STEPS.COMPLETE_REGISTRATION:
        return renderCompleteRegistration();
      case STEPS.SUCCESS:
        return renderSuccess();
      default:
        return renderLogin();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-end md:items-center justify-center z-50"
      style={{ background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(12px)' }}
      onClick={step !== STEPS.SUCCESS ? handleClose : undefined}
    >
      <div
        className="w-full md:max-w-md relative flex flex-col h-[95vh] md:h-auto md:max-h-[88vh] rounded-t-3xl md:rounded-2xl"
        style={{
          background: '#0D1117',
          border: '1px solid rgba(245,158,11,0.1)',
          boxShadow: '0 0 0 1px rgba(245,158,11,0.06), 0 32px 80px rgba(0,0,0,0.85)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Close Button */}
        {step !== STEPS.SUCCESS && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors z-10 text-white/30 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Content Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-6 pt-6 pb-24 md:px-8 md:pb-8"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
