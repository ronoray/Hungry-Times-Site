import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import API_BASE from '../config/api'
import VegDot from './VegDot'
import { trackCtaClick } from '../utils/analytics'

export default function TodaysSpecial() {
  const [item, setItem] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/public/todays-special`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ok) setItem(data.item) })
      .catch(() => {})
  }, [])

  if (!item) return null

  return (
    <section className="py-8 px-4 bg-gradient-to-r from-ht-red/10 via-ht-red/5 to-transparent border-y border-ht-red/20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-ht-red text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Today's Special
          </span>
        </div>
        <Link
          to={`/menu?highlight=${item.id}`}
          onClick={() => trackCtaClick('todays_special', 'home')}
          className="flex gap-4 items-center bg-ht-ivory border border-ht-ink/15 rounded-2xl p-4 hover:border-ht-red/50 transition-colors group"
        >
          {item.image_url && (
            <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-ht-paper">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 mb-1">
              {item.is_veg != null && <VegDot isVeg={item.is_veg} />}
              <h3 className="text-lg md:text-xl font-semibold text-ht-ink leading-tight">{item.name}</h3>
            </div>
            <p className="text-sm text-ht-mute mb-2">{item.category}</p>
            {item.description && (
              <p className="text-sm text-ht-mute line-clamp-2 mb-2">{item.description}</p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-ht-red font-bold text-lg">₹{Number(item.price).toFixed(0)}</span>
              <span className="text-xs text-ht-red bg-ht-red/10 px-2 py-0.5 rounded-full">Order Now</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
