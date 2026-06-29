# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Single read-only admin page at `/admin` showing 5 blocks (Users, Activity, Top Content, Trend Charts, Funnel) — enough for the owner to glance daily and understand project health.

**Architecture:** New Fastify routes under `/api/admin/*` gated by `requireAdmin` middleware (env-var allowlist of Telegram IDs). New lazy-loaded React page at `/admin` consumes a single JSON endpoint that returns all metrics with 30-second in-memory TTL cache. Recharts added as admin-chunk-only dependency.

**Tech Stack:** Fastify + Prisma (existing), React 19 + Tailwind (existing), **Recharts** (new, admin chunk only), no react-query (plain `fetch` + `useEffect`).

## Global Constraints

- Auth allowlist: env var `ADMIN_TG_IDS` — comma-separated Telegram IDs, e.g. `123456789,987654321`. Empty/missing → no admins.
- Cache: in-memory TTL = 30 seconds for `/api/admin/dashboard`.
- Admin URL is **hidden from UI** — only reachable via direct typed URL `/admin`.
- All times stored in DB are UTC; trend chart day buckets use server-local date via `date_trunc('day', ...)`.
- Window definitions everywhere: `24h` = `now() - interval '24 hours'`, `7d` = 7 days, `30d` = 30 days.
- Bundle-size rule: Recharts may NOT appear in main app chunk. Verify with `vite build` chunk report after Task 9.
- No new test infrastructure: codebase has no Vitest setup; verification is manual (curl, browser, build output). Don't add a test framework just for this feature.

---

## File Structure

**Backend (new):**
- `apps/api/src/middleware/requireAdmin.ts` — preHandler hook
- `apps/api/src/lib/adminAllowlist.ts` — single source of truth for parsing `ADMIN_TG_IDS`
- `apps/api/src/lib/adminCache.ts` — generic in-memory TTL cache
- `apps/api/src/lib/dashboardMetrics.ts` — all query functions
- `apps/api/src/routes/admin/index.ts` — Fastify plugin registering admin sub-routes
- `apps/api/src/routes/admin/dashboard.ts` — `GET /dashboard` handler

**Backend (modify):**
- `apps/api/src/routes/auth.ts` — add `isAdmin` to `/auth/me` response
- `apps/api/src/app.ts` — register `adminRoutes`
- `packages/shared/src/index.ts` — extend `AuthUser` with `isAdmin: boolean`; add `DashboardData` interface

**Frontend (new):**
- `apps/web/src/pages/admin/AdminDashboardPage.tsx` — main page (lazy import target)
- `apps/web/src/pages/admin/components/MetricCard.tsx` — single labeled number card
- `apps/web/src/pages/admin/components/TopContentTable.tsx` — top-10 movies table
- `apps/web/src/pages/admin/components/TrendChart.tsx` — Recharts line/bar wrapper
- `apps/web/src/pages/admin/components/DonutChart.tsx` — Recharts donut wrapper
- `apps/web/src/pages/admin/components/FunnelBlock.tsx` — funnel rows with % drop-off

**Frontend (modify):**
- `apps/web/src/App.tsx` — add `/admin` lazy route
- `apps/web/src/auth/AuthContext.tsx` — surface `isAdmin` from `/auth/me` (already returned by API after Task 1)
- `apps/web/package.json` — add `recharts` dependency

---

## Task 1: Admin allowlist + `requireAdmin` middleware + `/auth/me` exposes `isAdmin`

**Files:**
- Create: `apps/api/src/lib/adminAllowlist.ts`
- Create: `apps/api/src/middleware/requireAdmin.ts`
- Modify: `apps/api/src/routes/auth.ts` (only the `/auth/me` handler)
- Modify: `packages/shared/src/index.ts` (add `isAdmin: boolean` to `AuthUser`)

**Interfaces:**
- Produces:
  - `isAdminTelegramId(telegramId: bigint | number): boolean` exported from `adminAllowlist.ts`
  - `requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void>` — preHandler hook exported from `middleware/requireAdmin.ts`
  - `AuthUser.isAdmin: boolean` field present in every `/auth/me` response

- [ ] **Step 1: Create allowlist utility**

Create `apps/api/src/lib/adminAllowlist.ts`:

```typescript
// Parses ADMIN_TG_IDS env var once at import time. Comma-separated list of
// Telegram numeric IDs. Whitespace and trailing commas ignored. An ID is
// admin iff it appears in this set.
const RAW = process.env.ADMIN_TG_IDS ?? '';

const ADMIN_IDS: ReadonlySet<string> = new Set(
  RAW.split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^\d+$/.test(s)),
);

export function isAdminTelegramId(telegramId: bigint | number | string): boolean {
  return ADMIN_IDS.has(telegramId.toString());
}

export function adminCount(): number {
  return ADMIN_IDS.size;
}
```

- [ ] **Step 2: Create requireAdmin middleware**

Create `apps/api/src/middleware/requireAdmin.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { isAdminTelegramId } from '../lib/adminAllowlist';

// preHandler hook. Must run AFTER `app.authenticate` so req.user is populated
// by @fastify/jwt. Loads the user once to read telegramId, then checks the
// allowlist. 403 on miss.
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const jwtPayload = req.user as { sub?: string } | undefined;
  if (!jwtPayload?.sub) {
    return reply.status(401).send({ error: 'unauthorized' });
  }
  const user = await prisma.user.findUnique({
    where: { id: jwtPayload.sub },
    select: { telegramId: true },
  });
  if (!user || !isAdminTelegramId(user.telegramId)) {
    return reply.status(403).send({ error: 'forbidden' });
  }
}
```

- [ ] **Step 3: Extend AuthUser type in shared package**

Edit `packages/shared/src/index.ts`. Find:

```typescript
export interface AuthUser {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  photoUrl?: string;
}
```

Replace with:

```typescript
export interface AuthUser {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  photoUrl?: string;
  /** True if this user's telegramId is in the server's ADMIN_TG_IDS allowlist. */
  isAdmin: boolean;
}
```

- [ ] **Step 4: Wire `isAdmin` into `toAuthUser` and every `/auth/me` path**

