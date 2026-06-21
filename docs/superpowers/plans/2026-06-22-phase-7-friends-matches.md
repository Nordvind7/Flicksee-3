# Phase 7 — Friends & Matches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Flicksee into a social product where two friends added through a Telegram deeplink see the intersection of their watchlists and get a Telegram push the moment they both swipe right on the same title.

**Architecture:** Async friend-based model — no Socket.IO, no rooms in MVP. State lives in three new Prisma tables (`Friendship`, `Match`, `Invite`); match detection runs as a fire-and-forget hook off the existing `POST /swipes`; notifications go through a minimal Telegraf bot (polling in dev, webhook in prod). The frontend grows a "Friends" page, a friend-profile page, and a match modal/page.

**Tech Stack:** Fastify + Prisma + Postgres (existing). Adds `telegraf` to api. Adds `react-router-dom` to web (no router today — needed for `/matches/:id` deeplink from bot push).

## Global Constraints

- **Spec source of truth:** `docs/superpowers/specs/2026-06-22-phase-7-friends-matches-design.md`. If plan and spec disagree, spec wins; flag the disagreement before implementing.
- **User IDs are `String` (cuid)** in current schema — NOT `BigInt` as the spec draft showed. Canonical pair ordering uses string comparison: `userAId < userBId` (lex).
- **`User.isBotStarted` already exists** — re-use it; do not add `botChatActive`.
- **Use existing `ContentType` enum** (`MOVIE`/`TV`) — do not introduce `MediaType`.
- **Env naming convention:** `TELEGRAM_BOT_*` (existing pattern: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`).
- **Test style:** project uses verify-scripts via `app.inject()` + `node:assert/strict`. Mirror that — no jest/vitest setup needed. Each new domain gets `apps/api/scripts/verify-<domain>.ts` registered under `pnpm verify:<domain>`.
- **No `any` casts.** Existing routes use zod + explicit Prisma types.
- **Commits per task** with conventional-commit style: `feat(api):`, `feat(web):`, `chore(db):`, `docs:`. Match existing style.
- **Branch:** continue on `feat/monorepo-foundation`. No new branch.
- **All new routes auth-gated** via `{ onRequest: [app.authenticate] }`, except `/bot/webhook` (secret-token-gated).
- **Comments:** short, explain WHY, never WHAT. Match existing `src/routes/library.ts` style.

---

## File Structure

### Backend (apps/api/)

| Path | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Rename `Match` → `RoomMatch`; add `Friendship`, `Match` (friends-scope), `Invite` |
| `src/config.ts` | Modify | Add `TELEGRAM_BOT_WEBHOOK_SECRET`, `WEB_PUBLIC_URL`, `BOT_MODE` to env schema |
| `src/lib/canonicalPair.ts` | Create | `canonicalPair(a,b): [string,string]` — sorts user-id pair lex |
| `src/lib/matches.ts` | Create | `detectMatches(userId, swipe)` — fire-and-forget hook logic |
| `src/lib/inviteToken.ts` | Create | Random `base64url` token + parse helpers |
| `src/bot/index.ts` | Create | Telegraf instance, start (polling/webhook switch), `sendMatchPush` helper, `sendFriendshipPush` |
| `src/bot/handlers.ts` | Create | `/start`, `/start <token>` handlers |
| `src/routes/friends.ts` | Create | `POST /friends/invite`, `GET /friends`, `GET /friends/:id`, `GET /friends/:id/matches`, `DELETE /friends/:id`, `GET /matches/unseen-count`, `POST /matches/:id/seen` |
| `src/routes/bot.ts` | Create | `POST /bot/webhook` Fastify route → forwards to Telegraf |
| `src/routes/library.ts` | Modify | Hook `detectMatches` into `POST /swipes` via `setImmediate` |
| `src/app.ts` | Modify | Register `friends.ts`, `bot.ts`; start bot in `index.ts` lifecycle |
| `src/index.ts` | Modify | Start bot polling in dev; webhook init in prod |
| `scripts/verify-friends.ts` | Create | End-to-end inproc checks for invite → friend → match → push (push mocked) |
| `package.json` | Modify | Add `telegraf` dep, `verify:friends` script |
| `.env.example` | Modify (or create) | Document new env vars |

### Frontend (apps/web/)

| Path | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `react-router-dom@^6` |
| `src/main.tsx` (or `index.tsx`) | Modify | Wrap `<App/>` in `<BrowserRouter>` |
| `src/App.tsx` | Modify | Replace view-state machine with `<Routes>`; preserve swipe/liked/watched as routes |
| `src/lib/api.ts` | Modify | Add `friends`/`matches` methods next to existing auth/library calls |
| `src/hooks/useFriends.ts` | Create | Fetch + cache friends list |
| `src/hooks/useFriendProfile.ts` | Create | Friend's watchlist + match flags |
| `src/hooks/useFriendMatches.ts` | Create | Cursor-paginated matches with a friend |
| `src/hooks/useMatchPolling.ts` | Create | Poll `/matches/unseen-count` every 30s when tab visible |
| `src/pages/FriendsPage.tsx` | Create | List + invite button (Web Share API → clipboard fallback) |
| `src/pages/FriendProfilePage.tsx` | Create | Watchlist grid, matches highlighted + sorted to top |
| `src/pages/MatchPage.tsx` | Create | Single-match detail — opens from bot push |
| `src/components/MatchModal.tsx` | Create | First-unseen-match modal on app open |
| `src/components/FriendCard.tsx` | Create | One row in friends list |
| `src/components/Header.tsx` | Modify | "Друзья" nav item + unseen-match badge |

---

## Task 1: Schema migration — rename Room-`Match` and add friends-scope tables

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_phase7_friends_matches/migration.sql` (generated)

**Interfaces:**
- Consumes: existing `User`, `ContentType` enum, `Swipe`
- Produces: `Friendship`, `Match` (friends-scope, replaces previous Room-scoped `Match`), `Invite`, `RoomMatch` (renamed)

- [ ] **Step 1: Open the schema and rename the room-scoped Match to RoomMatch**

Edit `apps/api/prisma/schema.prisma`. Find the existing `model Match { ... roomId ... }` block. Rename `model Match` → `model RoomMatch`. Update the relation on `Room` from `matches Match[]` to `matches RoomMatch[]` to match.

- [ ] **Step 2: Append the three new models below the existing schema**

Append (after the renamed `RoomMatch` block):

```prisma
// ───────────────────────── Friendships ─────────────────────────

// Symmetric friendship between two users. We always store (smaller, larger)
// user-id, enforced by a unique index, so (A,B) and (B,A) cannot both exist.
model Friendship {
  id          String   @id @default(cuid())
  userAId     String   // smaller cuid (lex order)
  userBId     String   // larger cuid
  createdAt   DateTime @default(now())
  inviteToken String?  // which invite linked them (audit only)

  userA User @relation("FriendshipA", fields: [userAId], references: [id], onDelete: Cascade)
  userB User @relation("FriendshipB", fields: [userBId], references: [id], onDelete: Cascade)

  @@unique([userAId, userBId])
  @@index([userAId])
  @@index([userBId])
}

// A title both friends LIKEd. Stored canonically (userAId < userBId) so the
// pair has exactly one row regardless of who swiped first.
model Match {
  id          String      @id @default(cuid())
  userAId     String      // smaller id
  userBId     String      // larger id
  tmdbId      Int
  contentType ContentType
  matchedAt   DateTime    @default(now())
  notified    Boolean     @default(false) // push delivered?
  seenByA     Boolean     @default(false) // user A opened it in app
  seenByB     Boolean     @default(false)

  userA User @relation("MatchA", fields: [userAId], references: [id], onDelete: Cascade)
  userB User @relation("MatchB", fields: [userBId], references: [id], onDelete: Cascade)

  @@unique([userAId, userBId, tmdbId, contentType])
  @@index([userAId, matchedAt])
  @@index([userBId, matchedAt])
}

// Single-use Telegram deeplink token: t.me/<BOT_USERNAME>?start=<token>
model Invite {
  token       String    @id
  creatorId   String
  createdAt   DateTime  @default(now())
  expiresAt   DateTime
  consumedBy  String?
  consumedAt  DateTime?

  creator User @relation("InviteCreator", fields: [creatorId], references: [id], onDelete: Cascade)

  @@index([creatorId])
  @@index([expiresAt])
}
```

- [ ] **Step 3: Add back-relations on `User`**

In the `User` model block, after the existing relation lines, add:

```prisma
  friendshipsA Friendship[] @relation("FriendshipA")
  friendshipsB Friendship[] @relation("FriendshipB")
  matchesA     Match[]      @relation("MatchA")
  matchesB     Match[]      @relation("MatchB")
  invites      Invite[]     @relation("InviteCreator")
```

- [ ] **Step 4: Generate migration (dev — requires running Postgres)**

Run from `apps/api/`:

```bash
pnpm pg:status   # ensure Postgres is up; if not: pnpm pg:start
pnpm db:migrate -- --name phase7_friends_matches
```

Expected: Prisma prints "Applied migration" and regenerates client. Migration directory created under `prisma/migrations/`.

- [ ] **Step 5: Verify Prisma validates and types compile**

Run from `apps/api/`:

```bash
pnpm prisma validate
pnpm typecheck
```

Expected: both exit 0. If typecheck fails because of `RoomMatch` rename references elsewhere in code (`grep -r "prisma.match" src/` for the old room-Match consumers), update those references — there shouldn't be any per the spec, but verify.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "chore(db): phase 7 — Friendship/Match/Invite tables"
```

---

## Task 2: Extend config + env documentation

**Files:**
- Modify: `apps/api/src/config.ts`
- Create or modify: `apps/api/.env.example`

**Interfaces:**
- Produces: `config.TELEGRAM_BOT_WEBHOOK_SECRET`, `config.WEB_PUBLIC_URL`, `config.BOT_MODE` (`'polling' | 'webhook'`)

- [ ] **Step 1: Add new fields to the zod env schema**

Edit `apps/api/src/config.ts`, inside `schema`:

```ts
  TELEGRAM_BOT_WEBHOOK_SECRET: z.string().min(16).optional(),
  WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
```

- [ ] **Step 2: Add production assertion**

After the existing `if (config.NODE_ENV === 'production' && config.ENABLE_DEV_LOGIN)` block:

```ts
if (config.NODE_ENV === 'production' && config.BOT_MODE === 'webhook' && !config.TELEGRAM_BOT_WEBHOOK_SECRET) {
  throw new Error('TELEGRAM_BOT_WEBHOOK_SECRET is required when BOT_MODE=webhook in production');
}
```

- [ ] **Step 3: Create/extend `.env.example`**

If `apps/api/.env.example` doesn't exist, create it from current `.env`'s shape (no secrets), append. If exists, append:

```
# Phase 7 — Friends & Matches
BOT_MODE=polling
# TELEGRAM_BOT_WEBHOOK_SECRET=<crypto random, set in prod>
WEB_PUBLIC_URL=http://localhost:3000
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/api && pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/config.ts apps/api/.env.example
git commit -m "chore(api): phase 7 — bot/web env config"
```

---

## Task 3: `canonicalPair` utility

**Files:**
- Create: `apps/api/src/lib/canonicalPair.ts`
- Create: `apps/api/scripts/verify-canonicalPair.ts`

**Interfaces:**
- Produces: `canonicalPair(a: string, b: string): [string, string]` — returns `[smaller, larger]`; throws on `a === b`

- [ ] **Step 1: Write the verify script first (TDD-ish for this codebase)**

Create `apps/api/scripts/verify-canonicalPair.ts`:

```ts
import assert from 'node:assert/strict';
import { canonicalPair } from '../src/lib/canonicalPair';

assert.deepEqual(canonicalPair('b', 'a'), ['a', 'b']);
assert.deepEqual(canonicalPair('a', 'b'), ['a', 'b']);
assert.throws(() => canonicalPair('x', 'x'), /same user/);
console.log('✓ canonicalPair');
```

- [ ] **Step 2: Run it — expect failure**

```bash
cd apps/api && pnpm tsx scripts/verify-canonicalPair.ts
```

Expected: fails because the module doesn't exist.

- [ ] **Step 3: Implement the utility**

Create `apps/api/src/lib/canonicalPair.ts`:

```ts
// Sort a user-id pair lexicographically. Storing the smaller id as userAId
// guarantees a single row per friendship/match regardless of swipe order.
export function canonicalPair(a: string, b: string): [string, string] {
  if (a === b) throw new Error('canonicalPair: same user');
  return a < b ? [a, b] : [b, a];
}
```

- [ ] **Step 4: Re-run, expect pass**

```bash
cd apps/api && pnpm tsx scripts/verify-canonicalPair.ts
```

Expected: prints `✓ canonicalPair`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/canonicalPair.ts apps/api/scripts/verify-canonicalPair.ts
git commit -m "feat(api): canonicalPair helper for symmetric relations"
```

---

## Task 4: `inviteToken` utility

**Files:**
- Create: `apps/api/src/lib/inviteToken.ts`

**Interfaces:**
- Produces: `newInviteToken(): string` — returns 128-bit url-safe base64 (~22 chars), `INVITE_TTL_MS: number`

- [ ] **Step 1: Implement**

Create `apps/api/src/lib/inviteToken.ts`:

```ts
import crypto from 'node:crypto';

// 7 days — short enough to bound the consume window, long enough that
// "tomorrow" still works.
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 128 bits, url-safe; usable verbatim in t.me/<bot>?start=<token>.
// Telegram's start parameter accepts [A-Za-z0-9_-]{1,64} — base64url fits.
export function newInviteToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/api && pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/inviteToken.ts
git commit -m "feat(api): invite token generator"
```

---

## Task 5: Install Telegraf + skeleton bot module (no handlers yet)

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/bot/index.ts`

**Interfaces:**
- Produces: `getBot(): Telegraf` (singleton-lazy), `startBot(): Promise<void>`, `stopBot(): Promise<void>`

- [ ] **Step 1: Install telegraf**

From repo root:

```bash
pnpm --filter @flicksee/api add telegraf
```

Expected: lockfile updates; `telegraf` appears in `apps/api/package.json` deps.

- [ ] **Step 2: Implement skeleton**

Create `apps/api/src/bot/index.ts`:

```ts
import { Telegraf } from 'telegraf';
import { config } from '../config';

let _bot: Telegraf | null = null;

// Lazy-init so importing this module never crashes a context that doesn't
// have TELEGRAM_BOT_TOKEN set (e.g. some unit-style scripts).
export function getBot(): Telegraf {
  if (!_bot) _bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
  return _bot;
}

export async function startBot(): Promise<void> {
  const bot = getBot();
  if (config.BOT_MODE === 'polling') {
    // launch() resolves once polling is shut down; do not await here.
    void bot.launch();
  }
  // webhook mode: route handler in src/routes/bot.ts forwards updates.
  // Webhook URL registration is a manual one-shot via a separate script (Phase 8).
}

export async function stopBot(): Promise<void> {
  if (_bot) _bot.stop('app shutdown');
}
```

- [ ] **Step 3: Wire shutdown into `src/index.ts`**

Open `apps/api/src/index.ts`. Find the existing graceful-shutdown block (likely on `SIGINT`/`SIGTERM`). Add `await stopBot()` before `app.close()`. Add `await startBot()` after `app.listen()` succeeds. Import at top: `import { startBot, stopBot } from './bot'`.

- [ ] **Step 4: Typecheck + smoke-boot**

```bash
cd apps/api && pnpm typecheck
pnpm dev   # let it start, see "polling" or bot log, then Ctrl-C
```

Expected: typecheck passes. Bot logs a startup line; no crash. Ctrl-C cleanly shuts down.

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml apps/api/src/bot/index.ts apps/api/src/index.ts
git commit -m "feat(api): telegraf bot skeleton with polling/webhook switch"
```

(Note: pnpm-lock.yaml is at repo root if hoisted — `git add pnpm-lock.yaml` from root if needed.)

---

## Task 6: Bot handler — `/start` (no token) and generic reply

**Files:**
- Create: `apps/api/src/bot/handlers.ts`
- Modify: `apps/api/src/bot/index.ts`

**Interfaces:**
- Consumes: `getBot`, `prisma`
- Produces: side-effect — registers `/start` and `text` handlers on the singleton bot

- [ ] **Step 1: Implement handlers**

Create `apps/api/src/bot/handlers.ts`:

```ts
import type { Telegraf } from 'telegraf';
import { prisma } from '../db';

const WELCOME =
  'Привет! Я бот Flicksee. Я отправлю уведомление, когда у тебя и друга совпадёт фильм 🎬\n\n' +
  'Открой flicksee.app и пригласи друзей.';

const GENERIC =
  'Я отправляю уведомления о матчах с друзьями. Открой flicksee.app, чтобы свайпать.';

const LOGIN_REQUIRED =
  'Похоже, ты ещё не во Flicksee. Залогинься на flicksee.app через Telegram и тапни ссылку друга снова.';

// Find a Flicksee user by their Telegram user id and mark them as bot-started
// (we need this flag before we can push them match notifications).
async function markBotStarted(telegramId: number): Promise<{ id: string } | null> {
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
  if (!user) return null;
  await prisma.user.update({ where: { id: user.id }, data: { isBotStarted: true } });
  return { id: user.id };
}

export function registerHandlers(bot: Telegraf) {
  bot.start(async (ctx) => {
    const payload = ctx.startPayload; // raw start-parameter, may be ''
    const tgId = ctx.from?.id;
    if (!tgId) return; // shouldn't happen for /start

    const user = await markBotStarted(tgId);
    if (!user) {
      await ctx.reply(LOGIN_REQUIRED);
      return;
    }

    if (!payload) {
      await ctx.reply(WELCOME);
      return;
    }

    // Token path is handled by Task 7; for now, swallow it with WELCOME so
    // the handler is functionally complete even before deeplinks land.
    await ctx.reply(WELCOME);
  });

  bot.on('text', async (ctx) => {
    await ctx.reply(GENERIC);
  });
}
```

- [ ] **Step 2: Register handlers in bot startup**

Edit `apps/api/src/bot/index.ts`. In `startBot`, before `bot.launch()`, add:

```ts
import { registerHandlers } from './handlers';
// ...
export async function startBot(): Promise<void> {
  const bot = getBot();
  registerHandlers(bot);
  if (config.BOT_MODE === 'polling') {
    void bot.launch();
  }
}
```

- [ ] **Step 3: Manual smoke check (skip if no human handy)**

In `apps/api/`:

```bash
pnpm dev
# In Telegram, find @Flicksee_bot, send /start
# Expect: WELCOME message (if your TG account is linked) OR LOGIN_REQUIRED.
# Ctrl-C to stop.
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/api && pnpm typecheck
```

Expected: 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/bot/
git commit -m "feat(api): bot /start handler + generic text reply"
```

---

## Task 7: `POST /friends/invite` endpoint

**Files:**
- Create: `apps/api/src/routes/friends.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/scripts/verify-friends.ts` (will grow per task)
- Modify: `apps/api/package.json` (add script)

**Interfaces:**
- Produces: `POST /friends/invite` → `{ token: string, deeplink: string, expiresAt: string }`

- [ ] **Step 1: Add `verify:friends` script**

In `apps/api/package.json` scripts:

```json
"verify:friends": "tsx scripts/verify-friends.ts",
```

- [ ] **Step 2: Write the failing verify script (first slice)**

Create `apps/api/scripts/verify-friends.ts`:

```ts
import 'dotenv/config';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app';
import { prisma } from '../src/db';
import { config } from '../src/config';

const ALICE_TG = 88800001;

async function cleanup() {
  await prisma.invite.deleteMany({ where: { creator: { telegramId: BigInt(ALICE_TG) } } });
  await prisma.user.deleteMany({ where: { telegramId: BigInt(ALICE_TG) } });
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

  // 1. Create invite
  const res = await app.inject({ method: 'POST', url: '/friends/invite', headers: auth });
  assert.equal(res.statusCode, 200, `invite -> ${res.statusCode}: ${res.body}`);
  const body = res.json() as { token: string; deeplink: string; expiresAt: string };
  assert.match(body.token, /^[A-Za-z0-9_-]{20,}$/, 'token shape');
  assert.equal(body.deeplink, `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=${body.token}`);
  assert.ok(new Date(body.expiresAt).getTime() > Date.now(), 'expiresAt is future');
  console.log('✓ POST /friends/invite returns valid deeplink');

  // 2. Unauth → 401
  const noauth = await app.inject({ method: 'POST', url: '/friends/invite' });
  assert.equal(noauth.statusCode, 401, `unauth -> ${noauth.statusCode}`);
  console.log('✓ unauth POST /friends/invite → 401');

  await cleanup();
  await app.close();
  await prisma.$disconnect();
  console.log('\nFRIENDS-INVITE CHECKS PASSED ✅');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Run, expect failure**

```bash
cd apps/api && pnpm verify:friends
```

Expected: fails — route not registered (404).

- [ ] **Step 4: Implement the route**

Create `apps/api/src/routes/friends.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { config } from '../config';
import { INVITE_TTL_MS, newInviteToken } from '../lib/inviteToken';

export default async function friendsRoutes(app: FastifyInstance) {
  // Mint a single-use Telegram deeplink token for the current user.
  app.post(
    '/friends/invite',
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (req) => {
      const token = newInviteToken();
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      await prisma.invite.create({
        data: { token, creatorId: req.user.sub, expiresAt },
      });
      return {
        token,
        deeplink: `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=${token}`,
        expiresAt: expiresAt.toISOString(),
      };
    },
  );
}
```

- [ ] **Step 5: Register route in `app.ts`**

In `apps/api/src/app.ts`, after `await app.register(tmdbRoutes);` add:

```ts
import friendsRoutes from './routes/friends';
// ...
  await app.register(friendsRoutes);
```

- [ ] **Step 6: Run verify, expect pass**

```bash
cd apps/api && pnpm verify:friends
```

Expected: `FRIENDS-INVITE CHECKS PASSED ✅`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/friends.ts apps/api/src/app.ts apps/api/scripts/verify-friends.ts apps/api/package.json
git commit -m "feat(api): POST /friends/invite with TG deeplink"
```

---

## Task 8: Bot handler — `/start <token>` (link friendship + backfill retro-matches)

**Files:**
- Modify: `apps/api/src/bot/handlers.ts`
- Create: `apps/api/src/lib/friendship.ts`
- Modify: `apps/api/scripts/verify-friends.ts`

**Interfaces:**
- Consumes: `canonicalPair`, `prisma`
- Produces: `createFriendshipFromInvite(token, consumerUserId): { friendId, retroMatchCount } | { error: 'expired' | 'self' | 'already' | 'unknown' }`

- [ ] **Step 1: Implement the friendship creation logic**

Create `apps/api/src/lib/friendship.ts`:

```ts
import { prisma } from '../db';
import { canonicalPair } from './canonicalPair';

export type LinkResult =
  | { ok: true; friendId: string; retroMatchCount: number }
  | { ok: false; reason: 'expired' | 'self' | 'already' | 'unknown' };

// Atomic invite-consumption + friendship + retro-match backfill. Returns
// counts so the bot can craft a single aggregated welcome message instead of
// spamming one push per pre-existing intersection.
export async function linkFromInvite(token: string, consumerUserId: string): Promise<LinkResult> {
  const now = new Date();
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { ok: false, reason: 'unknown' };
  if (invite.consumedBy) return { ok: false, reason: 'expired' };
  if (invite.expiresAt < now) return { ok: false, reason: 'expired' };
  if (invite.creatorId === consumerUserId) return { ok: false, reason: 'self' };

  const [aId, bId] = canonicalPair(invite.creatorId, consumerUserId);

  return prisma.$transaction(async (tx) => {
    // Idempotent: existing pair short-circuits.
    const existing = await tx.friendship.findUnique({ where: { userAId_userBId: { userAId: aId, userBId: bId } } });
    if (existing) return { ok: false, reason: 'already' };

    // Single-flight invite consumption (CAS).
    const consumed = await tx.invite.updateMany({
      where: { token, consumedBy: null, expiresAt: { gt: now } },
      data: { consumedBy: consumerUserId, consumedAt: now },
    });
    if (consumed.count === 0) return { ok: false, reason: 'expired' };

    await tx.friendship.create({
      data: { userAId: aId, userBId: bId, inviteToken: token },
    });

    // Backfill retro-matches: titles BOTH users have LIKEd.
    const aLikes = await tx.swipe.findMany({
      where: { userId: aId, action: 'LIKE' },
      select: { tmdbId: true, contentType: true },
    });
    if (aLikes.length === 0) {
      return { ok: true, friendId: invite.creatorId === consumerUserId ? aId : invite.creatorId, retroMatchCount: 0 };
    }
    const bLikes = await tx.swipe.findMany({
      where: {
        userId: bId,
        action: 'LIKE',
        OR: aLikes.map((s) => ({ tmdbId: s.tmdbId, contentType: s.contentType })),
      },
      select: { tmdbId: true, contentType: true },
    });
    if (bLikes.length > 0) {
      await tx.match.createMany({
        data: bLikes.map((s) => ({
          userAId: aId,
          userBId: bId,
          tmdbId: s.tmdbId,
          contentType: s.contentType,
          notified: true, // do not push retro-matches individually
        })),
        skipDuplicates: true,
      });
    }
    return {
      ok: true,
      friendId: invite.creatorId === consumerUserId ? aId : invite.creatorId,
      retroMatchCount: bLikes.length,
    };
  });
}
```

- [ ] **Step 2: Wire into bot handler**

Edit `apps/api/src/bot/handlers.ts`. Replace the placeholder token branch in `bot.start` with:

```ts
    if (payload) {
      const result = await linkFromInvite(payload, user.id);
      if (!result.ok) {
        const msg = {
          expired: 'Ссылка устарела или уже использована, попроси новую.',
          self: 'Нельзя дружить с собой 😄 Отправь ссылку другу.',
          already: 'Вы уже друзья.',
          unknown: 'Не нашёл такой инвайт. Возможно, ссылка некорректна.',
        }[result.reason];
        await ctx.reply(msg);
        return;
      }
      const aggMsg = result.retroMatchCount > 0
        ? `🎉 Вы теперь друзья! У вас уже ${result.retroMatchCount} общих хочу-посмотреть. Открой flicksee.app/friends`
        : `🎉 Вы теперь друзья! Свайпайте и я напишу при первом совпадении.`;
      await ctx.reply(aggMsg);
      // Notify the inviter too — best-effort via getBot().telegram.sendMessage
      try {
        const inviter = await prisma.user.findUnique({ where: { id: result.friendId } });
        if (inviter?.isBotStarted) {
          await ctx.telegram.sendMessage(Number(inviter.telegramId), aggMsg);
        }
      } catch (e) {
        ctx.botInfo && console.error('inviter push failed', e);
      }
      return;
    }
```

Add import at top: `import { linkFromInvite } from '../lib/friendship';`.

- [ ] **Step 3: Extend `scripts/verify-friends.ts` with the link flow**

Append before `await cleanup()` at end of main:

```ts
  // 3. Bob links via Alice's invite
  const BOB_TG = 88800002;
  const bobToken = await loginAs(app, BOB_TG, 'bob_t');
  const bobUser = await prisma.user.findUnique({ where: { telegramId: BigInt(BOB_TG) } });
  assert.ok(bobUser, 'bob created');

  // Pre-stage some swipes so retro-match backfill has work
  await app.inject({
    method: 'POST', url: '/swipes',
    headers: { authorization: `Bearer ${bobToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify({ tmdbId: 700001, contentType: 'movie', action: 'LIKE', content: { title: 'X' } }),
  });
  await app.inject({
    method: 'POST', url: '/swipes',
    headers: { authorization: `Bearer ${aliceToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify({ tmdbId: 700001, contentType: 'movie', action: 'LIKE', content: { title: 'X' } }),
  });

  const { linkFromInvite } = await import('../src/lib/friendship');
  const r1 = await linkFromInvite(body.token, bobUser!.id);
  assert.equal(r1.ok, true, 'link ok');
  assert.equal((r1 as { retroMatchCount: number }).retroMatchCount, 1, '1 retro-match');
  console.log('✓ linkFromInvite creates friendship + backfills retro-match');

  // 4. Re-link same token → expired
  const r2 = await linkFromInvite(body.token, bobUser!.id);
  assert.equal(r2.ok, false);
  assert.equal((r2 as { reason: string }).reason, 'expired');
  console.log('✓ replayed token rejected');

  // 5. Self-friend
  const aliceUser = await prisma.user.findUnique({ where: { telegramId: BigInt(ALICE_TG) } });
  const fresh = await app.inject({ method: 'POST', url: '/friends/invite', headers: auth });
  const freshTok = (fresh.json() as { token: string }).token;
  const r3 = await linkFromInvite(freshTok, aliceUser!.id);
  assert.equal((r3 as { reason: string }).reason, 'self');
  console.log('✓ self-friend rejected');

  // 6. Already-friends
  const fresh2 = await app.inject({ method: 'POST', url: '/friends/invite', headers: auth });
  const r4 = await linkFromInvite((fresh2.json() as { token: string }).token, bobUser!.id);
  assert.equal((r4 as { reason: string }).reason, 'already');
  console.log('✓ already-friends rejected');
```

Update `cleanup()` to also wipe Bob, friendships, matches, swipes:

```ts
async function cleanup() {
  const tgIds = [BigInt(ALICE_TG), BigInt(88800002)];
  const users = await prisma.user.findMany({ where: { telegramId: { in: tgIds } } });
  const ids = users.map((u) => u.id);
  await prisma.match.deleteMany({ where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] } });
  await prisma.friendship.deleteMany({ where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] } });
  await prisma.invite.deleteMany({ where: { creatorId: { in: ids } } });
  await prisma.swipe.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
```

(Hoist `BOB_TG` to module-level constant for cleanup access.)

- [ ] **Step 4: Run, expect pass**

```bash
cd apps/api && pnpm verify:friends
```

Expected: all 6 checks pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/bot/handlers.ts apps/api/src/lib/friendship.ts apps/api/scripts/verify-friends.ts
git commit -m "feat(api): bot deeplink — link friendship + backfill retro-matches"
```

---

## Task 9: `sendMatchPush` helper

**Files:**
- Modify: `apps/api/src/bot/index.ts`

**Interfaces:**
- Produces: `sendMatchPush(recipientUserId: string, otherUserId: string, match: { id: string; tmdbId: number; contentType: 'MOVIE'|'TV' }): Promise<void>`

- [ ] **Step 1: Implement**

Append to `apps/api/src/bot/index.ts`:

```ts
// `getBot` and `config` are already imported at the top of this file from
// Tasks 5 and 2. Add these two imports:
import { prisma } from '../db';
// Note: config is already imported above — reuse it.

// Best-effort push. Returns silently on transient errors so callers can
// fire-and-forget without failing user-visible flows. Sets Match.notified=true
// once delivery succeeds.
export async function sendMatchPush(
  recipientUserId: string,
  otherUserId: string,
  match: { id: string; tmdbId: number; contentType: 'MOVIE' | 'TV' },
): Promise<void> {
  const [recipient, other, content] = await Promise.all([
    prisma.user.findUnique({ where: { id: recipientUserId } }),
    prisma.user.findUnique({ where: { id: otherUserId } }),
    prisma.content.findUnique({ where: { tmdbId_type: { tmdbId: match.tmdbId, type: match.contentType } } }),
  ]);
  if (!recipient || !other) return;
  if (!recipient.isBotStarted) return; // can't push — they'll see in-app
  const title = content?.title ?? `tmdb:${match.tmdbId}`;
  const friendName = other.firstName ?? other.username ?? 'Друг';
  try {
    await getBot().telegram.sendMessage(
      Number(recipient.telegramId),
      `🎬 Новый матч с ${friendName}: ${title}`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: 'Открыть', url: `${config.WEB_PUBLIC_URL}/matches/${match.id}` }]],
        },
      },
    );
    await prisma.match.update({ where: { id: match.id }, data: { notified: true } }).catch(() => {});
  } catch (err) {
    // Telegram returned 403 (blocked), rate-limit, etc. Logged once, never throws.
    console.warn('sendMatchPush failed', err);
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd apps/api && pnpm typecheck
```

Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/bot/index.ts
git commit -m "feat(api): sendMatchPush helper"
```

---

## Task 10: `detectMatches` + wire into `POST /swipes`

**Files:**
- Create: `apps/api/src/lib/matches.ts`
- Modify: `apps/api/src/routes/library.ts`
- Modify: `apps/api/scripts/verify-friends.ts`

**Interfaces:**
- Consumes: `prisma`, `canonicalPair`, `sendMatchPush`
- Produces: `detectMatches(userId: string, swipe: { tmdbId: number; contentType: 'MOVIE'|'TV'; action: 'LIKE'|'DISLIKE'|'SEEN' }): Promise<void>` — fire-and-forget safe

- [ ] **Step 1: Implement**

Create `apps/api/src/lib/matches.ts`:

```ts
import { prisma } from '../db';
import { canonicalPair } from './canonicalPair';
import { sendMatchPush } from '../bot';

// Called from POST /swipes via setImmediate. NEVER throws. Skips when the
// swipe isn't a LIKE. For each friend of the swiper, checks whether they
// already LIKEd the same title; if so, idempotently creates a Match row and
// pushes both sides.
export async function detectMatches(
  userId: string,
  swipe: { tmdbId: number; contentType: 'MOVIE' | 'TV'; action: 'LIKE' | 'DISLIKE' | 'SEEN' },
): Promise<void> {
  if (swipe.action !== 'LIKE') return;

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  if (friendships.length === 0) return;

  for (const f of friendships) {
    const friendId = f.userAId === userId ? f.userBId : f.userAId;
    const friendLike = await prisma.swipe.findUnique({
      where: {
        userId_tmdbId_contentType: {
          userId: friendId,
          tmdbId: swipe.tmdbId,
          contentType: swipe.contentType,
        },
      },
    });
    if (!friendLike || friendLike.action !== 'LIKE') continue;

    const [aId, bId] = canonicalPair(userId, friendId);
    try {
      const match = await prisma.match.create({
        data: { userAId: aId, userBId: bId, tmdbId: swipe.tmdbId, contentType: swipe.contentType },
      });
      // Fire both pushes; failures already swallowed inside helper.
      void sendMatchPush(userId, friendId, match);
      void sendMatchPush(friendId, userId, match);
    } catch (err) {
      // P2002 unique violation = the pair already had this match (race) — OK.
      const code = (err as { code?: string }).code;
      if (code === 'P2002') continue;
      console.warn('detectMatches insert failed', err);
    }
  }
}
```

- [ ] **Step 2: Wire into `POST /swipes`**

Edit `apps/api/src/routes/library.ts`. Inside the `app.post('/swipes', ...)` handler, after the `await prisma.$transaction(...)` block and BEFORE `return { ok: true }`:

```ts
    // Fire-and-forget: do not let match detection block the swipe response.
    setImmediate(() => {
      void detectMatches(userId, { tmdbId, contentType: dbType, action }).catch((e) => req.log.warn(e));
    });
```

Add import: `import { detectMatches } from '../lib/matches';`.

- [ ] **Step 3: Extend `scripts/verify-friends.ts` with match-detection slice**

Append before the last `await cleanup()`:

```ts
  // 7. Match detection on subsequent swipe
  // Pre-cleanup matches from earlier retro-backfill, then drive a fresh swipe
  await prisma.match.deleteMany({ where: { OR: [{ userAId: aliceUser!.id }, { userBId: aliceUser!.id }] } });

  // Bob LIKEs a new title first
  await app.inject({
    method: 'POST', url: '/swipes',
    headers: { authorization: `Bearer ${bobToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify({ tmdbId: 700002, contentType: 'movie', action: 'LIKE', content: { title: 'Y' } }),
  });
  // Alice LIKEs same → match
  await app.inject({
    method: 'POST', url: '/swipes',
    headers: { authorization: `Bearer ${aliceToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify({ tmdbId: 700002, contentType: 'movie', action: 'LIKE', content: { title: 'Y' } }),
  });
  // detectMatches runs in setImmediate — yield a tick
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setTimeout(r, 50));

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: aliceUser!.id }, { userBId: aliceUser!.id }] },
  });
  assert.equal(matches.length, 1, `expected 1 match, got ${matches.length}`);
  assert.equal(matches[0].tmdbId, 700002);
  console.log('✓ detectMatches creates a Match on mutual LIKE');

  // 8. Idempotent on re-swipe
  await app.inject({
    method: 'POST', url: '/swipes',
    headers: { authorization: `Bearer ${aliceToken}`, 'content-type': 'application/json' },
    payload: JSON.stringify({ tmdbId: 700002, contentType: 'movie', action: 'LIKE', content: { title: 'Y' } }),
  });
  await new Promise((r) => setTimeout(r, 50));
  const matches2 = await prisma.match.findMany({
    where: { OR: [{ userAId: aliceUser!.id }, { userBId: aliceUser!.id }] },
  });
  assert.equal(matches2.length, 1, 'no duplicate match on re-LIKE');
  console.log('✓ detectMatches is idempotent');
