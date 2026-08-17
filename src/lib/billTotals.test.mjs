// The GST rule as the CUSTOMER sees it, on every surface that shows an order
// summary: checkout, cart drawer, order-placed confirmation, order details.
//
//   No discount of any kind → GST is INCLUSIVE. Nothing was added, so it must
//     not appear in the arithmetic column; it is stated below the Total.
//   Any discount (offer code OR loyalty points) → 5% is ADDED on top of
//     (subtotal − discount − points + delivery) and belongs in the column.
//
// The invariant: the displayed rows sum to the displayed Total. A customer who
// adds the column and lands elsewhere cannot tell a display bug from being
// overcharged.
//
// Run with `npm test` (node's built-in runner — no dependencies).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTotalsLines,
  resolveBillGst,
  billReconciles,
  totalsArgsFromOrder,
  gstIncludedNote,
} from './billTotals.js';

const rows = (a) => buildTotalsLines(a).filter((l) => l.kind === 'row');
const keys = (a) => buildTotalsLines(a).map((l) => l.key);
const rowByKey = (a, k) => rows(a).find((l) => l.key === k);
const notes = (a) => buildTotalsLines(a).filter((l) => l.kind === 'note');

describe('no discount → GST inclusive, stated below the Total', () => {
  const bill = { subtotal: 549, total: 549, storedTax: 26.14 };

  test('no GST row in the column', () => {
    assert.equal(rowByKey(bill, 'gst'), undefined);
  });

  test('the tax is stated as a note instead', () => {
    const [note] = notes(bill);
    assert.ok(note);
    assert.equal(note.text, 'Price includes GST 5% — ₹26.14');
    const k = keys(bill);
    assert.ok(k.indexOf('gstIncluded') > k.indexOf('total'), 'the note follows the Total');
  });

  test('the column reconciles — this is the Weekend Special case', () => {
    // Used to read Subtotal ₹549, GST ₹26.14, Total ₹549.
    assert.ok(billReconciles(bill));
  });
});

describe('any discount → GST added on top', () => {
  test('offer code', () => {
    const bill = { subtotal: 1170, discountAmount: 175.5, deliveryCharge: 70, total: 1117.73, storedTax: 53.23, showDelivery: true };
    assert.equal(rowByKey(bill, 'gst').value, 53.23);
    assert.equal(notes(bill).length, 0);
    assert.ok(billReconciles(bill));
  });

  test('loyalty points alone still count as a discount', () => {
    const bill = { subtotal: 720, loyaltyDiscount: 144, total: 604.8, storedTax: 28.8 };
    assert.equal(rowByKey(bill, 'gst').value, 28.8);
    assert.ok(billReconciles(bill));
  });

  test('the points deduction is shown at all', () => {
    // OrderSuccess and OrderDetails used to omit this line entirely, so #262
    // showed Subtotal ₹720 and Total ₹604.80 with nothing explaining the gap.
    const bill = { subtotal: 720, loyaltyDiscount: 144, total: 604.8, storedTax: 28.8 };
    const line = rowByKey(bill, 'points');
    assert.ok(line, 'a redeemed order must show what was redeemed');
    assert.equal(line.label, 'Points redeemed (144 pts)');
    assert.equal(line.value, -144);
  });

  test('delivery is inside the GST base when discounted', () => {
    // (1205 − 212 + 130) × 5% = 56.15
    const { amount, onTop } = resolveBillGst({
      subtotal: 1205, loyaltyDiscount: 212, deliveryCharge: 130, total: 1179.15,
    });
    assert.equal(onTop, true);
    assert.equal(amount, 56.15);
  });
});

describe('line order', () => {
  test('Subtotal → Discount → Points → GST → Delivery → Total', () => {
    const k = keys({
      subtotal: 1000, discountAmount: 100, loyaltyDiscount: 50,
      deliveryCharge: 70, total: 971, showDelivery: true,
    });
    assert.deepEqual(k, ['subtotal', 'discount', 'points', 'gst', 'delivery', 'total']);
  });

  test('Delivery is the last row before Total — it is never discounted', () => {
    // OrderDetails printed it above the GST line while every other surface
    // printed it below.
    const k = keys({ subtotal: 1000, discountAmount: 100, deliveryCharge: 70, total: 1015.5, showDelivery: true });
    assert.ok(k.indexOf('delivery') > k.indexOf('discount'));
    assert.ok(k.indexOf('delivery') > k.indexOf('gst'));
    assert.ok(k.indexOf('delivery') < k.indexOf('total'));
  });

  test('pickup and dine-in get no Delivery row at all', () => {
    assert.ok(!keys({ subtotal: 500, total: 500, showDelivery: false }).includes('delivery'));
  });

  test('a free delivery row is flagged, and contributes nothing to the sum', () => {
    const bill = { subtotal: 500, total: 500, showDelivery: true, deliveryCharge: 0 };
    assert.equal(rowByKey(bill, 'delivery').free, true);
    assert.ok(billReconciles(bill));
  });
});

