<div align="center">
<img width="1200" height="475" alt="Flicksee" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Flicksee

«Tinder для трейлеров»: свайпай трейлеры фильмов и сериалов, собирай watchlist,
устраивай совместные сеансы с друзьями и находи фильм, который зайдёт всем.

## Монорепозиторий

```
apps/
  web/        — React 19 + TS + Vite, PWA (клиент), вход через Telegram
  api/        — Node + Fastify + TS, REST + Socket.IO, прокси TMDB, auth
packages/
  shared/     — общие типы и контракты между web и api
```

Пакетный менеджер — **pnpm** (workspaces). Требуется **Node ≥ 20**.

## Быстрый старт

```bash
pnpm install

# API: скопировать env и заполнить
cp apps/api/.env.example apps/api/.env

# Запустить всё (web :3000 + api :3001)
pnpm dev

# Или по отдельности
pnpm dev:web
pnpm dev:api
```

Веб-клиент проксирует `/api/*` на API (`VITE_API_URL`, по умолчанию
`http://localhost:3001`), поэтому ключ TMDB живёт только на сервере.

## Команды

| Команда | Действие |
| --- | --- |
| `pnpm dev` | web + api в режиме разработки |
| `pnpm build` | сборка всех пакетов |
| `pnpm typecheck` | проверка типов по всему воркспейсу |
| `pnpm lint` | линт по всему воркспейсу |

## Стек

- **Клиент:** React 19, TypeScript, Vite, Tailwind CSS, PWA.
- **Сервер:** Node, Fastify, Socket.IO, Prisma + PostgreSQL (добавляются в Phase 2).
- **Данные:** TMDB API (через прокси), YouTube IFrame API (трейлеры).
- **Авторизация:** Telegram Login Widget → собственный JWT.
- **Аналитика:** Яндекс.Метрика.

## База данных

PostgreSQL + Prisma. Схема — [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma).
Локальная БД для разработки — [Postgres.app](https://postgresapp.com/).

**Локальный сервер.** PostgreSQL 16 (Postgres.app) установлен и инициализирован; БД
`flicksee` создана и миграции применены. GUI Postgres.app требует macOS 14, поэтому
на Monterey сервером управляем из терминала:

```bash
cd apps/api
pnpm pg:start     # запустить локальный Postgres (:5432)
pnpm pg:stop      # остановить
pnpm pg:status    # статус
```

**Миграции:**

```bash
cd apps/api
pnpm db:deploy            # применить миграции (на чистой БД)
pnpm db:migrate --name x  # создать новую миграцию после правок схемы
pnpm db:studio            # GUI-просмотр данных
```

### Модель данных

| Таблица | Назначение |
| --- | --- |
| `User` | Telegram-пользователь (telegramId, профиль, флаг старта бота) |
| `RefreshToken` | refresh-токены своего JWT (хранится только хэш) |
| `Content` | кэш TMDB (трейлер, постеры, RU-провайдеры) по `(tmdbId, type)` |
| `Swipe` | личные свайпы LIKE/DISLIKE/SEEN — одна запись на `(user, title)` |
| `Room` · `RoomMember` · `RoomSwipe` · `RoomMatch` | совместные сеансы (Phase 7.5+, пока неактивны) |
| `Friendship` · `Match` · `Invite` | Phase 7 — друзья, матчи, deeplink-инвайты |

### Phase 7 — Friends & Matches

Добавить друга → tap «Пригласить» → откроется share-sheet с
`t.me/Flicksee_bot?start=<token>` → друг кликает → бот линкует аккаунты,
сразу подсчитывает ретро-матчи (фильмы, которые оба лайкнули раньше).
Каждый новый матч → push в бот с кнопкой «Открыть» на `/matches/:id`.

**Новые env-переменные (apps/api/.env):**

```bash
BOT_MODE=polling                          # polling в dev, webhook в проде
WEB_PUBLIC_URL=http://localhost:3000      # для inline-кнопок в пушах
# TELEGRAM_BOT_WEBHOOK_SECRET=<crypto-random>  # обязательно при BOT_MODE=webhook
```

**Запуск:** `pnpm dev` стартует API + поллинг бота автоматически.

**Verify:** `cd apps/api && pnpm verify:friends` — 16 inproc-проверок.