```

- [ ] **Step 4: Run, expect pass**

```bash
cd apps/api && pnpm verify:friends
```

Expected: all (8) checks pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/matches.ts apps/api/src/routes/library.ts apps/api/scripts/verify-friends.ts
git commit -m "feat(api): match detection hook off POST /swipes"
```

---

## Task 11: Remaining friends endpoints (`GET /friends`, profile, matches, delete, unseen-count, mark-seen)

**Files:**
- Modify: `apps/api/src/routes/friends.ts`
- Modify: `apps/api/scripts/verify-friends.ts`

**Interfaces:**
- Produces:
  - `GET /friends` → `{ items: { id: string; username: string|null; firstName: string|null; photoUrl: string|null; unseenCount: number }[] }`
  - `GET /friends/:id` → `{ friend: {...}; watchlist: LibraryMovie[]; matchedTmdbIds: number[] }`
  - `GET /friends/:id/matches?cursor=<matchId>&limit=<n>` → `{ items: Match[]; nextCursor: string|null }`
  - `DELETE /friends/:id` → `{ ok: true }`
  - `GET /matches/unseen-count` → `{ count: number }`
  - `POST /matches/:id/seen` → `{ ok: true }`

- [ ] **Step 1: Add helper to resolve a friendship by current-user + other-id**

