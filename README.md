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

> Локальная БД для разработки — [Postgres.app](https://postgresapp.com/).
