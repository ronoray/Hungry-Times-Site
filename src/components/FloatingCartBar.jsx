import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShoppingBag, ChevronRight } from 'lucide-react';

export default function FloatingCartBar() {
  const { lines, total } = useCart();
  const navigate = useNavigate();

  if (lines.length === 0) return null;

  const itemCount = lines.reduce((sum, l) => sum + (l.qty || 1), 0);

  return (
    <div className="fixed md:bottom-6 left-0 right-0 z-40 px-4 pointer-events-none" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
      <button
        onClick={() => navigate('/order')}
        className="pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-between
                   bg-green-600 hover:bg-green-700 active:bg-green-800
                   text-white px-5 py-3.5
                   rounded-2xl shadow-[0_8px_30px_rgba(22,163,74,0.45)]
                   transition-all duration-200"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-white text-green-700 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {Math.min(itemCount, 9)}
            </span>
          </div>
          <span className="font-bold text-sm">
            {itemCount} item{itemCount > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold">₹{total.toFixed(0)}</span>
          <span className="text-sm text-green-100">View Cart</span>
          <ChevronRight className="w-4 h-4 text-green-200" />
        </div>
      </button>
    </div>
  );
}