Add inside `apps/api/src/routes/friends.ts` (above `export default`):

```ts
import { canonicalPair } from '../lib/canonicalPair';

async function getFriendshipOr404(currentUserId: string, otherId: string) {
  const [a, b] = canonicalPair(currentUserId, otherId);
  return prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
}
```

- [ ] **Step 2: Append all six routes to `friends.ts`**

Inside the `export default async function friendsRoutes(app)` body, after the existing invite route:

```ts
  app.get('/friends', { onRequest: [app.authenticate] }, async (req) => {
    const me = req.user.sub;
    const fs = await prisma.friendship.findMany({
      where: { OR: [{ userAId: me }, { userBId: me }] },
      include: { userA: true, userB: true },
    });
    const items = await Promise.all(
      fs.map(async (f) => {
        const friend = f.userAId === me ? f.userB : f.userA;
        const [a, b] = canonicalPair(me, friend.id);
        const unseenField = me === a ? { seenByA: false } : { seenByB: false };
        const unseenCount = await prisma.match.count({
          where: { userAId: a, userBId: b, ...unseenField },
        });
        return {
          id: friend.id,
          username: friend.username,
          firstName: friend.firstName,
          photoUrl: friend.photoUrl,
          unseenCount,
        };
      }),
    );
    return { items };
  });

  app.get<{ Params: { id: string } }>(
    '/friends/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const friendId = req.params.id;
      const f = await getFriendshipOr404(me, friendId);
      if (!f) return reply.status(404).send({ error: 'not a friend' });

      const friend = await prisma.user.findUnique({ where: { id: friendId } });
      if (!friend) return reply.status(404).send({ error: 'user not found' });

      const swipes = await prisma.swipe.findMany({
        where: { userId: friendId, action: 'LIKE' },
        orderBy: { createdAt: 'desc' },
        select: { tmdbId: true, contentType: true },
      });
      const contents = swipes.length
        ? await prisma.content.findMany({
            where: { OR: swipes.map((s) => ({ tmdbId: s.tmdbId, type: s.contentType })) },
          })
        : [];
      const byKey = new Map(contents.map((c) => [`${c.tmdbId}:${c.type}`, c]));

      const watchlist = swipes
        .map((s) => {
          const c = byKey.get(`${s.tmdbId}:${s.contentType}`);
          if (!c) return null;
          return {
            id: s.tmdbId,
            contentType: s.contentType === 'MOVIE' ? 'movie' : 'tv',
            title: c.title,
            overview: c.overview ?? '',
            poster_path: c.posterPath ?? '',
            backdrop_path: c.backdropPath ?? '',
            vote_average: c.voteAverage ?? 0,
            release_date: c.releaseDate ?? undefined,
            genre_ids: c.genreIds ?? [],
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const [a, b] = canonicalPair(me, friendId);
      const matches = await prisma.match.findMany({
        where: { userAId: a, userBId: b },
        select: { tmdbId: true },
      });
      const matchedTmdbIds = matches.map((m) => m.tmdbId);

      return {
        friend: {
          id: friend.id,
          username: friend.username,
          firstName: friend.firstName,
          photoUrl: friend.photoUrl,
        },
        watchlist,
        matchedTmdbIds,
      };
    },
  );

  app.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/friends/:id/matches',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const f = await getFriendshipOr404(me, req.params.id);
      if (!f) return reply.status(404).send({ error: 'not a friend' });
      const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
      const [a, b] = canonicalPair(me, req.params.id);
      const items = await prisma.match.findMany({
        where: { userAId: a, userBId: b },
        orderBy: { matchedAt: 'desc' },
        take: limit + 1,
        ...(req.query.cursor ? { cursor: { id: req.query.cursor }, skip: 1 } : {}),
      });
      const nextCursor = items.length > limit ? items[limit].id : null;
      return { items: items.slice(0, limit), nextCursor };
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/friends/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const f = await getFriendshipOr404(me, req.params.id);
      if (!f) return reply.status(404).send({ error: 'not a friend' });
      const [a, b] = canonicalPair(me, req.params.id);
      await prisma.$transaction([
        prisma.match.deleteMany({ where: { userAId: a, userBId: b } }),
        prisma.friendship.delete({ where: { userAId_userBId: { userAId: a, userBId: b } } }),
      ]);
      return { ok: true };
    },
  );

  app.get('/matches/unseen-count', { onRequest: [app.authenticate] }, async (req) => {
    const me = req.user.sub;
    const count = await prisma.match.count({
      where: {
        OR: [
          { userAId: me, seenByA: false },
          { userBId: me, seenByB: false },
        ],
      },
    });
    return { count };
  });

  app.post<{ Params: { id: string } }>(
    '/matches/:id/seen',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const m = await prisma.match.findUnique({ where: { id: req.params.id } });
      if (!m) return reply.status(404).send({ error: 'match not found' });
      if (m.userAId !== me && m.userBId !== me) return reply.status(403).send({ error: 'not yours' });
      const data = m.userAId === me ? { seenByA: true } : { seenByB: true };
      await prisma.match.update({ where: { id: req.params.id }, data });
      return { ok: true };
    },
  );
```

