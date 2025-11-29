// ============================================================================
// FIXED: Customer Portal Testimonials.jsx
// PURPOSE: Open testimonials in new tab to avoid back button loop
// FILE: site/src/pages/Testimonials.jsx (CUSTOMER PORTAL)
// ============================================================================

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Testimonials() {
  const navigate = useNavigate()

  useEffect(() => {
    // Detect environment
    const isDevelopment = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';
    
    const redirectUrl = isDevelopment
      ? 'http://localhost:5173/public-testimonials'  // Dev: ops dev server
      : 'https://ops.hungrytimes.in/public-testimonials';  // Prod: ops subdomain
    
    console.log('[Testimonials] Opening in new tab:', redirectUrl);
    
    // Open in new tab to avoid back button loop
    window.open(redirectUrl, '_blank');
    
    // Navigate back to home immediately
    navigate('/', { replace: true });
  }, [navigate])

  // Return null since we're navigating away
  return null;
}

// ============================================================================
// END OF FILE
// ============================================================================