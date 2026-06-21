// Sort a user-id pair lexicographically. Storing the smaller id as userAId
// guarantees a single row per friendship/match regardless of swipe order.
export function canonicalPair(a: string, b: string): [string, string] {
  if (a === b) throw new Error('canonicalPair: same user');
  return a < b ? [a, b] : [b, a];
}
