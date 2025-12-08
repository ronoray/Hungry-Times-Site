// context/AuthContext.jsx - COMPLETE CUSTOMER AUTH FLOW
import { createContext, useContext, useState, useEffect } from 'react';
import API_BASE from '../config/api'; // adjust relative path if needed

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

  const login = (customer, token) => {
    localStorage.setItem('customerToken', token);
    setToken(token);
    setCustomer(customer);
  };

  // ============================================
  // STEP 1: SEND OTP
  // ============================================
  const sendOTP = async (phone) => {
    const res = await fetch(`${API_BASE}/customer/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to send OTP');
    }

    return await res.json();
  };

  // ============================================
  // STEP 2: VERIFY OTP
  // ============================================
  const verifyOTP = async (phone, otp) => {
    console.log('🔐 AuthContext: Verifying OTP', { phone, otp });
    
    const res = await fetch(`${API_BASE}/customer/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });

    console.log('📡 AuthContext: Response status:', res.status);

    if (!res.ok) {
      const error = await res.json();
      console.error('❌ AuthContext: Error response:', error);
      throw new Error(error.error || 'Failed to verify OTP');
    }

    const data = await res.json();
    console.log('📦 AuthContext: Response data:', data);
    
    // Store temporary token for profile completion
    const result = {
      tempToken: data.tempToken,
      customer: data.customer,
      isNewUser: data.customer.isNewUser
    };
    
    console.log('✨ AuthContext: Returning result:', result);
    return result;
  };

  // ============================================
  // STEP 3: SET USERNAME & PASSWORD
  // ============================================
  const setCredentials = async (tempToken, username, password) => {
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
      throw new Error(error.error || 'Failed to set credentials');
    }

    return await res.json();
  };

  // ============================================
  // STEP 4: COMPLETE PROFILE (Name + Email)
  // ============================================
  const completeProfile = async (tempToken, name, email) => {
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
      throw new Error(error.error || 'Failed to complete profile');
    }

    return await res.json();
  };

  // ============================================
  // STEP 5: SET ADDRESS & COMPLETE REGISTRATION
  // ============================================
  const setAddress = async (tempToken, address, latitude, longitude) => {
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
      throw new Error(error.error || 'Failed to set address');
    }

    const data = await res.json();
    
    // Registration complete - store final token
    login(data.customer, data.token);
    
    return data;
  };

  // ============================================
  // USERNAME/PASSWORD LOGIN (Returning customers)
  // ============================================
  const loginWithPassword = async (username, password) => {
    const res = await fetch(`${API_BASE}/customer/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await res.json();
    login(data.customer, data.token);
    return data;
  };

  // ============================================
  // FORGOT PASSWORD - SEND OTP
  // ============================================
  const sendForgotPasswordOTP = async (phone) => {
    const res = await fetch(`${API_BASE}/customer/auth/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to send OTP');
    }

    return await res.json();
  };

  // ============================================
  // FORGOT PASSWORD - RESET PASSWORD
  // ============================================
  const resetPassword = async (phone, otp, newPassword) => {
    const res = await fetch(`${API_BASE}/customer/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, newPassword })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to reset password');
    }

    return await res.json();
  };

  // ============================================
  // LOGOUT
  // ============================================
  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/customer/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }

    localStorage.removeItem('customerToken');
    setToken(null);
    setCustomer(null);
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
    sendForgotPasswordOTP,
    resetPassword,
    
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