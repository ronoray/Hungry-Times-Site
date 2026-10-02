// pages/Home.jsx — DNA v2 "Lal-Paar Table" home (docs/DESIGN_DNA.md).
//
// Mobile order: hero → one offer ticket → craving rail → red wok band →
// house card → reviews → three ways to eat → gallery → install.
// One reason, one offer, one CTA per screen (DNA §1). Every price and dish
// shown comes from the live menu / popular-items payloads — nothing here is a
// hard-coded price, and a dish that is missing or switched off just hides.
import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { BRAND } from '../lib/constants'
import SEOHead from '../components/SEOHead'
import StructuredData from '../components/StructuredData'
import VegDot from '../components/VegDot'
import OfferTicket from '../components/OfferTicket'
import StarRating from '../components/StarRating'
import InstallAppSection from '../components/InstallAppSection'
import { useToast } from '../components/Toast'
import { trackAddToCart } from '../utils/analytics'
import { packagingAddonOf } from '../utils/cartLine'
import TestimonialCarousel from '../components/TestimonialCarousel'
import { useRatingSummary } from '../hooks/useRatingSummary'
import API_BASE from '../config/api'

const RESTAURANT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": ["Restaurant", "FoodEstablishment"],
  "@id": "https://home.hungrytimes.in/#restaurant",
  "name": "Hungry Times",
  "url": "https://home.hungrytimes.in",
  "logo": "https://home.hungrytimes.in/hungry-times-logo.png",
  "image": "https://home.hungrytimes.in/banner.png",
  "description": "Hungry Times — Chinese, Continental & Indian restaurant in Dhakuria / Gariahat, South Kolkata. Order straight from our kitchen — delivery, takeaway and dine-in.",
  "telephone": "+91-8420822919",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "32/12A, Gariahat Road South, Ground Floor",
    "addressLocality": "Kolkata",
    "addressRegion": "West Bengal",
    "postalCode": "700031",
    "addressCountry": "IN"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 22.5061956, "longitude": 88.3673608 },
  // Owner, 2 Oct 2026: 12 PM – 11 PM, every day.
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    "opens": "12:00", "closes": "23:00"
  }],
  "servesCuisine": ["Indian", "Chinese", "Continental", "North Indian"],
  "priceRange": "$$",
  "hasMenu": { "@type": "Menu", "url": "https://home.hungrytimes.in/menu" },
  "potentialAction": {
    "@type": "OrderAction",
    "target": { "@type": "EntryPoint", "urlTemplate": "https://home.hungrytimes.in/menu" },
    "deliveryMethod": ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"]
  },
  "acceptsReservations": "True",
  "areaServed": ["Dhakuria", "Gariahat", "Ballygunge", "Selimpur", "Jadavpur", "Kasba", "South Kolkata"],
  // sameAs links the website to the same real-world entity as the Google Business
  // Profile + social pages — helps Google consolidate signals and rank the listing.
  "sameAs": [
    "https://www.google.com/maps/place/?q=place_id:ChIJvWGYyyhxAjoRjhl2_3xBiuM",
    "https://www.facebook.com/171145592738581",
    "https://www.instagram.com/hungrytimes2023"
  ]
};

// The three service modes, as CartContext stores them. Takeaway is 'pickup'.
const MODES = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'pickup', label: 'Takeaway' },
  { value: 'dine_in', label: 'Dine-in' },
];

// Craving plates. Each is shown only when its search finds live dishes
// (matched on dish and section names), so a rail entry never opens an empty
// menu. Rolls and drinks have no plate art yet and are left out.
const CRAVINGS = [
  { label: 'Chowmein', search: 'Chowmein', img: 'chowmein' },
  { label: 'Fried rice', search: 'Fried Rice', img: 'prawnrice' },
  { label: 'Momos', search: 'Momo', img: 'momos' },
  { label: 'Soups', search: 'Soup', img: 'soup' },
  { label: 'Paella', search: 'Paella', img: 'paella' },
  { label: 'Prawns', search: 'Prawn', img: 'prawns' },
];

const HERO_DISH = 'fish n chips';
const WOK_DISH = 'prawn mixed fried rice';
// AddToCartModal's size rule: "Large" is the only size variant; the base
// price is the regular. (server/utils/menuOptions.js SIZE_VARIANT_NAMES)
const isLarge = (v) => String(v?.name || '').trim().toLowerCase() === 'large';

