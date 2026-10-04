# Hungry Times — Website DNA v2 · "Lal-Paar Table"

Replaces v1 (dark / orange) as of 2 Oct 2026. The rule for every frontend change on
hungrytimes.in. Brand rules in the project CLAUDE.md win on conflict.

## 1. The idea
The site is **our table, not an app**. Ivory paper like the printed menu card, a red-and-gold
*lal-paar* border like a Bengali sari edge, real plates shot from above sitting on the paper.
Prices set like a menu — name, dotted leader, price. It should feel like being handed the
menu at Gariahat Road South, then being able to order from it.

Spine line (from the Sep 2026 diagnosis): **"We're not on the apps. By choice."**
One reason · one offer · one CTA per screen.

## 2. Colour (brand palette only)
| Token | Hex | Use |
|---|---|---|
| paper | #F7EEDC | page ground |
| ivory | #FBF2E1 | raised cards, sheets, bottom nav |
| ink | #150A0A | body text, headings on paper |
| red | #7E0E15 | **action** — primary buttons, active tab, cart bar, links |
| red2 | #5A070D | pressed state, footer ground |
| gold | #E0AE45 | **value** on red/ink grounds — offer figures, prices on red |
| gold2 | #F6DC9A | floating circles, offer ticket fill |
| gold3 | #A87524 | value on paper (≥24px only, 3.4:1), hairlines |
| veg | #1F7A3A | FSSAI veg square only |
| nonveg | #8A3B12 | FSSAI non-veg square only |

Red = do something. Gold = a deal / value. Never swap them. No orange, no neutral-950.
Badge red #EE3124 lives only inside `ht_badge.png`.

## 3. Type
- **Archivo Black** — headlines, section titles, the wordmark's HUNGRY.
- **Archivo** 400–700 — UI, dish names (600), prices (700, tabular).
- **Cormorant Garamond italic** — descriptions, voice lines, "Chinese & Continental".
- **IBM Plex Mono** — kickers, section numbers, codes (WELCOME15), category tabs.
- Mobile minimums: body 15px, dish description 16px Cormorant (it runs small), tap targets 44px.

## 4. Signature elements
1. **Paar band** — 12px red/gold/red stripe under the header and above the footer. Max 2 per screen.
2. **Menu row** — dish name · dotted leader · price; Cormorant description under. Two-size dishes
   show two tappable price chips (R / L, or HALF / FULL — label as the menu does).
3. **Plates** — round, top-down dish photos with a soft table shadow. Allowed to crop off the
   frame edge. Never a rectangle-cropped dish photo in a card grid.
4. **Offer ticket** — gold2 stub with a perforated edge and notches. One ticket per screen.
5. **Lockup** — paper grounds: `ht_badge.png` alone. Red grounds (footer, No.1 band): gold phoenix
   above the two-tier wordmark `HUNGRY` / `Times`.

## 5. Shape & motion
- Cards 14px radius; buttons 999px (pill); price chips 10px; plates 50%.
- Floating actions stay **circles, gold2 fill, ink icon, a little bouncy** (`motion-safe:animate-hop`)
  — the 1 Oct owner decision carried over, recoloured from light orange to gold2.
- Press: `active:scale-95`. UI motion ≤ 250ms. Decorative motion `motion-safe:` only.

## 6. Layout (keep from v1)
- 390px first. Bottom nav: Home · Menu · Orders · Account — fixed order.
- **Right-hand floating stack** (mobile, above the bottom nav), bottom to top:
  1. `80px` FloatingCartBar (full width, when cart has items)
  2. `144px` the page's primary floating circle (Menu on /menu, WhatsApp elsewhere)
  3. `220px` WhatsApp, when slot 2 is taken
  Left side `144px` is the feedback widget. Respect `env(safe-area-inset-bottom)`.
- Tap targets ≥ 44×44px. No horizontal scroll at 320px.
- On `/menu`, `Menu.css` resets `.menu-page *` margin/padding — use `!` utilities or inline style there.
- Service mode (Delivery · Takeaway · Dine-in) is chosen ONCE, on Home or the bag, as a
  3-way segment. All three always shown.

## 7. Words
- Dish names exactly as the menu. Descriptions in plain words, lower case, Cormorant.
- Superlatives only where the order database proves them: Fish n Chips = our No. 1 by revenue;
  Prawn Mixed Fried Rice = our best-selling *fried rice*. Nothing else is "best-selling".
- No delivery time, no radius until Ops supplies numbers.
- Deal prices carry "+5% GST"; menu prices are GST-inclusive (billTotals.js rule).
- Never mention the apps by name.

## 8. Popups
One overlay per visit. Never on first paint of /menu. WELCOME15 shows as the Home ticket
first; a modal only on exit-intent or second visit.

## 9. Before shipping a frontend change
- [ ] Base Tailwind classes are the phone layout (390px, holds at 320px); `md:`/`lg:` only add
- [ ] Checked at 320 / 360 / 390 / 768 — cart empty AND with items (`npm run mobile:check`)
- [ ] No horizontal scroll at 320px; no chip/tab/segment label wraps
- [ ] Nothing overlaps the bottom nav, cart bar or floating circles
- [ ] Text contrast ≥ 4.5:1 (gold3 on paper only at ≥ 24px)
- [ ] Only §7 claims — no delivery time, no radius
- [ ] Prices keep paise when the bill has them; WhatsApp text BMP-only (★ ►)
- [ ] `npm run lint:undef`, `npm run build`, `npm test` clean

## Owner decisions
- **1 Oct 2026** — Floating actions are circular and a little bouncy. First use: the /menu
  "Menu" button (opens the category list) after visitors missed the top-right ☰.
  v2: kept, recoloured from light orange to gold2.
- **1 Oct 2026** — The top-row ☰ on /menu is removed; the floating Menu circle is the only
  category opener on phones/tablets. Floating actions use a light fill, not dark glass.
- **2 Oct 2026** — v2 "Lal-Paar Table" adopted: light paper ground replaces the dark site.
- **2 Oct 2026** — Opening hours are **12 PM – 11 PM, every day**. Schema, footer and any
  visible hours text must say exactly this.
- **3 Oct 2026** — Pre-order items (biryani: min 10 plates, a later day, delivery/pickup,
  no codes or points). Menu tag is ink outline mono "PRE-ORDER · MIN 10 PLATES · A DAY
  AHEAD" — ink, not gold, because it is a condition, not a deal. Rules mirror
  `src/utils/preOrderPolicy.js`; the server is the authority.
- **3 Oct 2026** — RECOMMENDED panel on /menu beside "On the menu now": ivory (information,
  not a deal). "BEST SELLER" only on items ranked from real valid sales (server
  `utils/bestSellers.js`, 30 days); the biryani pre-order card is "NEW & LOVED", states the
  condition in plain text and only links to its menu section. Phones: compact swipe strip.
- **4 Oct 2026** — Outside kitchen hours the only order taken is a biryani pre-order (server
  `offHoursOrderError`). The closed kitchen pill says so: desktop "Kitchen closed — opens at
  12 PM · Biryani pre-orders open"; phones alternate "Opens 12 PM" / "Biryani pre-orders"
  every 4 s (≤18 chars keeps the 320px header on one line; static under reduced motion;
  full sentence as the aria-label). Opening time comes from the API, "Closed today" on a
  closed day.