Edit `apps/api/src/routes/auth.ts`. Find the `toAuthUser` function near the top:

```typescript
function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    telegramId: Number(user.telegramId),
    username: user.username ?? undefined,
    firstName: user.firstName ?? undefined,
    photoUrl: user.photoUrl ?? undefined,
  };
}
```

Replace with:

```typescript
import { isAdminTelegramId } from '../lib/adminAllowlist';

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    telegramId: Number(user.telegramId),
    username: user.username ?? undefined,
    firstName: user.firstName ?? undefined,
    photoUrl: user.photoUrl ?? undefined,
    isAdmin: isAdminTelegramId(user.telegramId),
  };
}
```

(Put the import alongside the other imports at the top of the file, not inside the function.)

- [ ] **Step 5: Build + restart, manual verification**

```bash
pnpm --filter @flicksee/api build
pnpm --filter @flicksee/shared build
# Locally: pnpm dev OR on VPS: pm2 restart api
```

Set `ADMIN_TG_IDS=<your-telegram-id>` in `.env` first.

Verify with curl (replace `<JWT>` with your access token, copy from browser devtools after logging in):

```bash
curl -s http://localhost:3001/auth/me \
  -H "Authorization: Bearer <JWT>" | jq
```

Expected response includes: `"isAdmin": true`. With a non-admin user (or empty `ADMIN_TG_IDS`), expect `"isAdmin": false`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/adminAllowlist.ts \
        apps/api/src/middleware/requireAdmin.ts \
        apps/api/src/routes/auth.ts \
        packages/shared/src/index.ts
git commit -m "feat(admin): allowlist + requireAdmin middleware + isAdmin in /auth/me"
```

---

## Task 2: In-memory TTL cache utility

**Files:**
- Create: `apps/api/src/lib/adminCache.ts`

**Interfaces:**
- Produces: `cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>` — returns cached value if fresh, otherwise calls `fn`, stores result, returns it.

- [ ] **Step 1: Create cache module**

Create `apps/api/src/lib/adminCache.ts`:

```typescript
// Tiny per-process TTL cache for admin endpoints. Single-instance API server
// means we don't need Redis. Map cleanup is lazy — entries are checked on read.
interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function clearCache(key?: string): void {
  if (key) store.delete(key);
  else store.clear();
}
```

- [ ] **Step 2: Manual sanity check**

```bash
cd apps/api
node --input-type=module -e "
import('./dist/lib/adminCache.js').then(async ({ cached }) => {
  let calls = 0;
  const f = async () => { calls++; return 42; };
  await cached('k', 1000, f);
  await cached('k', 1000, f);
  console.log('calls:', calls, '(should be 1)');
  await new Promise(r => setTimeout(r, 1100));
  await cached('k', 1000, f);
  console.log('calls:', calls, '(should be 2)');
});
"
```

Expected output:
```
calls: 1 (should be 1)
calls: 2 (should be 2)
```

(Requires `pnpm --filter @flicksee/api build` first.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/adminCache.ts
git commit -m "feat(admin): in-memory TTL cache utility"
```

---

## Task 3: Dashboard metrics — Users + Activity blocks

**Files:**
- Create: `apps/api/src/lib/dashboardMetrics.ts`
- Modify: `packages/shared/src/index.ts` (add `DashboardData` interface)

**Interfaces:**
- Consumes: `prisma` from `../db`
- Produces:
  - `getUsersMetrics(): Promise<UsersBlock>` — counts via `prisma.user.count`
  - `getActivityMetrics(): Promise<ActivityBlock>` — counts and groupBy on `Swipe`, `Match`, `Friendship`
  - Types `UsersBlock`, `ActivityBlock`, `DashboardData` exported (DashboardData partial for now; expanded in Tasks 4-5)

- [ ] **Step 1: Add `DashboardData` types to shared package**

Edit `packages/shared/src/index.ts`. Append at the bottom:

```typescript
// ──── Admin dashboard ────────────────────────────────────────────────

export interface UsersBlock {
  total: number;
  dau: number;
  wau: number;
  mau: number;
  new24h: number;
  new7d: number;
  new30d: number;
  botStarted: number;
}

export interface ActivityBlock {
  swipes: { d24: number; d7: number; d30: number };
  swipesByAction7d: { LIKE: number; DISLIKE: number; SEEN: number; RECOMMEND: number };
  matches: { d24: number; d7: number; d30: number };
  friendships7d: number;
}

export interface TopContentRow {
  tmdbId: number;
  contentType: 'MOVIE' | 'TV';
  title: string;
  posterPath: string | null;
  count: number;
  /** Only present for LIKE rows: likes / (likes + dislikes). 0..1. */
  likeRatio?: number;
}

export interface TopContentBlock {
  likes7d: TopContentRow[];
  dislikes7d: TopContentRow[];
  recommend30d: TopContentRow[];
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface Trends30dBlock {
  newUsers: TrendPoint[]; // exactly 30 entries
  swipes: TrendPoint[];
  matches: TrendPoint[];
}

export interface FunnelBlock {
  cohortSize: number;
  botStarted: number;
  openedWeb: number;
  fivePlusSwipes: number;
  gotMatch: number;
}

export interface DashboardData {
  users: UsersBlock;
  activity: ActivityBlock;
  topContent: TopContentBlock;
  trends30d: Trends30dBlock;
  funnel7d: FunnelBlock;
  generatedAt: string; // ISO
}
```

- [ ] **Step 2: Create metrics module with Users + Activity blocks**

Create `apps/api/src/lib/dashboardMetrics.ts`:

