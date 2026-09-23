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
- Домен + nginx + certbot на сервере для TLS-терминации — см. [раздел
  6](#6-tls--домен-nginx--lets-encrypt) ниже. Приложение само по себе
  слушает обычный HTTP и намеренно публикуется только на `127.0.0.1`
  (`docker-compose.prod.yml`), не наружу.

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

## 6. TLS / домен (nginx + Let's Encrypt)

Выбран этот вариант (а не Dockerized Caddy/Traefik с портами 80/443) именно
потому, что сервер уже хостит другой сайт — почти наверняка на нём уже
работает nginx на портах 80/443 для этого сайта, и новый Docker-контейнер,
пытающийся занять те же порты, только сломает существующий сайт. nginx на
хосте + отдельный vhost для нового домена — стандартный способ держать
несколько сайтов на одном сервере, не трогая уже работающие.

1. Установите nginx и certbot на сервере, если их ещё нет:
   ```bash
   apt install nginx certbot python3-certbot-nginx   # Debian/Ubuntu
   ```
2. Поднимите `app` (см. шаг 5) — важно, чтобы `APP_HOST_PORT` в `.env` не
   конфликтовал с портом, который уже слушает существующий сайт на этом
   сервере.
3. Скопируйте готовый конфиг [`deploy/nginx/modelkin.conf.example`](./deploy/nginx/modelkin.conf.example),
   подставьте реальный домен и (если меняли) `APP_HOST_PORT` — точные шаги
   описаны в комментариях самого файла.
4. `nginx -t && systemctl reload nginx`
5. `certbot --nginx -d modelkin.ru -d www.modelkin.ru` — certbot сам допишет
   в конфиг HTTPS-блок, редирект с HTTP на HTTPS и настроит автопродление
   (systemd-таймер/cron, ставится вместе с certbot) — вручную ничего
   продлевать не нужно.
6. Проверьте `https://modelkin.ru/api/health` — должно вернуть `200`.

`APP_URL` в `.env` должен быть реальным `https://`-доменом (не
`http://localhost:3000`) — от него зависят абсолютные ссылки в письмах и
совпадение `Origin` в same-origin CSRF-проверке (`src/middleware.ts`).

## 7. Health check

```bash
curl -f http://127.0.0.1:${APP_HOST_PORT:-3000}/api/health   # локально на сервере, в обход nginx
curl -f https://modelkin.ru/api/health                        # публично, после настройки TLS (шаг 6)
```

Ожидается `{"status":"ok","checks":{"database":"ok"}}` с кодом `200`.
Настройте публичный URL как health check вашего оркестратора/мониторинга —
контейнер `app` уже имеет встроенный Docker healthcheck на локальный URL.

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
- [ ] TLS настроен через nginx + certbot (см. [раздел 6](#6-tls--домен-nginx--lets-encrypt)), `app` публикуется только на `127.0.0.1`
- [ ] `GET /api/health` зелёный
- [ ] Логи пишутся и ротируются (`logs/<сегодня>/application.log`
      появляется и растёт)
