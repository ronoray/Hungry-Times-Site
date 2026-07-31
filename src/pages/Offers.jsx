// src/pages/Offers.jsx — the discount explainer: what's live, what it saves,
// and every rule that decides whether a discount applies.
//
// Nothing about the offers is hardcoded. Cards come from GET /offers/active,
// and the ₹ floor + tiered ceiling used by the calculator come from the same
// response (server/utils/offerPolicy.js). Copy that quotes a rupee figure must
// read it from state, never from a literal in this file.
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy, Check, Tag, Gift, Clock, ChevronDown, ChevronUp,
  Calculator, Sparkles, ShieldCheck, Ban, Percent, Users,
} from 'lucide-react';
import API_BASE from '../config/api';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import {
  ceilingFor, offerSavingFor, loyaltySavingFor, bestOf, pointsEarnedOn, audienceLabel,
  FALLBACK_MIN_ORDER, FALLBACK_TIERS,
  LOYALTY_EARN_RATE, LOYALTY_MIN_REDEEM, LOYALTY_MAX_REDEEM_FRACTION,
} from '../lib/discountRules';
import './Offers.css';

const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** Stash a code the way OfferBanner does, so checkout auto-applies it. */
function stashCode(code) {
  if (!code) return;
  try { sessionStorage.setItem('ht_promo', code); } catch { /* private mode */ }
}

function OfferCard({ offer, floor }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const discountText = offer.discount_type === 'percent'
    ? `${offer.discount_value}% OFF`
    : `${rupee(offer.discount_value)} OFF`;

  const restricted = !!(offer.applicable_item_ids && String(offer.applicable_item_ids).trim());

  // Item-restricted bundles are exempt from the global floor; everything else
  // must clear it, so the higher of the two is the real minimum.
  const effectiveMin = restricted
    ? (Number(offer.min_order_value) || 0)
    : Math.max(floor, Number(offer.min_order_value) || 0);

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

  const useCode = () => {
    stashCode(offer.promo_code);
    navigate('/menu');
  };

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
      {offer.description && <p className="offer-card-desc">{offer.description}</p>}

      <div className="offer-card-meta">
        <span className="offer-card-chip offer-card-chip--who">
          <Users className="w-3 h-3" />
          {audienceLabel(offer.target_audience)}
        </span>
        {effectiveMin > 0 && (
          <span className="offer-card-chip">Min order {rupee(effectiveMin)}</span>
        )}
        {offer.max_discount > 0 && (
          <span className="offer-card-chip">Max save {rupee(offer.max_discount)}</span>
        )}
        {daysLeft !== null && (
          <span className="offer-card-chip offer-card-chip--timer">
            <Clock className="w-3 h-3" />
            {daysLeft === 1 ? 'Ends tomorrow' : `${daysLeft} days left`}
          </span>
        )}
      </div>

      {restricted && (
        <p className="offer-card-note">
          Applies to selected items only — the discount is calculated on those items, not the whole cart.
        </p>
      )}

      {offer.promo_code && (
        <div className="offer-card-code-row">
          <button onClick={copyCode} className="offer-card-code-btn" type="button">
            <span className="offer-card-code-text">{offer.promo_code}</span>
            {copied
              ? <Check className="w-4 h-4 text-green-400" />
              : <Copy className="w-4 h-4 text-orange-400" />}
          </button>
          {copied && <span className="offer-card-copied">Copied!</span>}
        </div>
      )}

      <button onClick={useCode} className="offer-card-cta" type="button">
        {offer.promo_code ? 'Use this code' : 'Order Now'}
      </button>
    </div>
  );
}