/** Flatten /public/menu into [{ ...item, sub, top }]. */
function flattenMenu(data) {
  const out = [];
  for (const tc of data?.topCategories || []) {
    for (const sc of tc.subcategories || []) {
      for (const it of sc.items || []) out.push({ ...it, sub: sc.name, top: tc.name });
    }
  }
  return out;
}

const live = (it) => it && !it.effectiveDisabled && !it.outOfStock;
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function SectionHead({ kicker, title, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker && <p className="kicker mb-1.5">{kicker}</p>}
        <h2 className="font-display text-[26px] leading-none tracking-[-.01em] md:text-[34px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { orderMode, updateOrderMode, addLine, getSimpleItemQty } = useCart();
  const showToast = useToast();
  const [popularItems, setPopularItems] = useState([]);
  const [menuItems, setMenuItems] = useState(null); // null = not loaded yet
  const [testimonials, setTestimonials] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const rating = useRatingSummary();

  // Add a dish straight to the cart.
  //
  // The packaging add-on MUST ride along. AddToCartModal attaches it for every
  // item, and the server adds packaging at order time regardless — so a line
  // without it shows the customer a total lower than what they get charged.
  // Same line shape FeaturedComboCard builds for the same reason.
  //
  // Dine-in is NOT special-cased here: utils/cartLine.js hides and un-prices
  // packaging for dine-in, and the server strips it too. One rule, two layers
  // that already know it.
  const addPopularItem = (item, variant = null) => {
    const pkg = item.packagingAddon;
    addLine({
      itemId: item.id,
      itemName: item.name,
      name: item.name,
      basePrice: Number(item.price) || 0,
      variants: variant
        ? [{ id: variant.id, name: variant.name, priceDelta: Number(variant.priceDelta) || 0 }]
        : [],
      addons: pkg
        ? [{ id: pkg.id, name: pkg.name, priceDelta: Number(pkg.priceDelta) || 0, locked: true }]
        : [],
      qty: 1,
    }, { source: 'home_popular' });
    trackAddToCart(item, 1);
    showToast(`${item.name}${variant ? ` (${variant.name})` : ''} added to cart`, 'success');
  };

  // Attach aggregateRating to the restaurant schema only when there are real
  // published reviews behind it, and only on a page that also renders those
  // reviews — Google requires the rating to be visible on the page claiming it.
  const restaurantSchema = useMemo(() => {
    if (!rating.count || rating.avg == null) return RESTAURANT_SCHEMA;
    return {
      ...RESTAURANT_SCHEMA,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.avg,
        reviewCount: rating.count,
        bestRating: 5,
        worstRating: 1
      }
    };
  }, [rating.avg, rating.count]);

  useEffect(() => {
    fetch(`${API_BASE}/public/popular-items`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setPopularItems(Array.isArray(data) ? data : []))
      .catch(() => {});

    // The live menu: hero dish, wok band, craving rail and the house card's
    // descriptions all read from it.
    fetch(`${API_BASE}/public/menu`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setMenuItems(flattenMenu(data)))
      .catch(() => setMenuItems([]));

    // The server returns { data: [...] }; field names testimonial_text / text
    // and customer_name.
    fetch(`${API_BASE}/feedback/testimonials/public`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        setTestimonials(list.slice(0, 6));
      })
      .catch(() => {});

    // Gallery highlight — /gallery has no mobile entry point of its own (it is
    // desktop-nav only), so this strip is how phone users reach it at all.
    fetch(`${API_BASE}/gallery/public`)
      .then(r => r.ok ? r.json() : { images: [] })
      .then(data => setGalleryImages((data?.images || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  const byName = (name) => (menuItems || []).find(it => String(it.name).trim().toLowerCase() === name);
  const heroDish = live(byName(HERO_DISH)) ? byName(HERO_DISH) : null;
  const wokDish = live(byName(WOK_DISH)) ? byName(WOK_DISH) : null;
  const wokLarge = wokDish ? (wokDish.variants || []).find(isLarge) : null;

  const cravings = useMemo(() => {
    if (!menuItems?.length) return [];
    const pool = menuItems.filter(live);
    return CRAVINGS.filter(c => {
      const q = c.search.toLowerCase();
      return pool.some(it => String(it.name).toLowerCase().includes(q) || String(it.sub).toLowerCase().includes(q));
    });
  }, [menuItems]);

  const houseRows = popularItems.slice(0, 5);
  const menuById = useMemo(() => new Map((menuItems || []).map(it => [it.id, it])), [menuItems]);
  // "Continental, our way" only when every row really is Continental.
  const houseAllContinental = houseRows.length > 0 && houseRows.every(r => /continental/i.test(menuById.get(r.id)?.top || ''));

  const wokAdd = (variant) => {
    if (!wokDish) return;
    addPopularItem({
      id: wokDish.id,
      name: wokDish.name,
      price: wokDish.basePrice,
      packagingAddon: packagingAddonOf(wokDish),
    }, variant);
  };

  const goWithMode = (mode, to = '/menu') => { updateOrderMode(mode); navigate(to); };

  return (
    <>
      <SEOHead
        title="Hungry Times — Order Food Online in Kolkata"
        description="Order straight from the Hungry Times kitchen on Gariahat Road South. Chinese & Continental — delivery, takeaway and dine-in."
        canonicalPath="/"
      />
      <StructuredData data={restaurantSchema} />

      {/* ─── 1. Hero ─── */}
      <section
        data-hero
        className="relative overflow-hidden px-5 pb-7 pt-6 md:grid md:min-h-[600px] md:grid-cols-2 md:gap-x-10 md:px-10 md:py-16 lg:px-24"
      >
        <div className="relative z-10 md:col-start-1 md:row-start-1 md:self-end">
          <p className="kicker">Gariahat Road South · Kolkata</p>
          <h1 className="mb-3.5 mt-3 font-display text-[44px] leading-[.98] tracking-[-.015em] text-ht-red md:text-[64px] lg:text-[88px] lg:leading-[.94]">
            We&rsquo;re not on the apps. <span className="text-ht-gold3">By choice.</span>
          </h1>
          <p className="max-w-[330px] font-serif text-[21px] font-medium italic leading-tight md:max-w-[520px] md:text-[26px] lg:text-[28px]">
            Order straight from our kitchen and the price is the honest one — no 60% commission hiding in it.
          </p>
        </div>

        {/* Plates. Phones: a 300px stage between the copy and the buttons,
            the plate bleeding off the right edge. md: the right column. */}
        <div className="relative -mx-5 mt-3.5 h-[300px] md:col-start-2 md:row-span-2 md:row-start-1 md:mx-0 md:mt-0 md:h-auto md:min-h-[520px]">
          <img
            src="/plates/fnc-600.webp"
            srcSet="/plates/fnc-600.webp 600w, /plates/fnc-1040.webp 1040w"
            sizes="(min-width: 1024px) 520px, (min-width: 768px) 420px, 290px"
            alt="Fish n Chips"
            width="290"
            height="290"
            loading="eager"
            fetchPriority="high"
            className="plate absolute right-[-48px] top-1 h-[290px] w-[290px] md:right-[-40px] md:top-0 md:h-[420px] md:w-[420px] lg:h-[520px] lg:w-[520px]"
          />
          <img
            src="/plates/paella-520.webp"
            alt="Paella"
            width="260"
            height="260"
            loading="lazy"
            className="plate absolute left-[-10px] top-[300px] hidden h-[200px] w-[200px] md:block lg:top-[340px] lg:h-[260px] lg:w-[260px]"
          />
          {heroDish && (
            <div className="absolute left-5 top-[150px] w-[150px] md:bottom-0 md:left-auto md:right-0 md:top-auto md:w-[260px] md:rounded-[14px] md:bg-ht-ivory md:p-4 md:shadow-plate">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[.08em] text-ht-gold3">Our No. 1 dish</p>
              <p className="mb-0.5 mt-1 text-[19px] font-bold leading-tight">{heroDish.name}</p>
              <p className="font-serif text-base italic leading-tight text-ht-mute">two fillets, fries, spicy mayo. Never discounted.</p>
              <p className="mt-1.5 text-xl font-extrabold text-ht-red">{rupees(heroDish.basePrice)}</p>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-1.5 md:col-start-1 md:row-start-2 md:mt-8 md:max-w-[600px] md:self-start">
          <div className="lg:flex lg:items-center lg:gap-3.5">
            <div className="seg mb-3 lg:mb-0 lg:flex-1" role="group" aria-label="How do you want it?">
              {MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={orderMode === m.value}
                  onClick={() => updateOrderMode(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <Link
              to="/menu"
              className="flex h-[52px] w-full items-center justify-center whitespace-nowrap rounded-full bg-ht-red px-7 text-base font-bold text-white transition hover:bg-ht-red2 hover:no-underline active:scale-95 lg:w-auto"
            >
              Open the menu →
            </Link>
          </div>
          <p className="mt-3.5 text-center text-sm font-medium text-ht-mute md:text-left">
            or call{' '}
            <a href={`tel:${BRAND.phone1}`} className="inline-flex min-h-11 items-center font-bold text-ht-red">
              84208 22919
            </a>
          </p>
        </div>
      </section>

      {/* ─── 2. One offer ─── */}
      <OfferTicket surface="home" className="mx-auto max-w-3xl px-5 pb-2" />

      {/* ─── 3. What are you craving? ─── */}
      {cravings.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-7">
          <SectionHead title="What are you craving?" />
          <div className="-mx-5 flex snap-x gap-3.5 overflow-x-auto px-5 pb-2 pt-1 scrollbar-hide md:flex-wrap md:justify-start">
            {cravings.map(c => (
              <button
                key={c.label}
                type="button"
                onClick={() => navigate(`/menu?search=${encodeURIComponent(c.search)}`)}
                className="flex w-[84px] flex-none snap-start flex-col items-center gap-2 text-center text-[13px] font-semibold active:scale-95"
              >
                <img
                  src={`/plates/${c.img}-168.webp`}
                  alt=""
                  width="84"
                  height="84"
                  loading="lazy"
                  className="plate aspect-square h-[84px] w-[84px]"
                />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── 4. From the wok ─── */}
      {wokDish && (
        <section className="relative overflow-hidden bg-ht-red px-5 pb-9 pt-8 text-ht-ivory md:px-10">
          <div className="relative z-10 mx-auto max-w-6xl">
            <p className="kicker !text-ht-gold">From the wok</p>
            <h2 className="mb-2.5 mt-2 max-w-[180px] font-display text-[30px] leading-none min-[390px]:max-w-[220px] md:max-w-none md:text-[40px]">
              {wokDish.name}
            </h2>
            <p className="max-w-[170px] font-serif text-[19px] italic leading-tight text-ht-gold2 min-[390px]:max-w-[200px] md:max-w-[420px]">
              Our best-selling fried rice.
            </p>
            <div className="relative z-10 mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => wokAdd(null)}
                className="price-chip !border-ht-gold2/50 !bg-ht-red !text-ht-ivory"
                aria-label={`Add ${wokDish.name}, regular, ${rupees(wokDish.basePrice)}`}
              >
                <small className="!text-ht-gold2">REG</small>
                <b className="text-ht-gold">{rupees(wokDish.basePrice)}</b>
                <Plus className="h-4 w-4 text-ht-gold2" strokeWidth={2.5} />
              </button>
              {wokLarge && (
                <button
                  type="button"
                  onClick={() => wokAdd(wokLarge)}
                  className="price-chip !border-ht-gold2/50 !bg-ht-red !text-ht-ivory"
                  aria-label={`Add ${wokDish.name}, large, ${rupees(Number(wokDish.basePrice) + Number(wokLarge.priceDelta || 0))}`}
                >
                  <small className="!text-ht-gold2">LARGE</small>
                  <b className="text-ht-gold">{rupees(Number(wokDish.basePrice) + Number(wokLarge.priceDelta || 0))}</b>
                  <Plus className="h-4 w-4 text-ht-gold2" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
          <img
            src="/plates/prawnrice-480.webp"
            alt=""
            width="230"
            height="230"
            loading="lazy"
            className="plate absolute right-[-50px] top-6 h-[160px] w-[160px] shadow-[0_20px_40px_-10px_rgba(0,0,0,.6)] min-[390px]:right-[-70px] min-[390px]:h-[230px] min-[390px]:w-[230px] md:right-[6%] md:h-[300px] md:w-[300px]"
          />
        </section>
      )}

      {/* ─── 5. The house card ─── */}
      {houseRows.length > 0 && (
        <section className="mx-auto max-w-3xl px-5 py-7">
          <SectionHead
            kicker="The house card"
            title={houseAllContinental ? 'Continental, our way' : 'From our kitchen'}
            action={<Link to="/menu" className="whitespace-nowrap text-sm font-semibold text-ht-red">Full menu →</Link>}
          />
          <div>
            {houseRows.map(item => {
              // Only items with real choices to make go to the menu. The
              // packaging add-on doesn't count — it is on every dish and is
              // auto-locked. Server decides; an older payload without the flag
              // falls back to the menu.
              const needsOptions = item.needsOptions !== false;
              const qty = getSimpleItemQty(item.id);
              const desc = menuById.get(item.id)?.description;
              const addCls = `grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-ht-red transition active:scale-90 ${
                qty > 0 && !needsOptions ? 'bg-ht-red text-[15px] font-bold text-white' : 'bg-ht-ivory text-ht-red'
              }`;
              return (
                <div key={item.id} className="menu-row border-b border-ht-ink/15 py-3.5">
                  <Link to={`/menu?highlight=${item.id}`} className="flex min-w-0 items-baseline gap-2 text-[16px] font-semibold leading-tight text-ht-ink hover:no-underline">
                    {item.isVeg != null && <span className="translate-y-px"><VegDot isVeg={item.isVeg} /></span>}
                    <span className="min-w-0">{item.name}</span>
                  </Link>
                  <span className="leader" aria-hidden="true" />
                  <span className="whitespace-nowrap text-[16px] font-bold tabular-nums">{rupees(item.price)}</span>
                  {needsOptions ? (
                    <Link to={`/menu?highlight=${item.id}`} className={addCls} aria-label={`Choose options for ${item.name}`}>
                      <Plus className="h-5 w-5" />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => addPopularItem(item)} className={addCls} aria-label={`Add ${item.name}`}>
                      {qty > 0 ? qty : <Plus className="h-5 w-5" />}
                    </button>
                  )}
                  {desc && <p className="row-desc mt-1">{desc}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── 6. Reviews ─── */}
      {testimonials.length > 0 && (
        <section className="mx-auto max-w-3xl px-5 py-7">
          <SectionHead kicker="In their words" title="What our customers say" />

          {/* Real aggregate, or nothing. The count comes from the server over
              every published review — not from the list above, which is
              display-capped and would understate it. */}
          {rating.count > 0 && rating.avg != null && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StarRating value={rating.avg} size="w-5 h-5" />
              <span className="text-sm text-ht-mute">
                <span className="font-bold text-ht-ink">{rating.avg}</span>
                {' '}from {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}

          <TestimonialCarousel items={testimonials} />

          <div className="mt-2 text-center">
            <Link to="/testimonials" className="inline-flex min-h-11 items-center text-sm font-semibold text-ht-red">
              Read more reviews →
            </Link>
          </div>
        </section>
      )}

      {/* ─── 7. Three ways to eat ─── */}
      <section className="mx-auto max-w-3xl px-5 py-7">
        <SectionHead title="Three ways to eat" />
        <div className="grid gap-2.5 md:grid-cols-3">
          {[
            { n: '01', title: 'Dine-in', text: 'ground floor, 32/12A Gariahat Road South. Book a table.', go: () => goWithMode('dine_in', '/reservation') },
            { n: '02', title: 'Takeaway', text: 'order ahead, pick it up hot from the counter.', go: () => goWithMode('pickup') },
            { n: '03', title: 'Delivery', text: 'order here and we bring it to your door.', go: () => goWithMode('delivery') },
          ].map(w => (
            <button
              key={w.n}
              type="button"
              onClick={w.go}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-[14px] border border-ht-ink/15 bg-ht-ivory p-4 text-left transition hover:border-ht-red active:scale-[.98]"
            >
              <span className="font-mono text-xs font-medium text-ht-gold3">{w.n}</span>
              <span className="min-w-0">
                <span className="block text-[17px] font-bold">{w.title}</span>
                <span className="block font-serif text-base italic leading-tight text-ht-mute">{w.text}</span>
              </span>
              <span className="text-xl font-bold text-ht-red" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── 8. Gallery ─── */}
      {galleryImages.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-7">
          <SectionHead
            kicker="Gallery"
            title="From our kitchen"
            action={<Link to="/gallery" className="whitespace-nowrap text-sm font-semibold text-ht-red">See all →</Link>}
          />
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
            {galleryImages.map(img => (
              <Link
                key={img.id}
                to="/gallery"
                className="aspect-square overflow-hidden rounded-[14px] bg-ht-ivory"
              >
                <img
                  src={img.image_url}
                  alt={img.dish_name || 'Hungry Times'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Install App (renders nothing when there's no real install) ─── */}
      <InstallAppSection />
    </>
  )
}
