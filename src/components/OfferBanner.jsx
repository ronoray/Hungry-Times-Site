// components/OfferBanner.jsx
// Dismissible banner showing active offers with countdown
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../config/api.js';

export default function OfferBanner() {
  const [offer, setOffer] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already dismissed in this session
    if (sessionStorage.getItem('offer_banner_dismissed')) {
      setDismissed(true);
      return;
    }

    fetchOffer();
  }, []);

  useEffect(() => {
    if (!offer?.valid_till) return;

    const update = () => {
      const end = new Date(offer.valid_till + 'T23:59:59');
      const now = new Date();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days > 1) {
        setTimeLeft(`${days} days left`);
      } else if (days === 1) {
        setTimeLeft('Ends tomorrow!');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        setTimeLeft(`${hours}h left!`);
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [offer]);

  const fetchOffer = async () => {
    try {
      const res = await fetch(`${API_BASE}/offers/active`);
      if (!res.ok) return;
      const data = await res.json();
      const offers = data.offers || [];
      // Pick first active offer
      if (offers.length > 0) setOffer(offers[0]);
    } catch {
      // silently fail
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('offer_banner_dismissed', '1');
  };

  if (dismissed || !offer) return null;

  const discountText = offer.discount_type === 'percent'
    ? `${offer.discount_value}% OFF`
    : `₹${offer.discount_value} OFF`;

  return (
    <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-4 py-2.5 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm">
        <span className="font-bold">{discountText}</span>
        <span className="hidden sm:inline">—</span>
        <span className="hidden sm:inline">{offer.title}</span>
        {offer.promo_code && (
          <span className="bg-white/20 px-2 py-0.5 rounded font-mono text-xs">
            Code: {offer.promo_code}
          </span>
        )}
        {timeLeft && (
          <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-medium">
            {timeLeft}
          </span>
        )}
        <button
          onClick={() => navigate('/menu')}
          className="bg-white text-orange-600 px-3 py-1 rounded font-bold text-xs hover:bg-orange-50 transition-colors ml-1"
        >
          Order Now
        </button>
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
