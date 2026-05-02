import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShoppingBag, ChevronRight } from 'lucide-react';

export default function FloatingCartBar() {
  const { lines, total, orderMode } = useCart();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lines.length > 0) setVisible(true);
  }, [lines.length]);

  if (lines.length === 0) return null;

  const itemCount = lines.reduce((sum, l) => sum + (l.qty || 1), 0);

  return (
    <div className="fixed left-0 right-0 z-40 px-4 pointer-events-none bottom-[calc(80px+env(safe-area-inset-bottom,0px))] md:bottom-6">
      <button
        onClick={() => navigate('/order')}
        className={`pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-between
                   bg-orange-500 hover:bg-orange-600 active:bg-orange-700
                   text-white px-5 py-3.5
                   rounded-2xl shadow-xl shadow-orange-900/40
                   transition-all duration-200
                   ${visible ? 'animate-slideUp' : 'opacity-0'}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {Math.min(itemCount, 9)}
            </span>
          </div>
          <span className="font-bold text-sm">
            {itemCount} item{itemCount > 1 ? 's' : ''}
          </span>
          {(orderMode === 'dine_in' || orderMode === 'pickup') && (
            <span className="text-xs text-orange-200 opacity-80">
              · {orderMode === 'dine_in' ? 'Dine-in' : 'Pickup'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold">₹{total.toFixed(0)}</span>
          <span className="text-sm text-orange-100">View Cart</span>
          <ChevronRight className="w-4 h-4 text-orange-200" />
        </div>
      </button>
    </div>
  );
}
