// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

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
      const res = await fetch(`${API_BASE}/api/customer/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      } else {
        // Invalid token
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch customer:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phone) => {
    const res = await fetch(`${API_BASE}/api/customer/auth/send-otp`, {
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

  const verifyOTP = async (phone, otp, name) => {
    const res = await fetch(`${API_BASE}/api/customer/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, name })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to verify OTP');
    }

    const data = await res.json();
    
    // Store token
    localStorage.setItem('customerToken', data.token);
    setToken(data.token);
    setCustomer(data.customer);

    return data;
  };

  const updateProfile = async (updates) => {
    const res = await fetch(`${API_BASE}/api/customer/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update profile');
    }

    const data = await res.json();
    setCustomer(data.customer);
    return data;
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE}/api/customer/auth/logout`, {
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
    sendOTP,
    verifyOTP,
    updateProfile,
    logout,
    token
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