describe('totalsArgsFromOrder — which loyalty column to trust', () => {
  test('prefers points_redeemed, what was actually spent', () => {
    const args = totalsArgsFromOrder({
      subtotal: 720, discount: 0, tax: 28.8, total: 604.8,
      points_to_redeem: 144, points_redeemed: 144, order_type: 'delivery',
    });
    assert.equal(args.loyaltyDiscount, 144);
  });

  test('falls back to points_to_redeem only when the maths proves it was spent', () => {
    // Orders #111/#112: null intent beside a real redemption is the common case,
    // but the reverse also exists — this row has the intent and no redeemed
    // column, and the total confirms the points came off.
    const args = totalsArgsFromOrder({
      subtotal: 720, discount: 0, tax: 28.8, total: 604.8,
      points_to_redeem: 144, points_redeemed: null, order_type: 'delivery',
    });
    assert.equal(args.loyaltyDiscount, 144);
  });

  test('does NOT invent a redemption on a cancelled order', () => {
    // #128: intent of 50 points that were never spent. The total is the
    // undiscounted price, so nothing came off.
    const args = totalsArgsFromOrder({
      subtotal: 290, discount: 0, tax: 12, total: 290,
      points_to_redeem: 50, points_redeemed: 0, order_type: 'delivery',
    });
    assert.equal(args.loyaltyDiscount, 0);
    assert.equal(notes(args).length, 1, 'and it stays on the inclusive branch');
  });

  test('hides the Delivery row for pickup and dine-in', () => {
    assert.equal(totalsArgsFromOrder({ order_type: 'pickup' }).showDelivery, false);
    assert.equal(totalsArgsFromOrder({ order_type: 'dine_in' }).showDelivery, false);
    assert.equal(totalsArgsFromOrder({ order_type: 'delivery' }).showDelivery, true);
  });
});

describe('stored tax is authoritative', () => {
  test('a saved order is shown back exactly as billed', () => {
    const { amount } = resolveBillGst({ subtotal: 700, discountAmount: 105, total: 624.75, storedTax: 29.75 });
    assert.equal(amount, 29.75);
  });

  test('derives when the row has none', () => {
    const { amount } = resolveBillGst({ subtotal: 700, discountAmount: 105, total: 624.75 });
    assert.equal(amount, 29.75);
  });

  test('a row proving on-top maths is not mislabelled as inclusive', () => {
    const { onTop } = resolveBillGst({ subtotal: 595, total: 624.75, storedTax: 29.75 });
    assert.equal(onTop, true);
  });

  test('a genuinely inclusive row is not dragged on-top', () => {
    const { onTop } = resolveBillGst({ subtotal: 290, total: 290, storedTax: 13.81 });
    assert.equal(onTop, false);
  });
});

describe('real production rows all reconcile', () => {
  // Snapshotted from online_orders, 17 Aug 2026.
  const fixtures = [
    { id: 262, subtotal: 720, discount: 0, tax: 28.8, total: 604.8, delivery_fee: 0, points_redeemed: 144, order_type: 'delivery' },
    { id: 261, subtotal: 1170, discount: 175.5, tax: 53.23, total: 1117.73, delivery_fee: 70, points_redeemed: 0, order_type: 'delivery' },
    { id: 260, subtotal: 765, discount: 114.75, tax: 32.51, total: 682.76, delivery_fee: 0, points_redeemed: 0, order_type: 'delivery' },
    { id: 259, subtotal: 1890, discount: 0, tax: 75.6, total: 1587.6, delivery_fee: 0, points_redeemed: 378, order_type: 'delivery' },
    { id: 258, subtotal: 1790, discount: 179, tax: 80.55, total: 1691.55, delivery_fee: 0, points_redeemed: 0, order_type: 'delivery' },
    { id: 257, subtotal: 290, discount: 0, tax: 13.81, total: 290, delivery_fee: 0, points_redeemed: 0, order_type: 'delivery' },
    { id: 255, subtotal: 1205, discount: 0, tax: 56.15, total: 1179.15, delivery_fee: 130, points_redeemed: 212, order_type: 'delivery' },
    { id: 253, subtotal: 610, discount: 61, tax: 30.95, total: 649.95, delivery_fee: 70, points_redeemed: 0, order_type: 'delivery' },
    { id: 252, subtotal: 350, discount: 0, tax: 16.67, total: 350, delivery_fee: 0, points_redeemed: 0, order_type: 'pickup' },
    { id: 248, subtotal: 1210, discount: 0, tax: 52.35, total: 1099.35, delivery_fee: 0, points_redeemed: 163, order_type: 'delivery' },
    { id: 204, subtotal: 490, discount: 0, tax: 19.6, total: 411.6, delivery_fee: 0, points_redeemed: 98, order_type: 'delivery' },
    { id: 122, subtotal: 570, discount: 0, tax: 23, total: 523, delivery_fee: 40, points_redeemed: 110, order_type: 'delivery' },
  ];

  for (const row of fixtures) {
    test(`#${row.id} — displayed column equals displayed Total`, () => {
      const args = totalsArgsFromOrder(row);
      const sum = rows(args).reduce((s, l) => s + l.value, 0);
      assert.ok(
        Math.abs(sum - row.total) <= 0.02,
        `column sums to ${sum.toFixed(2)} but Total shows ${row.total}`
      );
    });

    test(`#${row.id} — GST presented the way it was charged`, () => {
      const args = totalsArgsFromOrder(row);
      const discounted = row.discount > 0 || row.points_redeemed > 0;
      if (discounted) {
        assert.ok(rowByKey(args, 'gst'), 'a discounted order must show the GST it added');
        assert.equal(notes(args).length, 0);
      } else {
        assert.equal(rowByKey(args, 'gst'), undefined);
        assert.equal(notes(args).length, 1);
      }
    });
  }
});

describe('note wording is shared with the live cart', () => {
  test('gstIncludedNote matches what buildTotalsLines emits', () => {
    // Order.jsx and CartDrawer.jsx keep their own interleaved layout and call
    // gstIncludedNote directly. If the two ever diverge, the checkout and the
    // confirmation page describe the same order differently.
    const fromList = notes({ subtotal: 220, total: 220, storedTax: 10.48 })[0].text;
    assert.equal(fromList, gstIncludedNote(10.48));
  });
});