- [ ] **Step 3: Extend verify with the new endpoints**

Append to `scripts/verify-friends.ts` (before final cleanup):

```ts
  // 9. GET /friends lists Bob as Alice's friend with unseenCount >= 1
  const list = await app.inject({ method: 'GET', url: '/friends', headers: auth });
  assert.equal(list.statusCode, 200);
  const lbody = list.json() as { items: { id: string; unseenCount: number }[] };
  const bob = lbody.items.find((x) => x.id === bobUser!.id);
  assert.ok(bob, 'bob in friends list');
  assert.ok(bob!.unseenCount >= 1, 'bob has unseen matches for alice');
  console.log('✓ GET /friends returns friends with unseenCount');

  // 10. GET /friends/:id returns friend + watchlist + matchedTmdbIds
  const prof = await app.inject({ method: 'GET', url: `/friends/${bobUser!.id}`, headers: auth });
  assert.equal(prof.statusCode, 200);
  const pbody = prof.json() as { matchedTmdbIds: number[]; watchlist: unknown[] };
  assert.ok(pbody.matchedTmdbIds.includes(700002), 'matched id present');
  assert.ok(pbody.watchlist.length >= 2, 'bob watchlist non-empty');
  console.log('✓ GET /friends/:id returns watchlist + match flags');

  // 11. GET /friends/:id/matches paginates
  const ms = await app.inject({ method: 'GET', url: `/friends/${bobUser!.id}/matches?limit=10`, headers: auth });
  const msb = ms.json() as { items: { id: string }[]; nextCursor: string | null };
  assert.ok(msb.items.length >= 1, 'matches returned');
  console.log('✓ GET /friends/:id/matches');

  // 12. POST /matches/:id/seen flips the right flag
  const mid = msb.items[0].id;
  const seen = await app.inject({ method: 'POST', url: `/matches/${mid}/seen`, headers: auth });
  assert.equal(seen.statusCode, 200);
  const after = await prisma.match.findUnique({ where: { id: mid } });
  // Alice's id may be either A or B depending on lex sort
  const aliceIsA = after!.userAId === aliceUser!.id;
  assert.equal(aliceIsA ? after!.seenByA : after!.seenByB, true);
  console.log('✓ POST /matches/:id/seen');

  // 13. GET /matches/unseen-count
  const uc = await app.inject({ method: 'GET', url: '/matches/unseen-count', headers: auth });
  const ucb = uc.json() as { count: number };
  assert.ok(ucb.count >= 0, 'count returned');
  console.log('✓ GET /matches/unseen-count');

  // 14. DELETE /friends/:id cascades matches
  const del = await app.inject({ method: 'DELETE', url: `/friends/${bobUser!.id}`, headers: auth });
  assert.equal(del.statusCode, 200);
  const remain = await prisma.match.findMany({
    where: { OR: [{ userAId: aliceUser!.id }, { userBId: aliceUser!.id }] },
  });
  assert.equal(remain.length, 0, 'matches cleared on unfriend');
  console.log('✓ DELETE /friends/:id cascades matches');

  // 15. Stranger profile → 404
  const stranger = await app.inject({ method: 'GET', url: '/friends/stranger123', headers: auth });
  assert.equal(stranger.statusCode, 404);
  console.log('✓ GET /friends/<stranger> → 404');
```

