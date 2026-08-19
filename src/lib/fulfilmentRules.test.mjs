// Tests for the checkout-side fulfilment guard.
//
// The bug this file exists to prevent: the guard was first wired to the cart
// context's `orderMode`, but Order.jsx owns its own `orderType` and the customer
// can change it ON the checkout page. A cart assembled while browsing in dine-in
// mode and then switched to delivery kept dine-in's exemption, so a dips-only
// order sailed through — reported live on 2026-08-19.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cartFulfilmentBlock } from "../lib/fulfilmentRules.js";

const RULES = {
  dineInOnly: new Set(["1193", "1148"]), // Black Coffee, Soft Drinks 200 ml
  needsCompanion: new Set(["1154", "1155"]), // the dips
  extras: new Set(["1148", "1149", "1150", "1193", "1154", "1155"]),
};

const line = (itemId, name) => ({ itemId, name });

const DIP = line(1154, "Regular Mayo");
const DIP2 = line(1155, "Spicy Mayo");
const WATER = line(1150, "Water 500 ml");
const COFFEE = line(1193, "Black Coffee");
const FOOD = line(648, "Prawn Mixed Fried Rice");

test("a dips-only cart is blocked for delivery and pickup", () => {
  for (const mode of ["delivery", "pickup"]) {
    const b = cartFulfilmentBlock([DIP], mode, RULES);
    assert.ok(b, `${mode} must block a dips-only cart`);
    assert.equal(b.reason, "needs_companion");
    assert.match(b.message, /order with food in it/i);
  }
});

test("dine-in allows everything", () => {
  assert.equal(cartFulfilmentBlock([DIP], "dine_in", RULES), null);
  assert.equal(cartFulfilmentBlock([COFFEE], "dine_in", RULES), null);
  assert.equal(cartFulfilmentBlock([DIP, COFFEE], "dine_in", RULES), null);
});

test("a drink does not count as the food a dip needs", () => {
  const b = cartFulfilmentBlock([DIP, WATER], "delivery", RULES);
  assert.ok(b);
  assert.equal(b.reason, "needs_companion");
});

test("dips do not satisfy each other", () => {
  const b = cartFulfilmentBlock([DIP, DIP2], "delivery", RULES);
  assert.ok(b);
  assert.equal(b.names.length, 2);
});

test("a dip rides along with real food", () => {
  assert.equal(cartFulfilmentBlock([DIP, FOOD], "delivery", RULES), null);
});

test("an unpackageable item is blocked, and named", () => {
  const b = cartFulfilmentBlock([COFFEE, FOOD], "delivery", RULES);
  assert.ok(b);
  assert.equal(b.reason, "dine_in_only");
  assert.match(b.message, /Black Coffee/);
  assert.match(b.message, /restaurant only/i);
});

test("the unpackageable message names the actual channel", () => {
  assert.match(cartFulfilmentBlock([COFFEE], "pickup", RULES).message, /pickup/);
  assert.match(cartFulfilmentBlock([COFFEE], "delivery", RULES).message, /delivery/);
});

test("an item that cannot travel is reported before the companion rule", () => {
  // Telling someone to "add food" when the real problem is that their coffee
  // cannot be packed would send them round in circles.
  const b = cartFulfilmentBlock([COFFEE, DIP], "delivery", RULES);
  assert.equal(b.reason, "dine_in_only");
});

test("an unrecognised line counts as food — never block what we cannot verify", () => {
  assert.equal(cartFulfilmentBlock([DIP, line(99999, "Legacy item")], "delivery", RULES), null);
});

test("an empty cart, or rules that never loaded, block nothing", () => {
  assert.equal(cartFulfilmentBlock([], "delivery", RULES), null);
  assert.equal(cartFulfilmentBlock([DIP], "delivery", null), null);
  const empty = { dineInOnly: new Set(), needsCompanion: new Set(), extras: new Set() };
  assert.equal(cartFulfilmentBlock([DIP], "delivery", empty), null);
});

test("lines carrying `id` instead of `itemId` are still matched", () => {
  const b = cartFulfilmentBlock([{ id: 1154, name: "Regular Mayo" }], "delivery", RULES);
  assert.ok(b, "a cart line keyed on id must not slip past the guard");
});