```typescript
import type { UsersBlock, ActivityBlock } from '@flicksee/shared';
import { prisma } from '../db';

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export async function getUsersMetrics(): Promise<UsersBlock> {
  const [total, dau, wau, mau, new24h, new7d, new30d, botStarted] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeenAt: { gt: daysAgo(1) } } }),
    prisma.user.count({ where: { lastSeenAt: { gt: daysAgo(7) } } }),
    prisma.user.count({ where: { lastSeenAt: { gt: daysAgo(30) } } }),
    prisma.user.count({ where: { createdAt: { gt: daysAgo(1) } } }),
    prisma.user.count({ where: { createdAt: { gt: daysAgo(7) } } }),
    prisma.user.count({ where: { createdAt: { gt: daysAgo(30) } } }),
    prisma.user.count({ where: { isBotStarted: true } }),
  ]);
  return { total, dau, wau, mau, new24h, new7d, new30d, botStarted };
}

export async function getActivityMetrics(): Promise<ActivityBlock> {
  const [s24, s7, s30, byAction, m24, m7, m30, f7] = await Promise.all([
    prisma.swipe.count({ where: { createdAt: { gt: daysAgo(1) } } }),
    prisma.swipe.count({ where: { createdAt: { gt: daysAgo(7) } } }),
    prisma.swipe.count({ where: { createdAt: { gt: daysAgo(30) } } }),
    prisma.swipe.groupBy({
      by: ['action'],
      where: { createdAt: { gt: daysAgo(7) } },
      _count: { _all: true },
    }),
    prisma.match.count({ where: { matchedAt: { gt: daysAgo(1) } } }),
    prisma.match.count({ where: { matchedAt: { gt: daysAgo(7) } } }),
    prisma.match.count({ where: { matchedAt: { gt: daysAgo(30) } } }),
    prisma.friendship.count({ where: { createdAt: { gt: daysAgo(7) } } }),
  ]);

  const swipesByAction7d = { LIKE: 0, DISLIKE: 0, SEEN: 0, RECOMMEND: 0 };
  for (const row of byAction) {
    swipesByAction7d[row.action as keyof typeof swipesByAction7d] = row._count._all;
  }

  return {
    swipes: { d24: s24, d7: s7, d30: s30 },
    swipesByAction7d,
    matches: { d24: m24, d7: m7, d30: m30 },
    friendships7d: f7,
  };
}
```

- [ ] **Step 3: Build + verify types compile**

```bash
pnpm --filter @flicksee/shared build
pnpm --filter @flicksee/api build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Smoke-test in REPL against dev DB**

```bash
cd apps/api
node --input-type=module -e "
import('./dist/lib/dashboardMetrics.js').then(async (m) => {
  console.log('users:', await m.getUsersMetrics());
  console.log('activity:', await m.getActivityMetrics());
  process.exit(0);
});
"
```

Expected: two objects printed, all numbers non-negative, types match the interfaces.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/dashboardMetrics.ts packages/shared/src/index.ts
git commit -m "feat(admin): users + activity dashboard metrics"
```

---

## Task 4: Dashboard metrics — Top Content + Funnel

**Files:**
- Modify: `apps/api/src/lib/dashboardMetrics.ts` (append two functions)

**Interfaces:**
- Consumes: `prisma`, types from `@flicksee/shared`
- Produces:
  - `getTopContent(): Promise<TopContentBlock>`
  - `getFunnel7d(): Promise<FunnelBlock>`

- [ ] **Step 1: Add `getTopContent` function**

Append to `apps/api/src/lib/dashboardMetrics.ts`:

```typescript
import type { TopContentBlock, TopContentRow, FunnelBlock } from '@flicksee/shared';

// Helper: fetch Content rows for a list of (tmdbId, contentType) pairs.
async function fetchContentMap(
  pairs: Array<{ tmdbId: number; contentType: 'MOVIE' | 'TV' }>,
): Promise<Map<string, { title: string; posterPath: string | null }>> {
  if (pairs.length === 0) return new Map();
  const rows = await prisma.content.findMany({
    where: { OR: pairs.map((p) => ({ tmdbId: p.tmdbId, type: p.contentType })) },
    select: { tmdbId: true, type: true, title: true, posterPath: true },
  });
  const map = new Map<string, { title: string; posterPath: string | null }>();
  for (const r of rows) {
    map.set(`${r.type}:${r.tmdbId}`, { title: r.title, posterPath: r.posterPath });
  }
  return map;
}

export async function getTopContent(): Promise<TopContentBlock> {
  const [likes, dislikes, recommends] = await Promise.all([
    prisma.swipe.groupBy({
      by: ['tmdbId', 'contentType'],
      where: { action: 'LIKE', createdAt: { gt: daysAgo(7) } },
      _count: { tmdbId: true },
      orderBy: { _count: { tmdbId: 'desc' } },
      take: 10,
    }),
    prisma.swipe.groupBy({
      by: ['tmdbId', 'contentType'],
      where: { action: 'DISLIKE', createdAt: { gt: daysAgo(7) } },
      _count: { tmdbId: true },
      orderBy: { _count: { tmdbId: 'desc' } },
      take: 10,
    }),
    prisma.swipe.groupBy({
      by: ['tmdbId', 'contentType'],
      where: { action: 'RECOMMEND', createdAt: { gt: daysAgo(30) } },
      _count: { tmdbId: true },
      orderBy: { _count: { tmdbId: 'desc' } },
      take: 10,
    }),
  ]);

  // Collect all unique (tmdbId, contentType) pairs for one Content lookup.
  const allPairs = [...likes, ...dislikes, ...recommends].map((r) => ({
    tmdbId: r.tmdbId,
    contentType: r.contentType as 'MOVIE' | 'TV',
  }));
  const contentMap = await fetchContentMap(allPairs);

  // For likes, also fetch dislike counts in the same period for ratio.
  const likePairs = likes.map((l) => ({ tmdbId: l.tmdbId, contentType: l.contentType }));
  const dislikeCounts = likePairs.length
    ? await prisma.swipe.groupBy({
        by: ['tmdbId', 'contentType'],
        where: {
          action: 'DISLIKE',
          createdAt: { gt: daysAgo(7) },
          OR: likePairs.map((p) => ({ tmdbId: p.tmdbId, contentType: p.contentType })),
        },
        _count: { tmdbId: true },
      })
    : [];
  const dislikeMap = new Map<string, number>();
  for (const d of dislikeCounts) {
    dislikeMap.set(`${d.contentType}:${d.tmdbId}`, d._count.tmdbId);
  }

  const toRow = (
    r: { tmdbId: number; contentType: string; _count: { tmdbId: number } },
    includeRatio: boolean,
  ): TopContentRow => {
    const key = `${r.contentType}:${r.tmdbId}`;
    const content = contentMap.get(key);
    const row: TopContentRow = {
      tmdbId: r.tmdbId,
      contentType: r.contentType as 'MOVIE' | 'TV',
      title: content?.title ?? `#${r.tmdbId}`,
      posterPath: content?.posterPath ?? null,
      count: r._count.tmdbId,
    };
    if (includeRatio) {
      const d = dislikeMap.get(key) ?? 0;
      row.likeRatio = r._count.tmdbId / (r._count.tmdbId + d);
    }
    return row;
  };

  return {
    likes7d: likes.map((r) => toRow(r, true)),
    dislikes7d: dislikes.map((r) => toRow(r, false)),
    recommend30d: recommends.map((r) => toRow(r, false)),
  };
}
```

- [ ] **Step 2: Add `getFunnel7d` function**

Append to the same file:

```typescript
// Cohort = users created in last 7d. Funnel measures their progress through
// engagement steps. Each step is a SUBSET of the previous step's users.
export async function getFunnel7d(): Promise<FunnelBlock> {
  const since = daysAgo(7);

  // Fetch cohort with all the booleans/relations we need in one shot.
  const cohort = await prisma.user.findMany({
    where: { createdAt: { gt: since } },
    select: {
      id: true,
      isBotStarted: true,
      _count: { select: { swipes: true } },
      matchesA: { select: { id: true }, take: 1 },
      matchesB: { select: { id: true }, take: 1 },
    },
  });

  const cohortSize = cohort.length;
  let botStarted = 0;
  let openedWeb = 0;
  let fivePlusSwipes = 0;
  let gotMatch = 0;

  for (const u of cohort) {
    if (u.isBotStarted) botStarted++;
    if (u._count.swipes > 0) openedWeb++;
    if (u._count.swipes >= 5) fivePlusSwipes++;
    if (u.matchesA.length > 0 || u.matchesB.length > 0) gotMatch++;
  }

  return { cohortSize, botStarted, openedWeb, fivePlusSwipes, gotMatch };
}
```

- [ ] **Step 3: Build + smoke test**

```bash
pnpm --filter @flicksee/api build
cd apps/api
node --input-type=module -e "
import('./dist/lib/dashboardMetrics.js').then(async (m) => {
  console.log('top:', JSON.stringify(await m.getTopContent(), null, 2));
  console.log('funnel:', await m.getFunnel7d());
  process.exit(0);
});
"
```

Expected: top arrays each have ≤10 items, funnel numbers monotonically non-increasing from `cohortSize` down to `gotMatch`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/lib/dashboardMetrics.ts
git commit -m "feat(admin): top content + 7d funnel metrics"
```

