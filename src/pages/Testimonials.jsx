// ============================================================================
// FIXED: Customer Portal Testimonials.jsx
// PURPOSE: Redirect to correct URL based on environment
// FILE: site/src/pages/Testimonials.jsx (CUSTOMER PORTAL)
// ============================================================================

import { useEffect } from 'react'

export default function Testimonials() {
  useEffect(() => {
    // Detect environment and redirect accordingly
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    
    const redirectUrl = isDevelopment
      ? 'http://localhost:5173/public-testimonials'  // Dev: ops dev server
      : 'https://ops.hungrytimes.in/public-testimonials';  // Prod: ops subdomain
    
    console.log('[Testimonials] Redirecting to:', redirectUrl);
    window.location.href = redirectUrl;
  }, [])

  // Show loading state while redirecting
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f0f0f'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '64px',
          height: '64px',
          border: '4px solid #f97316',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ color: '#d1d5db', fontSize: '16px' }}>
          Redirecting to testimonials...
        </p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// END OF FILE
// ============================================================================