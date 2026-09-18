# Тестирование

Четыре уровня, как того требует ТЗ §49: unit, integration, API, E2E.

| Уровень | Инструмент | Расположение | Что проверяет |
| --- | --- | --- | --- |
| Unit | Vitest | `tests/unit/**` | domain-правила, валидация, расчёт цены, авторизация, правила корзины, ownership, переходы статусов заказа |
| Integration | Vitest (реальный PostgreSQL) | `tests/integration/**` | Prisma-репозитории, auth, заказы, payment-абстракция, авторизация файлов |
| API | Vitest + запросы к запущенному Next.js | `tests/integration/api/**` (или отдельная папка `tests/api/**`, см. конкретные тесты) | коды статусов, валидация, авторизация, контракт ответа, обработка ошибок |
| E2E | Playwright | `tests/e2e/**` | полные пользовательские сценарии в браузере |

## Принцип разделения unit/integration

**Unit-тесты никогда не касаются реальной БД/сети.** Если тестируемая
функция требует `@shared/config` (а значит — валидных env-переменных) или
Prisma — тест не unit, а integration. Это разделение обеспечивается местом
файла (`tests/unit/` vs `tests/integration/`) и вручную соблюдается при
написании: не импортируйте `@infrastructure/database`/`@shared/config` в
`tests/unit/**`.

## Тестовая база данных

**Тесты никогда не запускаются на production БД** (ТЗ §50). Локально
интеграционные тесты используют ту же dev-БД, что и `npm run dev`
(поднимается через `docker compose up postgres`), если явно не указано
другое `DATABASE_URL`. Для изоляции создайте отдельную БД:

```bash
docker compose exec postgres createdb -U modelkin modelkin_test
DATABASE_URL="postgresql://modelkin:modelkin@localhost:5432/modelkin_test?schema=public" \
  npx prisma migrate deploy
DATABASE_URL="postgresql://modelkin:modelkin@localhost:5432/modelkin_test?schema=public" \
  npm run test:integration
```

В CI (`.github/workflows/ci.yml`) тестовая БД — отдельный, эфемерный
Postgres-сервис (`postgres:16-alpine` service container), поднимаемый и
уничтожаемый для каждого прогона — без ручной настройки.

## Запуск локально

```bash
npm run test              # unit + integration
npm run test:unit
npm run test:integration
npm run test:watch         # watch-режим (vitest)
npm run test:e2e            # Playwright — требует собранного/запущенного приложения
```

`tests/setup.ts` подгружает `.env` перед прогоном (через
`process.loadEnvFile`), так что integration-тесты видят те же переменные,
что и `npm run dev`.

## E2E

Конфигурация — `playwright.config.ts`. Локально `npm run test:e2e`
автоматически поднимает `npm run start` (нужен предварительный `npm run
build`); в CI приложение уже собрано и БД засеяна отдельными шагами до
запуска тестов (см. workflow).

Спецификации — `tests/e2e/*.spec.ts`, каждая соответствует одному
happy-path сценарию из ТЗ §49; запускать по отдельности —
`npm run test:e2e -- purchase-flow` (Playwright матчит по имени файла).
Тестовые вложения (маленькое PNG + минимальный валидный ASCII STL, тот же
текст, что в `prisma/seed.ts`) лежат в `tests/e2e/fixtures/`. Каждый тест сам
создаёт нужные ему данные (уникальный email через `Date.now()` и т.п.) — не
полагайтесь на конкретную позицию в каталоге/списке, ищите по slug/тексту.

- **`purchase-flow.spec.ts`** — регистрация → каталог → карточка модели →
  корзина → оформление заказа → mock-оплата → ownership (`/profile/purchases`)
  → скачивание (проверяется редирект/download на `localhost:9000`, т.е. в
  MinIO). Использует стабильный seed-slug `kronshteyn-dlya-naushnikov`, а не
  «N-ю карточку в каталоге».
- **`admin-flow.spec.ts`** — логин под ADMIN → `/admin/models/new` → загрузка
  превью + STL → публикация → модель появляется в `/models`.
- **`custom-order-flow.spec.ts`** — гость заполняет форму `/custom-order`,
  прикрепляет файл, отправляет, видит номер заявки; второй тест в этом же
  файле проверяет, что заявка видна админу в `/admin/custom-orders`.

