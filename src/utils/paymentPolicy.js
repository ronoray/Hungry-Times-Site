// Online orders above this bill must be paid online: no cash on delivery,
// pickup or dine-in (owner, 26 Sep 2026).
//
// MIRROR of server/utils/paymentPolicy.js in the webapp repo, which is the
// authority: the server refuses a cash order above it whatever this screen
// shows. Change both together.
export const COD_MAX_TOTAL = 2000;
export const RESTAURANT_PHONE = '+918420822919';
export const RESTAURANT_PHONE_DISPLAY = '+91 84208 22919';

/** May this bill be paid in cash? Exactly the limit still may. */
export const codAllowed = (total) => Number.isFinite(Number(total)) && Number(total) <= COD_MAX_TOTAL;

// ── Advance notice for large orders (MIRROR of the server's leadTimeError) ──
// Above ₹5000: scheduled at least 2 hours ahead. Above ₹10000: the next day or
// later, with a time. No "order now" / ASAP for either.
export const LEAD_TIME_TIERS = [
  { above: 10000, nextDay: true },
  { above: 5000, minutes: 120 },
];

/** The notice tier this bill needs, or null. */
export function leadTimeFor(total) {
  const t = Number(total);
  if (!Number.isFinite(t)) return null;
  return LEAD_TIME_TIERS.find((tier) => t > tier.above) || null;
}

/** One line for the customer describing the notice this bill needs. */
export function leadTimeNote(tier) {
  if (!tier) return '';
  return tier.nextDay
    ? `Orders above ₹${tier.above} must be booked for the next day or later.`
    : `Orders above ₹${tier.above} need at least 2 hours' notice.`;
}

/**
 * May this slot be picked for this tier? nowIST is an istNow() instant (its
 * UTC fields read as IST). A 5-minute grace matches the server, so the
 * earliest slot offered is never refused at checkout.
 */
export function slotAllowedForTier(tier, dateStr, timeStr, nowIST) {
  if (!tier) return true;
  if (!dateStr || !timeStr) return false;
  const todayStr = nowIST.toISOString().slice(0, 10);
  if (tier.nextDay) return dateStr > todayStr;
  // IST fields parsed as UTC, the same convention as nowIST.
  const slotMs = Date.parse(`${dateStr}T${String(timeStr).slice(0, 5)}:00Z`);
  return Number.isFinite(slotMs) && slotMs >= nowIST.getTime() + (tier.minutes - 5) * 60000;
}
