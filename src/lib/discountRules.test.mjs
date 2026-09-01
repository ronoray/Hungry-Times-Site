// Tests for the offers-page savings estimator.
//
// The bug this file exists to prevent: `offerSavingFor` decided an offer was
// item-restricted by looking at `applicable_item_ids` alone. A CATEGORY-scoped
// offer names no items at all — that is the entire purpose of
// `applicable_category_ids`, and the September "20% off any Meifoon" campaign is
// exactly that shape — so it fell through to the whole-cart branch and quoted
// 20% of the ENTIRE subtotal. On an ₹800 basket the page promised ₹160 against a
// real saving of ₹44 on one ₹220 dish, and stamped a "Min order ₹500" chip on an
// offer the server deliberately exempts from the floor (autoItemOffers.js), so a
// lone ₹240 Meifoon — the case the poster advertises — read as ineligible.
import { test } from "node:test";
import assert from "node:assert/strict";
import { offerSavingFor, ceilingFor } from "../lib/discountRules.js";

const TIERS = [
  { min: 0, pctCap: 0, rsCap: 0 },
  { min: 500, pctCap: 15, rsCap: 150 },
  { min: 1000, pctCap: 20, rsCap: 250 },
];
const OPTS = { tiers: TIERS, floor: 500 };

// The two live September rows, as /offers/active returns them.
const MEIFOON = {
  id: 4908,
  title: "September — 20% off any Meifoon",
  discount_type: "percent",
  discount_value: 20,
  promo_code: null,
  apply_automatically: 1,
  applicable_item_ids: null,
  applicable_category_ids: "45",
};
const FISH = {
  id: 4907,
  title: "September — Fish n Chips ₹255",
  discount_type: "flat",
  discount_value: 65,
  promo_code: null,
  apply_automatically: 1,
  applicable_item_ids: "431",
  applicable_category_ids: null,
};
const WELCOME15 = {
  id: 4,
  title: "15% Welcome Discount",
  discount_type: "percent",
  discount_value: 15,
  max_discount: 200,
  promo_code: "WELCOME15",
  apply_automatically: 0,
  applicable_item_ids: null,
  applicable_category_ids: null,
};

test("a category-scoped offer quotes no number — it is not a whole-cart percent", () => {
  const r = offerSavingFor(MEIFOON, 800, OPTS);
  assert.equal(r.unknown, true, "must be reported as unknown, not estimated");
  assert.equal(r.saving, 0);
  assert.equal(r.blocked, null, "unknown is not the same as blocked");
});

test("an item-scoped offer quotes no number either", () => {
  const r = offerSavingFor(FISH, 800, OPTS);
  assert.equal(r.unknown, true);
  assert.equal(r.saving, 0);
});

test("a restricted offer is never floor-blocked — the server exempts both kinds", () => {
  // ₹240 is a lone Meifoon: under the ₹500 floor, and the exact cart the
  // campaign advertises. Neither restricted offer may come back as 'floor'.
  for (const offer of [MEIFOON, FISH]) {
    const r = offerSavingFor(offer, 240, OPTS);
    assert.equal(r.blocked, null, `${offer.title} must not be floor-blocked`);
    assert.equal(r.unknown, true);
  }
});

test("an unrestricted code still estimates, and both caps still bind", () => {
  // ₹800 sits in the ₹500–999 band: 15% of 800 = ₹120, under the ₹150 rsCap and
  // under the offer's own ₹200 max_discount, so the raw percent survives.
  assert.deepEqual(offerSavingFor(WELCOME15, 800, OPTS), {
    saving: 120,
    blocked: null,
    unknown: false,
  });

  // ₹2000 in the ₹1000+ band: 15% = ₹300, clipped by the offer's ₹200 cap first
  // and the ₹250 tier ceiling second. The tighter of the two wins.
  assert.equal(offerSavingFor(WELCOME15, 2000, OPTS).saving, 200);
});

test("an unrestricted code below the floor is blocked, not merely zero", () => {
  const r = offerSavingFor(WELCOME15, 400, OPTS);
  assert.equal(r.blocked, "floor");
  assert.equal(r.saving, 0);
  assert.equal(r.unknown, false);
});

test("the tiered ceiling matches the live bands", () => {
  assert.equal(ceilingFor(400, TIERS), 0, "below the floor there is no code discount");
  assert.equal(ceilingFor(800, TIERS), 120, "15% of 800, under the ₹150 cap");
  assert.equal(ceilingFor(1500, TIERS), 250, "20% of 1500 is ₹300, clipped to the ₹250 cap");
});
