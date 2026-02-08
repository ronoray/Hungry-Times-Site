import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_URL = 'https://hungrytimes.in';

export default function SEOHead({ title, description, canonicalPath, ogImage }) {
  const location = useLocation();
  const canonical = canonicalPath || location.pathname;

  useEffect(() => {
    document.title = title
      ? `${title} | Hungry Times`
      : 'Hungry Times — Order Food Online in Kolkata';

    const desc = description ||
      'Order delicious food online from Hungry Times Kolkata. Indian, Chinese, Continental cuisine. Fast delivery within 5km. COD & online payment.';

    setMeta('description', desc);
    setLink('canonical', `${BASE_URL}${canonical}`);

    // Open Graph (critical for WhatsApp previews)
    setMeta('og:title', title || 'Hungry Times — Order Food Online in Kolkata');
    setMeta('og:description', desc);
    setMeta('og:url', `${BASE_URL}${canonical}`);
    setMeta('og:image', ogImage || `${BASE_URL}/banner.png`);
    setMeta('og:image:width', '1200');
    setMeta('og:image:height', '630');
    setMeta('og:type', 'restaurant');
    setMeta('og:site_name', 'Hungry Times');
    setMeta('og:locale', 'en_IN');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title || 'Hungry Times — Order Food Online');
    setMeta('twitter:description', desc);
    setMeta('twitter:image', ogImage || `${BASE_URL}/banner.png`);
  }, [title, description, canonical, ogImage]);

  return null;
}

function setMeta(name, content) {
  const attr = name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}
