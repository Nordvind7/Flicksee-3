import 'dotenv/config';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';

const DEV_TG_ID = 777000999; // throwaway dev user
const IDS = { liked: 9990001, seen: 9990002, disliked: 9990003 };

function movie(id: number, title: string) {
  return {
    tmdbId: id,
    contentType: 'movie' as const,
    content: { title, posterPath: `/p${id}.jpg`, voteAverage: 7.5, genreIds: [28] },
  };
}

async function main() {
  const app = await buildApp({ logger: false });
  const json = { 'content-type': 'application/json' };

  // Log in via the dev shortcut.
  const login = await app.inject({
    method: 'POST',
    url: '/auth/dev',
    headers: json,
    payload: JSON.stringify({ id: DEV_TG_ID, username: 'lib_test' }),
  });
  assert.equal(login.statusCode, 200, `dev login -> ${login.statusCode}: ${login.body}`);
  const token = (login.json() as { accessToken: string }).accessToken;
  const auth = { authorization: `Bearer ${token}`, ...json };

  // Record three different verdicts.
  for (const [action, m] of [
    ['LIKE', movie(IDS.liked, 'Liked Film')],
    ['SEEN', movie(IDS.seen, 'Seen Film')],
    ['DISLIKE', movie(IDS.disliked, 'Disliked Film')],
  ] as const) {
    const res = await app.inject({
      method: 'POST',
      url: '/swipes',
      headers: auth,
      payload: JSON.stringify({ ...m, action }),
    });
    assert.equal(res.statusCode, 200, `swipe ${action} -> ${res.statusCode}: ${res.body}`);
  }
  console.log('✓ recorded LIKE / SEEN / DISLIKE swipes');

  // Watchlist holds the liked title.
  const watchlist = await app.inject({ method: 'GET', url: '/watchlist', headers: auth });
  const wlItems = (watchlist.json() as { items: { id: number; title: string }[] }).items;
  assert.ok(wlItems.some((i) => i.id === IDS.liked && i.title === 'Liked Film'), 'liked in watchlist');
  assert.ok(!wlItems.some((i) => i.id === IDS.seen), 'seen NOT in watchlist');
  console.log('✓ /watchlist returns liked title with cached display data');

  // Watched holds the seen title.
  const watched = await app.inject({ method: 'GET', url: '/watched', headers: auth });
  assert.ok((watched.json() as { items: { id: number }[] }).items.some((i) => i.id === IDS.seen), 'seen in watched');
  console.log('✓ /watched returns seen title');

  // Excluded holds all three ids.
  const excluded = await app.inject({ method: 'GET', url: '/swipes/excluded', headers: auth });
  const ex = excluded.json() as { movie: number[]; tv: number[] };
  for (const id of Object.values(IDS)) assert.ok(ex.movie.includes(id), `excluded has ${id}`);
  console.log('✓ /swipes/excluded lists all acted ids');

  // Re-swiping the liked title as SEEN moves it between lists (upsert, not dup).
  await app.inject({
    method: 'POST',
    url: '/swipes',
    headers: auth,
    payload: JSON.stringify({ ...movie(IDS.liked, 'Liked Film'), action: 'SEEN' }),
  });
  const wl2 = (await app.inject({ method: 'GET', url: '/watchlist', headers: auth }).then((r) => r.json())) as { items: { id: number }[] };
  assert.ok(!wl2.items.some((i) => i.id === IDS.liked), 're-swiped title left the watchlist');
  const count = await prisma.swipe.count({ where: { tmdbId: IDS.liked } });
  assert.equal(count, 1, 'still a single swipe row (upsert, not duplicate)');
  console.log('✓ re-swipe updates the verdict in place (no duplicate rows)');

  // Cross-user isolation: a different user sees an empty library.
  const other = await app.inject({
    method: 'POST',
    url: '/auth/dev',
    headers: json,
    payload: JSON.stringify({ id: DEV_TG_ID + 1, username: 'other' }),
  });
  const otherAuth = { authorization: `Bearer ${(other.json() as { accessToken: string }).accessToken}` };
  const otherWl = (await app.inject({ method: 'GET', url: '/watchlist', headers: otherAuth }).then((r) => r.json())) as { items: unknown[] };
  assert.equal(otherWl.items.length, 0, 'another user does not see this user library');
  console.log('✓ libraries are per-user (no cross-user leakage)');

  // Unauthenticated write is rejected.
  const noauth = await app.inject({ method: 'POST', url: '/swipes', headers: json, payload: JSON.stringify(movie(1, 'x')) });
  assert.equal(noauth.statusCode, 401, `unauth swipe -> ${noauth.statusCode}`);
  console.log('✓ unauthenticated POST /swipes → 401');

  await cleanup();
  await app.close();
  await prisma.$disconnect();
  console.log('\nALL LIBRARY CHECKS PASSED ✅');
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { telegramId: { in: [BigInt(DEV_TG_ID), BigInt(DEV_TG_ID + 1)] } } });
  await prisma.content.deleteMany({ where: { tmdbId: { in: Object.values(IDS) } } });
}

main().catch(async (err) => {
  console.error('\nLIBRARY VERIFY FAILED ❌');
  console.error(err);
  try {
    await cleanup();
    await prisma.$disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
