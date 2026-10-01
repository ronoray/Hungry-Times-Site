# Hungry Times — Design DNA

Every frontend change on hungrytimes.in follows this. Owner's rule (1 Oct 2026):
"our own DNA for any frontend change". When a change needs something this file
does not cover, decide it, then add it here in the same commit.

Draft v1 — written from what the site already does, plus the owner's calls.
The owner has final say; record each new call under **Owner decisions**.

## 1. Feel

Dark, warm, appetising. Night-time kitchen glow: near-black surfaces, orange heat,
gold for value. Friendly and alive, never loud. Food photography carries the
colour; the interface stays out of its way.

## 2. Colour

| Role | Value | Use |
|---|---|---|
| Page | `#0B0B0B` / `neutral-950` | Background everywhere |
| Card | `#161616`, `neutral-900` | Raised surfaces |
| Hairline | `neutral-800`, `white/5` | Borders between surfaces |
| **Action orange** | `#F97316` (hover `#EA580C`) | Primary buttons, active tab, cart, floating actions |
| Ember orange | `#DC5F1E` | Offer card borders and tints (`/15`, `/40`) |
| **Value gold** | `#F5B944` | Offer badges, "ON THE MENU NOW", prices that are a deal |
| Prestige gold | `#D4AF37` | Hairline accents on special surfaces (install prompt, VIP) |
| Success / veg | `#22C55E` | Veg dot, "Kitchen Open", in-cart state |
| Danger | `#EF4444` | Errors, cart count badge |
| WhatsApp | `#25D366` | WhatsApp only — never reuse for anything else |
| Text | `white`, `white/85`, `neutral-400`, `white/45` | Heading → body → secondary → fine print |

No new colours without adding them here. Offer = gold, action = orange — keep
them apart so a customer can tell "a deal" from "a button".

## 3. Shape

- **Floating actions are circles.** Anything that hovers over the page
  (WhatsApp, Menu, future quick actions) is `rounded-full`, 56–64px.
- Cards `rounded-2xl`; buttons and inputs `rounded-xl`; chips/badges `rounded-lg`
  or `rounded-full`.
- Translucent glass for things floating over food: `bg-black/45 backdrop-blur-md`
  with a 1px coloured border (`border-orange-500/60`).
- Soft shadow, tinted by the element's colour (`rgba(249,115,22,0.35)` for
  orange, `rgba(37,211,102,0.5)` for WhatsApp).

## 4. Motion

- **Floating actions are a little bouncy** — `motion-safe:animate-hop`
  (tailwind `hop`: rest, then one small double hop every 4.5 s). Never a
  constant bounce; never more than one hopping element per screen region.
- Press feedback on every tappable: `active:scale-95` (circles `active:scale-90`).
- Entrances: `animate-slideUp` (0.25 s). Nothing over 300 ms for UI.
- **Always `motion-safe:`** for decorative motion — reduced-motion users get a
  still interface.

## 5. Layout (mobile first)

- Design at **390px wide** first, then scale up. No horizontal scroll, ever.
- Bottom nav is 4 fixed tabs (Home, Menu, Orders, Account) — never reorder or
  swap them by state.
- **Right-hand floating stack** (mobile, above the bottom nav), bottom to top:
  1. `80px` FloatingCartBar (full width, when cart has items)
  2. `144px` the page's primary floating action (Menu on /menu, WhatsApp elsewhere)
  3. `220px` WhatsApp, when slot 2 is taken
  Left side `144px` is the feedback widget. Respect `env(safe-area-inset-bottom)`.
- Tap targets at least 44×44px.
- On `/menu`, `Menu.css` resets `.menu-page *` margin/padding — inside the menu
  page use `!` utilities or inline style for spacing.

## 6. Words

- Short, warm, plain English. Dish names exactly as the menu has them.
- Every rupee price shown as a deal carries **"+5% GST"**; packaging (₹10/item,
  delivery and takeaway) belongs on the bill, not the creative.
- Prices keep paise when the offer produces them (₹237.60) — never round on a
  surface the bill must agree with.
- WhatsApp text: BMP characters only (★ ►), no 4-byte emoji.
- Never mention Zomato/Swiggy.

## 7. Before shipping a frontend change

- [ ] Uses only the colours, shapes and motion above (or adds to this file)
- [ ] Checked at 390px with the cart empty AND with items (floating stack clear)
- [ ] Decorative motion is `motion-safe:`
- [ ] Tap targets ≥ 44px; nothing overlaps the bottom nav or cart bar
- [ ] `npm run lint:undef` and `npm run build` clean

## Owner decisions

- **1 Oct 2026** — Floating actions are circular and a little bouncy. First use:
  the /menu "Menu" button (opens the category list) after visitors missed the
  top-right ☰.
