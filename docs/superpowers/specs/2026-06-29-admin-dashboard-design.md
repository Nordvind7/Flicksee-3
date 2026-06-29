# Admin Dashboard — MVP

**Status:** Approved
**Date:** 2026-06-29
**Owner:** Артём
**Phase:** 8.1 (первый экран админки)

## Цель

Дать владельцу проекта одностраничный экран с ключевыми метриками Flicksee, чтобы каждый день за 5 секунд понимать: растёт ли проект, сколько активных юзеров, что свайпают, где воронка теряет.

Это первый экран будущей админки. Следующие фазы: Broadcast → Users → Insights (см. ROADMAP Phase 8.2-8.4).

## Не-цели (явно вне MVP)

- ❌ Произвольные date-range фильтры. Жёстко фиксированные окна: 24h, 7d, 30d.
- ❌ Экспорт CSV/Excel.
- ❌ Realtime обновление (WebSocket/SSE). Polling раз в 30 сек на фокусе вкладки.
- ❌ Роли и granular permissions. Простой allowlist по Telegram ID.
- ❌ Аудит-лог действий админа (для Dashboard read-only это не нужно).

## Auth-модель

- Env var `ADMIN_TG_IDS` — comma-separated список Telegram ID админов. Пример: `ADMIN_TG_IDS=123456789,987654321`.
- Backend middleware `requireAdmin`:
  - Проверяет, что юзер залогинен (использует существующий auth).
  - Проверяет, что `user.telegramId.toString() ∈ ADMIN_TG_IDS`.
  - Иначе 403.
