import { Link } from 'react-router-dom'
import { BRAND } from '../lib/constants'
import SEOHead from '../components/SEOHead'
import StructuredData from '../components/StructuredData'

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

export default function Home() {
  return (
    <>
      <SEOHead
        title="Hungry Times — Order Food Online in Kolkata"
        description="Order delicious food online from Hungry Times. Fast delivery within 5km. Indian, Chinese, Continental cuisine. Free delivery under 3km!"
        canonicalPath="/"
      />
      <StructuredData data={RESTAURANT_SCHEMA} />
      {/* Hero Section with Single Image Placeholder */}
      <section className="relative min-h-[40vh] md:min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950">
        <div className="absolute inset-0 bg-neutral-800 animate-pulse">
          {/* Placeholder for hero image */}
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            <div className="text-center">
              <svg className="mx-auto h-24 w-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Hero Image Placeholder</p>
            </div>
          </div>
        </div>
        
        {/* Overlay Content */}
        <div className="relative z-10 text-center px-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-lg">
            Welcome to {BRAND.name}
          </h1>
          <p className="text-lg md:text-xl text-neutral-200 mb-8 drop-shadow">
            Chinese-Continental fusion cuisine in the heart of {BRAND.city}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/menu" className="btn btn-primary text-lg px-8 py-3">
              View Menu
            </Link>
            <a href={`tel:${BRAND.phone1}`} className="btn bg-neutral-800 hover:bg-neutral-700 text-white text-lg px-8 py-3">
              Call to Order
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="container-section py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-6">Our Story</h2>
          <p className="text-neutral-300 text-lg leading-relaxed mb-4">
            At {BRAND.name}, we bring together the best of Chinese and Continental cuisines in a cozy, 
            air-conditioned setting perfect for dining in or takeaway.
          </p>
          <p className="text-neutral-400">
            Located at {BRAND.address}, we've been serving delicious meals to the community with 
            passion and dedication.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="container-section py-12 bg-neutral-900/30">
        <h2 className="text-2xl font-semibold mb-8 text-center">What We Offer</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-lg">Extensive Menu</h3>
            <p className="text-neutral-300 mb-4">
              Explore our diverse selection of Chinese and Continental dishes
            </p>
            <Link to="/menu" className="text-orange-500 hover:text-orange-400 text-sm font-medium">
              Browse Menu →
            </Link>
          </div>

          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-lg">Call to Order</h3>
            <p className="text-neutral-300 mb-4">
              Quick phone orders for takeaway and delivery
            </p>
            <a href={`tel:${BRAND.phone1}`} className="text-orange-500 hover:text-orange-400 text-sm font-medium">
              {BRAND.phone1} →
            </a>
          </div>

          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2 text-lg">Visit Us</h3>
            <p className="text-neutral-300 mb-4">
              Comfortable air-conditioned dining space
            </p>
            <Link to="/contact" className="text-orange-500 hover:text-orange-400 text-sm font-medium">
              Get Directions →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}