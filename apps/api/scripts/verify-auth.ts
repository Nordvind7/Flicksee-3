import 'dotenv/config';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';
import { config } from '../src/config';

// Builds a Telegram Login Widget payload signed with the real bot token, so we
// can exercise the verification path exactly as Telegram would.
function signTelegram(payload: Record<string, string | number>): Record<string, string | number> {
  const dataCheckString = Object.keys(payload)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('\n');
  const secret = crypto.createHash('sha256').update(config.TELEGRAM_BOT_TOKEN).digest();
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return { ...payload, hash };
}

const TEST_TG_ID = 999000111; // throwaway id, cleaned up at the end

async function main() {
  const app = await buildApp({ logger: false });
  const json = { 'content-type': 'application/json' };

  // 1) Valid login → 200 + tokens.
  const valid = signTelegram({
    id: TEST_TG_ID,
    first_name: 'Verify',
    username: 'verify_user',
    auth_date: Math.floor(Date.now() / 1000),
  });
  const login = await app.inject({ method: 'POST', url: '/auth/telegram', headers: json, payload: JSON.stringify(valid) });
  assert.equal(login.statusCode, 200, `login -> ${login.statusCode}: ${login.body}`);
  const loginBody = login.json() as { accessToken: string; user: { telegramId: number } };
  assert.ok(loginBody.accessToken, 'accessToken present');
  assert.equal(loginBody.user.telegramId, TEST_TG_ID, 'telegramId echoed');
  const cookie = login.cookies.find((c) => c.name === 'flicksee_rt');
  assert.ok(cookie, 'refresh cookie set');
  assert.ok(cookie!.httpOnly, 'refresh cookie is httpOnly');
  console.log('✓ valid login → 200, access token + httpOnly refresh cookie');

  // 2) /auth/me with the access token.
  const me = await app.inject({
    method: 'GET',
    url: '/auth/me',
    headers: { authorization: `Bearer ${loginBody.accessToken}` },
  });
  assert.equal(me.statusCode, 200, `me -> ${me.statusCode}`);
  assert.equal((me.json() as { user: { telegramId: number } }).user.telegramId, TEST_TG_ID);
  console.log('✓ /auth/me with token → returns the user');

  // 3) Refresh rotates the token.
  const refresh = await app.inject({
    method: 'POST',
    url: '/auth/refresh',
    cookies: { flicksee_rt: cookie!.value },
  });
  assert.equal(refresh.statusCode, 200, `refresh -> ${refresh.statusCode}`);
  assert.ok((refresh.json() as { accessToken: string }).accessToken, 'new access token');
  const rotated = refresh.cookies.find((c) => c.name === 'flicksee_rt');
  assert.ok(rotated && rotated.value !== cookie!.value, 'refresh cookie rotated');
  console.log('✓ refresh → new access token + rotated refresh cookie');

  // 4) Old (already-rotated) refresh token is now rejected.
  const reuse = await app.inject({
    method: 'POST',
    url: '/auth/refresh',
    cookies: { flicksee_rt: cookie!.value },
  });
  assert.equal(reuse.statusCode, 401, `reused refresh -> ${reuse.statusCode}`);
  console.log('✓ reusing the old refresh token → 401 (rotation works)');

  // 5) Tampered hash → 401.
  const bad = await app.inject({
    method: 'POST',
    url: '/auth/telegram',
    headers: json,
    payload: JSON.stringify({ ...valid, hash: 'de'.repeat(32) }),
  });
  assert.equal(bad.statusCode, 401, `tampered -> ${bad.statusCode}`);
  console.log('✓ tampered hash → 401');

  // 6) /auth/me without a token → 401.
  const noauth = await app.inject({ method: 'GET', url: '/auth/me' });
  assert.equal(noauth.statusCode, 401, `no-auth me -> ${noauth.statusCode}`);
  console.log('✓ /auth/me without token → 401');

  await cleanup();
  await app.close();
  await prisma.$disconnect();
  console.log('\nALL AUTH CHECKS PASSED ✅');
}

async function cleanup() {
  await prisma.user.deleteMany({ where: { telegramId: BigInt(TEST_TG_ID) } });
}

main().catch(async (err) => {
  console.error('\nAUTH VERIFY FAILED ❌');
  console.error(err);
  try {
    await cleanup();
    await prisma.$disconnect();
  } catch {
    /* ignore cleanup errors */
  }
  process.exit(1);
});
