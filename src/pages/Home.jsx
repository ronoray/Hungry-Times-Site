import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Truck, Clock, CreditCard, MapPin, UtensilsCrossed, ChefHat, Flame, Utensils, Layers, Coffee, Instagram } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { BRAND, SOCIAL } from '../lib/constants'
import SEOHead from '../components/SEOHead'
import StructuredData from '../components/StructuredData'
import KitchenStatus from '../components/KitchenStatus'
import TodaysSpecial from '../components/TodaysSpecial'
import LiveOrderCount from '../components/LiveOrderCount'
import VegDot from '../components/VegDot'
import ComboPromoCard from '../components/ComboPromoCard'
import FeaturedComboCard from '../components/FeaturedComboCard'
import OffersStrip from '../components/OffersStrip'
import StarRating from '../components/StarRating'
import InstallAppSection from '../components/InstallAppSection'
import { useToast } from '../components/Toast'
import { trackAddToCart } from '../utils/analytics'
import TestimonialCarousel from '../components/TestimonialCarousel'
import { useRatingSummary } from '../hooks/useRatingSummary'
import API_BASE from '../config/api'
import heroImg from '../assets/hero-1200.jpg'

const RESTAURANT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": ["Restaurant", "FoodEstablishment"],
  "@id": "https://home.hungrytimes.in/#restaurant",
  "name": "Hungry Times",
  "url": "https://home.hungrytimes.in",
  "logo": "https://home.hungrytimes.in/hungry-times-logo.png",
  "image": "https://home.hungrytimes.in/banner.png",
  "description": "Hungry Times — Chinese, Continental & Indian restaurant in Dhakuria / Gariahat, South Kolkata. Order online with fast home delivery within 5 km, plus dine-in and takeaway.",
  "telephone": "+91-8420822919",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "32, 12A, Gariahat Road South, Dhakuria",
    "addressLocality": "Kolkata",
    "addressRegion": "West Bengal",
    "postalCode": "700031",
    "addressCountry": "IN"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 22.5061956, "longitude": 88.3673608 },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    "opens": "11:00", "closes": "22:30"
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

const QUICK_CATEGORIES = [
  { label: 'Chinese', Icon: UtensilsCrossed, search: 'Chinese' },
  { label: 'Continental', Icon: ChefHat, search: 'Continental' },
  { label: 'Starters', Icon: Flame, search: 'Starters' },
  { label: 'Rice & Noodles', Icon: Utensils, search: 'Rice' },
  { label: 'Rolls & Wraps', Icon: Layers, search: 'Roll' },
  { label: 'Beverages', Icon: Coffee, search: 'Beverage' },
];

