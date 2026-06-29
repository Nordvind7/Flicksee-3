# Cloudflare Worker — деплой и интеграция

Этот воркер обходит блокировку TMDB и Telegram с российского VPS. Он живёт на edge-сети Cloudflare (доступной из РФ) и пересылает запросы на:

- `api.themoviedb.org` — TMDB REST API (вызывает наш Fastify)
- `image.tmdb.org` — постеры и бэкдропы (загружают браузеры юзеров)
- `api.telegram.org` — отправка сообщений ботом (вызывает наш Fastify)

Лимит free-плана: 100 000 запросов в день. Картинки кешируются на edge'е Cloudflare, так что повторные просмотры не съедают квоту.

---

## Шаг 1. Создать аккаунт Cloudflare (если ещё нет)

1. Открой <https://dash.cloudflare.com/sign-up>
2. Зарегайся (email + пароль). Карта НЕ нужна — Workers Free вечно бесплатный.
3. Подтверди email.

## Шаг 2. Создать Worker

1. В дашборде слева → **Workers & Pages** → **Create application** → **Create Worker**.
2. Имя: `flicksee-proxy`. **Deploy**.
3. После деплоя нажми **Edit code**.
4. Удали весь дефолтный код из редактора.
5. Открой файл [`worker.js`](./worker.js) из этой папки и скопируй ВЕСЬ его контент в редактор Cloudflare.
6. Жми **Save and deploy** (правый верх).
7. Cloudflare покажет публичный URL — что-то вроде:
   ```
   https://flicksee-proxy.<твой-username>.workers.dev
   ```
   **Скопируй этот URL — он понадобится для всех следующих шагов.**

## Шаг 3. Проверить воркер вручную

В терминале на маке:

```bash
WORKER_URL="https://flicksee-proxy.<твой-username>.workers.dev"

# TMDB API (должен вернуть JSON с фильмами)
curl -s "$WORKER_URL/tmdb-api/3/movie/popular?api_key=<TMDB_API_KEY>&language=ru-RU" | head -c 200

# Картинка (должна качаться)
curl -sI "$WORKER_URL/tmdb-img/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" | head -5

# Telegram (вернёт JSON про бота)
curl -s "$WORKER_URL/tg/bot<TELEGRAM_BOT_TOKEN>/getMe"
```

Если всё три ответа выглядят живыми — воркер работает. Иначе посмотри логи в дашборде Cloudflare (Worker → Logs).

## Шаг 4. Обновить .env на VPS

SSH на сервер:

```bash
ssh root@194.67.103.19
nano /opt/flicksee/apps/api/.env
```

Добавь две строчки (или замени, если уже были):

```
TMDB_API_BASE=https://flicksee-proxy.<твой-username>.workers.dev/tmdb-api/3
TELEGRAM_API_ROOT=https://flicksee-proxy.<твой-username>.workers.dev/tg
```

Сохрани (Ctrl+O, Enter, Ctrl+X) и перезапусти API:

```bash
systemctl restart flicksee-api
journalctl -u flicksee-api -n 30 --no-pager
```

В логах НЕ должно быть `ETIMEDOUT` или `getMe failed`.

## Шаг 5. Пересобрать frontend с прокси-URL для картинок

На локальном маке, перед сборкой web, добавь в `apps/web/.env.production` (создай файл если нет):

```
VITE_TMDB_IMG_HOST=https://flicksee-proxy.<твой-username>.workers.dev/tmdb-img
```

Пересобери:

```bash
cd /Users/mac/Claude/work/Flicksee-3/apps/web
pnpm build
```

Залей результат `dist/` на сервер (тот же путь, что и в первый деплой), например:

```bash
rsync -avz --delete dist/ root@194.67.103.19:/opt/flicksee/apps/web/dist/
```

Nginx подхватит новые файлы автоматически — рестарт не нужен.

## Шаг 6. Перерегистрировать Telegram webhook через прокси

Webhook регистрируется одним curl'ом, но он тоже идёт на api.telegram.org → значит, тоже через воркер:

```bash
WORKER_URL="https://flicksee-proxy.<твой-username>.workers.dev"
TOKEN="<TELEGRAM_BOT_TOKEN>"
SECRET="<TELEGRAM_BOT_WEBHOOK_SECRET — то же значение что в .env>"

curl -X POST "$WORKER_URL/tg/bot$TOKEN/setWebhook" \
  -F "url=https://flicksee.ru/api/bot/webhook" \
  -F "secret_token=$SECRET"

# Должен ответить: {"ok":true,"result":true,"description":"Webhook was set"}

# Проверить, что Telegram запомнил:
curl "$WORKER_URL/tg/bot$TOKEN/getWebhookInfo"
```

## Шаг 7. Финальная проверка

1. Открой <https://flicksee.ru> в инкогнито.
2. Должна загрузиться splash-страница С ПОСТЕРАМИ (значит, картинки идут через воркер).
3. Свайпай — карточки трейлеров должны появляться (значит, /api/tmdb через воркер работает).
4. Напиши боту `/start` в Telegram → должен ответить (значит, webhook работает).
5. Лайкни один и тот же фильм с двух аккаунтов через `/friends` → должен прилететь push о матче (значит, бот может слать сообщения через воркер).

---

## Мониторинг квоты

Cloudflare → Workers & Pages → `flicksee-proxy` → **Analytics**. Видно requests/day. Если приближается к 100k:

- Картинки кешируются 30 дней — основной расход экономится автоматически
- Если упёрлось всё равно — Workers Paid: $5/мес даёт 10M запросов

## Откат

Если что-то сломалось — убери `TMDB_API_BASE` и `TELEGRAM_API_ROOT` из `.env`, перезапусти `flicksee-api`. Код упадёт к дефолтам (`api.themoviedb.org`, `api.telegram.org`) — но это не оживит на RU-VPS, просто вернёт исходное сломанное состояние. Реальный откат — переезд на не-RU хостинг.
