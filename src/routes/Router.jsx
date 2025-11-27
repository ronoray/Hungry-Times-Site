// src/routes/Router.jsx (ESSENTIAL, KEEP THIS FILE)
import { Routes, Route, Navigate } from 'react-router-dom'
import Offers from '../pages/Offers'
import Order from '../pages/Order'
import Profile from '../pages/Profile'

export default function Router() {
  return (
    <Routes>
      {/* Set /menu as the default/index page */}
      <Route path="/" element={<Navigate to="/menu" replace />} /> 

      {/* Public Menu/Order page */}
      <Route path="/menu" element={<Order />} /> 

      {/* Offers page */}
      <Route path="/offers" element={<Offers />} />

      {/* Customer profile page */}
      <Route path="/profile" element={<Profile />} />

      {/* Public Testimonials/Feedback - redirects */}
      <Route path="/public-testimonials" element={<Navigate to="/" replace />} />
      <Route path="/public-feedback" element={<Navigate to="/" replace />} />

      {/* Catch all - redirect to the main menu page */}
      <Route path="*" element={<Navigate to="/menu" replace />} />
    </Routes>
  )
}