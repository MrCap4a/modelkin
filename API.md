# API

Next.js Route Handlers (`src/app/api/**`) для операций, требующих явный
HTTP-контракт (webhooks, health check, presigned URLs, скачивание). Обычные
мутации UI-форм по умолчанию используют Server Actions (данные и типы
через переиспользуемые Zod-схемы `src/shared/validation`, ТЗ §63) — они не
являются публичным HTTP API и здесь не документируются построчно; их
поведение описывается в соответствующем разделе use case.

Этот файл обновляется по мере готовности каждого модуля — актуальное
состояние всегда соответствует реализации (не документируем то, чего ещё
нет).

## Конвенции

- **Аутентификация**: session cookie (`modelkin_session`, HttpOnly). Нет
  отдельного API-токена/API-key для публичных клиентов.
- **Авторизация**: проверяется на сервере в каждом обработчике
  (`requireUser()`/`requireAdmin()` из `@modules/auth`), не только в UI.
- **Формат ошибок** — единый на все эндпоинты:

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Человекочитаемое сообщение на русском",
      "details": { "...": "опционально, безопасно для клиента" }
    }
  }
  ```

  Коды соответствуют иерархии `src/shared/errors`: `VALIDATION_ERROR` (400),
  `AUTHENTICATION_ERROR` (401), `AUTHORIZATION_ERROR` (403), `NOT_FOUND`
  (404), `CONFLICT` (409), `RATE_LIMITED` (429), `PAYMENT_ERROR` (402),
  `STORAGE_ERROR` / `EXTERNAL_SERVICE_ERROR` (502), `INTERNAL_ERROR` (500,
  без деталей — полная информация только в server-логах).
- **Request ID**: каждый ответ содержит заголовок `x-request-id`;
  используйте его при обращении в поддержку/для поиска в логах.
- **CSRF**: state-changing запросы (`POST`/`PUT`/`PATCH`/`DELETE`) должны
  быть same-origin (проверяется в `src/middleware.ts`) — см.
  [SECURITY.md](./SECURITY.md#csrf). Исключение — webhook-эндпоинты
  провайдера платежей, защищённые проверкой подписи вместо этого.
- **Rate limiting**: см. [SECURITY.md](./SECURITY.md#rate-limiting) —
  применяется к login/register/password-reset/upload и другим
  чувствительным путям.

## Реализованные эндпоинты

Полный список `src/app/api/**` Route Handlers в проекте — их ровно четыре.
Всё остальное (включая всю админку) реализовано через Server Actions — см.
[«Server Actions»](#server-actions-остальная-часть-приложения) ниже.

### `GET /api/health`

Публичный, без авторизации. Используется health-check'ом Docker/оркестратора
(см. `Dockerfile`/`docker-compose*.yml`).

**Response `200`** (всё исправно):

```json
{
  "status": "ok",
  "timestamp": "2026-09-18T12:00:00.000Z",
  "checks": { "database": "ok" }
}
```

**Response `503`** (проблема с зависимостью):

```json
{
  "status": "degraded",
  "timestamp": "2026-09-18T12:00:00.000Z",
  "checks": { "database": "error" }
}
```

### `GET /api/models/[slug]/viewer-url`

Публичный, без авторизации (ТЗ §18 — вращать/приближать 3D-превью может
любой гость; в отличие от покупки файла это не требует ownership). Отдаёт
короткоживущий signed GET URL на STL, чтобы 3D-viewer (React Three Fiber +
`STLLoader`) мог загрузить геометрию прямо из браузера. Резолвится только для
моделей в статусе `PUBLISHED` — черновик/скрытая модель через этот путь не
доступна, даже если знать её slug.

**Response `200`**:

```json
{ "url": "https://s3.example.com/modelkin/models/....stl?X-Amz-...", "expiresInSeconds": 300 }
```

**Response `404`** — модель не найдена, не `PUBLISHED`, либо у неё ещё нет
прикреплённого STL-файла:

```json
{ "error": { "code": "NOT_FOUND", "message": "3D-модель недоступна" } }
```

### `POST /api/payments/webhook`

Публичный (авторизации через cookie нет — это server-to-server вызов от
платёжного провайдера, а не от браузера пользователя), но **обязан** пройти
проверку подлинности через `PaymentProvider.verifyWebhook(...)`.
Единственный маршрут, явно исключённый из same-origin CSRF-проверки в
`src/middleware.ts` (webhook по природе кросс-доменный) — вместо этого
защищён проверкой подписи/секрета на уровне самого провайдера.

Для `MockPaymentProvider` (текущая единственная реализация, ТЗ §24) подпись —
заголовок `x-mock-webhook-secret` с фиксированным shared-секретом; тело —
`{ "providerPaymentId": string, "status": "PENDING" | "PAID" | "FAILED" }`.
Реальный провайдер в будущем подключается как новая реализация
`PaymentProvider` в `src/infrastructure/payments/` — этот маршрут и его
контракт со стороны нашего приложения не меняются.

Обрабатывает статус идемпотентно (ТЗ §25/§64/§65): повторный webhook с тем же
`providerPaymentId`/статусом не создаёт вторых `UserModelOwnership`, не
откатывает `Order` из `PAID` обратно.

**Response `200`** (всегда, если подпись верна — независимо от того, изменилось ли что-то фактически):

```json
{ "received": true }
```

**Response `400`** — подпись невалидна/отсутствует:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Недействительная подпись webhook" } }
```

**Response `404`** — подпись верна, но `providerPaymentId` не соответствует
ни одному `Payment` в БД:

```json
{ "error": { "code": "NOT_FOUND", "message": "Платёж не найден", "details": { "providerPaymentId": "..." } } }
```

### `POST /api/payments/mock/complete`

**Только для dev/E2E** — ручной триггер mock-платёжного шлюза (ТЗ §24: пока
не подключён реальный провайдер, странице `/checkout/mock/[providerPaymentId]`
нужен способ «нажать оплатить»). Реальный провайдер вызывал бы
`/api/payments/webhook` напрямую — эта страница/маршрут целиком удаляются при
подключении реального провайдера.

Требует авторизации: `requireUser()`. Дополнительно проверяет, что платёж
принадлежит именно вызывающему пользователю (иначе один авторизованный
пользователь мог бы подтверждать чужие платежи по угаданному
`providerPaymentId`). Под капотом переиспользует тот же путь, что и настоящий
webhook (`processPaymentWebhook`), так что бизнес-логика перехода статусов не
дублируется.

**Request**:

```json
{ "providerPaymentId": "mock_...", "status": "PAID" }
```

`status` — `"PAID"` или `"FAILED"` (zod enum, третьего значения не бывает).

**Response `200`**:

```json
{ "status": "ok" }
```

**Ошибки**:

| Код | HTTP | Когда |
| --- | --- | --- |
| `AUTHENTICATION_ERROR` | 401 | нет валидной session cookie |
| `VALIDATION_ERROR` | 400 | тело не проходит `completeMockPaymentSchema` (например, `status` не из `["PAID","FAILED"]`) |
| `NOT_FOUND` | 404 | `providerPaymentId` не найден |
| `AUTHORIZATION_ERROR` | 403 | платёж существует, но принадлежит другому пользователю |

## Server Actions (остальная часть приложения)

Всё остальное состояние-изменяющее взаимодействие в приложении — включая
регистрацию/вход/сброс пароля, профиль, корзину/оформление заказа, custom
order (создание заявки гостем), загрузку файлов (presigned upload URL),
кабинет автора (запрос выплаты) и **всю админку**
(`src/app/admin/models/actions.ts`, `src/app/admin/custom-orders/actions.ts`)
— реализовано через Next.js Server Actions (`"use server"`), а не через
`app/api/**` Route Handlers.

Это не случайное упущение: Server Actions уже дают то, что здесь потребовалось
бы вручную реализовывать поверх REST — типобезопасный вызов из React-формы
без ручной (де)сериализации, встроенную защиту от CSRF (тот же same-origin
принцип, что описан в [SECURITY.md](./SECURITY.md#csrf)), и единую схему
валидации (Zod), которую можно переиспользовать и на клиенте для мгновенной
обратной связи (ТЗ §63).

**Где искать контракт конкретного действия** — не здесь построчно (это
быстро разошлось бы с кодом), а в самом модуле:

1. Server Action-обёртка — `src/app/**/actions.ts` рядом со страницей, либо
   `src/modules/<module>/presentation/actions.ts` для действий, переиспользуемых
   несколькими страницами (например, `@modules/files/presentation/actions.ts`
   — запрос presigned upload URL, вызывается и из custom-order формы, и из
   admin-загрузчиков превью/STL).
2. Она почти всегда тонкая: `requireUser()`/`requireAdmin()` → `zodSchema.parse(input)`
   → вызов use case из `application/` того же модуля → `{ ok: true, data }`
   / `{ ok: false, error, fieldErrors }` (единая форма `ActionResult<T>`,
   см. `src/app/(auth)/_components/action-result.ts` и
   `src/app/admin/_lib/action-result.ts`).
3. **Реальный контракт** (какие поля, какие ошибки) — это Zod-схема и use
   case в `application/`, а не сама Server Action-обёртка. Схемы
   переиспользуются и на клиенте (см. заголовок-комментарий каждой такой
   схемы про импорт из конкретного файла, а не барреля — важно для
   Client Components, см. `ARCHITECTURE.md`/known issue про
   `"use client"` + barrel).

| Область | Обёртка (`actions.ts`) | Use case / контракт (`application/`) |
| --- | --- | --- |
| Auth | `src/app/(auth)/{login,register,forgot-password}/actions.ts`, `src/app/(auth)/reset-password/[token]/actions.ts` | `src/modules/auth/application/*` |
| Профиль | `src/app/profile/actions.ts` | `src/modules/users/application/*` |
| Корзина/заказ | `src/app/(public)/cart/actions.ts` | `@modules/cart`, `@modules/orders` (`createOrder`) |
| Покупки/скачивание | `src/app/profile/purchases/actions.ts` | `@modules/downloads` (`getSignedDownloadUrl`) |
| Custom order (гость) | `src/modules/custom-orders/presentation/actions.ts` | `src/modules/custom-orders/application/*` |
| Загрузка файлов (presigned URL) | `src/modules/files/presentation/actions.ts` | `src/modules/files/application/request-upload-url.ts` |
| Кабинет автора | `src/app/profile/author/actions.ts` | `src/modules/authors/application/*` |
| Admin — модели | `src/app/admin/models/actions.ts` | `@modules/models` (`createModel`/`updateModel`/`publishModel`/`hideModel`/`addModelImage`/`addModelFile`) |
| Admin — custom orders | `src/app/admin/custom-orders/actions.ts` | `@modules/custom-orders` (`updateCustomOrderStatus`), плюс прямой presigned-download для вложений (`@infrastructure/storage`) |

Все Server Actions, изменяющие состояние, проверяют авторизацию сервером
(`requireUser`/`requireAdmin`) внутри самой обёртки — точно так же, как и
Route Handlers; отсутствие отдельного `/admin/**` API не означает отсутствие
серверной проверки роли (см. [SECURITY.md](./SECURITY.md#admin-authorization)).