- [ ] **Step 4: Run, expect pass**

```bash
cd apps/api && pnpm verify:friends
```

Expected: 15 checks pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/friends.ts apps/api/scripts/verify-friends.ts
git commit -m "feat(api): /friends, /friends/:id, /friends/:id/matches, /matches/unseen-count, mark-seen, delete"
```

---

## Task 12: Webhook route (skeleton — used only in prod)

**Files:**
- Create: `apps/api/src/routes/bot.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Produces: `POST /bot/webhook?secret=<X>` — forwards Telegram update to Telegraf

- [ ] **Step 1: Implement**

Create `apps/api/src/routes/bot.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { config } from '../config';
import { getBot } from '../bot';

export default async function botRoutes(app: FastifyInstance) {
  if (config.BOT_MODE !== 'webhook') return; // only mount in webhook mode

  app.post<{ Querystring: { secret?: string } }>(
    '/bot/webhook',
    {
      // Also validate Telegram's standard header for defense-in-depth.
      preHandler: async (req, reply) => {
        const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
        const ok =
          (config.TELEGRAM_BOT_WEBHOOK_SECRET &&
            (req.query.secret === config.TELEGRAM_BOT_WEBHOOK_SECRET ||
              headerSecret === config.TELEGRAM_BOT_WEBHOOK_SECRET));
        if (!ok) return reply.status(401).send({ error: 'unauthorized' });
      },
      config: { rateLimit: false }, // Telegram bursts; trust the secret instead
    },
    async (req, reply) => {
      await getBot().handleUpdate(req.body as Parameters<ReturnType<typeof getBot>['handleUpdate']>[0]);
      return reply.status(200).send();
    },
  );
}
```

