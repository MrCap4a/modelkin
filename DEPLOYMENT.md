# Deployment

## Обзор

```text
server → Docker → environment → database → storage → migrations → application → health check
```

Next.js собирается в standalone-режиме (`output: "standalone"` в
`next.config.ts`) — production-образ содержит только минимальный сервер и
реально используемые зависимости, без dev-инструментов.

## Prerequisites на сервере

- Docker Engine + Docker Compose v2
- Доступ к PostgreSQL (либо managed-сервис, либо контейнер — см. ниже)
- Доступ к S3-совместимому хранилищу (managed S3, либо самостоятельно
  развёрнутый MinIO/аналог)
- Домен + TLS-терминация (реверс-прокси/балансировщик — не входит в этот
  репозиторий; приложение слушает обычный HTTP на порту 3000)

## 1. Подготовка окружения

```bash
git clone <repo> modelkin && cd modelkin
cp .env.example .env
# заполнить: DATABASE_URL, S3_*, APP_URL (публичный https-домен),
# MAIL_PROVIDER/SMTP_*, PLATFORM_COMMISSION_BPS, LOG_DIR, LOG_LEVEL
```

`APP_URL` обязателен и должен быть реальным публичным origin — используется
для абсолютных ссылок в письмах и совпадает с ожидаемым `Origin` в
same-origin CSRF-проверке (`src/middleware.ts`).

`NODE_ENV=production` включает `Secure` на cookie сессии и HSTS — не
запускайте production без него.

## 2. База данных

Вариант A — managed/внешний PostgreSQL (рекомендуется для прод, ТЗ §35: "не
обязательно запускать production PostgreSQL внутри того же Compose-файла"):
укажите его `DATABASE_URL` в `.env`, ничего дополнительно поднимать не
нужно.

Вариант B — PostgreSQL на том же сервере:

```bash
docker compose -f docker-compose.prod.yml --profile with-local-infra up -d postgres
```

## 3. Object storage

Managed S3 — просто укажите `S3_ENDPOINT`/`S3_REGION`/креды/`S3_BUCKET` в
`.env` (`S3_FORCE_PATH_STYLE=false` для настоящего AWS S3, `true` для
большинства self-hosted S3-совместимых сервисов). Бакет должен существовать
до первого деплоя (либо создайте вручную, либо адаптируйте
`minio-init`-подход из `docker-compose.yml` под свой провайдер).

## 4. Миграции

Применяются автоматически при старте контейнера `app`
(`docker-entrypoint.sh` выполняет `prisma migrate deploy` перед запуском
сервера) — отдельный шаг не требуется. Чтобы применить миграции вручную
(например, перед стартом нового контейнера, чтобы сократить downtime):

```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint sh app -c \
  "./node_modules/.bin/prisma migrate deploy"
```

## 5. Приложение

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Поднимает `app` (веб-сервер) и `worker` (background jobs — email,
подготовлено под будущую автогенерацию STL-превью). Оба используют один и
тот же образ, `worker` — с другим entrypoint/командой (см.
`docker-compose.prod.yml`).

## 6. Health check

```bash
curl -f http://<host>:3000/api/health
```

Ожидается `{"status":"ok","checks":{"database":"ok"}}` с кодом `200`.
Настройте это как health check вашего реверс-прокси/оркестратора — контейнер
`app` уже имеет встроенный Docker healthcheck с тем же URL.

## Обновление (redeploy)

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Пересборка образа автоматически подхватывает новые миграции при старте
контейнера (`docker-entrypoint.sh`). Даунтайм между старым и новым
контейнером минимален (Compose пересоздаёт `app` после успешной сборки);
для zero-downtime деплоя потребуется внешний load balancer с несколькими
инстансами `app` — не входит в текущий scope.

## Rollback

1. Откатить код: `git checkout <предыдущий-тег-или-коммит>`.
2. Пересобрать и перезапустить: `docker compose -f docker-compose.prod.yml up -d --build`.
3. Если откат пересекает миграцию, добавившую несовместимое изменение схемы
   (например, новую обязательную колонку) — миграции Prisma **не
   откатываются автоматически** `migrate deploy` (он только применяет
   вперёд). Для отката схемы: восстановить БД из бэкапа, сделанного перед
   проблемным деплоем (см. [DATABASE.md](./DATABASE.md#backup--restore)),
   либо вручную написать и применить компенсирующую миграцию. Поэтому:
   **всегда делайте бэкап БД перед деплоем, включающим миграцию схемы.**

## Логи в production

Volume `app-logs` (см. `docker-compose.prod.yml`) хранит
`logs/<YYYY-MM-DD>/{application,error,audit}.log` за пределами жизненного
цикла контейнера. Подробности — [LOGGING.md](./LOGGING.md).

## Backup

См. [DATABASE.md](./DATABASE.md#backup--restore) — PostgreSQL и object
storage бэкапятся независимо друг от друга, оба обязательны для disaster
recovery.

## Чеклист перед первым production-деплоем

- [ ] `.env` заполнен реальными значениями, секреты нигде не закоммичены
- [ ] `APP_URL` — правильный публичный https-домен
- [ ] `NODE_ENV=production`
- [ ] Бэкапы PostgreSQL и object storage настроены и проверены (реальный
      restore хотя бы раз протестирован не на проде)
- [ ] TLS-терминация настроена перед приложением (реверс-прокси)
- [ ] `GET /api/health` зелёный
- [ ] Логи пишутся и ротируются (`logs/<сегодня>/application.log`
      появляется и растёт)
