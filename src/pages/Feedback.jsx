// ============================================================================
// PATCH 2/11: Customer Portal Feedback.jsx
// PURPOSE: Complete feedback form with submission to backend
// FILE: client/src/pages/Feedback.jsx (CUSTOMER PORTAL - NOT OPS PANEL)
// ============================================================================

import { useState } from 'react'
import { BRAND } from '../lib/constants'
import SEOHead from '../components/SEOHead'

import API_BASE from '../config/api';

export default function Feedback() {
  const [formData, setFormData] = useState({
    name: '',
    feedback: '',
    rating: 5
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.feedback.trim()) {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus(null), 3000)
      return
    }

    try {
      setSubmitting(true)
      setSubmitStatus(null)

      const response = await fetch(`${API_BASE}/public/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim() || 'Anonymous',
          feedback: formData.feedback.trim(),
          rating: formData.rating,
          submitted_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      setSubmitStatus('success')
      setFormData({ name: '', feedback: '', rating: 5 })
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000)
    } catch (error) {
      console.error('Feedback submission error:', error)
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus(null), 5000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <SEOHead
      title="Feedback"
      description="Share your feedback about Hungry Times. We value your opinion and use it to improve our food and service."
      canonicalPath="/feedback"
    />
    <section className="container-section py-12">
      <h2 className="text-2xl font-semibold mb-6">Share Your Feedback</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Feedback Form */}
        <div>
          <form onSubmit={handleSubmit} className="card p-6 grid gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-neutral-300">
                Name (Optional)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-md focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="rating" className="block text-sm font-medium mb-2 text-neutral-300">
                Rating
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="rating"
                  name="rating"
                  type="range"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={handleChange}
                  className="flex-1 accent-orange-500"
                />
                <div className="flex items-center gap-1 min-w-[80px]">
                  <span className="text-2xl text-orange-500">{formData.rating}</span>
                  <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Drag to rate from 1 (Poor) to 5 (Excellent)
              </p>
            </div>

            <div>
              <label htmlFor="feedback" className="block text-sm font-medium mb-2 text-neutral-300">
                Your Feedback <span className="text-red-500">*</span>
              </label>
              <textarea
                id="feedback"
                name="feedback"
                value={formData.feedback}
                onChange={handleChange}
                rows="6"
                placeholder="Tell us what you think about our food, service, or overall experience..."
                className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-md focus:outline-none focus:border-orange-500 transition-colors resize-none"
                required
              />
            </div>

            {submitStatus === 'success' && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3 text-green-500 text-sm">
                Thank you for your feedback! We truly appreciate your input.
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 text-red-500 text-sm">
                Something went wrong. Please try again or contact us directly.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-max disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </form>
        </div>

        {/* Why Feedback Matters */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Why Your Feedback Matters
            </h3>
            <p className="text-neutral-300 text-sm leading-relaxed">
              Your feedback helps us improve our food, service, and overall experience. 
              We read every comment and use your suggestions to make {BRAND.name} better.
            </p>
          </div>

          <div className="card p-6 bg-orange-500/5 border-orange-500/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What to Include
            </h3>
            <ul className="text-neutral-300 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Your experience with our food quality</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Service and staff friendliness</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Ambience and cleanliness</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>Suggestions for improvement</span>
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Anonymous Feedback
            </h3>
            <p className="text-neutral-400 text-sm">
              Your name is optional. Feel free to share your honest thoughts anonymously. 
              We value all feedback equally.
            </p>
          </div>
        </div>
      </div>
    </section>
    </>
  )
}