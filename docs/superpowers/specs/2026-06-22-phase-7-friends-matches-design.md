# Phase 7 — Friends & Matches: Design Spec

**Status:** Draft for implementation
**Date:** 2026-06-22
**Branch target:** `feat/monorepo-foundation` (continuation)
**Predecessors:** Phase 0–5 (см. `flicksee-project` memory)

---

## 1. Цель и scope

Превратить Flicksee из персонального свайпера в **социальный продукт**: пользователь добавляет друзей через Telegram, видит пересечение их и своего watchlist'а ("матчи") и получает push-уведомление о каждом новом совпадении.

**В scope MVP:**
- Парные дружбы через Telegram-deeplink (mutual one-click).
- Detection и хранение матчей (оба зафрендженных юзера поставили `LIKE` на один и тот же фильм/сериал).
- Просмотр watchlist'а друга с подсветкой совпадений.
- Push в Telegram-бот при каждом новом матче.
- Бейдж непросмотренных матчей в UI.

**Вне scope (отложено):**
- Комнаты, групповые матчи (3+ человек) — Phase 7.5 при подтверждённой потребности.
- Realtime/Socket.IO — Phase 7.5.
- Настройки приватности и нотификаций — Phase 8.
- Бот-команды кроме `/start` — Phase 8.
- Friend search / поиск по username — намеренно не делаем (только deeplink).

---

## 2. UX-сценарии (single source of truth)

### S1 — Приглашение друга
1. Олег: вкладка «Друзья» → «Пригласить».
2. UI: native share-sheet с текстом + ссылкой `t.me/Flicksee_bot?start=<token>`.
3. Саша тапает → открывается бот → если зарегистрирован во Flicksee — становятся друзьями + оба получают пуш «🎉 Вы теперь друзья с X. У вас N общих хочу-посмотреть». Если **не** зарегистрирован — бот «Сначала залогинься на flicksee.app и тапни ссылку снова».

### S2 — Матч при свайпе
1. Олег свайпает `Dune` вправо.
2. Сервер находит у Саши `LIKE` на тот же `tmdbId` → создаёт `Match` (идемпотентно).
3. Оба получают в бот: «🎬 Новый матч с X: Dune (2021). Открыть →».
4. Тап «Открыть» → веб-страница `/matches/:id` с постером + (заглушка) «Где смотреть».

### S3 — Просмотр профиля друга
1. Вкладка «Друзья» → имя друга (бейдж непросмотренных).
2. Грид watchlist'а друга. Матчи — золотая рамка, поднимаются вверх.

### S4 — Группа 3+ (workaround, явное ограничение MVP)
Попарная проверка через «Матчи с X» / «Матчи с Y». Сигнал к Phase 7.5, если потребность массовая.

### Edge-cases (учтены в реализации)
- Клик на свою же ссылку → бот «Нельзя дружить с собой».
- Повторное приглашение существующего друга → бот «Вы уже друзья».
- Истёкшая ссылка (>7 дней) → «Ссылка устарела».
- Юзер не залогинен во Flicksee при /start → инструкция войти.
- Матч случается до `/start` боту → пуш не идёт (помечено `notified=false`), юзер увидит в приложении при заходе.
- Первый френдинг с N≥1 ретро-матчами → **одно** агрегированное сообщение, не N штук.

---

## 3. Архитектура

**Стек:** существующий — Fastify + Prisma + Postgres + React. **Без** Socket.IO в этой фазе.