export default function Home() {
  const navigate = useNavigate();
  const { updateOrderMode, addLine, getSimpleItemQty } = useCart();
  const showToast = useToast();
  const [popularItems, setPopularItems] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const rating = useRatingSummary();

  // Add a popular item straight to the cart.
  //
  // The packaging add-on MUST ride along. AddToCartModal attaches it for every
  // item, and the server adds packaging at order time regardless — so a line
  // without it shows the customer a total lower than what they get charged.
  // Same line shape FeaturedComboCard builds for the same reason.
  //
  // Dine-in is NOT special-cased here: utils/cartLine.js hides and un-prices
  // packaging for dine-in, and the server strips it too. One rule, two layers
  // that already know it.
  const addPopularItem = (item) => {
    const pkg = item.packagingAddon;
    addLine({
      itemId: item.id,
      itemName: item.name,
      name: item.name,
      basePrice: Number(item.price) || 0,
      variants: [],
      addons: pkg
        ? [{ id: pkg.id, name: pkg.name, priceDelta: Number(pkg.priceDelta) || 0, locked: true }]
        : [],
      qty: 1,
    });
    trackAddToCart(item, 1);
    showToast(`${item.name} added to cart`, 'success');
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
    // Fetch popular items
    fetch(`${API_BASE}/public/popular-items`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setPopularItems(data))
      .catch(() => {});

    // Fetch testimonials.
    // The server returns { data: [...] } — this used to unwrap `data.testimonials`,
    // which matches nothing, so the whole section silently rendered empty from the
    // day it was written. Field names below follow the same payload:
    // testimonial_text / text and customer_name.
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

  return (
    <>
      <SEOHead
        title="Hungry Times — Order Food Online in Kolkata"
        description="Order delicious food online from Hungry Times. Fast delivery within 5km. Indian, Chinese, Continental cuisine. Free delivery under 3km!"
        canonicalPath="/"
      />
      <StructuredData data={restaurantSchema} />

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[60vh] md:min-h-[80vh] flex items-end bg-neutral-950">
        <img
          src={heroImg}
          alt="Hungry Times restaurant"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          loading="eager"
          width="1200" height="800"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />

        <div className="relative z-10 w-full px-4 pb-8 md:pb-14 max-w-5xl mx-auto">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
              <KitchenStatus />
            </div>
            {/* Static copy, matching the delivery strip below and the rest of
                the site. Deliberately NOT KitchenStatus's estimatedWait — that
                is a kitchen prep figure only surfaced when activeOrders > 3, so
                showing it here would read as a delivery promise. */}
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs text-neutral-200">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              30–45 min delivery
            </div>
          </div>
          <h1
            className="text-3xl md:text-5xl font-bold mb-3 text-white leading-tight"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
          >
            Chinese-Continental Fusion.<br className="hidden md:block" />
            <span className="text-orange-500">Fresh. Cozy. Kolkata.</span>
          </h1>
          <p className="text-neutral-300 text-base md:text-lg mb-6 max-w-xl">
            Signature dishes, fast delivery within 5km, and free delivery under 3km.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/menu"
              onClick={() => updateOrderMode('delivery')}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Order Now
            </Link>
            <button
              onClick={() => { updateOrderMode('dine_in'); navigate('/menu'); }}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-full backdrop-blur-sm transition-colors font-medium"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Dine-in
            </button>
            <a
              href={`tel:${BRAND.phone1}`}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-6 py-3 rounded-full border border-white/20 backdrop-blur-sm transition-colors"
            >
              Call to Order
            </a>
          </div>
        </div>
      </section>

      {/* ─── Live fixed-price bundle: Mid-Week Combo Mon–Thu, Weekend Special
           Fri–Sun. The server picks whichever is in-schedule and returns exactly
           one, so this slot swaps by itself and never stacks the two. Renders
           nothing when neither is live. ─── */}
      <section className="px-4 pt-5 -mb-3 max-w-5xl mx-auto w-full">
        <FeaturedComboCard surface="home" />
      </section>

      {/* ─── Combo offer (auto-hides when COMBO50 is off) ─── */}
      <section className="px-4 pt-5 -mb-3 max-w-5xl mx-auto w-full">
        <ComboPromoCard />
      </section>

      {/* ─── Live promo codes → /offers (renders nothing when none are live) ───
           No -mb-3 here, unlike the combo sections above: those are followed by
           another section with pt-5 that absorbs the pull, but LiveOrderCount
           has no top padding and rode up over this card's bottom border. */}
      <section className="px-4 pt-5 pb-5 max-w-5xl mx-auto w-full">
        <OffersStrip />
      </section>

      {/* ─── Live Order Count (social proof) ─── */}
      <LiveOrderCount />

      {/* ─── Quick Categories ─── */}
      <section className="py-8 px-4 bg-neutral-950">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-neutral-200">What are you craving?</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {QUICK_CATEGORIES.map(({ label, Icon, search }) => (
              <button
                key={label}
                onClick={() => navigate(`/menu?search=${encodeURIComponent(search)}`)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-orange-500/50 rounded-2xl px-5 py-3 transition-all active:scale-95 min-w-[90px]"
              >
                <Icon className="w-5 h-5 text-orange-500" />
                <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Today's Special ─── */}
      <TodaysSpecial />

      {/* ─── Popular Items ─── */}
      {popularItems.length > 0 && (
        <section className="py-10 px-4 bg-neutral-900/40">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Most Popular</h2>
              <Link to="/menu" className="text-sm text-orange-500 hover:text-orange-400">
                View full menu &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {popularItems.map(item => {
                // Only items with real choices to make go to the menu. The
                // packaging add-on doesn't count — it is on every dish and is
                // auto-locked, so treating it as a choice would send a third of
                // the menu to a modal with nothing in it. Server decides; an
                // older payload without the flag falls back to the modal.
                const needsOptions = item.needsOptions !== false;
                const qty = getSimpleItemQty(item.id);

                return (
                  <div
                    key={item.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition-colors group flex flex-col"
                  >
                    <Link to={`/menu?highlight=${item.id}`} className="block">
                      {item.imageUrl ? (
                        <div className="aspect-[4/3] overflow-hidden bg-neutral-800">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-neutral-800 flex items-center justify-center">
                          <span className="text-3xl opacity-40">🍽️</span>
                        </div>
                      )}
                    </Link>

                    <div className="p-3 flex flex-col flex-1">
                      <Link to={`/menu?highlight=${item.id}`} className="block">
                        <div className="flex items-start gap-1.5">
                          {item.isVeg != null && <VegDot isVeg={item.isVeg} />}
                          <h3 className="text-sm font-medium text-neutral-200 leading-tight line-clamp-2">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-orange-500 font-semibold text-sm mt-1.5">
                          ₹{Number(item.price).toFixed(0)}
                        </p>
                      </Link>

                      <div className="mt-3">
                        {needsOptions ? (
                          <Link
                            to={`/menu?highlight=${item.id}`}
                            className="block w-full text-center py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                          >
                            Choose options
                          </Link>
                        ) : (
                          <button
                            onClick={() => addPopularItem(item)}
                            className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-semibold transition-colors"
                          >
                            {qty > 0 ? `Add more (${qty})` : 'Add to cart'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Delivery Info Strip ─── */}
      <section className="py-8 px-4 bg-neutral-950 border-y border-neutral-800/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <Truck className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-200">Free Delivery</p>
            <p className="text-xs text-neutral-500">Under 3km</p>
          </div>
          <div>
            <Clock className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-200">30-45 Min</p>
            <p className="text-xs text-neutral-500">Avg. delivery time</p>
          </div>
          <div>
            <CreditCard className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-200">Online Payment</p>
            <p className="text-xs text-neutral-500">UPI, Cards & COD</p>
          </div>
          <div>
            <MapPin className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-200">5km Radius</p>
            <p className="text-xs text-neutral-500">Delivery coverage</p>
          </div>
        </div>
      </section>

      {/* ─── Social Proof + Testimonial Carousel ─── */}
      {testimonials.length > 0 && (
        <section className="py-10 px-4 bg-neutral-900/20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-semibold mb-2 text-center">What Our Customers Say</h2>

            {/* Real aggregate, or nothing. The count comes from the server over
                every published review — not from the list above, which is
                display-capped and would understate it. */}
            {rating.count > 0 && rating.avg != null && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <StarRating value={rating.avg} size="w-5 h-5" />
                <span className="text-sm text-neutral-300">
                  <span className="font-semibold text-white">{rating.avg}</span>
                  {' '}from {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            )}

            <TestimonialCarousel items={testimonials} />

            <div className="text-center mt-6">
              <Link to="/testimonials" className="text-sm text-orange-500 hover:text-orange-400">
                Read more reviews &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Gallery Highlight ─── */}
      {galleryImages.length > 0 && (
        <section className="py-10 px-4 bg-neutral-950">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">From Our Kitchen</h2>
              <Link to="/gallery" className="text-sm text-orange-500 hover:text-orange-400">
                See all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {galleryImages.map(img => (
                <Link
                  key={img.id}
                  to="/gallery"
                  className="aspect-square overflow-hidden rounded-lg bg-neutral-800 border border-neutral-800 hover:border-neutral-600 transition-colors"
                >
                  <img
                    src={img.image_url}
                    alt={img.dish_name || 'Hungry Times'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Install App (renders nothing when there's no real install) ─── */}
      <InstallAppSection />

      {/* ─── About / Story ─── */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
          <p className="text-neutral-400 leading-relaxed mb-3">
            At {BRAND.name}, we bring together the best of Chinese and Continental cuisines in a cozy,
            air-conditioned setting perfect for dining in or takeaway.
          </p>
          <p className="text-neutral-500 text-sm">
            Located at {BRAND.address}, open daily 12 PM — 11 PM.
          </p>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-10 px-4 bg-neutral-900 border-t border-b border-neutral-700 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Hungry? Order Now!</h2>
          <p className="text-neutral-400 mb-6">Free delivery under 3km. Pay online or cash on delivery.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-full transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      </section>
    </>
  )
}
