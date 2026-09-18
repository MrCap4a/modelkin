# Моделкин.рф

Интернет-магазин цифровых 3D-моделей в формате STL. Модульный монолит на
Next.js App Router + PostgreSQL/Prisma + S3-совместимое хранилище.

Полная документация:

- [ARCHITECTURE.md](./ARCHITECTURE.md) — слои, модули, диаграмма
- [DATABASE.md](./DATABASE.md) — схема БД, ER-диаграмма, миграции, backup
- [API.md](./API.md) — публичное и административное API
- [SECURITY.md](./SECURITY.md) — авторизация, сессии, CSRF, загрузки
- [LOGGING.md](./LOGGING.md) — application/audit логирование, ротация
- [TESTING.md](./TESTING.md) — unit/integration/API/E2E
- [DEPLOYMENT.md](./DEPLOYMENT.md) — production deployment, rollback, backup
- [CONTRIBUTING.md](./CONTRIBUTING.md) — ветки, коммиты, PR, code style

## Стек

| Слой           | Технология                                             |
| -------------- | ------------------------------------------------------- |
| Application    | Next.js 15 (App Router), React 18, TypeScript (strict)  |
| Database       | PostgreSQL 16, Prisma ORM                                |
| Validation     | Zod                                                      |
| Auth           | Собственная session-based авторизация, HttpOnly cookies  |
| 3D             | React Three Fiber / Three.js (lazy-loaded)               |
| Storage        | S3-совместимое хранилище (MinIO в dev)                   |
| Логирование    | pino, JSON, посуточная ротация файлов                    |
| Тесты          | Vitest (unit/integration), Playwright (E2E)              |
| Containers     | Docker, Docker Compose                                   |

Обоснование выбора модульного монолита, слоёв и границ модулей — см.
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Prerequisites

- Node.js ≥ 20
- Docker Desktop (Docker Engine + Compose v2)
- Свободные порты `3000` (app), `5432` (Postgres), `9000`/`9001` (MinIO) —
  либо переопределите их через `.env` (см. ниже)

## Быстрый старт (Docker — рекомендуется)

```bash
cp .env.example .env
docker compose up
```

Эта единственная команда поднимает Next.js (dev-режим, hot reload),
PostgreSQL и MinIO, автоматически создаёт бакет и применяет миграции. После
старта:

- приложение: http://localhost:3000
- MinIO Console: http://localhost:9001 (`modelkin` / `modelkin-secret`)
- health check: http://localhost:3000/api/health

Если порт `5432`/`9000`/`9001` уже занят локальным ПО — раскомментируйте и
измените `POSTGRES_HOST_PORT` / `MINIO_HOST_PORT` в `.env` (см. комментарии
в `.env.example`), затем `docker compose up` снова.

Наполнить БД демо-данными (модели/теги/пользователи, соответствующие
дизайн-макету):

```bash
docker compose exec app npm run db:seed
```

Демо-аккаунты после сида:

| Роль   | Email                  | Пароль          |
| ------ | ----------------------- | ---------------- |
| Admin  | admin@modelkin.ru       | `Admin12345!`     |
| Автор  | alex3dprint@mail.ru     | `Password12345!`  |
| Покупатель | maria@example.com   | `Password12345!`  |

## Локальный запуск без Docker

Требуется собственный PostgreSQL и S3-совместимое хранилище.

```bash
npm install
cp .env.example .env   # заполните DATABASE_URL/S3_* под свою инфраструктуру
npx prisma migrate deploy
npm run db:seed         # опционально, демо-данные
npm run dev
```

## Скрипты

```bash
npm run dev              # dev-сервер (hot reload)
npm run build             # production build (Next standalone output)
npm run start             # запуск собранного standalone сервера
npm run typecheck          # tsc --noEmit
npm run lint                # ESLint
npm run format               # Prettier --write

npm run prisma:migrate         # создать/применить миграцию в dev
npm run prisma:migrate:deploy   # применить миграции (prod/CI)
npm run prisma:studio            # Prisma Studio
npm run db:seed                   # наполнить БД демо-данными

npm run test              # unit + integration
npm run test:unit
npm run test:integration
npm run test:e2e           # Playwright (нужен собранный/запущенный app)

npm run worker              # background job worker (см. ARCHITECTURE.md)
```

## Переменные окружения

Полный список и назначение — в `.env.example`. Валидируются через Zod при
старте приложения (`src/shared/config/env.ts`): отсутствие обязательной
переменной останавливает процесс с понятным сообщением, а не падает где-то
в середине запроса.

## Структура репозитория

```text
src/
├── app/                # Next.js App Router: страницы, API routes, layouts
├── modules/             # доменные модули (auth, models, cart, orders, ...)
│   └── <module>/
│       ├── domain/           # бизнес-правила, интерфейсы, entities
│       ├── application/       # use cases
│       ├── infrastructure/     # Prisma-репозитории, S3, внешние API
│       └── presentation/        # компоненты/формы, специфичные для модуля
├── shared/               # config, errors, logging, validation, utils
├── infrastructure/        # database, storage, payments, email, jobs, rate-limit
├── components/              # переиспользуемые UI-компоненты (shared chrome)
└── middleware.ts              # security headers, requestId, same-origin CSRF check

prisma/                # schema.prisma, migrations, seed.ts
tests/
├── unit/
├── integration/
└── e2e/
```

Подробности архитектурных границ и правил зависимостей — в
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Production

См. [DEPLOYMENT.md](./DEPLOYMENT.md) для пошагового деплоя (Docker-образ,
миграции, health check, rollback) и `docker-compose.prod.yml`.

## Диагностика

- Логи: `logs/<YYYY-MM-DD>/{application,error,audit}.log` (в контейнере —
  volume `app-logs`), подробности — [LOGGING.md](./LOGGING.md)
- Health check: `GET /api/health` — проверяет БД и приложение
- Каждый HTTP-запрос имеет `requestId` (заголовок ответа `x-request-id`),
  присутствующий во всех связанных логах — используйте его для поиска
  конкретного запроса в логах