- Frontend:
  - `useAuth()` уже возвращает `user`. Добавляем поле `isAdmin: boolean` (вычисляется backend'ом в `/auth/me` ответе на основе того же env var).
  - Роут `/admin` проверяет `isAdmin`, если нет — `<Navigate to="/" />`.
  - Ссылку на админку **не показываем нигде в UI** — только прямой URL. Снижает риск случайного раскрытия.

## Метрики (что показываем на Dashboard)

### Блок 1: Юзеры
- **Всего юзеров** (count User)
- **DAU** — уникальные `lastSeenAt > now() - 24h`
- **WAU** — `lastSeenAt > now() - 7d`
- **MAU** — `lastSeenAt > now() - 30d`
- **Новые за 24h / 7d / 30d** (created_at)
- **isBotStarted=true** — сколько из всех нажали /start в боте (важно для broadcast в будущем)

### Блок 2: Активность
- **Свайпы за 24h / 7d / 30d** (Swipe.createdAt)
- Раскладка по action: LIKE / DISLIKE / SEEN / RECOMMEND (за 7d, числами в одной строке)
- **Матчи за 24h / 7d / 30d** (Match.createdAt)
- **Friendship создано за 7d**

### Блок 3: Контент (top-10)
- **Top-10 LIKE за 7d** — название (из Content cache), tmdbId, число лайков, %{лайки/(лайки+дислайки)}
- **Top-10 DISLIKE за 7d** — то же самое
- **Top-10 RECOMMEND за 30d** — самые рекомендуемые друзьям

### Блок 4: Графики (тренды за 30 дней)
- **Новые юзеры по дням** — bar chart, 30 столбцов (по дням), `User.createdAt`
- **Свайпы по дням** — line chart, 30 точек, `Swipe.createdAt`
- **Матчи по дням** — line chart, 30 точек, `Match.createdAt`
- **Распределение действий за 7d** — donut chart: LIKE / DISLIKE / SEEN / RECOMMEND с процентами

Все 4 графика — в гриде 2×2 на десктопе, в одну колонку на мобиле.

### Блок 5: Воронка (за 7d)
Когорта: юзеры, созданные за окно.
- Зашли в бот (created_at)
- → нажали /start (isBotStarted)
- → открыли веб (есть хоть один Swipe)
- → сделали 5+ свайпов
- → получили хоть один Match

Каждый шаг — абсолютное число + % от предыдущего шага.

## API

Один endpoint: `GET /api/admin/dashboard`

Возвращает JSON со всеми блоками одним ответом. Кеширование на бэке: in-memory cache на 30 сек (через `node-cache` или Map с TTL — все запросы за 30 сек к одному и тому же endpoint возвращают одинаковый ответ, экономим Postgres).

Response shape:
```ts
{
  users: { total, dau, wau, mau, new24h, new7d, new30d, botStarted },
  activity: {
    swipes: { d24, d7, d30 },
    swipesByAction7d: { LIKE, DISLIKE, SEEN, RECOMMEND },
    matches: { d24, d7, d30 },
    friendships7d: number,
  },
  topContent: {
    likes7d: Array<{ tmdbId, contentType, title, posterPath, likeCount, likeRatio }>,
    dislikes7d: Array<{ tmdbId, contentType, title, posterPath, dislikeCount }>,
    recommend30d: Array<{ tmdbId, contentType, title, posterPath, recommendCount }>,
  },
  funnel7d: {
    cohortSize: number,
    botStarted: number,
    openedWeb: number,
    fivePlusSwipes: number,
    gotMatch: number,
  },
  trends30d: {
    newUsers: Array<{ date: 'YYYY-MM-DD', count: number }>, // 30 элементов
    swipes:   Array<{ date: 'YYYY-MM-DD', count: number }>,
    matches:  Array<{ date: 'YYYY-MM-DD', count: number }>,
  },
  generatedAt: ISOString,
}
```

## Frontend

### Роутинг
`apps/web/src/App.tsx` — добавить:
```tsx
<Route
  path="/admin"
  element={
    <React.Suspense fallback={<div className="min-h-screen bg-brand-background" />}>
      <AdminDashboardPage />
    </React.Suspense>
  }
/>
```
`AdminDashboardPage` — lazy-imported. Нулевое влияние на основной bundle.

### Компонент
`apps/web/src/pages/admin/AdminDashboardPage.tsx`:
- Проверка `isAdmin` сразу при маунте, иначе `<Navigate to="/" replace />`.
- `useEffect` + `setInterval(30_000)` для refetch'а на фокусе вкладки.
- Один большой `useEffect` fetcher, без react-query (минимизируем зависимости).
- Лейаут: 5 секций вертикально, каждая — карточка с заголовком и грид-таблицей/графиком.
- Tailwind, без отдельной UI-либы.
- На мобиле — всё в одну колонку (`flex flex-col`), всё работает.

### Графики
- Библиотека: **Recharts** (`pnpm add recharts -D --filter web` или dependency). ~50KB gzipped.
- **Только внутри admin-чанка** — он lazy-loaded, на основной bundle не влияет.
- Темная тема: tooltip/grid/axis под `#0a0a0b` фон, цвета совпадают с брендом (`#E50914` для главных линий, `#ff6a3d` / `#ffcd3d` / `#ffffff` для donut).
- Responsive: используем `ResponsiveContainer` от Recharts.

### Состояния
- **Loading** — скелетоны (4 серых блока).
- **Error** — красная карточка с сообщением и кнопкой Retry.
- **Stale** — если `generatedAt > 60s` назад, мелкий индикатор «обновлено N сек назад» в углу.

## Backend

### Файлы
- `apps/api/src/routes/admin/index.ts` — Fastify plugin, регистрирует `requireAdmin` hook + sub-routes.
- `apps/api/src/routes/admin/dashboard.ts` — `GET /dashboard` handler.
- `apps/api/src/middleware/requireAdmin.ts` — preHandler hook.
- `apps/api/src/lib/adminCache.ts` — простой Map<string, {data, expiresAt}>.

### Регистрация
В `apps/api/src/server.ts` (или где регистрируются routes):
```ts
import adminRoutes from './routes/admin';
await app.register(adminRoutes, { prefix: '/api/admin' });
```

### Запросы к БД
- 4-5 `prisma.user.count({ where: { ... } })` для блока 1
- 3-4 `prisma.swipe.count` / `prisma.swipe.groupBy` для блока 2
- 3× `prisma.swipe.groupBy({ by: ['tmdbId', 'contentType'], where: { action }, _count, orderBy, take: 10 })` + join с Content
- 4-5 запросов для воронки
- 3× raw SQL для trends30d:
  ```sql
  SELECT date_trunc('day', "createdAt")::date as date, count(*)::int as count
  FROM "User" WHERE "createdAt" > now() - interval '30 days'
  GROUP BY 1 ORDER BY 1
  ```
  Аналогично для Swipe и Match. Дни без данных добиваем нулями на стороне Node, чтобы массив всегда был ровно 30 элементов.

**Все запросы параллельно через `Promise.all`**. Целевой p95 < 300ms даже без кеша. С кешем — < 5ms.

### Auth: `isAdmin` в /auth/me
В существующем `/auth/me` handler добавить вычисление `isAdmin` на основе env var. Возвращать в response. Frontend читает.

## Тестирование

- **Unit**: `requireAdmin` middleware — 3 кейса (нет user, не админ, админ).
- **Integration**: `GET /admin/dashboard` — 403 без auth, 403 не-админу, 200 + shape валидация админу.
- **Manual smoke**: после деплоя зайти на flicksee.ru/admin со своего аккаунта, проверить все числа похожи на правду (можно сверить с прямым SQL).

## Roll-out

1. Локально — миграции не нужны (только новые routes/pages).
2. Env var `ADMIN_TG_IDS=<твой_TG_ID>` добавляется в `.env` на VPS.
3. `pm2 restart api` + `pnpm build && nginx reload` (или как обычно деплоим).
4. Открываешь `flicksee.ru/admin`, проверяешь.

## Открытые вопросы (решить перед implementation plan)

Никаких. MVP скоупирован, scope-bounded, готов к плану.

## Метрика успеха

Через неделю использования: Артём заходит на /admin минимум раз в день, числа понимает с первого взгляда, ни одно поле не вызывает «что это вообще». Если вызывает — это сигнал убрать или переименовать.
