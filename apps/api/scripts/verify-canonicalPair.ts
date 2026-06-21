import assert from 'node:assert/strict';
import { canonicalPair } from '../src/lib/canonicalPair';

assert.deepEqual(canonicalPair('b', 'a'), ['a', 'b']);
assert.deepEqual(canonicalPair('a', 'b'), ['a', 'b']);
assert.throws(() => canonicalPair('x', 'x'), /same user/);
console.log('✓ canonicalPair');
