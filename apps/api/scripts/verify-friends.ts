import 'dotenv/config';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';
import { config } from '../src/config';
import { linkFromInvite } from '../src/lib/friendship';

const ALICE_TG = 88800001;
const BOB_TG = 88800002;

async function cleanup() {
  const tgIds = [BigInt(ALICE_TG), BigInt(BOB_TG)];
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } } });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return;
  await prisma.match.deleteMany({
    where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] },
  });
  await prisma.friendship.deleteMany({
    where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] },
  });
  await prisma.invite.deleteMany({ where: { creatorId: { in: ids } } });
  await prisma.swipe.deleteMany({ where: { userId: { in: ids } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function loginAs(app: Awaited<ReturnType<typeof buildApp>>, tgId: number, username: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/dev',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ id: tgId, username }),
  });
  assert.equal(res.statusCode, 200, `dev login -> ${res.statusCode}: ${res.body}`);
  return (res.json() as { accessToken: string }).accessToken;
}

async function main() {
  await cleanup();
  const app = await buildApp({ logger: false });

  const aliceToken = await loginAs(app, ALICE_TG, 'alice_t');
  const auth = { authorization: `Bearer ${aliceToken}`, 'content-type': 'application/json' };

  // 1. POST /friends/invite
  const res = await app.inject({
    method: 'POST',
    url: '/friends/invite',
    headers: auth,
    payload: '{}',
  });
  assert.equal(res.statusCode, 200, `invite -> ${res.statusCode}: ${res.body}`);
  const body = res.json() as { token: string; deeplink: string; expiresAt: string };
  assert.match(body.token, /^[A-Za-z0-9_-]{20,}$/, 'token shape');
  assert.equal(body.deeplink, `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=${body.token}`);
  assert.ok(new Date(body.expiresAt).getTime() > Date.now(), 'expiresAt is future');
  console.log('✓ POST /friends/invite returns valid deeplink');

  // 2. Unauth → 401
  const noauth = await app.inject({
    method: 'POST',
    url: '/friends/invite',
    headers: { 'content-type': 'application/json' },
    payload: '{}',
  });
  assert.equal(noauth.statusCode, 401, `unauth -> ${noauth.statusCode}`);
  console.log('✓ unauth POST /friends/invite → 401');

  // 3. Bob links via Alice's invite; pre-stage swipes for retro-backfill
  const bobToken = await loginAs(app, BOB_TG, 'bob_t');
  const bobUser = await prisma.user.findUnique({ where: { telegramId: BigInt(BOB_TG) } });
  const aliceUser = await prisma.user.findUnique({ where: { telegramId: BigInt(ALICE_TG) } });
  assert.ok(bobUser && aliceUser, 'both users created');

  const swipeMovie = (tmdb: number, title: string) => ({
    tmdbId: tmdb,
    contentType: 'movie' as const,
    action: 'LIKE' as const,
    content: { title, posterPath: `/p${tmdb}.jpg` },
  });

  for (const tok of [aliceToken, bobToken]) {
    await app.inject({
      method: 'POST',
      url: '/swipes',
      headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' },
      payload: JSON.stringify(swipeMovie(700001, 'X')),
    });
  }
  // Both LIKEd 700001 BEFORE friendship — must surface as retro-match

  const r1 = await linkFromInvite(body.token, bobUser!.id);
  assert.equal(r1.ok, true, `link ok: ${JSON.stringify(r1)}`);
  assert.equal((r1 as { retroMatchCount: number }).retroMatchCount, 1, '1 retro-match');
  console.log('✓ linkFromInvite creates friendship + backfills retro-match');

  // 4. Re-link same token → expired
  const r2 = await linkFromInvite(body.token, bobUser!.id);
  assert.equal(r2.ok, false);
  assert.equal((r2 as { reason: string }).reason, 'expired');
  console.log('✓ replayed token rejected');

  // 5. Self-friend
  const fresh = await app.inject({
    method: 'POST',
    url: '/friends/invite',
    headers: auth,
    payload: '{}',
  });
  const freshTok = (fresh.json() as { token: string }).token;
  const r3 = await linkFromInvite(freshTok, aliceUser!.id);
  assert.equal((r3 as { reason: string }).reason, 'self');
  console.log('✓ self-friend rejected');

  // 6. Already-friends
  const fresh2 = await app.inject({
    method: 'POST',
    url: '/friends/invite',
    headers: auth,
    payload: '{}',
  });
  const r4 = await linkFromInvite((fresh2.json() as { token: string }).token, bobUser!.id);
  assert.equal((r4 as { reason: string }).reason, 'already');
  console.log('✓ already-friends rejected');

  // 7. detectMatches on subsequent swipe — clear matches first so the new
  // one is unambiguous
  await prisma.match.deleteMany({
    where: { OR: [{ userAId: aliceUser!.id }, { userBId: aliceUser!.id }] },
  });

  await app.inject({
    method: 'POST',
    url: '/swipes',
    headers: { authorization: `Bearer ${bobToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify(swipeMovie(700002, 'Y')),
  });
  await app.inject({
    method: 'POST',
    url: '/swipes',
    headers: { authorization: `Bearer ${aliceToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify(swipeMovie(700002, 'Y')),
  });
  // setImmediate + leave time for prisma
  await new Promise((r) => setTimeout(r, 200));

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: aliceUser!.id }, { userBId: aliceUser!.id }] },
  });
  assert.equal(matches.length, 1, `expected 1 match, got ${matches.length}`);
  assert.equal(matches[0].tmdbId, 700002);
  console.log('✓ detectMatches creates a Match on mutual LIKE');

  // 8. Idempotent on re-swipe
  await app.inject({
    method: 'POST',
    url: '/swipes',
    headers: { authorization: `Bearer ${aliceToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify(swipeMovie(700002, 'Y')),
  });
  await new Promise((r) => setTimeout(r, 200));
  const matches2 = await prisma.match.findMany({
    where: { OR: [{ userAId: aliceUser!.id }, { userBId: aliceUser!.id }] },
  });
  assert.equal(matches2.length, 1, 'no duplicate match on re-LIKE');
  console.log('✓ detectMatches is idempotent');

  // 9. GET /friends
  const list = await app.inject({ method: 'GET', url: '/friends', headers: auth });
  assert.equal(list.statusCode, 200);
  const lbody = list.json() as { items: { id: string; unseenCount: number }[] };
  const bob = lbody.items.find((x) => x.id === bobUser!.id);
  assert.ok(bob, 'bob in friends list');
  assert.ok(bob!.unseenCount >= 1, 'bob has unseen matches for alice');
  console.log('✓ GET /friends returns friends with unseenCount');

  // 10. GET /friends/:id
  const prof = await app.inject({ method: 'GET', url: `/friends/${bobUser!.id}`, headers: auth });
  assert.equal(prof.statusCode, 200);
  const pbody = prof.json() as { matchedTmdbIds: number[]; watchlist: unknown[] };
  assert.ok(pbody.matchedTmdbIds.includes(700002), 'matched id present');
  assert.ok(pbody.watchlist.length >= 2, 'bob watchlist non-empty');
  console.log('✓ GET /friends/:id returns watchlist + match flags');

  // 11. GET /friends/:id/matches paginates
  const ms = await app.inject({
    method: 'GET',
    url: `/friends/${bobUser!.id}/matches?limit=10`,
    headers: auth,
  });
  const msb = ms.json() as { items: { id: string }[]; nextCursor: string | null };
  assert.ok(msb.items.length >= 1, 'matches returned');
  console.log('✓ GET /friends/:id/matches');

  // 12. POST /matches/:id/seen
  const mid = msb.items[0].id;
  const seen = await app.inject({
    method: 'POST',
    url: `/matches/${mid}/seen`,
    headers: auth,
    payload: '{}',
  });
  assert.equal(seen.statusCode, 200);
  const after = await prisma.match.findUnique({ where: { id: mid } });
  const aliceIsA = after!.userAId === aliceUser!.id;
  assert.equal(aliceIsA ? after!.seenByA : after!.seenByB, true);
  console.log('✓ POST /matches/:id/seen');

  // 13. GET /matches/unseen-count
  const uc = await app.inject({ method: 'GET', url: '/matches/unseen-count', headers: auth });
  const ucb = uc.json() as { count: number };
  assert.ok(ucb.count >= 0, 'count returned');
  console.log('✓ GET /matches/unseen-count');

  // 14. GET /matches/:id detail
  const md = await app.inject({ method: 'GET', url: `/matches/${mid}`, headers: auth });
  assert.equal(md.statusCode, 200);
  const mdb = md.json() as { match: { id: string }; friend: { id: string } | null };
  assert.equal(mdb.match.id, mid);
  assert.equal(mdb.friend?.id, bobUser!.id);
  console.log('✓ GET /matches/:id');

  // 15. DELETE /friends/:id cascades matches
  const del = await app.inject({
    method: 'DELETE',
    url: `/friends/${bobUser!.id}`,
    headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(del.statusCode, 200);
  const remain = await prisma.match.findMany({
    where: { OR: [{ userAId: aliceUser!.id }, { userBId: aliceUser!.id }] },
  });
  assert.equal(remain.length, 0, 'matches cleared on unfriend');
  console.log('✓ DELETE /friends/:id cascades matches');

  // 16. Stranger profile → 404
  const stranger = await app.inject({
    method: 'GET',
    url: '/friends/stranger123',
    headers: { authorization: `Bearer ${aliceToken}` },
  });
  assert.equal(stranger.statusCode, 404);
  console.log('✓ GET /friends/<stranger> → 404');

  await cleanup();
  await app.close();
  await prisma.$disconnect();
  console.log('\nALL FRIENDS CHECKS PASSED ✅');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
