# Security

## Аутентификация и пароли

- Пароли хешируются `bcryptjs` (cost factor 12) —
  `src/modules/auth/infrastructure/password-hash.ts`. Открытый пароль
  никогда не сохраняется и не логируется.
- Регистрация/логин — server-side валидация через Zod, ошибки не раскрывают,
  существует ли email в системе конкретнее необходимого (единая формулировка
  на неверные логин/пароль).

## Сессии

- Session-based, не JWT. Токен сессии — случайные 32 байта
  (`generateSecureToken`), клиенту выдаётся только он; в БД (`Session.tokenHash`)
  хранится исключительно его SHA-256 хэш — кража дампа БД не даёт
  возможности воспроизвести валидную сессию.
- Cookie: `HttpOnly`, `Secure` в production, `SameSite=Lax`, срок жизни 30
  дней (`src/shared/config/index.ts` → `session.durationMs`).
- Logout удаляет конкретную сессию; смена/сброс пароля удаляет **все**
  сессии пользователя (`deleteAllSessionsForUser`) — кража старого токена
  сессии перестаёт быть опасной сразу после смены пароля.
- Истёкшие сессии не проходят проверку (`expiresAt` сравнивается на каждый
  запрос) и периодически подчищаются (`deleteExpiredSessions`).

## Password reset

```text
forgot password → email со ссылкой (single-use token) → reset password
```

- Токен сброса — тот же принцип, что и сессия: случайный, клиенту отдаётся
  raw-значение (в ссылке письма), в БД (`PasswordResetToken.tokenHash`) —
  только хэш.
- Ограничен по времени (`expiresAt`) и одноразовый (`usedAt` проставляется
  при использовании и проверяется перед принятием).
- Запрос сброса и сама смена пароля идут через rate limiting (см. ниже).

## Авторизация (authorization)

- Роли: `USER`, `ADMIN`. Проверка роли — всегда на сервере
  (`requireUser`/`requireAdmin` в `src/modules/auth`), никогда только на
  клиенте/в UI.
- Admin-маршруты (`/admin/**`) и их API проверяют роль на каждом запросе —
  скрытие пункта меню в UI не заменяет серверную проверку.
- Скачивание файла проверяет владение (`UserModelOwnership`) до выдачи
  signed URL — см. «Файлы» ниже.

## CSRF

Модель защиты — **same-origin проверка**, а не CSRF-токены (допустимо по
ТЗ §45 при условии, что модель задокументирована и не является просто
отключением защиты).

Реализация — `src/middleware.ts`: для всех state-changing методов (`POST`,
`PUT`, `PATCH`, `DELETE`), кроме явно исключённых webhook-путей
(`/api/payments/webhook*`, которые по природе кросс-доменные и защищены
проверкой подписи провайдера, см. `PaymentProvider.verifyWebhook`),
запрос отклоняется (`403`), если присутствующий заголовок `Origin` не
совпадает с хостом запроса. Работает вместе с `SameSite=Lax` на cookie
сессии — сторонний сайт не может ни отправить cookie с кросс-доменного
POST (Lax блокирует), ни подделать `Origin`.

## XSS

- React экранирует вывод по умолчанию — `dangerouslySetInnerHTML` не
  используется нигде в проекте.
- CSP (`src/middleware.ts`) запрещает `unsafe-inline` для скриптов —
  `script-src` использует per-request nonce (`'nonce-<value>'
  'strict-dynamic'`), не голый allowlist, и ограничивает `object-src 'none'`,
  `base-uri 'self'`, `frame-ancestors 'none'`.

  Next.js App Router инжектирует часть своего hydration/RSC-payload через
  инлайн-скрипты (`<script>self.__next_f.push(...)</script>`) — без nonce в
  CSP браузер блокирует эти скрипты и клиентская гидратация не проходит
  (обнаружено при подготовке E2E-тестов, воспроизводилось против реальной
  production-сборки). Middleware генерирует nonce на каждый запрос и
  прокидывает один и тот же CSP-заголовок и на forwarded request, и на
  response — Next автоматически считывает nonce из **response**-заголовка
  `Content-Security-Policy` и проставляет его на собственные инлайн-скрипты.
  Проверено вручную на реальной `next build` + `next start`: все инлайн
  `<script>` получают совпадающий с заголовком `nonce`.

