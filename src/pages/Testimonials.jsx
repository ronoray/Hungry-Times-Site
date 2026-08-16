// pages/Testimonials.jsx
//
// A real page. This used to be a redirect stub that window.open'd
// https://ops.hungrytimes.in/public-testimonials and bounced back to '/', which
// meant every customer following the nav link — or Home's "Read more reviews" —
// landed on the ops panel's Cloudflare Zero Trust email wall.
//
// Same public endpoint Home uses. Note the payload is { data: [...] }, NOT a
// bare array and NOT { testimonials: [...] }.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import StarRating from '../components/StarRating'
import { useRatingSummary } from '../hooks/useRatingSummary'
import { quoteOf } from '../utils/reviewText'
import API_BASE from '../config/api'

export default function Testimonials() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const rating = useRatingSummary()

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/feedback/testimonials/public`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return
        setReviews(Array.isArray(data) ? data : (data?.data || []))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <SEOHead
        title="Customer Reviews"
        description="What our customers say about Hungry Times — Chinese-Continental fusion in Dhakuria, Kolkata."
        canonicalPath="/testimonials"
      />

      <div className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Customer Reviews</h1>

        {rating.count > 0 && rating.avg != null && (
          <div className="flex items-center gap-2 mb-8">
            <StarRating value={rating.avg} size="w-5 h-5" />
            <span className="text-sm text-neutral-300">
              <span className="font-semibold text-white">{rating.avg}</span>
              {' '}from {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 animate-pulse">
                <div className="h-3 w-24 bg-neutral-800 rounded mb-3" />
                <div className="h-3 w-full bg-neutral-800 rounded mb-2" />
                <div className="h-3 w-2/3 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-10 text-center">
            <p className="text-neutral-400 mb-4">No reviews published yet.</p>
            <Link to="/feedback" className="text-orange-500 hover:text-orange-400 text-sm">
              Be the first to leave one &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((t, i) => (
              <div key={t.id ?? i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <StarRating value={Number(t.rating) || 5} className="mb-3" />
                {/* Wordless reviews are the common case, not an edge case — see
                    utils/reviewText.js. Stars and a name, no empty quote marks. */}
                {quoteOf(t) && (
                  <p className="text-sm sm:text-base text-neutral-300 leading-relaxed mb-3">
                    &ldquo;{quoteOf(t)}&rdquo;
                  </p>
                )}
                <p className="text-xs text-neutral-500 font-medium">
                  &mdash; {t.customer_name || t.name || 'Happy Customer'}
                </p>

                {/* Owner replies are only present when an admin explicitly
                    published them (response_published), so anything here is
                    safe to show. */}
                {t.admin_response && (
                  <div className="mt-4 pl-4 border-l-2 border-orange-500/40">
                    <p className="text-xs text-orange-400 font-medium mb-1">Hungry Times replied</p>
                    <p className="text-sm text-neutral-400 leading-relaxed">{t.admin_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/feedback"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Leave a review
          </Link>
        </div>
      </div>
    </>
  )
}
