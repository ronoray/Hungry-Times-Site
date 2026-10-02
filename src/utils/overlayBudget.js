// One overlay per visit (docs/DESIGN_DNA.md §8).
//
// FirstVisitPopup, NotificationPromptModal and PWAInstallPrompt each call
// claimOverlay() at the moment they would appear. The first one to claim the
// session wins; the others stay hidden until the next session. Storage can be
// missing or throw (private window, blocked site data) — then nothing is
// claimed and nothing is blocked, which is the old behaviour.

const OVERLAY_KEY = 'ht_overlay_shown';
// Set when the WELCOME15 ticket on Home has been on screen or copied — the
// visitor has seen the offer, so the popup carrying the same offer is skipped.
const WELCOME_TICKET_KEY = 'ht_welcome_ticket_seen';

export function claimOverlay(name) {
  try {
    const current = sessionStorage.getItem(OVERLAY_KEY);
    if (current && current !== name) return false;
    sessionStorage.setItem(OVERLAY_KEY, name);
    return true;
  } catch {
    return true;
  }
}

export function overlayClaimedByOther(name) {
  try {
    const current = sessionStorage.getItem(OVERLAY_KEY);
    return Boolean(current && current !== name);
  } catch {
    return false;
  }
}

export function markWelcomeTicketSeen() {
  try { localStorage.setItem(WELCOME_TICKET_KEY, String(Date.now())); } catch { /* storage blocked */ }
}

export function welcomeTicketSeen() {
  try { return Boolean(localStorage.getItem(WELCOME_TICKET_KEY)); } catch { return false; }
}
