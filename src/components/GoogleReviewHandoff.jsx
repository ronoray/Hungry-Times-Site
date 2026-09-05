// Hands a customer who has just left feedback over to Google, with their own
// words on the clipboard.
//
// Why this is a handoff and not a post: there is no API that creates a Google
// review. The Business Profile API reads reviews and replies to them as the
// business, nothing more — a review has to be written by a signed-in Google
// account that is not the restaurant. So the most we can do is remove the
// friction: they have already typed the thing, we put it on the clipboard and
// open the review box, and they paste and submit it themselves under their own
// account. Their words, their account, their review.
//
// Google's writereview URL takes no text parameter, so the clipboard is the
// only way to carry the text across. Don't go looking for a prefill param.
//
// THIS IS SHOWN TO EVERYONE, whatever they rated us. Showing it only to happy
// customers is "review gating" and it is against Google's policy — it is the
// specific practice that gets listings penalised. The owner reading feedback
// and personally messaging someone is a different thing entirely: that is one
// person asking another, not an automated filter on the star rating.

import { useEffect, useRef, useState } from 'react'
import { BRAND } from '../lib/constants'
import { trackCtaClick } from '../utils/analytics'

/**
 * Put text on the clipboard, falling back to the old execCommand path.
 *
 * Deliberately NOT async at the call site. The navigator.clipboard promise must
 * not be awaited before opening Google: awaiting it spends the user-gesture
 * context, and Safari then treats the navigation as a popup and blocks it.
 * Fire this, let it settle on its own, and let the anchor navigate natively.
 */
function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  // Older iOS Safari and any non-secure context. A detached textarea is the
  // only thing execCommand can select from reliably.
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-1000px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ta.setSelectionRange(0, text.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      ok ? resolve() : reject(new Error('execCommand copy refused'))
    } catch (err) {
      reject(err)
    }
  })
}

export default function GoogleReviewHandoff({ text }) {
  // 'idle' | 'copied' | 'manual' — 'manual' means the clipboard refused and the
  // customer has to select the text themselves, so we show it selectable
  // instead of pretending the copy worked.
  const [copyState, setCopyState] = useState('idle')
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // A wordless review is a real review — the ops feedback form only requires a
  // rating, so plenty arrive with no text at all. Those still get the ask, just
  // without the copy step, because there is nothing to carry across.
  const review = String(text || '').trim()

  const handleClick = () => {
    trackCtaClick(review ? 'google_review_handoff' : 'google_review_link', 'feedback')
    if (!review) return
    copyText(review)
      .then(() => setCopyState('copied'))
      .catch(() => setCopyState('manual'))
    // The anchor's own navigation opens Google. Nothing here calls
    // window.open, so there is no popup to block.
  }

  return (
    <div className="card p-5 sm:p-6 bg-orange-500/5 border-orange-500/20">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        Put this on Google?
      </h3>

      <p className="text-neutral-300 text-sm leading-relaxed mb-4">
        {review
          ? 'We are a small kitchen, and a review on Google reaches people who are deciding where to order from right now. Tap below and we will copy what you wrote — paste it into Google and it is done.'
          : 'We are a small kitchen, and a review on Google reaches people who are deciding where to order from right now. It takes half a minute.'}
      </p>

      {review && (
        <div className="rounded-md bg-neutral-900 border border-neutral-700 p-3 mb-4">
          <p
            className="text-neutral-200 text-sm whitespace-pre-wrap break-words select-all"
            data-testid="review-text"
          >
            {review}
          </p>
        </div>
      )}

      <a
        href={BRAND.googleReviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="btn btn-primary w-full sm:w-max justify-center inline-flex items-center gap-2"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {review ? 'Copy & post on Google' : 'Write a review on Google'}
      </a>

      {copyState === 'copied' && (
        <p className="text-green-500 text-sm mt-3">
          Copied. Paste it into the Google review box and hit Post.
        </p>
      )}
      {copyState === 'manual' && (
        <p className="text-amber-400 text-sm mt-3">
          Your browser would not let us copy it. Tap the text above to select
          it, copy, then paste it into Google.
        </p>
      )}

      <p className="text-neutral-500 text-xs mt-4 leading-relaxed">
        Google opens in a new tab and you post it from your own account — we
        never post on your behalf, and we cannot see or change what you write
        there.
      </p>
    </div>
  )
}