function SavingsCalculator({ offers, tiers, floor, points }) {
  const [amount, setAmount] = useState('800');
  const [pointsInput, setPointsInput] = useState(String(points || 0));

  const subtotal = Number(amount) || 0;
  const balance = Number(pointsInput) || 0;

  const rows = useMemo(() => {
    const list = offers.map((o) => {
      const r = offerSavingFor(o, subtotal, { tiers, floor });
      return {
        key: `offer-${o.id}`,
        label: o.promo_code || o.title,
        sub: o.title,
        ...r,
      };
    });

    const loyalty = loyaltySavingFor(balance, subtotal, { floor });
    list.push({
      key: 'loyalty',
      label: 'Loyalty points',
      sub: `${balance} points available`,
      saving: loyalty.saving,
      blocked: loyalty.blocked,
      unknown: false,
    });

    return list;
  }, [offers, subtotal, balance, tiers, floor]);

  const winner = useMemo(() => bestOf(rows), [rows]);
  const ceiling = ceilingFor(subtotal, tiers);
  const earned = pointsEarnedOn(subtotal);

  const blockedText = (row) => {
    if (row.unknown) return 'Depends on your cart';
    switch (row.blocked) {
      case 'floor': return `Needs ${rupee(floor)}+`;
      case 'min_order': return 'Below this offer\'s minimum';
      case 'min_points': return `Needs ${LOYALTY_MIN_REDEEM}+ points`;
      default: return 'Not eligible';
    }
  };

  return (
    <div className="calc">
      <div className="calc-inputs">
        <div className="input-group">
          <label htmlFor="calcAmount">Your order total (₹)</label>
          <input
            id="calcAmount"
            type="number"
            inputMode="numeric"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="800"
          />
        </div>
        <div className="input-group">
          <label htmlFor="calcPoints">Your loyalty points</label>
          <input
            id="calcPoints"
            type="number"
            inputMode="numeric"
            min="0"
            value={pointsInput}
            onChange={(e) => setPointsInput(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="calc-rows">
        {rows.map((row) => {
          const isWinner = winner && winner.key === row.key;
          return (
            <div key={row.key} className={`calc-row ${isWinner ? 'calc-row--win' : ''}`}>
              <div className="calc-row-left">
                <span className="calc-row-label">{row.label}</span>
                <span className="calc-row-sub">{row.sub}</span>
              </div>
              <div className="calc-row-right">
                {row.saving > 0
                  ? <span className="calc-row-save">− {rupee(row.saving)}</span>
                  : <span className="calc-row-blocked">{blockedText(row)}</span>}
                {isWinner && <span className="calc-row-tag">Best</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="calc-summary">
        {winner ? (
          <>
            <p className="calc-summary-line">
              Best saving on {rupee(subtotal)}: <strong>{rupee(winner.saving)}</strong> with{' '}
              <strong>{winner.label}</strong> — you pay about{' '}
              <strong>{rupee(subtotal - winner.saving)}</strong> before GST and delivery.
            </p>
            <p className="calc-summary-note">
              Only one discount applies per order. At this order value the most any code can take off is {rupee(ceiling)}.
            </p>
          </>
        ) : (
          <p className="calc-summary-line">
            No discount applies at {rupee(subtotal)}.{' '}
            {subtotal < floor
              ? `Codes and points start at ${rupee(floor)}.`
              : 'You may not be eligible for the offers currently running.'}
          </p>
        )}
        <p className="calc-summary-note">
          You still earn <strong>{earned} points</strong> on this order — worth {rupee(earned)} off a future one.
        </p>
      </div>

      <p className="calc-disclaimer">
        An estimate, not a quote. Your final discount is confirmed at checkout.
      </p>
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'faq-item--open' : ''}`} onClick={() => setOpen(!open)}>
      <div className="faq-q">
        <span>{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-orange-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </div>
      {open && <p className="faq-a">{a}</p>}
    </div>
  );
}

export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [pointsPromo, setPointsPromo] = useState(null);
  const [floor, setFloor] = useState(FALLBACK_MIN_ORDER);
  const [tiers, setTiers] = useState(FALLBACK_TIERS);
  const [loading, setLoading] = useState(true);
  const [customerPhone, setCustomerPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const { customer, isAuthenticated } = useAuth();

  const myPoints = customer?.loyaltyPoints || 0;

  useEffect(() => {
    let cancelled = false;

    const fetchOffers = async () => {
      try {
        const phoneParam = isAuthenticated && customer?.phone ? `?phone=${customer.phone}` : '';
        const res = await fetch(`${API_BASE}/offers/active${phoneParam}`);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          // Only codes are shown — auto-apply offers have nothing for a customer to do.
          setOffers((data.offers || []).filter((o) => o.promo_code));
          setPointsPromo(data.points_promo || null);
          if (Number(data.min_order_for_offer) >= 0) setFloor(Number(data.min_order_for_offer));
          if (Array.isArray(data.discount_tiers) && data.discount_tiers.length) {
            setTiers(data.discount_tiers);
          }
        }
      } catch { /* keep fallbacks */ }
      if (!cancelled) setLoading(false);
    };

    fetchOffers();
    return () => { cancelled = true; };
  }, [isAuthenticated, customer?.phone]);

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = verifyCode.trim().toUpperCase();
    const phone = customerPhone.trim().replace(/\D/g, '');

    if (!code) {
      setVerifyResult({ type: 'error', message: 'Please enter a code.' });
      return;
    }
    if (phone.length < 10) {
      setVerifyResult({ type: 'error', message: 'Please enter a valid 10-digit phone number.' });
      return;
    }

    setVerifying(true);
    setVerifyResult(null);

    try {
      const response = await fetch(`${API_BASE}/offers/validate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, customerPhone: phone }),
      });
      const data = await response.json();

      if (data.valid) {
        setVerifyResult({
          type: 'success',
          code,
          title: data.title,
          discountText: data.discount_type === 'percent'
            ? `${data.discount_value}% OFF`
            : `${rupee(data.discount_value)} OFF`,
        });
      } else {
        setVerifyResult({ type: 'error', message: data.error || 'This code is invalid or expired.' });
      }
    } catch {
      setVerifyResult({ type: 'error', message: 'Unable to connect. Please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  // Sorted low→high so the table reads as a ladder.
  const tierRows = useMemo(
    () => (Array.isArray(tiers) ? tiers : FALLBACK_TIERS)
      .slice()
      .sort((a, b) => a.min - b.min)
      .filter((t) => t.rsCap > 0 || t.pctCap > 0),
    [tiers]
  );

  const maxPointsPct = Math.round(LOYALTY_MAX_REDEEM_FRACTION * 100);

  return (
    <div className="offers-container">
      <SEOHead
        title="Offers, Discounts & Loyalty Rewards"
        description="Every discount at Hungry Times in one place — live promo codes, loyalty points worth 10% back, how much you can save, and the rules that apply. Order Chinese-Continental food online in Kolkata."
        canonicalPath="/offers"
      />

      {/* ── Hero ── */}
      <div className="offers-header">
        <h1>Offers &amp; Savings</h1>
        <p className="subtitle">
          Every discount we run, and exactly how much it takes off your bill.
        </p>
        <div className="hero-rules">
          <span className="hero-rule">
            <Sparkles className="w-4 h-4" /> One discount per order — we apply the bigger one
          </span>
          <span className="hero-rule">
            <ShieldCheck className="w-4 h-4" /> Codes &amp; points start at {rupee(floor)}
          </span>
          <span className="hero-rule">
            <Gift className="w-4 h-4" /> 10% back in points on everything
          </span>
        </div>
      </div>

      {/* ── 2× points promo (server decides whether the window is live) ── */}
      {!loading && pointsPromo && (
        <div className="section">
          <div className="offer-card">
            <div className="offer-card-badge">{pointsPromo.multiplier}× POINTS</div>
            <h3 className="offer-card-title">{pointsPromo.title}</h3>
            <p className="offer-card-desc">{pointsPromo.description}</p>
            <div className="offer-card-meta">
              <span className="offer-card-chip">No code needed</span>
              {pointsPromo.valid_till && (
                <span className="offer-card-chip offer-card-chip--timer">
                  <Clock className="w-3 h-3" />
                  Till {pointsPromo.valid_till}
                </span>
              )}
            </div>
            <button onClick={() => navigate('/menu')} className="offer-card-cta" type="button">
              Order Now
            </button>
          </div>
        </div>
      )}

      {/* ── Live offers ── */}
      <div className="section">
        <div className="section-title-row">
          <Tag className="w-5 h-5 text-orange-400" />
          <h2 className="section-title">Running Right Now</h2>
        </div>

        {loading && <p className="section-description">Loading offers…</p>}

        {!loading && offers.length === 0 && (
          <p className="section-description">
            No promo codes are running for you at the moment — but loyalty points always apply.
            You earn 1 point for every {rupee(LOYALTY_EARN_RATE)} spent, and every point is {rupee(1)} off later.
          </p>
        )}

        {!loading && offers.length > 0 && (
          <>
            <p className="section-description">
              Tap <strong>Use this code</strong> and it is waiting for you at checkout — no typing.
            </p>
            <div className="offers-grid">
              {offers.map((o) => <OfferCard key={o.id} offer={o} floor={floor} />)}
            </div>
          </>
        )}
      </div>

      {/* ── Savings calculator ── */}
      <div className="section">
        <div className="section-title-row">
          <Calculator className="w-5 h-5 text-orange-400" />
          <h2 className="section-title">What Would I Save?</h2>
        </div>
        <p className="section-description">
          Enter an order total and see what each option takes off, using the same rules checkout uses.
        </p>
        {!loading && (
          <SavingsCalculator offers={offers} tiers={tiers} floor={floor} points={myPoints} />
        )}
      </div>

      {/* ── Loyalty ── */}
      <div className="section">
        <div className="section-title-row">
          <Gift className="w-5 h-5 text-orange-400" />
          <h2 className="section-title">Loyalty Points</h2>
        </div>
        <p className="section-description">
          Every order earns points automatically — no code, no sign-up form, nothing to remember.
          {isAuthenticated && ` You have ${myPoints} points right now.`}
        </p>
        <div className="rule-grid">
          <div className="rule-card">
            <span className="rule-card-value">1 point</span>
            <span className="rule-card-label">for every {rupee(LOYALTY_EARN_RATE)} you spend</span>
          </div>
          <div className="rule-card">
            <span className="rule-card-value">1 point = {rupee(1)}</span>
            <span className="rule-card-label">straight off a future order</span>
          </div>
          <div className="rule-card">
            <span className="rule-card-value">{LOYALTY_MIN_REDEEM} points</span>
            <span className="rule-card-label">the balance you need before redeeming</span>
          </div>
          <div className="rule-card">
            <span className="rule-card-value">Up to {maxPointsPct}%</span>
            <span className="rule-card-label">of an order can be paid with points</span>
          </div>
        </div>
        <p className="section-note">
          Points are redeemed at checkout when you are signed in, on orders of {rupee(floor)} and above.
          Points and a promo code cannot be used on the same order — we apply whichever saves you more.
        </p>
      </div>

      {/* ── How discounts work ── */}
      <div className="section">
        <div className="section-title-row">
          <Percent className="w-5 h-5 text-orange-400" />
          <h2 className="section-title">How Discounts Work</h2>
        </div>

        <div className="rule-list">
          <div className="rule-item">
            <ShieldCheck className="rule-item-icon" />
            <div>
              <h3>Discounts start at {rupee(floor)}</h3>
              <p>
                Promo codes and loyalty points both apply on orders of {rupee(floor)} or more.
                Below that, no discount applies. Fixed-price combos are the exception — they are
                already discounted, so they have their own lower minimum.
              </p>
            </div>
          </div>

          <div className="rule-item">
            <Sparkles className="rule-item-icon" />
            <div>
              <h3>One discount per order</h3>
              <p>
                A promo code and loyalty points cannot be combined, and two codes cannot be stacked.
                Checkout applies whichever gives you the larger saving.
              </p>
            </div>
          </div>

          <div className="rule-item">
            <Percent className="rule-item-icon" />
            <div>
              <h3>How much a code can take off</h3>
              <p>The maximum discount from a code scales with your order:</p>
              <div className="tier-table">
                {tierRows.map((t, i) => {
                  const next = tierRows[i + 1];
                  const band = next
                    ? `${rupee(t.min)} – ${rupee(next.min - 1)}`
                    : `${rupee(t.min)} and above`;
                  const cap = t.rsCap > 0 && t.pctCap > 0
                    ? `up to ${t.pctCap}%, max ${rupee(t.rsCap)}`
                    : t.rsCap > 0 ? `up to ${rupee(t.rsCap)}` : `up to ${t.pctCap}%`;
                  return (
                    <div className="tier-row" key={t.min}>
                      <span className="tier-band">{band}</span>
                      <span className="tier-cap">{cap}</span>
                    </div>
                  );
                })}
              </div>
              <p className="section-note">
                Each offer also has its own cap — whichever limit is lower is the one that applies.
              </p>
            </div>
          </div>

          <div className="rule-item">
            <Ban className="rule-item-icon" />
            <div>
              <h3>Combos already carry their saving</h3>
              <p>
                Our fixed-price combos are priced below the sum of their parts. When one is in your
                cart, promo codes and points are switched off for that order — the combo price is
                the discount.
              </p>
            </div>
          </div>

          <div className="rule-item">
            <Tag className="rule-item-icon" />
            <div>
              <h3>GST on a discounted order</h3>
              <p>
                Menu prices already include GST. When a discount is applied, 5% GST is added on top
                of the reduced amount instead — so the tax follows what you actually pay.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Verify a code ── */}
      <div className="section">
        <div className="section-title-row">
          <ShieldCheck className="w-5 h-5 text-orange-400" />
          <h2 className="section-title">Check a Code</h2>
        </div>
        <p className="section-description">
          Got a code from WhatsApp or a message from us? Check it here before you order.
        </p>

        <form onSubmit={handleVerify}>
          <div className="input-group">
            <label htmlFor="customerPhone">Your phone number</label>
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
            <label htmlFor="verifyCode">Promo code</label>
            <input
              type="text"
              id="verifyCode"
              placeholder="e.g. WELCOME15"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={verifying}>
            {verifying ? <><span className="loading"></span> Checking…</> : 'Check Code'}
          </button>
        </form>

        {verifyResult?.type === 'success' && (
          <div className="result-box success">
            <div className="code-display">{verifyResult.code}</div>
            <p className="result-headline">This code is valid</p>
            <p>{verifyResult.title} — <strong>{verifyResult.discountText}</strong></p>
            <button
              type="button"
              className="offer-card-cta"
              onClick={() => { stashCode(verifyResult.code); navigate('/menu'); }}
            >
              Use it now
            </button>
          </div>
        )}

        {verifyResult?.type === 'error' && (
          <div className="result-box error">
            <p>{verifyResult.message}</p>
          </div>
        )}
      </div>

      {/* ── FAQ ── */}
      <div className="section">
        <h2 className="section-title">Common Questions</h2>
        <div className="faq-list">
          <FAQItem
            q="How do I use a promo code?"
            a="Tap 'Use this code' on any offer above and it is applied for you at checkout. You can also type it into the 'Have a code?' box on the order page."
          />
          <FAQItem
            q="Why isn't my code working?"
            a={`Usually one of four reasons: your order is under ${rupee(floor)}; the code is meant for a different group (WELCOME15 is first-order only, LOYAL10 is for returning customers); you already have a fixed-price combo in the cart, which blocks all codes; or the code has expired.`}
          />
          <FAQItem
            q="Can I use a code and my points together?"
            a="No — one discount per order. Checkout compares the two and applies whichever saves you more, so you are never worse off."
          />
          <FAQItem
            q="Is there a minimum order?"
            a={`Yes. Promo codes and points both need an order of ${rupee(floor)} or more. Fixed-price combos are exempt — they are already discounted.`}
          />
          <FAQItem
            q="Do offers work when I order over WhatsApp or at the counter?"
            a="Most do. Some offers are limited to particular channels, and the code check above tells you the moment a code doesn't apply to you. Loyalty points are earned on every order, whichever way you place it."
          />
          <FAQItem
            q="When do I get my points?"
            a={`Points are credited after your order is completed — 1 point per ${rupee(LOYALTY_EARN_RATE)} spent. Sign in to see your balance at checkout.`}
          />
          <FAQItem
            q="Do points expire?"
            a="No. Your balance stays until you use it."
          />
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="section offers-cta-section">
        <button
          onClick={() => navigate('/menu')}
          className="btn btn-primary"
          type="button"
        >
          Browse Menu &amp; Order
        </button>
      </div>
    </div>
  );
}
