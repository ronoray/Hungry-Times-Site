import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BRAND } from '../lib/constants'
import SEOHead from '../components/SEOHead'
import StructuredData from '../components/StructuredData'
import KitchenStatus from '../components/KitchenStatus'
import TodaysSpecial from '../components/TodaysSpecial'
import LiveOrderCount from '../components/LiveOrderCount'
import VegDot from '../components/VegDot'
import API_BASE from '../config/api'
import heroImg from '../assets/hero-1200.jpg'

const RESTAURANT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": ["Restaurant", "FoodEstablishment"],
  "@id": "https://hungrytimes.in/#restaurant",
  "name": "Hungry Times",
  "url": "https://hungrytimes.in",
  "logo": "https://hungrytimes.in/hungry-times-logo.png",
  "image": "https://hungrytimes.in/banner.png",
  "description": "Order delicious food online from Hungry Times. Indian, Chinese & Continental cuisine with fast delivery in Kolkata.",
  "telephone": "+91-8420822919",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Selimpur, Ballygunge",
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
  "hasMenu": { "@type": "Menu", "url": "https://hungrytimes.in/menu" },
  "potentialAction": {
    "@type": "OrderAction",
    "target": { "@type": "EntryPoint", "urlTemplate": "https://hungrytimes.in/menu" },
    "deliveryMethod": ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"]
  }
};

// Quick category tiles for the home page
const QUICK_CATEGORIES = [
  { label: 'Chinese', icon: '🥡', search: 'Chinese' },
  { label: 'Continental', icon: '🍝', search: 'Continental' },
  { label: 'Starters', icon: '🍗', search: 'Starters' },
  { label: 'Rice & Noodles', icon: '🍜', search: 'Rice' },
  { label: 'Rolls & Wraps', icon: '🌯', search: 'Roll' },
  { label: 'Beverages', icon: '🥤', search: 'Beverage' },
];

export default function Home() {
  const navigate = useNavigate();
  const [popularItems, setPopularItems] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    // Fetch popular items
    fetch(`${API_BASE}/public/popular-items`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setPopularItems(data))
      .catch(() => {});

    // Fetch testimonials
    fetch(`${API_BASE}/public/feedback/testimonials/public`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : data?.testimonials || [];
        setTestimonials(list.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <SEOHead
        title="Hungry Times — Order Food Online in Kolkata"
        description="Order delicious food online from Hungry Times. Fast delivery within 5km. Indian, Chinese, Continental cuisine. Free delivery under 3km!"
        canonicalPath="/"
      />
      <StructuredData data={RESTAURANT_SCHEMA} />

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[50vh] md:min-h-[70vh] flex items-end bg-neutral-950">
        <img
          src={heroImg}
          alt="Hungry Times restaurant"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          loading="eager"
          width="1200" height="800"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />

        <div className="relative z-10 w-full px-4 pb-8 md:pb-14 max-w-5xl mx-auto">
          <div className="mb-4">
            <KitchenStatus />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 text-white leading-tight">
            Chinese-Continental Fusion.<br className="hidden md:block" />
            <span className="text-orange-500">Fresh. Cozy. Kolkata.</span>
          </h1>
          <p className="text-neutral-300 text-base md:text-lg mb-6 max-w-xl">
            Signature dishes, fast delivery within 5km, and free delivery under 3km.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Order Now
            </Link>
            <a
              href={`tel:${BRAND.phone1}`}
              className="inline-flex items-center gap-2 bg-neutral-800/80 hover:bg-neutral-700 text-white px-6 py-3 rounded-full border border-neutral-700 transition-colors"
            >
              Call to Order
            </a>
          </div>
        </div>
      </section>

      {/* ─── Live Order Count (social proof) ─── */}
      <LiveOrderCount />

      {/* ─── Quick Categories ─── */}
      <section className="py-8 px-4 bg-neutral-950">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-neutral-200">What are you craving?</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {QUICK_CATEGORIES.map(cat => (
              <button
                key={cat.label}
                onClick={() => navigate(`/menu?search=${encodeURIComponent(cat.search)}`)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-2xl px-5 py-3 transition-colors min-w-[90px]"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">{cat.label}</span>
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
              {popularItems.map(item => (
                <Link
                  key={item.id}
                  to={`/menu?highlight=${item.id}`}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition-colors group"
                >
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
                  <div className="p-3">
                    <div className="flex items-start gap-1.5">
                      {item.isVeg != null && <VegDot isVeg={item.isVeg} />}
                      <h3 className="text-sm font-medium text-neutral-200 leading-tight line-clamp-2">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-orange-500 font-semibold text-sm mt-1.5">
                      ₹{Number(item.price).toFixed(0)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Delivery Info Strip ─── */}
      <section className="py-8 px-4 bg-neutral-950 border-y border-neutral-800/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl mb-1">🚚</div>
            <p className="text-sm font-medium text-neutral-200">Free Delivery</p>
            <p className="text-xs text-neutral-500">Under 3km</p>
          </div>
          <div>
            <div className="text-2xl mb-1">⏱️</div>
            <p className="text-sm font-medium text-neutral-200">30-45 Min</p>
            <p className="text-xs text-neutral-500">Avg. delivery time</p>
          </div>
          <div>
            <div className="text-2xl mb-1">💳</div>
            <p className="text-sm font-medium text-neutral-200">Online Payment</p>
            <p className="text-xs text-neutral-500">UPI, Cards & COD</p>
          </div>
          <div>
            <div className="text-2xl mb-1">📍</div>
            <p className="text-sm font-medium text-neutral-200">5km Radius</p>
            <p className="text-xs text-neutral-500">Delivery coverage</p>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      {testimonials.length > 0 && (
        <section className="py-10 px-4 bg-neutral-900/20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-center">What Our Customers Say</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <svg key={s} className={`w-4 h-4 ${s < (t.rating || 5) ? 'text-yellow-500' : 'text-neutral-700'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed mb-3 line-clamp-3">
                    "{t.comment || t.feedback || t.message || t.text}"
                  </p>
                  <p className="text-xs text-neutral-500 font-medium">
                    — {t.customer_name || t.name || 'Happy Customer'}
                  </p>
                </div>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link to="/testimonials" className="text-sm text-orange-500 hover:text-orange-400">
                Read more reviews &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

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
      <section className="py-10 px-4 bg-gradient-to-r from-orange-600 to-orange-500 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Hungry? Order Now!</h2>
          <p className="text-orange-100 mb-6">Free delivery under 3km. Pay online or cash on delivery.</p>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold px-8 py-3 rounded-full hover:bg-orange-50 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      </section>
    </>
  )
}