## Security headers

Выставляются централизованно в `src/middleware.ts` на каждый ответ:

| Заголовок | Значение | Назначение |
| --- | --- | --- |
| `Content-Security-Policy` | см. middleware.ts (учитывает S3-хост для `img-src`/`connect-src` — presigned upload идёт напрямую из браузера в S3) | XSS/инъекции |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | утечка referrer |
| `X-Frame-Options` | `DENY` | clickjacking |
| `Permissions-Policy` | camera/microphone/geolocation отключены | ненужные браузерные API |
| `Strict-Transport-Security` | только в production | принудительный HTTPS |

`connect-src`/`img-src` включают S3 endpoint — 3D viewer грузит STL и
изображения, а presigned upload идёт напрямую из браузера в S3/MinIO, минуя
наш сервер.

## Rate limiting

`src/infrastructure/rate-limit` — собственный fixed-window лимитер на
таблице `RateLimitBucket` (без Redis, ТЗ §67). Применяется как минимум к:
login, регистрации, password reset, upload-эндпоинтам, другим
чувствительным API (см. `RATE_LIMIT_PRESETS`).

Известное ограничение: корректен для single-instance деплоя. При
горизонтальном масштабировании потребуется Redis-backed реализация с тем же
интерфейсом (`checkRateLimit`/`enforceRateLimit`) — вызывающий код менять не
придётся.

## Файлы

- Загрузка — через presigned S3 URL, большие файлы не проходят через
  application-сервер (ТЗ §20).
- Storage key всегда случайный (`generateStorageKey`) — оригинальное имя
  файла сохраняется только как метаданные (`originalName` в
  `ModelFile`/`CustomOrderFile`), никогда не используется как часть пути →
  исключает path traversal и атаки через имя файла.
- Расширение валидируется по allowlist на префикс хранилища
  (`ALLOWED_EXTENSIONS` в `src/infrastructure/storage/storage-service.ts`):
  `models/` — только `.stl`, `avatars/`/`previews/` — изображения,
  `custom-orders/` — изображения/PDF.
- Оригинальный STL приватен: скачивание всегда идёт через
  `authenticated request → проверка ownership → signed download URL`
  (ТЗ §21), никогда не отдаётся публичным URL.
- Загруженные файлы никогда не исполняются сервером.

## Admin authorization

Все `/admin/**` страницы и API проверяют `role === ADMIN` на сервере
(`requireAdmin()`), независимо от того, что показывает клиентский UI.
Критические административные действия (публикация/скрытие модели, смена
статуса заявки, обработка выплаты автору) пишутся в audit log — см.
[LOGGING.md](./LOGGING.md).

## Secrets

- Секреты (S3 креды, SMTP пароль и т.д.) — только через переменные
  окружения, никогда в репозитории (`.env` в `.gitignore`, коммитится только
  `.env.example` с плейсхолдерами).
- Секреты не логируются: `src/shared/logging/logger.ts` настраивает
  `redact` для password/token/secret/authorization/cookie-путей на любой
  глубине объекта.

## Платёжная безопасность

- Реальный платёжный провайдер не подключён (ТЗ §24) — используется Mock.
- Webhook обрабатывается только после `PaymentProvider.verifyWebhook(...)`
  — неаутентичный payload отклоняется до какой-либо обработки.
  Webhook-путь явно исключён из same-origin CSRF-проверки в middleware
  (он по своей природе кросс-доменный — запрос от провайдера, а не браузера),
  но обязан проходить собственную проверку подлинности.
- Создание `UserModelOwnership` при подтверждении оплаты — идемпотентно
  (`UserModelOwnership` уникален по `(userId, modelId)`, вся операция —
  в транзакции) — повторный webhook не создаёт дублей (ТЗ §25/§64/§65).

## Privacy логирования

См. [LOGGING.md](./LOGGING.md#чувствительные-данные) — пароли, токены
сессий/сброса, платёжные секреты никогда не попадают в логи.