- [ ] **Step 2: Register in `app.ts`**

```ts
import botRoutes from './routes/bot';
// ...
  await app.register(botRoutes);
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/api && pnpm typecheck
```

Expected: 0.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/bot.ts apps/api/src/app.ts
git commit -m "feat(api): /bot/webhook route (prod, secret-gated)"
```

---

## Task 13: Add `react-router-dom` + wrap App in BrowserRouter

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/index.tsx` (or `main.tsx` — check which)
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces: working `/`, `/liked`, `/watched` routes that mirror the previous view-state machine

- [ ] **Step 1: Install**

From repo root:

```bash
pnpm --filter @flicksee/web add react-router-dom
```

- [ ] **Step 2: Wrap root in BrowserRouter**

In `apps/web/src/index.tsx` (or `main.tsx`), wrap `<App/>`:

```tsx
import { BrowserRouter } from 'react-router-dom';
// ...
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
```

- [ ] **Step 3: Refactor App.tsx to use Routes**

In `apps/web/src/App.tsx`, replace the `useState<'swipe'|'liked'|'watched'>` machine with `<Routes>` (preserve existing Header/SwipeContainer/LikedList — just navigate them under routes):

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';

// Within the rendered tree (after auth/hasInteracted gates), replace the
// switch over `view` with:
<Routes>
  <Route path="/" element={<SwipeContainer .../>} />
  <Route path="/liked" element={<LikedList kind="liked" .../>} />
  <Route path="/watched" element={<LikedList kind="watched" .../>} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

Update `Header.tsx` to use `<NavLink to="/liked">` etc. instead of internal `setView`.

- [ ] **Step 4: Smoke-build**

```bash
cd apps/web && pnpm build
```

Expected: build succeeds. Visit `/liked` and `/watched` in dev (`pnpm dev` from repo root, two terminals) — should render same as before.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/src/
git commit -m "feat(web): add react-router-dom, route swipe/liked/watched"
```

---

## Task 14: Extend `lib/api.ts` with friends + matches methods

**Files:**
- Modify (or create): `apps/web/src/lib/api.ts`

**Interfaces:**
- Produces: `createInvite()`, `getFriends()`, `getFriendProfile(id)`, `getFriendMatches(id, cursor?)`, `deleteFriend(id)`, `markMatchSeen(id)`, `getUnseenMatchCount()`

- [ ] **Step 1: Append methods (mirror existing fetch helper)**

In `apps/web/src/lib/api.ts`, after existing helpers (use the same `apiFetch` or whatever wrapper handles refresh-on-401):

```ts
// Friends API
export interface FriendSummary {
  id: string;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  unseenCount: number;
}
export async function getFriends(): Promise<FriendSummary[]> {
  const res = await apiFetch('/friends');
  return (await res.json() as { items: FriendSummary[] }).items;
}

