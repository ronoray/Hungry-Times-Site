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
const OG_IMAGE  = `${BASE}/og-image.jpg`;

const ROUTES = {
  '/': {
    title:       'Hungry Times — Chinese-Continental in Kolkata',
    description: 'Order Chinese-Continental fusion food online from Hungry Times, Kolkata. Fast delivery within 5 km. Dine in, takeaway, and online ordering available.',
  },
  '/home': {
    title:       'Hungry Times — Chinese-Continental in Kolkata',
    description: 'Order Chinese-Continental fusion food online from Hungry Times, Kolkata. Fast delivery within 5 km. Dine in, takeaway, and online ordering available.',
  },
  '/menu': {
    title:       'Our Menu — Hungry Times | Chinese-Continental in Kolkata',
    description: 'Explore our full Chinese-Continental menu — starters, mains, desserts and more. Order online for delivery or dine in at Selimpur, Ballygunge, Kolkata.',
  },
  '/gallery': {
    title:       'Gallery — Hungry Times | Food & Ambiance Photos',
    description: 'See photos of our signature dishes, restaurant ambiance, and the dining experience at Hungry Times, Kolkata.',
  },
  '/offers': {
    title:       'Offers & Deals — Hungry Times | Kolkata',
    description: 'Exclusive promo codes, loyalty rewards, and special offers at Hungry Times. Order online and save on your next meal.',
  },
  '/contact': {
    title:       'Contact Hungry Times | Selimpur, Ballygunge, Kolkata',
    description: 'Get in touch with Hungry Times. Visit us at Selimpur, Ballygunge, Kolkata, or call +91 84208 22919.',
  },
  '/feedback': {
    title:       'Share Your Feedback — Hungry Times',
    description: 'Had a meal at Hungry Times? Share your experience and help us serve you better.',
  },
  '/testimonials': {
    title:       'Customer Reviews — Hungry Times | Kolkata',
    description: 'Read what our customers say about Hungry Times. Real reviews from diners who love our Chinese-Continental food in Kolkata.',
  },
};

function buildHTML(path, { title, description }) {
  const url = `${BASE}${path}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="restaurant">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Hungry Times">
<meta property="og:locale" content="en_IN">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${OG_IMAGE}">
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
