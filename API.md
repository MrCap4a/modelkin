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

### `GET /api/health`

Публичный, без авторизации. Используется health-check'ом Docker/оркестратора.

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

## Запланированные группы эндпоинтов (заполняются по мере реализации)

| Группа | Примерные маршруты | Модуль |
| --- | --- | --- |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password/[token]` (Server Actions) | `auth` |
| Каталог | `GET /models`, `GET /models/[slug]` (Server Components, не REST API) | `catalog`, `models` |
| Файлы | `POST /api/files/upload-url`, `GET /api/files/download/[fileId]` | `files`, `downloads` |
| Корзина/заказы | Server Actions на `/cart`, `POST /api/orders`, `POST /api/payments/webhook` | `cart`, `orders`, `payments` |
| Custom orders | Server Action на `/custom-order`, admin API смены статуса | `custom-orders` |
| Admin | `/admin/models/**`, `/admin/custom-orders/**`, `/admin/users`, `/admin/payments`, `/admin/audit`, `/admin/payouts` | `admin` |
| Authors | Server Actions запроса выплаты, чтения баланса | `authors` |

Каждая группа при реализации документируется здесь по тому же шаблону, что
`/api/health`: метод, путь, авторизация, request/response контракт, ошибки,
права доступа.