---

## Task 5: Dashboard metrics — 30-day trends (raw SQL)

**Files:**
- Modify: `apps/api/src/lib/dashboardMetrics.ts`

**Interfaces:**
- Consumes: `prisma.$queryRaw`
- Produces: `getTrends30d(): Promise<Trends30dBlock>` — three 30-element arrays, one entry per day, days with no rows are filled with `count: 0`.

- [ ] **Step 1: Add trends function**

Append to `apps/api/src/lib/dashboardMetrics.ts`:

```typescript
import { Prisma } from '@prisma/client';
import type { Trends30dBlock, TrendPoint } from '@flicksee/shared';

// Produces an array of exactly 30 daily buckets ending today. Days without
// data come back as { date, count: 0 } so chart x-axis is continuous.
// Each table has a different "happened-at" column:
//   User      → createdAt (signup)
//   Swipe     → createdAt
//   Match     → matchedAt  (NB: not createdAt — match rows use matchedAt)
async function dailyCounts(table: 'User' | 'Swipe' | 'Match'): Promise<TrendPoint[]> {
  const timeColumn = table === 'Match' ? 'matchedAt' : 'createdAt';
  // generate_series fills in the gaps. Left join to actual counts.
  const rows = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(
    Prisma.sql`
      SELECT d.date::date AS date, COALESCE(c.count, 0)::bigint AS count
      FROM generate_series(
        (current_date - interval '29 days')::date,
        current_date::date,
        '1 day'
      ) AS d(date)
      LEFT JOIN (
        SELECT date_trunc('day', ${Prisma.raw(`"${timeColumn}"`)})::date AS day,
               count(*)::bigint AS count
        FROM ${Prisma.raw(`"${table}"`)}
        WHERE ${Prisma.raw(`"${timeColumn}"`)} > current_date - interval '30 days'
        GROUP BY 1
      ) c ON c.day = d.date
      ORDER BY d.date ASC
    `,
  );

  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10), // YYYY-MM-DD
    count: Number(r.count),
  }));
}

export async function getTrends30d(): Promise<Trends30dBlock> {
  const [newUsers, swipes, matches] = await Promise.all([
    dailyCounts('User'),
    dailyCounts('Swipe'),
    dailyCounts('Match'),
  ]);
  return { newUsers, swipes, matches };
}
```

- [ ] **Step 2: Build + smoke test**

```bash
pnpm --filter @flicksee/api build
cd apps/api
node --input-type=module -e "
import('./dist/lib/dashboardMetrics.js').then(async (m) => {
  const t = await m.getTrends30d();
  console.log('newUsers length:', t.newUsers.length, '(should be 30)');
  console.log('swipes length:', t.swipes.length, '(should be 30)');
  console.log('first date:', t.newUsers[0]?.date, 'last:', t.newUsers[29]?.date);
  console.log('sample swipes:', t.swipes.slice(-3));
  process.exit(0);
});
"
```

