// The biryani pre-order rule, stated in plain words where the customer is
// choosing: under the Biryani heading on the menu and at the top of the cart.
// Owner, 21 Oct 2026: "The website should clearly state this. Minimum 10 and a
// day ahead." A 10-plate order can mix chicken, mutton and pork, so the menu
// still adds one plate at a time; this box and the running count are what keep
// the minimum from coming as a surprise at the Pay button.
//
// Display only. The rule is enforced by lib/fulfilmentRules.js at checkout and
// by the server (utils/preOrderPolicy.js in the webapp repo).
import { PREORDER_MIN_QTY, PREORDER_MAX_DAYS_AHEAD } from '../utils/preOrderPolicy';

/** "2 of 10 plates in your cart. Add 8 more (any biryani)." — or null at 0. */
export function preOrderProgressText(plates, min = PREORDER_MIN_QTY) {
  if (!plates) return null;
  const short = min - plates;
  return short > 0
    ? `${plates} of ${min} biryani plates in your cart. Add ${short} more (any mix).`
    : `${plates} biryani plates in your cart. Ready to pre-order.`;
}

export default function PreOrderNotice({
  plates = 0,
  min = PREORDER_MIN_QTY,
  maxDaysAhead = PREORDER_MAX_DAYS_AHEAD,
  className = '',
}) {
  const progress = preOrderProgressText(plates, min);
  return (
    <div className={`rounded-[12px] border-[1.5px] border-ht-ink/30 bg-white !px-3.5 !py-3 text-ht-ink ${className}`}>
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ht-red2">
        Biryani is pre-order only
      </p>
      <ul className="!mt-1.5 list-none space-y-1 !p-0 text-[14px] leading-snug">
        <li>
          <b>Minimum {min} plates</b> per order. Chicken, mutton and pork count together, so mix as you like.
        </li>
        <li>
          <b>Order a day ahead.</b> Pick your date at checkout, up to {maxDaysAhead} days ahead.
        </li>
        <li>Delivery or pickup only.</li>
      </ul>
      {progress && (
        <p className={`!mt-2 text-[14px] font-semibold ${plates < min ? 'text-ht-red' : 'text-ht-ink'}`}>
          {progress}
        </p>
      )}
    </div>
  );
}
