// context/AuthContext.jsx - COMPLETE CUSTOMER AUTH FLOW WITH FORGOT PASSWORD
import { createContext, useContext, useState, useEffect } from 'react';
import { resubscribeOnLogin } from '../App';
import API_BASE from '../config/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('customerToken'));

  // Check if customer is authenticated on mount
  useEffect(() => {
    if (token) {
      fetchCustomer();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`${API_BASE}/customer/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      } else {
        const error = await res.json();
        // If token expired, clear it
        if (error.code === 'TOKEN_EXPIRED') {
          logout();
        }
      }
    } catch (err) {
      console.error('Failed to fetch customer:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login function that stores token and re-subscribes to push
   */
    const login = async (customer, newToken) => {
    console.log('[Auth] Logging in customer:', customer.phone);
    
    localStorage.setItem('customerToken', newToken);
    setToken(newToken);
    setCustomer(customer);
    
    // ✅ FETCH COMPLETE PROFILE FROM SERVER
    console.log('[Auth] Fetching complete customer profile...');
    try {
      const res = await fetch(`${API_BASE}/customer/auth/me`, {
        headers: {
          'Authorization': `Bearer ${newToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[Auth] Complete profile fetched:', data.customer.phone);
        setCustomer(data.customer);  // ✅ UPDATE WITH COMPLETE PROFILE
      }
    } catch (err) {
      console.error('[Auth] Failed to fetch complete profile:', err);
      // Continue with partial profile if fetch fails
    }
    
    // Re-subscribe to push notifications with customer account
    console.log('[Auth] Re-subscribing to push notifications...');
    setTimeout(() => {
      resubscribeOnLogin()
        .then(success => {
          if (success) {
            console.log('[Auth] Push re-subscription successful');
          } else {
            console.warn('[Auth] Push re-subscription had issues but login succeeded');
          }
        })
        .catch(err => {
          console.error('[Auth] Push re-subscription error:', err);
          // Don't fail login if push fails
        });
    }, 500);
  };

  // ============================================
  // STEP 1: SEND OTP
  // ============================================
  const sendOTP = async (phone) => {
    console.log('[Auth] Sending OTP to:', phone);
    
    const res = await fetch(`${API_BASE}/customer/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to send OTP');
    }

    console.log('[Auth] OTP sent successfully');
    return await res.json();
  };

  // ============================================
  // STEP 2: VERIFY OTP
  // ============================================
  const verifyOTP = async (phone, otp) => {
    console.log('[Auth] Verifying OTP for:', phone);
    
    const res = await fetch(`${API_BASE}/customer/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Auth] OTP verification failed:', error);
      throw new Error(error.error || 'Failed to verify OTP');
    }

    const data = await res.json();
    console.log('[Auth] OTP verified successfully');
    
    return {
      tempToken: data.tempToken,
      customer: data.customer,
      isNewUser: data.customer?.isNewUser
    };
  };

  // ============================================
  // STEP 3: SET USERNAME & PASSWORD
  // ============================================
  const setCredentials = async (tempToken, username, password) => {
    console.log('[Auth] Setting credentials for username:', username);
    
    const res = await fetch(`${API_BASE}/customer/auth/set-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`
      },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Auth] Failed to set credentials:', error);
      throw new Error(error.error || 'Failed to set credentials');
    }

    console.log('[Auth] Credentials set successfully');
    return await res.json();
  };

  // ============================================
  // STEP 4: COMPLETE PROFILE (Name + Email)
  // ============================================
  const completeProfile = async (tempToken, name, email) => {
    console.log('[Auth] Completing profile for:', name);
    
    const res = await fetch(`${API_BASE}/customer/auth/complete-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`
      },
      body: JSON.stringify({ name, email })
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Auth] Failed to complete profile:', error);
      throw new Error(error.error || 'Failed to complete profile');
    }

    console.log('[Auth] Profile completed');
    return await res.json();
  };

  // ============================================
  // STEP 5: SET ADDRESS & COMPLETE REGISTRATION
  // ============================================
  const setAddress = async (tempToken, address, latitude, longitude) => {
    console.log('[Auth] Setting address:', address);
    
    const res = await fetch(`${API_BASE}/customer/auth/set-address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempToken}`
      },
      body: JSON.stringify({ address, latitude, longitude })
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Auth] Failed to set address:', error);
      throw new Error(error.error || 'Failed to set address');
    }

    const data = await res.json();
    console.log('[Auth] Address set, registration complete');
    
    // Registration complete - store final token and call login
    if (data.customer && data.token) {
      await login(data.customer, data.token);
    }
    
    return data;
  };

  // ============================================
  // USERNAME/PASSWORD LOGIN (Returning customers)
  // ============================================
  const loginWithPassword = async (username, password) => {
    console.log('[Auth] Attempting login for username:', username);
    
    const res = await fetch(`${API_BASE}/customer/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Auth] Login failed:', error);
      throw new Error(error.error || 'Login failed');
    }

    const data = await res.json();
    console.log('[Auth] Login successful');
    
    // login() will handle push re-subscription
    await login(data.customer, data.token);
    return data;
  };

  // ============================================
  // FORGOT PASSWORD - STEP 1: SEND OTP
  // ============================================
  const sendForgotPasswordOTP = async (phone) => {
    console.log('[Auth] Sending forgot password OTP to:', phone);
    
    const res = await fetch(`${API_BASE}/customer/auth/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Auth] Failed to send forgot password OTP:', error);
      throw new Error(error.error || 'Failed to send OTP');
    }

    console.log('[Auth] Forgot password OTP sent');
    return await res.json();
  };

  // ============================================
  // FORGOT PASSWORD - STEP 2: VERIFY OTP
  // ============================================
  const verifyForgotPasswordOTP = async (phone, otp) => {
    console.log('[Auth] Verifying forgot password OTP for:', phone);
    
    const res = await fetch(`${API_BASE}/customer/auth/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('[Auth] Forgot password OTP verification failed:', error);
      throw new Error(error.error || 'OTP verification failed');
    }

    const data = await res.json();
    console.log('[Auth] Forgot password OTP verified, temp token received');
    
    return {
      tempToken: data.tempToken,
      customer: data.customer,
      message: data.message
    };
  };

  // ============================================
  // FORGOT PASSWORD - STEP 3: RESET PASSWORD
  // ============================================
  const resetForgotPassword = async (tempToken, newPassword, confirmPassword) => {
  console.log('[Auth] Resetting password...');
  
  const res = await fetch(`${API_BASE}/customer/auth/forgot-password/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tempToken}`
    },
    body: JSON.stringify({ newPassword, confirmPassword })
  });

  if (!res.ok) {
    const error = await res.json();
    console.error('[Auth] Password reset failed:', error);
    throw new Error(error.error || 'Failed to reset password');
  }

  const data = await res.json();
  console.log('[Auth] Password reset successfully');
  
  // ✅ AUTO-LOGIN THE CUSTOMER (NEW)
  if (data.token && data.customer) {
    await login(data.customer, data.token);
    console.log('[Auth] Customer auto-logged in after password reset');
  }
  
  return {
    token: data.token,
    customer: data.customer,
    message: data.message
  };
};

  // ============================================
  // LOGOUT
  // ============================================
  const logout = async () => {
    console.log('[Auth] Logging out...');
    
    if (token) {
      try {
        await fetch(`${API_BASE}/customer/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('[Auth] Logout error:', err);
        // Continue with local logout even if backend fails
      }
    }

    localStorage.removeItem('customerToken');
    setToken(null);
    setCustomer(null);
    console.log('[Auth] Logged out');
  };

  const value = {
    customer,
    loading,
    isAuthenticated: !!customer,
    token,
    
    // Registration flow
    sendOTP,
    verifyOTP,
    setCredentials,
    completeProfile,
    setAddress,
    
    // Login flows
    loginWithPassword,
    login,
    
    // Forgot password
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetForgotPassword,
    
    // Logout
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}