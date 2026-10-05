/**
 * Cloudflare Worker — Social bot meta tag handler for home.hungrytimes.in
 *
 * Social media crawlers (WhatsApp, Facebook, Twitter/X, Slack, etc.) do not
 * execute JavaScript, so they only see the raw index.html which has generic
 * root-level tags. This Worker intercepts those bots and serves a thin HTML
 * shell with the correct per-route Open Graph and Twitter Card tags.
 *
 * Real users and search engine bots (Googlebot, Bingbot) are passed through
 * to the origin unmodified — they can execute JS and see the full React app.
 *
 * Deploy:
 *   cd workers && npx wrangler deploy
 */

// Bots that preview links but cannot execute JavaScript
const SOCIAL_BOT =
  /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot-LinkExpanding|Discordbot|TelegramBot|Applebot|PinterestBot|Snapchat|redditbot|vkShare|Embedly|Quora|W3C_Validator|MetaInspector/i;

const BASE      = 'https://home.hungrytimes.in';
// Bump ?v= whenever public/og-image.jpg changes, in step with index.html and
// SEOHead.jsx. Facebook, WhatsApp and Telegram cache previews by image URL, so a
// same-name replacement keeps showing the old card.
const OG_IMAGE  = `${BASE}/og-image.jpg?v=2`;
const DEFAULT_IMAGE = { url: OG_IMAGE, width: '1200', height: '630', type: 'image/jpeg' };

// Words follow docs/DESIGN_DNA.md §7: no delivery time, no delivery radius, no
// app names. The address is 32/12A Gariahat Road South — not Selimpur.
const HOME = {
  title:       'Hungry Times — Chinese & Continental, Gariahat Road South, Kolkata',
  description: 'We’re not on the apps. By choice. Chinese & Continental from Gariahat Road South, Kolkata — order straight from our kitchen. Dine-in, takeaway & delivery.',
};

const ROUTES = {
  '/combo': {
    title:       '50% OFF — Chilli Pork Combo at ₹145 🔥 | Hungry Times',
    description: 'Veg Fried Rice or Chowmein + Chilli Pork at ₹145. Use code COMBO50 for 50% off. Order online, at the counter or on WhatsApp.',
    type:        'website',
    image:       { url: 'https://cdn.hungrytimes.in/images/gallery/combo-chilli-pork.png', width: '1124', height: '1055', type: 'image/png' },
  },
  '/':     HOME,
  '/home': HOME,
  '/menu': {
    title:       'The Menu — Hungry Times | Chinese & Continental, Kolkata',
    description: 'The full Hungry Times menu — starters, fried rice, noodles, mains and Continental plates. Order straight from our kitchen on Gariahat Road South.',
  },
  '/gallery': {
    title:       'Gallery — Hungry Times | Gariahat Road South, Kolkata',
    description: 'Our plates and our room — photos from the Hungry Times kitchen on Gariahat Road South, Kolkata.',
  },
  '/offers': {
    title:       'Offers — Hungry Times | Kolkata',
    description: 'Every live offer and code at Hungry Times, and loyalty points on every order placed with us direct.',
  },
  '/contact': {
    title:       'Contact — Hungry Times | Gariahat Road South, Kolkata',
    description: 'Find us at 32/12A Gariahat Road South, ground floor, Kolkata 700031, or call +91 84208 22919. Open 12 PM – 11 PM, every day.',
  },
  '/feedback': {
    title:       'Feedback — Hungry Times',
    description: 'Ate with us? Tell us how it was — every note reaches the kitchen.',
  },
  '/reservation': {
    title:       'Reserve a table — Hungry Times | Gariahat Road South, Kolkata',
    description: 'Book a table at Hungry Times, 32/12A Gariahat Road South. Pick the date, time and party size — we confirm on WhatsApp.',
  },
  '/testimonials': {
    title:       'Reviews — Hungry Times | Kolkata',
    description: 'What people who have eaten with us say about Hungry Times, Gariahat Road South, Kolkata.',
  },
};

function buildHTML(path, { title, description, image, type }) {
  const url = `${BASE}${path}`;
  const img = image ?? DEFAULT_IMAGE;
  const ogType = type ?? 'restaurant';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Hungry Times">
<meta property="og:locale" content="en_IN">
<meta property="og:image" content="${img.url}">
<meta property="og:image:width" content="${img.width}">
<meta property="og:image:height" content="${img.height}">
<meta property="og:image:type" content="${img.type}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${img.url}">
<link rel="canonical" href="${url}">
<meta http-equiv="refresh" content="0;url=${url}">
</head>
<body><p>Loading Hungry Times…</p></body>
</html>`;
}

export default {
  async fetch(request) {
    const ua = request.headers.get('user-agent') || '';

    // Real users and Googlebot/Bingbot → pass straight through to origin
    if (!SOCIAL_BOT.test(ua)) {
      return fetch(request);
    }

    const url  = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const meta = ROUTES[path] ?? ROUTES['/'];

    return new Response(buildHTML(path, meta), {
      headers: {
        'Content-Type':  'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  },
};
