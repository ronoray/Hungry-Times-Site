import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offerKey, unitOfferOff } from './offerPrice.js';

const chilliPork = { offerId: 6421, label: '₹41 OFF', was: 280, price: 239, off: { '': 41, '9': 41 } };

test('bare dish and Large are looked up, not computed', () => {
  assert.equal(unitOfferOff(chilliPork, []), 41);
  assert.equal(unitOfferOff(chilliPork, [{ id: 9, name: 'Large' }]), 41);
});

test('a selection the server did not price returns null — list price + badge', () => {
  assert.equal(unitOfferOff(chilliPork, [{ id: 9 }, { id: 12 }]), null);
  assert.equal(unitOfferOff({ label: '₹41 OFF' }, []), null);   // badge without prices
  assert.equal(unitOfferOff(null, []), null);
});

test('key is order-independent', () => {
  assert.equal(offerKey([{ id: 12 }, { id: 9 }]), offerKey([{ id: 9 }, { id: 12 }]));
  assert.equal(offerKey(undefined), '');
});
