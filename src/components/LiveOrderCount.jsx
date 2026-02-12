import { useState, useEffect } from 'react'
import API_BASE from '../config/api'

export default function LiveOrderCount() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/public/live-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ok && data.orders_today > 0) setStats(data) })
      .catch(() => {})

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetch(`${API_BASE}/public/live-stats`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.ok) setStats(data.orders_today > 0 ? data : null) })
        .catch(() => {})
    }, 300000)

    return () => clearInterval(interval)
  }, [])

  if (!stats) return null

  return (
    <div className="flex items-center justify-center gap-2 py-2 bg-green-600/10 border-y border-green-600/20">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <p className="text-sm text-green-400 font-medium">
        {stats.message}
      </p>
    </div>
  )
}
