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

Обязательные happy-path сценарии (ТЗ §49):

- **Покупка**: регистрация → логин → каталог → карточка модели → корзина →
  оформление заказа → mock-оплата → webhook → ownership → скачивание
- **Админ**: логин под ADMIN → создание модели → загрузка STL/превью →
  публикация → модель появляется в публичном каталоге
- **Индивидуальный заказ**: открыть форму → заполнить поля → прикрепить
  файл → отправить → заявка видна в админке → админ меняет статус

## Что проверяют unit-тесты (обязательный минимум, ТЗ §49)

- бизнес-правила domain-слоя каждого модуля
- Zod-валидация входных данных
- расчёт цены заказа (сервер, не клиент — см. `orders`/`cart`)
- правила авторизации (`requireUser`/`requireAdmin`)
- правила корзины (одна модель = одна позиция, нельзя добавить уже купленную)
- идемпотентность создания ownership
- переходы статусов заказа (`PENDING_PAYMENT → PAID/CANCELLED/REFUNDED`)

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
