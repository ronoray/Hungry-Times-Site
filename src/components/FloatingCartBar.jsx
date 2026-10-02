import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ChevronRight } from 'lucide-react';

export default function FloatingCartBar() {
  const { lines, total, orderMode } = useCart();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lines.length > 0) setVisible(true);
  }, [lines.length]);

  if (lines.length === 0) return null;

  const itemCount = lines.reduce((sum, l) => sum + (l.qty || 1), 0);

  // DNA v2: red pill, gold2 amount, gold2 "View bag" button. Sits in slot 1
  // of the floating stack (80px, above the bottom nav).
  return (
    <div className="pointer-events-none fixed left-0 right-0 z-40 px-3 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] md:bottom-6">
      <button
        onClick={() => navigate('/order')}
        className={`pointer-events-auto mx-auto flex h-[58px] w-full max-w-lg items-center justify-between gap-3
                   rounded-full bg-ht-red pl-5 pr-2 text-white
                   shadow-[0_12px_24px_-8px_rgba(90,7,13,.6)] transition active:scale-[.98]
                   ${visible ? 'animate-slideUp' : 'opacity-0'}`}
        aria-label={`View bag, ${itemCount} item${itemCount > 1 ? 's' : ''}, ₹${total.toFixed(0)}`}
      >
        <span className="min-w-0 truncate text-sm font-semibold">
          {itemCount} item{itemCount > 1 ? 's' : ''} · <b className="font-extrabold text-ht-gold2">₹{total.toFixed(0)}</b>
          {(orderMode === 'dine_in' || orderMode === 'pickup') && (
            <span className="text-ht-ivory/75"> · {orderMode === 'dine_in' ? 'Dine-in' : 'Takeaway'}</span>
          )}
        </span>
        <span className="flex h-[42px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-ht-gold2 px-4 text-sm font-bold text-ht-ink">
          View bag <ChevronRight className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
