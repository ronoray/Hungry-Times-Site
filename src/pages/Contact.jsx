import { useState } from 'react'
import { BRAND } from '../lib/constants'
import SEOHead from '../components/SEOHead'
import { trackContactFormSubmit, trackPhoneClick, trackWhatsAppClick } from '../utils/analytics'

import API_BASE from '../config/api';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.name || !formData.message) {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus(null), 3000)
      return
    }

    try {
      setSubmitting(true)
      setSubmitStatus(null)

      const response = await fetch(`${API_BASE}/public/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          submitted_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit contact form')
      }

      setSubmitStatus('success')
      trackContactFormSubmit()
      setFormData({ name: '', email: '', phone: '', message: '' })
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000)
    } catch (error) {
      console.error('Contact form error:', error)
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus(null), 5000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <SEOHead
      title="Contact Us"
      description="Get in touch with Hungry Times. Visit us at 32/12A Gariahat Road South, Kolkata, or call +91-8420822919. Dine-in, takeaway & delivery."
      canonicalPath="/contact"
    />
    <section className="container-section py-12">
      <h2 className="text-2xl font-semibold mb-6">Contact Us</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div>
          <form onSubmit={handleSubmit} className="card p-6 grid gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2 text-ht-ink">
                Name <span className="text-ht-red">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full px-4 py-2 bg-ht-ivory border border-ht-ink/15 rounded-md focus:outline-none focus:border-ht-red transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-ht-ink">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className="w-full px-4 py-2 bg-ht-ivory border border-ht-ink/15 rounded-md focus:outline-none focus:border-ht-red transition-colors"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2 text-ht-ink">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-4 py-2 bg-ht-ivory border border-ht-ink/15 rounded-md focus:outline-none focus:border-ht-red transition-colors"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2 text-ht-ink">
                Message <span className="text-ht-red">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="5"
                placeholder="How can we help you?"
                className="w-full px-4 py-2 bg-ht-ivory border border-ht-ink/15 rounded-md focus:outline-none focus:border-ht-red transition-colors resize-none"
                required
              />
            </div>

            {submitStatus === 'success' && (
              <div className="bg-ht-veg/10 border border-ht-veg/20 rounded-md p-3 text-ht-veg text-sm">
                Thank you! We've received your message and will get back to you soon.
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="bg-ht-red/10 border border-ht-red/20 rounded-md p-3 text-ht-red text-sm">
                Something went wrong. Please try again or call us directly.
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
                'Send Message'
              )}
            </button>
          </form>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-ht-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Visit Us
            </h3>
            <p className="text-ht-ink">{BRAND.address}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-ht-red hover:text-ht-red text-sm font-medium"
            >
              Get Directions →
            </a>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-ht-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call Us
            </h3>
            <div className="space-y-2">
              <a href={`tel:${BRAND.phone1}`} className="block text-ht-ink hover:text-ht-red transition-colors" onClick={() => trackPhoneClick('contact_page')}>
                {BRAND.phone1}
              </a>
              <a href={`tel:${BRAND.phone2}`} className="block text-ht-ink hover:text-ht-red transition-colors" onClick={() => trackPhoneClick('contact_page')}>
                {BRAND.phone2}
              </a>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-ht-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Us
            </h3>
            <a href={`mailto:${BRAND.email}`} className="text-ht-ink hover:text-ht-red transition-colors break-all">
              {BRAND.email}
            </a>
          </div>

          <div className="card p-6 bg-ht-red/5 border-ht-red/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-ht-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Opening Hours
            </h3>
            <p className="text-ht-mute text-sm">
              Opening hours 12 PM to 11 PM - Everyday.
            </p>
          </div>
        </div>
      </div>
    </section>
    </>
  )
}