// Tests for the one place that decides where an offer's "Order Now" goes.
//
// The bug this file exists to prevent: PromoBar, AutoOfferCard and the Offers
// page each navigated to a bare '/menu'. For a promo code that is right — the
// code applies to whatever the customer builds. For the September campaign's
// codeless dish offers it dropped them at the top of a 443-item menu with no
// hint which dish the offer was about. Category-scoped offers are the case that
// keeps getting missed, because they name no items at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { offerDeepLink, firstId } from "../utils/offerLink.js";

test("an item-scoped offer links to the dish", () => {
  assert.equal(
    offerDeepLink({ applicable_item_ids: "431", applicable_category_ids: null }),
    "/menu?highlight=431"
  );
});

test("a category-scoped offer links to the section", () => {
  assert.equal(
    offerDeepLink({ applicable_item_ids: null, applicable_category_ids: "45" }),
    "/menu?sub=45"
  );
});

test("items win over categories when an offer carries both", () => {
  // An offer naming a specific dish should land on that dish, not on the
  // section it happens to sit in — the dish is the more precise promise.
  assert.equal(
    offerDeepLink({ applicable_item_ids: "431", applicable_category_ids: "45" }),
    "/menu?highlight=431"
  );
});

test("a whole-cart offer has no deep link", () => {
  // Null, not '/menu': callers must be able to tell "nothing to point at" from
  // "the menu is the point". AutoOfferCard drops these; PromoBar falls back.
  assert.equal(offerDeepLink({ applicable_item_ids: null, applicable_category_ids: null }), null);
  assert.equal(offerDeepLink({}), null);
  assert.equal(offerDeepLink(null), null);
});

test("id lists are parsed leniently — spacing and trailing commas are real", () => {
  assert.equal(firstId(" 431 , 432 "), "431");
  assert.equal(firstId("431,"), "431");
  assert.equal(firstId(",,"), null);
  assert.equal(firstId(""), null);
  assert.equal(firstId(null), null);
  // Offer rows come back from SQLite, where an id list can arrive as a number.
  assert.equal(firstId(431), "431");
});
