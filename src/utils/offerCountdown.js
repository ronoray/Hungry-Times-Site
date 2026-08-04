// src/utils/offerCountdown.js
//
// One implementation of "how long is this offer good for". The same maths had
// been written three times — PromoBar, the Offers page, and (in a client-only
// variant) FirstVisitPopup — and OffersStrip showed no expiry at all despite
// having valid_till in the payload it already fetched.
//
// `valid_till` from /offers/active is a DATE (YYYY-MM-DD) and the offer is good
// through the END of that day IST, hence the T23:59:59 — treating it as midnight
// expires every offer a day early.

/** Milliseconds until an offer's valid_till lapses. Negative once expired. */
export function msUntilExpiry(validTill, now = Date.now()) {
  if (!validTill) return null;
  const end = new Date(`${validTill}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  return end.getTime() - now;
}

/** Whole days remaining, or null when there is no usable valid_till. */
export function daysUntilExpiry(validTill, now = Date.now()) {
  const ms = msUntilExpiry(validTill, now);
  if (ms == null) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Short human label for a banner or card: "3 days left", "Ends tomorrow!",
 * "5h left!", "Expired". Returns '' when there is nothing worth saying, so a
 * caller can render `{label && <span>{label}</span>}` without a special case.
 */
export function expiryLabel(validTill, now = Date.now()) {
  const ms = msUntilExpiry(validTill, now);
  if (ms == null) return '';
  if (ms <= 0) return 'Expired';

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days > 1) return `${days} days left`;
  if (days === 1) return 'Ends tomorrow!';
  return `${Math.floor(ms / (1000 * 60 * 60))}h left!`;
}
