import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import API_BASE from '../config/api';
import { ChevronRight, X, Star } from 'lucide-react';

const STATUS_CONFIG = {
  pending:          { label: 'Order placed',         color: 'border-l-amber-500',   dot: 'bg-amber-500' },
  confirmed:        { label: 'Order confirmed',      color: 'border-l-blue-500',    dot: 'bg-blue-500' },
  preparing:        { label: 'Preparing your order', color: 'border-l-violet-500',  dot: 'bg-violet-500' },
  out_for_delivery: { label: 'Out for delivery',     color: 'border-l-emerald-500', dot: 'bg-emerald-500' },
};

export default function ActiveOrderBar() {
  const { isAuthenticated } = useAuth();
  const { lines } = useCart();
  const navigate = useNavigate();

  const [activeOrder, setActiveOrder] = useState(null);
  const [deliveredOrder, setDeliveredOrder] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchActiveOrder = useCallback(async () => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('customerToken');
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/delivery/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.order) {
        setActiveOrder(data.order);
        setDeliveredOrder(null);
        setDismissed(false);
      } else {
        // No active order — check for recently delivered
        if (activeOrder && !deliveredOrder) {
          // Order just transitioned to delivered
          setActiveOrder(null);
          await fetchRecentDelivered(token);
        } else if (!activeOrder) {
          // Initial load, check for recent delivered
          await fetchRecentDelivered(token);
        }
      }
    } catch (e) {
      // Silently fail — polling will retry
    }
  }, [isAuthenticated, activeOrder, deliveredOrder]);

  const fetchRecentDelivered = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/delivery/recent-delivered`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.order) {
        const dismissKey = `ht_reviewed_${data.order.id}`;
        const dismissedAt = localStorage.getItem(dismissKey);
        if (!dismissedAt) {
          setDeliveredOrder(data.order);
        }
      }
    } catch (e) {}
  };

  // Poll for active order
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveOrder(null);
      setDeliveredOrder(null);
      return;
    }

    fetchActiveOrder();
    const interval = setInterval(fetchActiveOrder, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchActiveOrder]);

  const handleDismiss = () => {
    if (deliveredOrder) {
      localStorage.setItem(`ht_reviewed_${deliveredOrder.id}`, Date.now().toString());
    }
    setDeliveredOrder(null);
    setDismissed(true);
    setShowReview(false);
    setRating(0);
    setReviewText('');
  };

  const handleSubmitReview = async () => {
    if (!rating || !deliveredOrder) return;
    setSubmitting(true);

    try {
      const token = localStorage.getItem('customerToken');
      await fetch(`${API_BASE}/feedback/public/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rating,
          comment: reviewText || '',
          orderId: deliveredOrder.id,
          source: 'order_bar'
        })
      });
    } catch (e) {
      console.warn('Review submit failed:', e.message);
    }

    handleDismiss();
    setSubmitting(false);
  };

  // Nothing to show
  if (!activeOrder && !deliveredOrder) return null;
  if (dismissed) return null;

  const hasCartItems = lines.length > 0;
  // Stack above cart bar when both are visible
  const bottomClass = hasCartItems
    ? 'bottom-[calc(136px+env(safe-area-inset-bottom,0px))] md:bottom-[calc(72px+24px)]'
    : 'bottom-[calc(72px+env(safe-area-inset-bottom,0px))] md:bottom-6';

  // State B — Delivered → Review prompt
  if (deliveredOrder) {
    return (
      <div className={`fixed left-0 right-0 z-40 px-4 pointer-events-none ${bottomClass}`}>
        <div className="pointer-events-auto w-full max-w-lg mx-auto bg-neutral-800/95 backdrop-blur-sm border border-neutral-700 rounded-2xl shadow-lg shadow-black/40 p-4">
          <div className="flex items-start justify-between mb-2">
            <p className="text-white font-semibold text-sm">
              Order delivered! Rate your experience
            </p>
            <button onClick={handleDismiss} className="text-neutral-500 hover:text-white p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Star rating */}
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onClick={() => { setRating(s); setShowReview(true); }}
                className="p-0.5"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-600'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Expanded review form */}
          {showReview && rating > 0 && (
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                placeholder="Tell us more (optional)"
                className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {submitting ? '...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // State A — Active order tracking
  const config = STATUS_CONFIG[activeOrder.status] || STATUS_CONFIG.pending;

  return (
    <div className={`fixed left-0 right-0 z-40 px-4 pointer-events-none ${bottomClass}`}>
      <button
        onClick={() => navigate(`/orders/${activeOrder.id}`)}
        className={`pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-between
                   bg-neutral-800/95 backdrop-blur-sm border border-neutral-700 border-l-4 ${config.color}
                   text-white px-4 py-3
                   rounded-2xl shadow-lg shadow-black/40
                   transition-all duration-200`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
            <span className="text-sm font-semibold truncate">{config.label}</span>
            {activeOrder.estimated_delivery_time && (
              <span className="text-xs text-neutral-400 ml-auto shrink-0">
                ~{activeOrder.estimated_delivery_time}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-0.5 truncate">
            Order #{activeOrder.id} &middot; ₹{activeOrder.total}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-neutral-400 ml-2 shrink-0" />
      </button>
    </div>
  );
}