Expected: each array has length 30, dates form a continuous 30-day range ending today.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/lib/dashboardMetrics.ts
git commit -m "feat(admin): 30-day trends via raw SQL with generate_series"
```

---

## Task 6: `/api/admin/dashboard` endpoint (gated, cached)

**Files:**
- Create: `apps/api/src/routes/admin/index.ts`
- Create: `apps/api/src/routes/admin/dashboard.ts`
- Modify: `apps/api/src/app.ts` (register admin routes)

**Interfaces:**
- Consumes: `app.authenticate` decorator (existing), `requireAdmin` (Task 1), `cached` (Task 2), metrics functions (Tasks 3-5)
- Produces: `GET /api/admin/dashboard` — returns `DashboardData` JSON, 30s in-memory cache, 401 unauth, 403 non-admin

- [ ] **Step 1: Create dashboard handler**

Create `apps/api/src/routes/admin/dashboard.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import type { DashboardData } from '@flicksee/shared';
import { cached } from '../../lib/adminCache';
import {
  getUsersMetrics,
  getActivityMetrics,
  getTopContent,
  getFunnel7d,
  getTrends30d,
} from '../../lib/dashboardMetrics';

const CACHE_KEY = 'dashboard:v1';
const CACHE_TTL_MS = 30 * 1000;

export default async function dashboardRoute(app: FastifyInstance) {
  app.get('/dashboard', async () => {
    return cached<DashboardData>(CACHE_KEY, CACHE_TTL_MS, async () => {
      const [users, activity, topContent, funnel7d, trends30d] = await Promise.all([
        getUsersMetrics(),
        getActivityMetrics(),
        getTopContent(),
        getFunnel7d(),
        getTrends30d(),
      ]);
      return {
        users,
        activity,
        topContent,
        trends30d,
        funnel7d,
        generatedAt: new Date().toISOString(),
      };
    });
  });
}
```

- [ ] **Step 2: Create admin plugin (auth gate)**

Create `apps/api/src/routes/admin/index.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/requireAdmin';
import dashboardRoute from './dashboard';