**Доставка пушей:** Telegram Bot API через [Telegraf](https://telegraf.js.org/) (или nativeотный `fetch` к Bot API, решение — на этапе writing-plans).

**Webhook vs polling для бота:** webhook (`POST /bot/webhook` с secret-token). Локально — polling-режим для dev.

---

## 4. Модель данных (Prisma)

Canonical ordering для symmetric-relations: всегда `userAId < userBId`, гарантировано unique-индексом.

```prisma
model Friendship {
  id           String   @id @default(cuid())
  userAId      BigInt
  userBId      BigInt
  createdAt    DateTime @default(now())
  inviteToken  String?

  userA User @relation("FriendshipA", fields: [userAId], references: [id], onDelete: Cascade)
  userB User @relation("FriendshipB", fields: [userBId], references: [id], onDelete: Cascade)

  @@unique([userAId, userBId])
  @@index([userAId])
  @@index([userBId])
}

enum MediaType { MOVIE TV }

model Match {
  id        String   @id @default(cuid())
  userAId   BigInt
  userBId   BigInt
  tmdbId    Int
  mediaType MediaType
  matchedAt DateTime @default(now())
  notified  Boolean  @default(false)
  seenByA   Boolean  @default(false)
  seenByB   Boolean  @default(false)

  @@unique([userAId, userBId, tmdbId, mediaType])
  @@index([userAId, matchedAt])
  @@index([userBId, matchedAt])
}

model Invite {
  token       String    @id
  creatorId   BigInt
  createdAt   DateTime  @default(now())
  expiresAt   DateTime
  consumedBy  BigInt?
  consumedAt  DateTime?

  creator User @relation("InviteCreator", fields: [creatorId], references: [id], onDelete: Cascade)

  @@index([creatorId])
  @@index([expiresAt])
}

// User: добавляется поле
model User {
  // ...existing fields
  botChatActive Boolean @default(false)
  // + back-relations к Friendship/Match/Invite
}
```

**Старая таблица `Match` (room-scoped) и `RoomSwipe` `Room` `RoomMember`:** оставить как есть в schema до Phase 7.5. Friends-Match — отдельная модель, конфликта имени нет (room-Match переименовать в `RoomMatch` миграцией; в коде не используется → потерь данных нет).

**Миграция:** `pnpm prisma migrate dev --name phase7_friends_matches`. Состав: rename `Match` → `RoomMatch`, new `Friendship`/`Match`/`Invite`, alter `User` (add `botChatActive`).

---

## 5. API (apps/api/src/routes/)

Все за `app.authenticate` кроме `/bot/webhook`.

| Метод | Путь | Назначение |
|---|---|---|
| `POST` | `/friends/invite` | Создать invite (TTL 7 дней). Возвращает `{ token, deeplink: "https://t.me/<BOT_USERNAME>?start=<token>" }`. |
| `GET` | `/friends` | Список друзей + `unseenMatchesCount` на каждого. |
| `GET` | `/friends/:id` | Профиль друга: watchlist + флаг `isMatch` на каждом фильме. |
| `GET` | `/friends/:id/matches` | Пагинируемый список матчей (cursor). |
| `DELETE` | `/friends/:id` | Расфрендить (cascade удаляет Match через onDelete). |
| `GET` | `/matches/unseen-count` | Общий бейдж (по всем друзьям). |
| `POST` | `/matches/:id/seen` | Пометить просмотренным (для userA или userB соответственно). |
| `POST` | `/bot/webhook?secret=<X>` | Telegram webhook. |

**Pagination** для `/friends/:id/matches`: `?cursor=<matchId>&limit=50` (default 50, max 100).

**Rate limits** (через `@fastify/rate-limit`, конфиг уже есть):
- `/friends/invite`: 10/час на юзера.
- `/friends` GET-эндпоинты: 60/мин (стандартный).
- `/bot/webhook`: без rate-limit, защищён secret.

**Ошибки** (используем стандартный error handler, без утечки внутренностей):
- 400 — bad request (невалидный body).
- 401 — нет JWT.
- 403 — попытка работать с чужим матчем/инвайтом.
- 404 — друг/матч/инвайт не найден.
- 409 — `Friendship` уже существует.
- 410 — инвайт истёк или consumed.

---

## 6. Telegram-бот (apps/api/src/bot/)

Минимальный handler. Файлы: `bot/index.ts` (инстанс), `bot/handlers.ts` (логика).

**Хэндлеры:**
- `/start <token>` — извлекает `token` → ищет `Invite` (не expired, не consumed) → ищет `User` по `ctx.from.id == telegramId` → если найден: ставит `botChatActive=true`, создаёт `Friendship` (canonical pair, idempotent через unique), помечает invite `consumedBy/consumedAt`, отправляет оба `Friendship`-пуша с агрегатом ретро-матчей. Если не найден — instruct «залогинься на flicksee.app».
- `/start` (без токена) — ставит `botChatActive=true`, приветствие.
- Любая другая команда / текст — generic ответ «Я отправляю уведомления о матчах. Открой flicksee.app».

**`sendMatchPush(userId, otherUserId, match)`:**
- Проверяет `user.botChatActive` — если `false`, skip + log.
- Шлёт `sendMessage` с inline-кнопкой `[Открыть]` → URL `https://flicksee.app/matches/:matchId`.
- После успешного отправления — `UPDATE Match SET notified=true`.

**Конфиг:** `BOT_WEBHOOK_SECRET` (env, генерится случайно), `WEB_PUBLIC_URL` для inline-button (default `http://localhost:3000` в dev). Telegram webhook регистрируется отдельным cli-скриптом `pnpm bot:register-webhook`.

---

## 7. Match-detection hook

В существующий `POST /swipes` (`apps/api/src/routes/library.ts`). **Важно:** detection запускается **после** ответа клиенту, чтобы не блокировать swipe UX. Реализация — `setImmediate(() => detectMatches(...))` или внутренняя очередь; ошибки логируются, не пробрасываются.

```ts
// псевдокод, финал — в writing-plans
async function detectMatches(userId: BigInt, swipe: Swipe) {
  if (swipe.type !== 'LIKE') return

  const friends = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] }
  })

  for (const f of friends) {
    const friendId = f.userAId === userId ? f.userBId : f.userAId
    const friendLiked = await prisma.swipe.findFirst({
      where: { userId: friendId, tmdbId: swipe.tmdbId, mediaType: swipe.mediaType, type: 'LIKE' }
    })
    if (!friendLiked) continue

    const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId]
    try {
      const match = await prisma.match.create({
        data: { userAId: a, userBId: b, tmdbId: swipe.tmdbId, mediaType: swipe.mediaType }
      })
      // fire-and-forget пуши, не валим хук на ошибке Telegram
      sendMatchPush(userId, friendId, match).catch(log)
      sendMatchPush(friendId, userId, match).catch(log)
    } catch (e) {
      if (isPrismaUniqueViolation(e)) continue // дубль — ОК
      log.error(e)
    }
  }
}
```

**Производительность:** для среднего юзера (<20 друзей, <1000 лайков) — O(N_friends) запросов на свайп, каждый по unique-индексу. Достаточно. Оптимизация (batch query) — Phase 7.5 если упрёмся.

**Ретро-матчи при френдинге:** В хэндлере `/start <token>` после создания `Friendship` — однократный backfill `Match`-records (SELECT intersect, INSERT batch). Пуш юзерам — **одно** агрегированное сообщение, не per-match.

---

## 8. Frontend (apps/web/src/)

**Новые файлы:**
- `components/FriendsTab.tsx` — список друзей с аватарками TG (если есть в `User`, иначе инициал), бейджи unseen, кнопка «Пригласить» (Web Share API → fallback на copy-to-clipboard).
- `components/FriendProfile.tsx` — грид watchlist'а с золотой рамкой на матчах, сортировка: матчи сверху.
- `components/MatchModal.tsx` — модалка одного матча.
- `hooks/useFriends.ts`, `hooks/useFriendProfile.ts`, `hooks/useMatchPolling.ts` (30s интервал, только когда `document.visibilityState === 'visible'`).
- `pages/MatchPage.tsx` — страница `/matches/:id`, открывается из бота.

**Изменения:**
- `Header.tsx` — добавить иконку «Друзья» с бейджем.
- `App.tsx` — роутинг для `/friends`, `/friends/:id`, `/matches/:id` (если еще нет react-router — добавить).
- `lib/api.ts` — методы `getFriends`, `getFriendProfile`, `getFriendMatches`, `createInvite`, `deleteFriend`, `markMatchSeen`, `getUnseenCount`.

**Дизайн** (Netflix-style тёмный, как сейчас): золотая рамка `#FFB800`/похожая на матчах, бейдж — красный кружок с числом.

---

## 9. Безопасность

- **Авторизация:** все `/friends/*` и `/matches/*` за `app.authenticate`. Проверка `req.user.sub` против `userA/userB` в каждом query.
- **`/bot/webhook`:** защищён secret-token в query string (`?secret=<BOT_WEBHOOK_SECRET>`, генерим crypto-random) + проверка `x-telegram-bot-api-secret-token` header (Telegram-стандарт).
- **Invite tokens:** `crypto.randomBytes(16).toString('base64url')` — 128 бит, неугадываемо.
- **Канонический pair:** проверка `userAId < userBId` на уровне БД через unique-индекс — невозможно создать дубль с обратным порядком.
- **Rate limits** на `/friends/invite` (anti-spam-генерация).
- **Bot reply на сторонний токен:** invite, не принадлежащий юзеру по `creatorId`, — генерируется на ЛЮБОГО юзера, кроме самого creator (anti-self-friend). Это feature, не баг.
- **Cascade удалений:** `Friendship` cascade удаляет связанные `Match` (через FK on `Friendship` нет — Match не FK-связан с Friendship). **Решение:** при `DELETE /friends/:id` явно `DELETE FROM Match WHERE pair = canonical(req.user.sub, friendId)`.

---

## 10. Тестирование

**Inproc verify-скрипты** (стиль уже принятый в проекте — `pnpm verify:auth`, `pnpm verify:library`):

`pnpm verify:friends`:
1. Создание Invite → deeplink format.
2. `/start <token>` другим юзером → создаётся Friendship (canonical order), invite consumed.
3. Повторный `/start <token>` → idempotent error 410.
4. `/start <expired_token>` → 410.
5. Self-friend (creator кликает свой токен) → reject.
6. Already-friends → idempotent.
7. Match detection: оба LIKE → создаётся 1 Match, не дубль.
8. `DELETE /friends/:id` → удаляет Friendship и связанные Match-записи (explicit DELETE в одной транзакции).
9. Unauth → 401.

`pnpm verify:bot` (mock Telegram API):
1. `/start <token>` хэндлер → корректный flow.
2. `sendMatchPush` с `botChatActive=false` → skip + не падает.

**Manual** перед merge: e2e через реальный @Flicksee_bot в dev-режиме (polling), два TG-аккаунта, два браузера. Чек-лист в Phase 7 implementation plan.

**Security review workflow:** прогнать adversarial review (3 линзы) перед merge — как делали в Phase 3/4.

---

## 11. Миграция и обратная совместимость

- Schema-миграция: один step `phase7_friends_matches` (rename Room-Match → RoomMatch, new Friendship/Match/Invite, alter User).
- Существующая Phase 4 `Swipe`-таблица **не изменяется**.
- Существующие свайпы автоматически становятся базой для ретро-матчей при первом френдинге — это feature.

---

## 12. Зависимости и среда

**Новые env-переменные** (apps/api/.env):
- `BOT_TOKEN` (уже есть из Phase 3 — переиспользуем @Flicksee_bot). **TODO до прод-релиза:** ротировать через BotFather (старый светился в git-истории/чате).
- `BOT_WEBHOOK_SECRET` — random.
- `WEB_PUBLIC_URL` — для inline-button-URL в пушах (`http://localhost:3000` dev, прод-URL потом).
- `BOT_MODE` — `webhook` | `polling`, default `polling` в dev.
- `BOT_USERNAME` — для генерации deeplink (`Flicksee_bot`).

**Новые npm-пакеты:** `telegraf` (или решить во время plan-этапа: native `fetch` к Bot API возможно достаточно).

**BotFather actions** (юзер делает руками):
- `/setdomain` — для Login Widget (уже сделано в Phase 3, не повторяем).
- Для webhook в проде: задать webhook URL через бот-helper.

---

## 13. Risks & open questions

| Risk | Mitigation |
|---|---|
| Telegram не доставит push (юзер не сделал /start) | Помечаем `notified=false`, юзер увидит в приложении. |
| Backfill ретро-матчей при френдинге с тысячами лайков медленный | Batch INSERT, измерить на dev — если >1с, выносим в bg job. |
| Webhook unreachable локально без туннеля | dev = polling mode, webhook включается только в прод-конфиге. |
| Match-detection в swipe-хуке замедляет UX | Async fire-and-forget после `res.send` (200 возвращаем сразу, hook в `setImmediate`). Если упало — лог, юзер всё равно видит в приложении. |
| Реальные UX-проблемы группового сценария (3+) | Намеренно отложено в Phase 7.5; чек-лист «появилось ли massive-проблем» после релиза. |

---

## 14. Definition of Done

- Все verify-скрипты зелёные локально и в CI (если CI к моменту merge есть; иначе локально).
- Manual e2e чек-лист пройден (два аккаунта, два браузера, реальный бот в dev).
- Security review workflow прогнан, все HIGH/MEDIUM находки зафикшены.
- Документация: README обновлён (новые env, как запустить бот в dev), `docs/superpowers/specs/2026-06-22-phase-7-friends-matches-design.md` (этот файл) закоммичен.
- Memory `flicksee-project` обновлена post-merge.
