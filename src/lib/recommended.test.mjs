import { test } from "node:test";
import assert from "node:assert/strict";
import { preOrderCards, plainFeatured } from "./recommended.js";

const BIRYANI = [
  { id: 1199, name: "Chicken Biryani", basePrice: 350, preOrder: true, minQty: 10, categoryId: 79 },
  { id: 1200, name: "Mutton Biryani", basePrice: 390, preOrder: true, minQty: 10, categoryId: 79 },
  { id: 1201, name: "Pork Biryani", basePrice: 400, preOrder: true, minQty: 10, categoryId: 79 },
];

test("the three biryanis become one card with every price and the minimum", () => {
  const cards = preOrderCards(BIRYANI);
  assert.equal(cards.length, 1);
  const c = cards[0];
  assert.equal(c.title, "Biryani");
  assert.deepEqual(c.prices.map((p) => [p.label, p.price]), [["Chicken", 350], ["Mutton", 390], ["Pork", 400]]);
  assert.equal(c.minQty, 10);
});

test("the card links to the biryani section, never to a one-plate add", () => {
  assert.equal(preOrderCards(BIRYANI)[0].href, "/menu?sub=79");
});

test("a featured dish that isn't pre-order is not folded into the pre-order card", () => {
  const all = [...BIRYANI, { id: 7, name: "Thai Green Curry", basePrice: 300, preOrder: false, categoryId: 76 }];
  assert.equal(preOrderCards(all).length, 1);
  assert.deepEqual(plainFeatured(all).map((f) => f.id), [7]);
});

test("nothing featured, nothing rendered", () => {
  assert.deepEqual(preOrderCards([]), []);
  assert.deepEqual(preOrderCards(undefined), []);
});
