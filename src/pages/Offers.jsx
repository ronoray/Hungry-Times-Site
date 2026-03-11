// src/pages/Offers.jsx — Central offers hub
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Tag, Gift, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import API_BASE from '../config/api';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import './Offers.css';

function OfferCard({ offer }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const discountText = offer.discount_type === 'percent'
    ? `${offer.discount_value}% OFF`
    : `₹${offer.discount_value} OFF`;

  const copyCode = async () => {
    if (!offer.promo_code) return;
    try {
      await navigator.clipboard.writeText(offer.promo_code);
    } catch {
      const el = document.createElement('textarea');
      el.value = offer.promo_code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Days remaining
  let daysLeft = null;
  if (offer.valid_till) {
    const end = new Date(offer.valid_till + 'T23:59:59');
    const diff = end - new Date();
    if (diff > 0) daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="offer-card">
      <div className="offer-card-badge">{discountText}</div>
      <h3 className="offer-card-title">{offer.title}</h3>
      {offer.description && (
        <p className="offer-card-desc">{offer.description}</p>
      )}
      <div className="offer-card-meta">
        {offer.min_order_value > 0 && (
          <span className="offer-card-chip">Min order ₹{offer.min_order_value}</span>
        )}
        {offer.max_discount && (
          <span className="offer-card-chip">Max save ₹{offer.max_discount}</span>
        )}
        {daysLeft !== null && (
          <span className="offer-card-chip offer-card-chip--timer">
            <Clock className="w-3 h-3" />
            {daysLeft} days left
          </span>
        )}
      </div>
      {offer.promo_code && (
        <div className="offer-card-code-row">
          <button onClick={copyCode} className="offer-card-code-btn">
            <span className="offer-card-code-text">{offer.promo_code}</span>
            {copied
              ? <Check className="w-4 h-4 text-green-400" />
              : <Copy className="w-4 h-4 text-orange-400" />
            }
          </button>
          {copied && <span className="offer-card-copied">Copied!</span>}
        </div>
      )}
      <button onClick={() => navigate('/menu')} className="offer-card-cta">
        Order Now
      </button>
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'faq-item--open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="faq-q">
        <span>{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </div>
      {open && <p className="faq-a">{a}</p>}
    </div>
  );
}

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerPhone, setCustomerPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState({ show: false, type: '', message: '' });
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const { customer, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchOffers();
  }, [isAuthenticated, customer?.phone]);

  const fetchOffers = async () => {
    try {
      const phoneParam = isAuthenticated && customer?.phone ? `?phone=${customer.phone}` : '';
      const res = await fetch(`${API_BASE}/offers/active${phoneParam}`);
      if (res.ok) {
        const data = await res.json();
        // Only show offers that have a promo code (not auto-apply hidden ones)
        setOffers((data.offers || []).filter(o => o.promo_code));
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = verifyCode.trim().toUpperCase();
    const phone = customerPhone.trim().replace(/\D/g, '');

    if (!code) {
      setVerifyResult({ show: true, type: 'error', message: 'Please enter a code.' });
      return;
    }
    if (phone.length < 10) {
      setVerifyResult({ show: true, type: 'error', message: 'Please enter a valid 10-digit phone number.' });
      return;
    }

    setVerifying(true);
    setVerifyResult({ show: false, type: '', message: '' });

    try {
      const response = await fetch(`${API_BASE}/offers/validate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, customerPhone: phone })
      });

      const data = await response.json();

      if (data.valid) {
        const discText = data.discount_type === 'percent'
          ? `${data.discount_value}% OFF`
          : `₹${data.discount_value} OFF`;
        setVerifyResult({
          show: true,
          type: 'success',
          message: `<div style="text-align:center">
            <div class="code-display">${code}</div>
            <p style="font-weight:bold;color:#10b981">Code is valid!</p>
            <p>${data.title} — <strong>${discText}</strong></p>
            <p style="margin-top:10px;font-size:0.9em;color:#a0a0a0">Apply this code at checkout to get your discount.</p>
          </div>`
        });
      } else {
        setVerifyResult({
          show: true,
          type: 'error',
          message: data.error || 'This code is invalid or expired.'
        });
      }
    } catch {
      setVerifyResult({ show: true, type: 'error', message: 'Unable to connect. Please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="offers-container">
      <SEOHead
        title="Offers & Rewards"
        description="Exclusive offers at Hungry Times — promo codes, loyalty rewards, and more. Order online and save on your favourite Chinese-Continental food in Kolkata."
        canonicalPath="/offers"
      />

      {/* Header */}
      <div className="offers-header">
        <h1>Offers & Rewards</h1>
        <p className="subtitle">Exclusive deals for our guests</p>
      </div>

      {/* Active Promo Codes */}
      {!loading && offers.length > 0 && (
        <div className="section">
          <div className="section-title-row">
            <Tag className="w-5 h-5 text-orange-400" />
            <h2 className="section-title">Active Offers</h2>
          </div>
          <div className="offers-grid">
            {offers.map(o => <OfferCard key={o.id} offer={o} />)}
          </div>
        </div>
      )}

      {/* Verify Code */}
      <div className="section">
        <div className="section-title-row">
          <Gift className="w-5 h-5 text-orange-400" />
          <h2 className="section-title">Verify a Code</h2>
        </div>
        <p className="section-description">
          Have a promo code? Check if it's valid and see your discount.
        </p>

        <form onSubmit={handleVerify}>
          <div className="input-group">
            <label htmlFor="customerPhone">Your Phone Number</label>
            <input
              type="tel"
              id="customerPhone"
              placeholder="10-digit phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="verifyCode">Promo Code</label>
            <input
              type="text"
              id="verifyCode"
              placeholder="e.g. FIRST30, TRYONLINE, WEEKEND15"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={verifying}>
            {verifying ? <><span className="loading"></span> Checking...</> : 'Verify Code'}
          </button>
        </form>

        {verifyResult.show && (
          <div
            className={`result-box ${verifyResult.type}`}
            dangerouslySetInnerHTML={{ __html: verifyResult.message }}
          />
        )}
      </div>

      {/* FAQ */}
      <div className="section">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          <FAQItem
            q="How do I use a promo code?"
            a="Add items to your cart, go to checkout, and enter the code in the 'Have a code?' section. The discount will be applied to your order total."
          />
          <FAQItem
            q="Can I use multiple codes on one order?"
            a="Only one promo code can be applied per order. However, you can combine a promo code with loyalty points redemption."
          />
          <FAQItem
            q="Do codes work for dine-in orders?"
            a="Promo codes like FIRST30 and TRYONLINE are for online orders only. Loyalty points can be redeemed online."
          />
          <FAQItem
            q="Why is my code not working?"
            a="Some codes have eligibility rules — FIRST30 works only on your first order, TRYONLINE works 20+ days after your last order, WEEKEND15 only on Saturdays and Sundays, and LUNCH15 only between 12 PM and 3 PM."
          />
        </div>
      </div>

      {/* Loyalty Rewards */}
      <div className="section loyalty-section-container">
        <div className="loyalty-section">
          <div className="loyalty-icon">
            <Gift className="w-10 h-10 text-orange-400 mx-auto" />
          </div>
          <h3>Loyalty Rewards</h3>
          <p className="section-description">
            Earn 1 point for every ₹10 spent. Redeem points at checkout — 1 point = ₹1 off.
          </p>
          <ul style={{ textAlign: 'left', marginTop: '12px', paddingLeft: '20px', color: '#9ca3af', fontSize: '0.9em', lineHeight: '1.8' }}>
            <li>Minimum <strong style={{ color: '#e5e7eb' }}>50 points</strong> to redeem</li>
            <li>Points visible at checkout when you sign in</li>
            <li>Stackable with most promo codes</li>
          </ul>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="section" style={{ textAlign: 'center', border: 'none', background: 'transparent' }}>
        <button
          onClick={() => navigate('/menu')}
          className="btn btn-primary"
          style={{ maxWidth: 320, margin: '0 auto' }}
        >
          Browse Menu & Order
        </button>
      </div>
    </div>
  );
}
