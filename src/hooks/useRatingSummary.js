// src/hooks/useRatingSummary.js
// Aggregate customer rating — average stars + total review count.
//
// Backed by GET /feedback/public/summary, which counts every published review.
// Do NOT compute this client-side from /feedback/public/testimonials: that list
// is capped at 50 for display, so counting it would silently understate the
// review count as soon as there are more than 50.
//
// Returns { avg: number|null, count: number }. count === 0 means "nothing to
// show" — callers should render nothing rather than a zero.

import { useEffect, useState } from 'react';
import API_BASE from '../config/api';

export function useRatingSummary() {
  const [summary, setSummary] = useState({ avg: null, count: 0 });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/feedback/public/summary`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return;
        setSummary({ avg: data.avg ?? null, count: Number(data.count) || 0 });
      })
      .catch(() => {
        // Social proof is decorative — a failed fetch leaves count at 0 and the
        // section renders nothing. Never block the page on it.
      });
    return () => { cancelled = true; };
  }, []);

  return summary;
}

export default useRatingSummary;
