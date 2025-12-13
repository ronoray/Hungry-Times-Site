// hungrytimes-frontend/src/pages/Gallery.jsx - FIXED VERSION
import { useState, useEffect } from 'react'
import Section from '../components/Section'

// Get API base from environment or use default
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api'

console.log('🔧 Gallery initialized with API_BASE:', API_BASE)

export default function Gallery() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  useEffect(() => {
    fetchGalleryImages()
  }, [])

  const fetchGalleryImages = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const url = `${API_BASE}/gallery/public`
      console.log('📡 Fetching from:', url)
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('✅ Gallery data received:', data)
      
      setImages(data.images || [])
      
      if (data.images && data.images.length > 0) {
        console.log(`✅ Loaded ${data.images.length} active images`)
        data.images.forEach(img => {
          console.log(`  - ${img.dish_name}: ${img.image_url}`)
        })
      }
    } catch (err) {
      console.error('❌ Gallery fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openLightbox = (image) => {
    setSelectedImage(image)
  }

  const closeLightbox = () => {
    setSelectedImage(null)
  }

  if (loading) {
    return (
      <Section title="Gallery">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card aspect-square bg-neutral-800 animate-pulse" />
          ))}
        </div>
      </Section>
    )
  }

  if (error) {
    return (
      <Section title="Gallery">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Unable to Load Gallery</h3>
          <p className="text-neutral-400 mb-2">{error}</p>
          <p className="text-xs text-neutral-500 mb-4">API Endpoint: {API_BASE}/gallery/public</p>
          <button 
            onClick={fetchGalleryImages}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </Section>
    )
  }

  if (images.length === 0) {
    return (
      <Section title="Gallery">
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No Images Yet</h3>
          <p className="text-neutral-400">Check back soon for photos of our restaurant and dishes!</p>
        </div>
      </Section>
    )
  }

  return (
    <>
      <Section title="Gallery">
        <p className="text-neutral-400 mb-8 text-center">
          Explore our delicious dishes and restaurant ambiance
        </p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="group cursor-pointer"
              onClick={() => openLightbox(image)}
            >
              {/* Image Card */}
              <div className="card aspect-square overflow-hidden relative mb-3">
                <img
                  src={image.image_url}
                  alt={image.dish_name || 'Gallery image'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                  onError={(e) => {
                    console.error('❌ Failed to load image:', image.image_url)
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23333" width="400" height="400"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E'
                  }}
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div className="text-white">
                    <h3 className="font-bold text-lg mb-1">{image.dish_name}</h3>
                    {image.caption && (
                      <p className="text-sm text-neutral-300 line-clamp-2">{image.caption}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dish Name (Always Visible) */}
              <div className="px-2">
                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-orange-400 transition-colors">
                  {image.dish_name}
                </h3>
                {image.caption && (
                  <p className="text-sm text-neutral-400 line-clamp-2">
                    {image.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 text-white hover:text-neutral-300 transition-colors z-10"
            onClick={closeLightbox}
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Image Container */}
          <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage.image_url}
              alt={selectedImage.dish_name || 'Gallery image'}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* Image Info */}
            <div className="mt-6 text-center">
              <h2 className="text-white text-3xl font-bold mb-3">
                {selectedImage.dish_name}
              </h2>
              {selectedImage.caption && (
                <p className="text-neutral-300 text-lg max-w-2xl mx-auto">
                  {selectedImage.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}