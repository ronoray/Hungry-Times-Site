// src/routes/Router.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import UnderConstruction from '../pages/UnderConstruction'
import Offers from '../pages/Offers'
import Menu from '../pages/Menu'   // NEW

export default function Router() {
  return (
    <Routes>
      {/* Main under construction page */}
      <Route path="/" element={<UnderConstruction />} />

      {/* Public Menu page */}
      <Route path="/menu" element={<Menu />} />

      {/* Offers page - verify & list offers */}
      <Route path="/offers" element={<Offers />} />

      {/* Public Testimonials - handled by nginx; fallback redirect if direct hit */}
      <Route path="/public-testimonials" element={<Navigate to="/" replace />} />

      {/* Public Feedback - handled by nginx; fallback redirect if direct hit */}
      <Route path="/public-feedback" element={<Navigate to="/" replace />} />

      {/* Catch all - redirect to under construction */}
      <Route path="*" element={<UnderConstruction />} />
    </Routes>
  )
}