export interface InviteResponse {
  token: string;
  deeplink: string;
  expiresAt: string;
}
export async function createInvite(): Promise<InviteResponse> {
  const res = await apiFetch('/friends/invite', { method: 'POST' });
  return res.json();
}

export interface FriendProfile {
  friend: { id: string; username: string | null; firstName: string | null; photoUrl: string | null };
  watchlist: LibraryMovie[];
  matchedTmdbIds: number[];
}
export async function getFriendProfile(id: string): Promise<FriendProfile> {
  const res = await apiFetch(`/friends/${id}`);
  return res.json();
}

export interface MatchRow {
  id: string;
  tmdbId: number;
  contentType: 'MOVIE' | 'TV';
  matchedAt: string;
  seenByA: boolean;
  seenByB: boolean;
  userAId: string;
  userBId: string;
}
export async function getFriendMatches(id: string, cursor?: string): Promise<{ items: MatchRow[]; nextCursor: string | null }> {
  const url = cursor ? `/friends/${id}/matches?cursor=${cursor}` : `/friends/${id}/matches`;
  return (await apiFetch(url)).json();
}

export async function deleteFriend(id: string): Promise<void> {
  await apiFetch(`/friends/${id}`, { method: 'DELETE' });
}

export async function markMatchSeen(id: string): Promise<void> {
  await apiFetch(`/matches/${id}/seen`, { method: 'POST' });
}

export async function getUnseenMatchCount(): Promise<number> {
  const res = await apiFetch('/matches/unseen-count');
  return (await res.json() as { count: number }).count;
}
```

(`LibraryMovie` may need import from `@flicksee/shared`.)

- [ ] **Step 2: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat(web): api client methods for friends + matches"
```

---

## Task 15: `useFriends` hook + `FriendsPage`

**Files:**
- Create: `apps/web/src/hooks/useFriends.ts`
- Create: `apps/web/src/pages/FriendsPage.tsx`
- Create: `apps/web/src/components/FriendCard.tsx`
- Modify: `apps/web/src/App.tsx` (add `/friends` route)

**Interfaces:**
- Produces: `useFriends()` returning `{ friends, loading, refetch, invite }`

- [ ] **Step 1: Hook**

Create `apps/web/src/hooks/useFriends.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { createInvite, getFriends, type FriendSummary, type InviteResponse } from '../lib/api';

export function useFriends() {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try { setFriends(await getFriends()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const invite = useCallback(async (): Promise<InviteResponse> => createInvite(), []);

  return { friends, loading, refetch, invite };
}
```

- [ ] **Step 2: FriendCard**

Create `apps/web/src/components/FriendCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { FriendSummary } from '../lib/api';

export default function FriendCard({ friend }: { friend: FriendSummary }) {
  const initial = (friend.firstName ?? friend.username ?? '?').charAt(0).toUpperCase();
  return (
    <Link
      to={`/friends/${friend.id}`}
      className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800"
    >
      {friend.photoUrl ? (
        <img src={friend.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center text-lg">
          {initial}
        </div>
      )}
      <div className="flex-1">
        <div className="font-medium">{friend.firstName ?? friend.username ?? 'Без имени'}</div>
        {friend.username && <div className="text-sm text-neutral-400">@{friend.username}</div>}
      </div>
      {friend.unseenCount > 0 && (
        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.5rem] text-center">
          {friend.unseenCount}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: FriendsPage**

Create `apps/web/src/pages/FriendsPage.tsx`:

```tsx
import { useFriends } from '../hooks/useFriends';
import FriendCard from '../components/FriendCard';

