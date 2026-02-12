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
    <section className="py-8 px-4 bg-gradient-to-r from-orange-600/10 via-orange-500/5 to-transparent border-y border-orange-500/20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Today's Special
          </span>
        </div>
        <Link
          to={`/menu?highlight=${item.id}`}
          onClick={() => trackCtaClick('todays_special', 'home')}
          className="flex gap-4 items-center bg-neutral-900/80 border border-neutral-700 rounded-2xl p-4 hover:border-orange-500/50 transition-colors group"
        >
          {item.image_url && (
            <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-800">
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
              <h3 className="text-lg md:text-xl font-semibold text-white leading-tight">{item.name}</h3>
            </div>
            <p className="text-sm text-neutral-400 mb-2">{item.category}</p>
            {item.description && (
              <p className="text-sm text-neutral-500 line-clamp-2 mb-2">{item.description}</p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-orange-500 font-bold text-lg">₹{Number(item.price).toFixed(0)}</span>
              <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Order Now</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
