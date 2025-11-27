import { useEffect } from 'react'

export default function Testimonials() {
  useEffect(() => {
    // Redirect to ops site's public testimonials page
    window.location.href = 'https://ops.hungrytimes.in/public-testimonials'
  }, [])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-neutral-300">Redirecting to testimonials...</p>
      </div>
    </div>
  )
}