// All /api/admin/* routes require both a valid JWT and an allowlisted
// telegramId. authenticate populates req.user; requireAdmin checks the
// allowlist. Order matters: JWT first, then allowlist check.
export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);
  app.addHook('preHandler', requireAdmin);

  await app.register(dashboardRoute);
}
```

- [ ] **Step 3: Register in app**

Edit `apps/api/src/app.ts`. Find the block of route registrations near the bottom:

```typescript
  await app.register(authRoutes);
  await app.register(libraryRoutes);
  await app.register(tmdbRoutes);
  await app.register(friendsRoutes);
  await app.register(botRoutes);

  return app;
}
```

Add `adminRoutes` import at the top alongside the others:

```typescript
import adminRoutes from './routes/admin';
```

And add the registration with the `/api/admin` prefix:

```typescript
  await app.register(authRoutes);
  await app.register(libraryRoutes);
  await app.register(tmdbRoutes);
  await app.register(friendsRoutes);
  await app.register(botRoutes);
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
```

Note: existing routes don't use prefixes (auth.ts has `/auth/*`, etc). Admin routes get prefixed because the spec specifies `/api/admin/*`. Verify by checking that hitting `GET /api/admin/dashboard` works in step 4.

- [ ] **Step 4: Build, restart, verify all three response codes**

```bash
pnpm --filter @flicksee/api build
# locally: pnpm dev; on VPS: pm2 restart api
```

```bash
# No auth → 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/admin/dashboard
# expected: 401

# With non-admin JWT (use a JWT from a user whose telegramId is NOT in ADMIN_TG_IDS) → 403
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/admin/dashboard \
  -H "Authorization: Bearer <NON_ADMIN_JWT>"
# expected: 403

# With admin JWT → 200 + JSON
curl -s http://localhost:3001/api/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_JWT>" | jq 'keys'
# expected: [ "activity", "funnel7d", "generatedAt", "topContent", "trends30d", "users" ]
```

- [ ] **Step 5: Verify cache works**

Hit the endpoint twice within 30 seconds and check that `generatedAt` is identical:

```bash
curl -s http://localhost:3001/api/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_JWT>" | jq .generatedAt
sleep 2
curl -s http://localhost:3001/api/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_JWT>" | jq .generatedAt
```

Expected: same timestamp. After 30s, hit again — timestamp updates.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/admin/ apps/api/src/app.ts
git commit -m "feat(admin): GET /api/admin/dashboard endpoint with 30s cache"
```

---

## Task 7: Frontend — `/admin` lazy route + auth gate

**Files:**
- Create: `apps/web/src/pages/admin/AdminDashboardPage.tsx` (skeleton)
- Modify: `apps/web/src/App.tsx` (add route)

**Interfaces:**
- Consumes: `useAuth()` returns `user.isAdmin: boolean` (already true from Task 1 after shared rebuild)
- Produces: route `/admin` renders `AdminDashboardPage`; non-admins are redirected to `/`

- [ ] **Step 1: Create skeleton admin page**

Create `apps/web/src/pages/admin/AdminDashboardPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { DashboardData } from '@flicksee/shared';
import { useAuth } from '../../auth/AuthContext';

const REFRESH_MS = 30_000;

const AdminDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DashboardData;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'load failed');
      }
    }
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user?.isAdmin]);

  if (authLoading) {
    return <div className="min-h-screen bg-brand-background" />;
  }
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-brand-background text-brand-secondary p-4 sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Flicksee Admin</h1>
        <p className="text-sm opacity-60">
          {data ? `Обновлено ${new Date(data.generatedAt).toLocaleTimeString('ru-RU')}` : 'Загрузка…'}
        </p>
      </header>
      {error && (
        <div className="mb-6 rounded border border-red-500 bg-red-500/10 p-4 text-red-300">
          Ошибка: {error}
        </div>
      )}
      {!data && !error && <div className="opacity-60">Загружаю метрики…</div>}
      {data && (
        <pre className="text-xs overflow-x-auto bg-black/30 p-4 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default AdminDashboardPage;
```

- [ ] **Step 2: Add lazy route in App.tsx**

Edit `apps/web/src/App.tsx`. Near the other lazy imports at the top:

```typescript
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
```

In the `<Routes>` block (after `/privacy` route, before `*`):

```tsx
<Route
  path="/admin"
  element={
    <React.Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#0a0a0b' }} />}>
      <AdminDashboardPage />
    </React.Suspense>
  }
/>
```

- [ ] **Step 3: Rebuild shared + run web dev**

```bash
pnpm --filter @flicksee/shared build
pnpm --filter web dev
```

Open `http://localhost:5173/admin`:
- As an admin user (your TG ID in `ADMIN_TG_IDS`): page renders, shows raw JSON dump of the dashboard.
- As a non-admin user: redirected to `/`.
- Not logged in: redirected to `/` (auth loading completes with `user=null`).

- [ ] **Step 4: Verify chunk separation**

```bash
pnpm --filter web build
ls -lh apps/web/dist/assets/ | head -20
```

Expected: there's a separate chunk file for `AdminDashboardPage` (filename like `AdminDashboardPage-abc123.js`). Main `index-*.js` size unchanged from before this task (within ~1 KB).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/admin/AdminDashboardPage.tsx apps/web/src/App.tsx
git commit -m "feat(admin): /admin lazy route + auth gate + raw JSON dump"
```

---

## Task 8: Frontend — Users + Activity + Funnel blocks (no charts yet)

**Files:**
- Create: `apps/web/src/pages/admin/components/MetricCard.tsx`
- Create: `apps/web/src/pages/admin/components/TopContentTable.tsx`
- Create: `apps/web/src/pages/admin/components/FunnelBlock.tsx`
- Modify: `apps/web/src/pages/admin/AdminDashboardPage.tsx` (replace JSON dump with real layout)

**Interfaces:**
- Consumes: `DashboardData` from `@flicksee/shared`
- Produces: visual rendering of Users, Activity, Top Content, Funnel blocks. Trend charts deferred to Task 9.

- [ ] **Step 1: Create MetricCard component**

Create `apps/web/src/pages/admin/components/MetricCard.tsx`:

```typescript
import React from 'react';

interface Props {
  label: string;
  value: number | string;
  hint?: string;
}

const MetricCard: React.FC<Props> = ({ label, value, hint }) => (
  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
    <div className="text-xs uppercase tracking-wide opacity-60">{label}</div>
    <div className="text-2xl font-bold mt-1 tabular-nums">
      {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
    </div>
    {hint && <div className="text-xs opacity-50 mt-1">{hint}</div>}
  </div>
);

export default MetricCard;
```

- [ ] **Step 2: Create TopContentTable component**

Create `apps/web/src/pages/admin/components/TopContentTable.tsx`:

```typescript
import React from 'react';
import type { TopContentRow } from '@flicksee/shared';

interface Props {
  title: string;
  rows: TopContentRow[];
  countLabel: string; // "лайков", "дислайков", "рекоменд."
}

const TopContentTable: React.FC<Props> = ({ title, rows, countLabel }) => (
  <div className="rounded-lg bg-white/5 border border-white/10 p-4">
    <h3 className="text-sm uppercase tracking-wide opacity-60 mb-3">{title}</h3>
    {rows.length === 0 ? (
      <div className="text-sm opacity-50">Нет данных</div>
    ) : (
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={`${r.contentType}-${r.tmdbId}`} className="flex items-center gap-3 text-sm">
            <span className="opacity-40 w-5 text-right">{i + 1}.</span>
            <span className="flex-1 truncate">
              {r.title}
              <span className="opacity-40 ml-2 text-xs">[{r.contentType}]</span>
            </span>
            <span className="tabular-nums font-mono">
              {r.count} {countLabel}
              {r.likeRatio !== undefined && (
                <span className="opacity-50 ml-2">({Math.round(r.likeRatio * 100)}%)</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

export default TopContentTable;
```

- [ ] **Step 3: Create FunnelBlock component**

Create `apps/web/src/pages/admin/components/FunnelBlock.tsx`:

```typescript
import React from 'react';
import type { FunnelBlock as FunnelData } from '@flicksee/shared';

interface Props {
  data: FunnelData;
}

const FunnelBlock: React.FC<Props> = ({ data }) => {
  const steps = [
    { label: 'Регистраций в когорте (7 дн)', value: data.cohortSize, base: data.cohortSize },
    { label: '→ Нажал /start в боте', value: data.botStarted, base: data.cohortSize },
    { label: '→ Открыл веб (≥1 свайп)', value: data.openedWeb, base: data.botStarted },
    { label: '→ Сделал 5+ свайпов', value: data.fivePlusSwipes, base: data.openedWeb },
    { label: '→ Получил матч', value: data.gotMatch, base: data.fivePlusSwipes },
  ];

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm uppercase tracking-wide opacity-60 mb-3">Воронка (когорта 7 дней)</h3>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const pct = s.base > 0 && i > 0 ? Math.round((s.value / s.base) * 100) : null;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex-1 text-sm">{s.label}</div>
              <div className="tabular-nums font-mono">{s.value}</div>
              {pct !== null && (
                <div className="text-xs opacity-50 w-12 text-right">{pct}%</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FunnelBlock;
```

- [ ] **Step 4: Replace JSON dump in AdminDashboardPage**

Edit `apps/web/src/pages/admin/AdminDashboardPage.tsx`. Replace the `<pre>` block (`{data && (<pre>...JSON.stringify...)`) with:

```tsx
{data && (
  <>
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3 opacity-80">Юзеры</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Всего" value={data.users.total} />
        <MetricCard label="DAU" value={data.users.dau} hint="за 24 часа" />
        <MetricCard label="WAU" value={data.users.wau} hint="за 7 дней" />
        <MetricCard label="MAU" value={data.users.mau} hint="за 30 дней" />
        <MetricCard label="Новых 24h" value={data.users.new24h} />
        <MetricCard label="Новых 7d" value={data.users.new7d} />
        <MetricCard label="Новых 30d" value={data.users.new30d} />
        <MetricCard label="/start в боте" value={data.users.botStarted} />
      </div>
    </section>

    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3 opacity-80">Активность</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <MetricCard label="Свайпов 24h" value={data.activity.swipes.d24} />
        <MetricCard label="Свайпов 7d" value={data.activity.swipes.d7} />
        <MetricCard label="Свайпов 30d" value={data.activity.swipes.d30} />
        <MetricCard label="Друзья 7d" value={data.activity.friendships7d} />
        <MetricCard label="Матчей 24h" value={data.activity.matches.d24} />
        <MetricCard label="Матчей 7d" value={data.activity.matches.d7} />
        <MetricCard label="Матчей 30d" value={data.activity.matches.d30} />
      </div>
      <div className="rounded-lg bg-white/5 border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide opacity-60 mb-2">
          Свайпы по типу (7 дней)
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>👍 LIKE: <b>{data.activity.swipesByAction7d.LIKE}</b></span>
          <span>👎 DISLIKE: <b>{data.activity.swipesByAction7d.DISLIKE}</b></span>
          <span>✓ SEEN: <b>{data.activity.swipesByAction7d.SEEN}</b></span>
          <span>⭐ RECOMMEND: <b>{data.activity.swipesByAction7d.RECOMMEND}</b></span>
        </div>
      </div>
    </section>

    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3 opacity-80">Топ контента</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TopContentTable title="Топ лайков (7d)" rows={data.topContent.likes7d} countLabel="❤" />
        <TopContentTable title="Топ дислайков (7d)" rows={data.topContent.dislikes7d} countLabel="👎" />
        <TopContentTable title="Топ рекомендаций (30d)" rows={data.topContent.recommend30d} countLabel="⭐" />
      </div>
    </section>

    <section className="mb-8">
      <FunnelBlock data={data.funnel7d} />
    </section>
  </>
)}
```

Add imports at the top of the file:

```typescript
import MetricCard from './components/MetricCard';
import TopContentTable from './components/TopContentTable';
import FunnelBlock from './components/FunnelBlock';
```

- [ ] **Step 5: Visual verify**

```bash
pnpm --filter web dev
```

Open `/admin` as admin. Expected:
- 4 sections in vertical stack: Юзеры, Активность, Топ контента, Воронка.
- All MetricCards show numbers (zero is fine for new project).
- Top tables show 0-10 rows each.
- Funnel shows 5 rows with % drop-offs on rows 2-5.
- Responsive: on mobile, 4-col grid collapses to 2-col, top tables stack.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/admin/
git commit -m "feat(admin): metric cards, top content tables, funnel block"
```

---

## Task 9: Frontend — Recharts trend charts (4 graphs in 2×2 grid)

**Files:**
- Modify: `apps/web/package.json` (add `recharts` dependency)
- Create: `apps/web/src/pages/admin/components/TrendChart.tsx`
- Create: `apps/web/src/pages/admin/components/DonutChart.tsx`
- Modify: `apps/web/src/pages/admin/AdminDashboardPage.tsx` (insert Trends section before Funnel)

**Interfaces:**
- Consumes: `TrendPoint[]` from shared
- Produces: visual line/bar/donut charts. Must remain in admin chunk only.

- [ ] **Step 1: Install recharts**

```bash
pnpm --filter web add recharts
```

Verify in `apps/web/package.json` it appears under `dependencies`.

- [ ] **Step 2: Create TrendChart wrapper**

Create `apps/web/src/pages/admin/components/TrendChart.tsx`:

```typescript
import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { TrendPoint } from '@flicksee/shared';

interface Props {
  title: string;
  data: TrendPoint[];
  kind: 'line' | 'bar';
  color: string;
}

const TrendChart: React.FC<Props> = ({ title, data, kind, color }) => {
  // Show only "DD.MM" on x-axis to fit 30 ticks on mobile.
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(8) + '.' + d.date.slice(5, 7),
  }));

  const ChartType = kind === 'line' ? LineChart : BarChart;

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm uppercase tracking-wide opacity-60 mb-3">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ChartType data={formatted} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#ffffff60', fontSize: 10 }}
              interval={4}
              stroke="#ffffff20"
            />
            <YAxis tick={{ fill: '#ffffff60', fontSize: 10 }} stroke="#ffffff20" allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1c', border: '1px solid #ffffff20', fontSize: 12 }}
              labelStyle={{ color: '#ffffff80' }}
            />
            {kind === 'line' ? (
              <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} />
            ) : (
              <Bar dataKey="count" fill={color} />
            )}
          </ChartType>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;
```

- [ ] **Step 3: Create DonutChart wrapper**

Create `apps/web/src/pages/admin/components/DonutChart.tsx`:

```typescript
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface Slice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  title: string;
  data: Slice[];
}

const DonutChart: React.FC<Props> = ({ title, data }) => {
  const total = data.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-4">
      <h3 className="text-sm uppercase tracking-wide opacity-60 mb-3">{title}</h3>
      <div className="h-48">
        {total === 0 ? (
          <div className="flex items-center justify-center h-full text-sm opacity-50">
            Нет данных
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
              >
                {data.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1a1c', border: '1px solid #ffffff20', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default DonutChart;
```

- [ ] **Step 4: Add Trends section to AdminDashboardPage**

Edit `apps/web/src/pages/admin/AdminDashboardPage.tsx`. Add imports:

```typescript
import TrendChart from './components/TrendChart';
import DonutChart from './components/DonutChart';
```

Insert a new section **before** the existing `<FunnelBlock>` section:

```tsx
<section className="mb-8">
  <h2 className="text-lg font-semibold mb-3 opacity-80">Тренды (30 дней)</h2>
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
    <TrendChart title="Новые юзеры" data={data.trends30d.newUsers} kind="bar" color="#E50914" />
    <TrendChart title="Свайпы" data={data.trends30d.swipes} kind="line" color="#ff6a3d" />
    <TrendChart title="Матчи" data={data.trends30d.matches} kind="line" color="#ffcd3d" />
    <DonutChart
      title="Свайпы по типу (7d)"
      data={[
        { name: 'LIKE', value: data.activity.swipesByAction7d.LIKE, color: '#E50914' },
        { name: 'DISLIKE', value: data.activity.swipesByAction7d.DISLIKE, color: '#888888' },
        { name: 'SEEN', value: data.activity.swipesByAction7d.SEEN, color: '#ffcd3d' },
        { name: 'RECOMMEND', value: data.activity.swipesByAction7d.RECOMMEND, color: '#ff6a3d' },
      ]}
    />
  </div>
</section>
```

- [ ] **Step 5: Visual verify + bundle check**

```bash
pnpm --filter web dev
```

Open `/admin`. Expected:
- 4 charts in 2×2 grid on desktop, 1 column on mobile.
- Tooltips appear on hover/tap.
- Donut shows 4 colored segments with legend.
- Empty data (zero swipes) → "Нет данных" message in donut.

Bundle check:

```bash
pnpm --filter web build
ls -lh apps/web/dist/assets/ | grep -E "(index|Admin)" | head
```

Expected: main `index-*.js` size unchanged from before this task (recharts NOT in it). Admin chunk grew significantly (now includes recharts, ~150-200KB pre-gzip).

If recharts ends up in main chunk: check that App.tsx still uses `React.lazy(() => import('./pages/admin/AdminDashboardPage'))` and no other file imports from `pages/admin/*`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/src/pages/admin/
git commit -m "feat(admin): recharts trend charts + donut for action breakdown"
```

---

## Task 10: Frontend polish — loading skeleton, error retry, stale indicator

**Files:**
- Modify: `apps/web/src/pages/admin/AdminDashboardPage.tsx`

**Interfaces:**
- No new exports. Improves UX of existing page.

- [ ] **Step 1: Add loading skeleton, retry button, stale indicator**

Edit `apps/web/src/pages/admin/AdminDashboardPage.tsx`. Replace the entire return (the `return (<div ...>...</div>)` JSX block) with:

```tsx
const ageSeconds = data ? Math.floor((Date.now() - new Date(data.generatedAt).getTime()) / 1000) : 0;
const isStale = data ? ageSeconds > 60 : false;

return (
  <div className="min-h-screen bg-brand-background text-brand-secondary p-4 sm:p-8">
    <header className="mb-6 flex items-baseline gap-3 flex-wrap">
      <h1 className="text-2xl font-bold">Flicksee Admin</h1>
      <p className="text-sm opacity-60">
        {data
          ? `Обновлено ${new Date(data.generatedAt).toLocaleTimeString('ru-RU')}`
          : 'Загрузка…'}
      </p>
      {isStale && (
        <span className="text-xs text-yellow-400 opacity-80">⚠ данные устарели</span>
      )}
    </header>

    {error && (
      <div className="mb-6 rounded border border-red-500 bg-red-500/10 p-4 text-red-300 flex items-center justify-between">
        <span>Ошибка: {error}</span>
        <button
          onClick={() => {
            setError(null);
            // Force re-fetch by toggling a dummy state — or call load() directly.
            // We re-use the effect by changing a counter.
            setRetryCounter((c) => c + 1);
          }}
          className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-sm"
        >
          Повторить
        </button>
      </div>
    )}

    {!data && !error && (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-white/5 border border-white/10" />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-white/5 border border-white/10" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 rounded-lg bg-white/5 border border-white/10" />
          ))}
        </div>
      </div>
    )}

    {data && (
      <>
        {/* sections from Task 8 + 9 unchanged */}
        {/* (keep all <section> blocks here as they are) */}
      </>
    )}
  </div>
);
```

Add a state hook for the retry counter (near the existing `useState` calls):

```typescript
const [retryCounter, setRetryCounter] = useState(0);
```

Add `retryCounter` to the `useEffect` dependency array (so clicking Retry re-runs the load):

```typescript
}, [user?.isAdmin, retryCounter]);
```

(Keep `user?.isAdmin` as the first dep.)

- [ ] **Step 2: Visual verify all states**

```bash
pnpm --filter web dev
```

- **Loading**: hard reload `/admin`, expect grey skeleton blocks animating before data loads.
- **Error**: stop the API server (`pm2 stop api` or Ctrl-C dev) and hard reload — expect red error banner with "Повторить" button. Restart API, click button → data loads.
- **Stale**: wait ~70 seconds without backgrounding the tab — yellow "⚠ данные устарели" indicator appears next to timestamp. After the 30s poll fires, indicator disappears.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/admin/AdminDashboardPage.tsx
git commit -m "feat(admin): loading skeleton, error retry, stale indicator"
```