export default function FriendsPage() {
  const { friends, loading, invite } = useFriends();

  const onInvite = async () => {
    const { deeplink } = await invite();
    const text = `Свайпни со мной фильмы на Flicksee: ${deeplink}`;
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch { /* user cancelled — fall through to clipboard */ }
    }
    await navigator.clipboard.writeText(text);
    alert('Ссылка скопирована');
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Друзья</h1>
        <button onClick={onInvite} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md">
          Пригласить
        </button>
      </div>
      {loading ? (
        <div className="text-neutral-400">Загрузка…</div>
      ) : friends.length === 0 ? (
        <div className="text-neutral-400 text-center py-8">
          Друзей пока нет. Тапни «Пригласить», чтобы добавить первого.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {friends.map((f) => <FriendCard key={f.id} friend={f} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add route in App.tsx**

```tsx
import FriendsPage from './pages/FriendsPage';
// inside <Routes>:
<Route path="/friends" element={<FriendsPage />} />
```

- [ ] **Step 5: Build + smoke**

```bash
cd apps/web && pnpm build
# pnpm dev (from root), navigate to /friends — empty state shows, "Пригласить" button works
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/useFriends.ts apps/web/src/components/FriendCard.tsx apps/web/src/pages/FriendsPage.tsx apps/web/src/App.tsx
git commit -m "feat(web): friends list page + invite share-sheet"
```

---

## Task 16: `useFriendProfile` + `FriendProfilePage`

**Files:**
- Create: `apps/web/src/hooks/useFriendProfile.ts`
- Create: `apps/web/src/pages/FriendProfilePage.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces: `useFriendProfile(id)` returning `{ data, loading, error, unfriend }`

- [ ] **Step 1: Hook**

Create `apps/web/src/hooks/useFriendProfile.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { deleteFriend, getFriendProfile, type FriendProfile } from '../lib/api';

export function useFriendProfile(id: string) {
  const [data, setData] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFriendProfile(id)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const unfriend = useCallback(() => deleteFriend(id), [id]);
  return { data, loading, error, unfriend };
}
```

- [ ] **Step 2: Page**

Create `apps/web/src/pages/FriendProfilePage.tsx`:

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { useFriendProfile } from '../hooks/useFriendProfile';

export default function FriendProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, unfriend } = useFriendProfile(id);

  if (loading) return <div className="p-4 text-neutral-400">Загрузка…</div>;
  if (error || !data) return <div className="p-4">Ошибка. <button onClick={() => navigate('/friends')}>Назад</button></div>;

  const matched = new Set(data.matchedTmdbIds);
  // Sort: matches first, then by original order (already createdAt desc).
  const sorted = [...data.watchlist].sort((a, b) => Number(matched.has(b.id)) - Number(matched.has(a.id)));

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">{data.friend.firstName ?? data.friend.username ?? 'Друг'}</h1>
        <button
          className="text-sm text-red-400 hover:text-red-300"
          onClick={async () => {
            if (confirm('Удалить из друзей? Совпадения тоже исчезнут.')) {
              await unfriend(); navigate('/friends');
            }
          }}
        >
          Удалить
        </button>
      </div>
      <div className="text-sm text-neutral-400 mb-3">
        {matched.size > 0 ? `🎬 ${matched.size} общих хочу-посмотреть` : 'Пока нет общих'}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((m) => (
          <div
            key={`${m.id}-${m.contentType}`}
            className={`relative rounded-md overflow-hidden ${matched.has(m.id) ? 'ring-2 ring-yellow-400' : ''}`}
          >
            {m.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                alt={m.title}
                className="w-full h-auto"
                loading="lazy"
              />
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-xs truncate">
              {m.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add route**

```tsx
import FriendProfilePage from './pages/FriendProfilePage';
<Route path="/friends/:id" element={<FriendProfilePage />} />
```

- [ ] **Step 4: Build + smoke**

```bash
cd apps/web && pnpm build
```

Expected: build passes.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useFriendProfile.ts apps/web/src/pages/FriendProfilePage.tsx apps/web/src/App.tsx
git commit -m "feat(web): friend profile page with match highlighting"
```

---

## Task 17: `MatchPage` (deeplink from bot)

**Files:**
- Create: `apps/web/src/pages/MatchPage.tsx`
- Modify: `apps/web/src/lib/api.ts` (add `getMatch(id)` if needed)
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces: `/matches/:id` route — fetches match + marks seen + renders detail

- [ ] **Step 1: Add backend `GET /matches/:id` (one endpoint we missed in Task 11)**

In `apps/api/src/routes/friends.ts`, add:

```ts
  app.get<{ Params: { id: string } }>(
    '/matches/:id',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const me = req.user.sub;
      const m = await prisma.match.findUnique({ where: { id: req.params.id } });
      if (!m) return reply.status(404).send({ error: 'not found' });
      if (m.userAId !== me && m.userBId !== me) return reply.status(403).send({ error: 'forbidden' });
      const content = await prisma.content.findUnique({
        where: { tmdbId_type: { tmdbId: m.tmdbId, type: m.contentType } },
      });
      const otherId = m.userAId === me ? m.userBId : m.userAId;
      const other = await prisma.user.findUnique({ where: { id: otherId } });
      return {
        match: { id: m.id, tmdbId: m.tmdbId, contentType: m.contentType, matchedAt: m.matchedAt },
        content,
        friend: other ? { id: other.id, firstName: other.firstName, username: other.username, photoUrl: other.photoUrl } : null,
      };
    },
  );
```

Run `pnpm verify:friends` — should still pass (no behaviour regression).

- [ ] **Step 2: Add api client method**

In `apps/web/src/lib/api.ts`:

```ts
export async function getMatch(id: string) {
  return (await apiFetch(`/matches/${id}`)).json();
}
```

- [ ] **Step 3: MatchPage component**

Create `apps/web/src/pages/MatchPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMatch, markMatchSeen } from '../lib/api';

export default function MatchPage() {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMatch(id)
      .then(async (d) => {
        if (cancelled) return;
        setData(d);
        await markMatchSeen(id).catch(() => {});
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <div className="p-4">Не нашёл матч. <button onClick={() => nav('/')}>На главную</button></div>;
  if (!data) return <div className="p-4 text-neutral-400">Загрузка…</div>;

  const { match, content, friend } = data;
  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold mb-1">🎬 Матч!</h1>
      <div className="text-neutral-400 mb-4">с {friend?.firstName ?? friend?.username ?? 'другом'}</div>
      {content?.posterPath && (
        <img
          src={`https://image.tmdb.org/t/p/w500${content.posterPath}`}
          alt={content.title}
          className="rounded-lg mx-auto mb-4 max-h-[60vh]"
        />
      )}
      <div className="text-lg font-medium">{content?.title ?? `tmdb:${match.tmdbId}`}</div>
      <div className="mt-6 flex gap-2 justify-center">
        <button onClick={() => nav(`/friends/${friend?.id}`)} className="bg-neutral-800 px-4 py-2 rounded">
          Профиль друга
        </button>
        <button onClick={() => nav('/')} className="bg-red-600 px-4 py-2 rounded">
          Свайпать дальше
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add route**

```tsx
import MatchPage from './pages/MatchPage';
<Route path="/matches/:id" element={<MatchPage />} />
```

- [ ] **Step 5: Build + verify backend**

```bash
cd apps/api && pnpm verify:friends
cd ../web && pnpm build
```

Both expected to pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/friends.ts apps/web/src/lib/api.ts apps/web/src/pages/MatchPage.tsx apps/web/src/App.tsx
git commit -m "feat: match detail page + GET /matches/:id"
```

---

## Task 18: `useMatchPolling` + Header badge + first-unseen modal

**Files:**
- Create: `apps/web/src/hooks/useMatchPolling.ts`
- Create: `apps/web/src/components/MatchModal.tsx`
- Modify: `apps/web/src/components/Header.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces: `useMatchPolling()` returns `{ count, refetch }`. Pollers tick every 30s only while `document.visibilityState === 'visible'`.

- [ ] **Step 1: Hook**

Create `apps/web/src/hooks/useMatchPolling.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { getUnseenMatchCount } from '../lib/api';

export function useMatchPolling(intervalMs = 30_000) {
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    try { setCount(await getUnseenMatchCount()); } catch { /* ignore transient */ }
  }, []);

  useEffect(() => {
    void refetch();
    let timer: number | undefined;
    const tick = () => {
      if (document.visibilityState === 'visible') void refetch();
      timer = window.setTimeout(tick, intervalMs);
    };
    timer = window.setTimeout(tick, intervalMs);
    const onVis = () => { if (document.visibilityState === 'visible') void refetch(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs, refetch]);

  return { count, refetch };
}
```

- [ ] **Step 2: Header badge**

In `apps/web/src/components/Header.tsx`, add a NavLink to `/friends` and a small badge bound to the count. Pull count from `useMatchPolling` (which Header can call directly — it's safe to mount the poller once at Header level since Header is always rendered).

```tsx
import { NavLink } from 'react-router-dom';
import { useMatchPolling } from '../hooks/useMatchPolling';
// inside the rendered Header:
const { count } = useMatchPolling();
// ...
<NavLink to="/friends" className="relative">
  Друзья
  {count > 0 && (
    <span className="absolute -top-1 -right-3 bg-red-500 text-white text-xs rounded-full px-1.5">
      {count}
    </span>
  )}
</NavLink>
```

(Preserve existing nav items.)

- [ ] **Step 3: Smoke**

```bash
cd apps/web && pnpm build
```

Expected: build passes. Manually verify in dev that badge updates when you /matches/:id/seen via API or open a match page.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useMatchPolling.ts apps/web/src/components/Header.tsx
git commit -m "feat(web): unseen-match polling + Header badge"
```

---

## Task 19: README + memory update

**Files:**
- Modify: `README.md` (root)
- Modify: `apps/api/README.md` if exists
- Modify: `/Users/mac/.claude/projects/-Users-mac-Claude/memory/flicksee_project.md`

**Interfaces:** docs only

- [ ] **Step 1: README — add Phase 7 section**

Append to root `README.md` under existing "Phases" / progress section:

```markdown
### Phase 7 — Friends & Matches ✅

- Add friends via Telegram deeplink (`t.me/Flicksee_bot?start=<token>`).
- Each friend's watchlist is visible on their profile; intersection (matches) highlighted.
- Bot push on every new match (one aggregated message for retro-matches on first link).
- No Socket.IO / rooms in this phase — Phase 7.5 if needed.

**New env vars:** `BOT_MODE` (polling|webhook, default polling), `WEB_PUBLIC_URL`, `TELEGRAM_BOT_WEBHOOK_SECRET` (prod-only).

**Run:** `cd apps/api && pnpm dev` (polling bot starts automatically).

**Verify:** `cd apps/api && pnpm verify:friends`.
```

- [ ] **Step 2: Update memory**

Edit `/Users/mac/.claude/projects/-Users-mac-Claude/memory/flicksee_project.md`. In the "Готово" section, change "Phase 0–5" to "Phase 0–5 + 7". Move "комнаты/матчи с друзьями (Phase 7, headline-фича)" out of "Осталось" and add: "Phase 7 (friends-based): deeplink-invites, retro-match backfill, push на каждый матч. Rooms (Phase 7.5) отложены."

- [ ] **Step 3: Commit (single)**

```bash
git add README.md
git commit -m "docs: Phase 7 — friends & matches in README"
```

(Memory file lives outside the repo — no git add needed.)

---

## Task 20: Security review + final manual e2e

**Files:** none directly — uses workflow agents and live bot

**Interfaces:** N/A

- [ ] **Step 1: Run security-review skill against the diff**

```
/security-review
```

(Or invoke as documented in user's skill set.) Review every HIGH / MEDIUM finding; fix in a follow-up commit per finding with `harden(...)` prefix matching prior Phase 3/4 style.

- [ ] **Step 2: Manual e2e checklist (requires real BotFather domain + two TG accounts)**

Run through, ticking each:
- [ ] Alice creates invite → share-sheet shows correct deeplink
- [ ] Bob (different TG account) clicks → bot links + sends welcome to both
- [ ] Bob swipes new movie → no push to Alice
- [ ] Alice swipes same movie → both get push within 5s
- [ ] Tap "Открыть" in push → opens `/matches/:id`, marks seen, badge decrements
- [ ] Visit `/friends/<bob-id>` → matched movie has gold ring + sits at top
- [ ] Delete Bob from friends → matches disappear; Bob's profile 404s
- [ ] Bob clicks expired invite → "Ссылка устарела"
- [ ] Alice clicks own invite (self) → "Нельзя дружить с собой"

- [ ] **Step 3: If e2e finds anything, fix + commit; only then proceed**

- [ ] **Step 4: Final verify-script sweep**

```bash
cd apps/api && pnpm verify:auth && pnpm verify:library && pnpm verify:friends
```

All three should pass — confirms no regression in prior phases.

- [ ] **Step 5: No-op commit not needed; this task ends the phase**

---

## Done Criteria (rolled up)

- `pnpm verify:friends` green (15 checks).
- `pnpm verify:auth` and `pnpm verify:library` still green (no regression).
- `pnpm typecheck` green in both `apps/api` and `apps/web`.
- `pnpm build` green in `apps/web`.
- Manual e2e checklist (Task 20 Step 2) passed.
- Security review HIGH/MEDIUM findings resolved.
- README + memory updated.
- Branch `feat/monorepo-foundation` has 19+ phase-7 commits, all conventional.
