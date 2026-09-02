// src/lib/scheduleSlots.js — the one place that decides which times a customer
// may pick for a scheduled order.
//
// Checkout used to ask this question twice. Dine-in rendered a grid of slots
// built from the current IST time, so a past slot was never on screen. Delivery
// and pickup rendered a bare <input type="time" min="12:00" max="23:00">, and
// those attributes are advisory — mobile pickers happily return 10:00 at 6 PM.
// One order went out that way: placed around 6 PM, scheduled for 10 AM the same
// morning, which is not a late delivery but an impossible one.
//
// Both pickers now build their options here. The server checks the slot again on
// the way in (server/utils/scheduledSlot.js in the ops repo) — this file decides
// what is offered, not what is allowed.

/** Kitchen hours the slots are drawn from, in IST minutes past midnight. */
export const SLOT_OPEN_MINUTES = 12 * 60;   // 12 PM
export const SLOT_CLOSE_MINUTES = 23 * 60;  // 11 PM
/** Slot spacing, and the head start the kitchen gets on an ASAP order. */
export const SLOT_STEP_MINUTES = 15;
export const SLOT_LEAD_MINUTES = 10;
/** How far ahead a customer may book. */
export const SLOT_MAX_DAYS_AHEAD = 2;

/** Now, as an IST wall-clock instant. Read its UTC parts to get IST fields. */
export function istNow(date = new Date()) {
  return new Date(date.getTime() + 330 * 60 * 1000);
}

/** 'YYYY-MM-DD' for an IST instant produced by istNow(). */
export function istDateStr(nowIST) {
  return nowIST.toISOString().slice(0, 10);
}

/** The date range the picker offers: today through SLOT_MAX_DAYS_AHEAD. */
export function slotDateRange(nowIST) {
  const max = new Date(nowIST);
  max.setUTCDate(max.getUTCDate() + SLOT_MAX_DAYS_AHEAD);
  return { min: istDateStr(nowIST), max: istDateStr(max) };
}

/** 'HH:MM' from minutes past midnight. */
export function fmtSlot(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/** '22:00' → '10:00 PM', for anything a customer reads. */
export function label12(t) {
  const [h, mn] = String(t).split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mn).padStart(2, '0')} ${ap}`;
}

/**
 * The slots on offer for one date.
 *
 *   const { asapTime, slots } = buildSlots(dateStr, nowIST);
 *
 * On today, everything at or before the ASAP mark is dropped — that is the whole
 * point of this module. On a later date the full service window is offered.
 * Returns `slots: []` with `asapTime: null` when today is already over, which
 * the caller renders as "no slots left today".
 */
export function buildSlots(dateStr, nowIST = istNow()) {
  const todayStr = istDateStr(nowIST);
  const isToday = dateStr === todayStr;
  const nowMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();

  const asapMins = isToday
    ? Math.ceil((nowMins + SLOT_LEAD_MINUTES) / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES
    : null;
  const showAsap =
    asapMins != null && asapMins >= SLOT_OPEN_MINUTES && asapMins <= SLOT_CLOSE_MINUTES;
  const asapTime = showAsap ? fmtSlot(asapMins) : null;

  const slots = [];
  for (let m = SLOT_OPEN_MINUTES; m <= SLOT_CLOSE_MINUTES; m += SLOT_STEP_MINUTES) {
    if (isToday && asapMins != null && m <= asapMins) continue; // ASAP covers the earliest
    if (isToday && asapMins == null && m < nowMins + SLOT_LEAD_MINUTES) continue;
    slots.push(fmtSlot(m));
  }

  return { asapTime, slots, isToday };
}

/**
 * Is this date+time pair still ahead of us? The guard the submit path runs, so a
 * slot that went stale while the customer sat on the checkout page is caught
 * before payment rather than after it.
 */
export function isSlotInPast(dateStr, timeStr, nowIST = istNow()) {
  if (!dateStr || !timeStr) return false;
  const [h, mn] = String(timeStr).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(mn)) return false;
  const todayStr = istDateStr(nowIST);
  if (dateStr > todayStr) return false;
  if (dateStr < todayStr) return true;
  const nowMins = nowIST.getUTCHours() * 60 + nowIST.getUTCMinutes();
  return h * 60 + mn < nowMins;
}