---

## Task 11: Deploy

**Files:** none (deploy-only task).

- [ ] **Step 1: Set `ADMIN_TG_IDS` on VPS**

SSH into VPS, edit `.env`:

```bash
ssh flicksee-vps
cd /opt/flicksee/apps/api
# Add or update line:
# ADMIN_TG_IDS=<your_telegram_id>
nano .env
```

- [ ] **Step 2: Push, rebuild, restart**

From local:

```bash
git push origin main
```

On VPS:

```bash
cd /opt/flicksee
git pull
pnpm install --frozen-lockfile
pnpm --filter @flicksee/shared build
pnpm --filter @flicksee/api build
pnpm --filter web build
pm2 restart api
sudo systemctl reload nginx
```

- [ ] **Step 3: Smoke test in production**

Open `https://flicksee.ru/admin` from a browser logged in with your admin Telegram account.

Expected:
- Page renders all 5 sections.
- Numbers reflect real production data (will be small if this is fresh, but non-zero for users/swipes).
- No console errors.
- Polling visible: open DevTools Network tab, wait 30s, see another `GET /api/admin/dashboard` request.

Verify access control:
- Open in incognito (not logged in) → redirects to `/`.
- Log in as a different (non-admin) account → redirects to `/`.

- [ ] **Step 4: Verify chunk separation in production build**

On VPS:

```bash
ls -lh /opt/flicksee/apps/web/dist/assets/ | grep -E "(index|Admin)"
```

Expected:
- Main `index-*.js` gzipped ~97KB (unchanged from before this feature).
- A separate `AdminDashboardPage-*.js` chunk exists, ~150-250KB pre-gzip (includes Recharts).

If main chunk grew >5KB, recharts leaked — investigate which file imports from `pages/admin/*` outside of the lazy import.

- [ ] **Step 5: No commit needed; deploy task is complete.**

---

## Out of scope (deliberately, for reference)

These are listed in the spec as non-goals — do NOT implement in this plan:

- Charts beyond the 4 in Task 9 (no funnel chart, no per-user timeline).
- Arbitrary date-range pickers.
- CSV export.
- WebSocket / SSE realtime updates.
- Roles / granular permissions / audit log.
- Admin UI for changing data (users, broadcasts, content) — those are Phases 8.2-8.4.