`admin-flow.spec.ts` и вторая часть `custom-order-flow.spec.ts` сами
проверяют (`request.get(...)`, статус `404`), существует ли ещё нужный
`/admin/**` маршрут, и вызывают `test.skip(...)` с понятным сообщением, если
нет — так что эти спеки безопасно гонять и до, и после того, как
соответствующий кусок админки смёржен, без ручного комментирования тестов.

Ранее в разработке nonce-less CSP (`script-src 'self'`) ломал клиентскую
гидратацию Next.js в production-сборке (браузер блокировал инлайн-скрипты
гидратации как CSP-нарушение) — из-за этого сценарии, завязанные на
интерактивность (клики, отправка форм), не проходили бы против
production-сборки. Исправлено в `src/middleware.ts` (nonce-паттерн CSP, см.
[SECURITY.md](./SECURITY.md#xss)) и подтверждено вручную на реальной
`next build`/`next start` — все инлайн-скрипты получают корректный `nonce`.

**Ограничение среды разработки (не баг проекта):** в некоторых
sandbox-окружениях `npx playwright install` не может скачать Chromium
(`cdn.playwright.dev` недоступен) — тогда `npm run test:e2e` локально не
запустится. Это ограничение сети конкретной машины/контейнера, а не
CI — в GitHub Actions (`.github/workflows/ci.yml`) шаг `npx playwright
install --with-deps chromium` выполняется в обычной среде с доступом в
интернет и E2E-джоб гоняется полностью. Если увидите ошибку загрузки
браузера локально — установите Chromium вручную или запускайте E2E через
CI/Docker-окружение с доступом к cdn.playwright.dev.

## Что проверяют unit-тесты (обязательный минимум, ТЗ §49)

- бизнес-правила domain-слоя каждого модуля
- Zod-валидация входных данных
- расчёт цены заказа (сервер, не клиент — см. `orders`/`cart`)
- правила авторизации (`requireUser`/`requireAdmin`)
- правила корзины (одна модель = одна позиция, нельзя добавить уже купленную)
- идемпотентность создания ownership
- переходы статусов заказа (`PENDING_PAYMENT → PAID/CANCELLED/REFUNDED`)

## Что проверяют integration/API-тесты сверх unit

- `tests/integration/modules/downloads/get-signed-download-url.test.ts` —
  скачивание-авторизация (ТЗ §21) сквозь реальную БД: чужому пользователю
  отказано (`AuthorizationError` + audit `file.download_denied`), владельцу
  выдан signed URL + audit `file.download`, модель без файла → `NotFoundError`.
- `tests/integration/api/payments-webhook.test.ts` — `POST
  /api/payments/webhook` через реальный Route Handler: неверная подпись
  (`400`), неизвестный `providerPaymentId` (`404`), корректный webhook
  переводит `Order` в `PAID` и создаёт `UserModelOwnership`, повторный
  (replay) webhook — идемпотентен (не дублирует ownership).
- `tests/integration/api/payments-mock-complete.test.ts` — `POST
  /api/payments/mock/complete`: без сессии (`401`), некорректный `status`
  (`400`), несуществующий платёж (`404`), платёж другого пользователя
  (`403`), успешное подтверждение своим владельцем (`200`, `Order` → `PAID`).
- `tests/integration/api/models-viewer-url.test.ts` — `GET
  /api/models/[slug]/viewer-url`: `PUBLISHED` модель с файлом → `200` +
  signed URL; `DRAFT` модель, модель без файла, несуществующий slug → `404`.
- `tests/integration/api/health.test.ts` — `GET /api/health`: `200` + форма
  ответа, `x-request-id` прокидывается/генерируется корректно.

## CI

`.github/workflows/ci.yml` — на каждый PR/push в `main`:

```text
install → typecheck → lint → prisma generate → prisma migrate deploy → unit → integration → build
```

E2E — отдельный job (`e2e`), идущий после основного, чтобы не увеличивать
время фидбека на обычный PR дольше необходимого; поднимает и Postgres, и
MinIO как service containers, гоняет `npm run db:seed` и полный Playwright
набор, прикладывает HTML-отчёт как artifact при падении.

## Соглашения

- Один тестовый файл — один модуль/use case, имя зеркалит путь к
  тестируемому файлу.
- Integration/API-тесты приводят БД к известному состоянию в
  `beforeEach`/`afterEach` (или через транзакцию с rollback) — тесты не
  должны зависеть от порядка выполнения.
- Не мокать Prisma в integration-тестах — именно реальная БД даёт
  уверенность, что констрейнты (unique-индексы, foreign keys) действительно
  защищают бизнес-правила (ТЗ §66), а не только код на уровне приложения.
