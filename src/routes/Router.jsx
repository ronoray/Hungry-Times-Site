// src/routes/Router.jsx
// SIMPLE SETUP - Only 3 routes needed for your under construction site

import { Routes, Route, Navigate } from 'react-router-dom'
import UnderConstruction from '../pages/UnderConstruction'
import Offers from '../pages/Offers'

export default function Router() {
  return (
    <Routes>
      {/* Main under construction page */}
      <Route path="/" element={<UnderConstruction />} />
      
      {/* Offers page - verify 15% codes */}
      <Route path="/offers" element={<Offers />} />
      
      {/* Public Testimonials - proxy to ops.hungrytimes.in */}
      {/* This will be handled by nginx proxy, no React route needed */}
      {/* But if someone directly navigates here, redirect to home */}
      <Route path="/public-testimonials" element={<Navigate to="/" replace />} />
      
      {/* Public Feedback - proxy to ops.hungrytimes.in */}
      {/* This will be handled by nginx proxy, no React route needed */}
      {/* But if someone directly navigates here, redirect to home */}
      <Route path="/public-feedback" element={<Navigate to="/" replace />} />
      
      {/* Catch all - redirect to under construction */}
      <Route path="*" element={<UnderConstruction />} />
    </Routes>
  )
}