# Логирование

Два независимых механизма: **application logging** (эксплуатационная
диагностика) и **audit logging** (кто/что/когда сделал критическое
действие). Оба — структурированный JSON, оба ротируются посуточно.

## Формат

Application/error логи (`src/shared/logging/logger.ts`, pino):

```json
{
  "level": 30,
  "time": "2026-09-18T12:00:00.000Z",
  "requestId": "abc123",
  "userId": "user123",
  "event": "order.created",
  "msg": "http.response"
}
```

Audit-логи (`src/modules/audit/infrastructure/audit-file-writer.ts`) — по
формату из ТЗ §32:

```json
{
  "timestamp": "2026-09-18T12:00:00.000Z",
  "level": "info",
  "event": "order.created",
  "requestId": "abc123",
  "actorUserId": "user123",
  "entityType": "Order",
  "entityId": "order123"
}
```

## Хранение и ротация

```text
logs/
├── 2026-09-18/
│   ├── application.log
│   ├── error.log
│   └── audit.log
├── 2026-09-19/
│   ├── application.log
│   ├── error.log
│   └── audit.log
```

Реализация — `src/shared/logging/daily-rotating-writer.ts`
(`DailyRotatingWriter`): на каждую запись пересчитывается текущая дата и,
если она изменилась, открывается новый файл в новой (создаваемой при
необходимости) директории. Ротация не зависит ни от какого сохранённого
состояния/таймера — при рестарте контейнера просто продолжает писать в
директорию текущего дня, создавая её при отсутствии (ТЗ §33 требование
«корректная работа при рестарте контейнера»).

`application.log` получает все уровни от `LOG_LEVEL` (по умолчанию `info`) и
выше; `error.log` — только `error`/`fatal` (дублируются туда же); `audit.log`
— только события из аудита (полный отдельный поток, см. ниже).

В production том с логами (`app-logs`, см. `docker-compose.prod.yml`)
монтируется отдельно от контейнера — данные переживают пересоздание
контейнера.

## Application logging

Что логируется (`src/shared/http/with-api-handler.ts` + модули):

- старт/остановка приложения и воркера (`worker.started`/`worker.stopped`)
- каждый HTTP/API запрос: `http.request`/`http.response` (метод, путь,
  статус, длительность, requestId)
- ошибки — через единый `toSafeError` (`src/shared/errors/handle-error.ts`):
  полная информация (включая stack trace) уходит в лог уровня `error`,
  клиенту — только безопасное сообщение и код
  - предупреждения — например, неудачная валидация (`warn`, не `error`)
  - ошибки внешних сервисов (S3, email, payment) — через
    `StorageError`/`ExternalServiceError`/`PaymentError`
- background jobs — старт/успех/неудача обработки (`job.processing_failed`,
  с числом попыток)
- важные переходы состояний — фиксируются как раз через audit log (см. ниже),
  а не application-лог, чтобы не дублировать одно и то же в двух форматах
  без необходимости.

Что **не** логируется: пароли, хэши паролей, токены сессий/сброса, API- и
платёжные секреты, содержимое приватных файлов. Обеспечивается `redact` в
`src/shared/logging/logger.ts` (действует на любой глубине объекта для
ключей `password`, `passwordHash`, `token`, `tokenHash`, `resetToken`,
`secret`, `authorization`, `cookie`).

## Audit logging

Отдельная система (`src/modules/audit`) — событие одновременно:

1. пишется в БД (`AuditLog` таблица) — для отображения/фильтрации в
   `/admin/audit`;
2. пишется в `logs/<день>/audit.log` — для оффлайн-анализа/долговременного
   архива, независимо от доступности БД.

Публичный API — `recordAuditEvent(...)` из `src/modules/audit`. Другие
модули вызывают его напрямую после того, как критическое действие
успешно завершилось. Сбой самой записи аудита (БД недоступна, диск полон)
логируется как `application`-ошибка, но **не** откатывает и не проваливает
основную операцию — аудит описывает событие, а не управляет им.

Закрытый список событий — `AuditEventName` в
`src/modules/audit/domain/audit-log-entry.ts`, соответствует категориям
ТЗ §30:

| Категория | События |
| --- | --- |
| Аутентификация | `auth.login_success`, `auth.login_failure`, `auth.logout`, `auth.register`, `auth.password_change`, `auth.password_reset_requested`, `auth.password_reset_completed` |
| Админ | `model.created/updated/published/hidden/deleted`, `user.role_changed`, `user.updated_by_admin`, `custom_order.status_changed` |
| Коммерция | `cart.item_added/removed`, `order.created`, `payment.status_changed`, `ownership.created`, `order.refunded` |
| Авторы | `author.payout_requested`, `author.payout_status_changed` |
| Файлы | `file.upload`, `file.download`, `file.download_denied` |

## Request ID

Каждый запрос получает `requestId` (заголовок `x-request-id`) —
`src/middleware.ts` принимает клиентский заголовок, если он проходит
формат `^[a-zA-Z0-9_-]{8,128}$`, иначе генерирует новый. Значение
пробрасывается через `AsyncLocalStorage`
(`src/shared/logging/request-context.ts`), поэтому любой вызов
`getLogger()` в рамках обработки запроса автоматически включает
`requestId` — не нужно передавать его вручную по цепочке вызовов.
Присутствует в application-, error- и audit-логах, а также в заголовке
ответа — можно скоррелировать жалобу пользователя («ошибка в 12:03») с
конкретной записью в логах.

## Поиск по логам

Логи — построчный JSON, поэтому стандартные инструменты работают без
дополнительной настройки:

```bash
# найти всё, что связано с конкретным запросом
grep '"abc123"' logs/2026-09-18/*.log

# все ошибки за день
cat logs/2026-09-18/error.log | jq 'select(.level >= 50)'

# audit-события конкретного пользователя
cat logs/2026-09-18/audit.log | jq 'select(.actorUserId == "user123")'
```

В `/admin/audit` то же самое доступно через UI с фильтрами по событию,
пользователю, диапазону дат (источник данных — таблица `AuditLog`, тот же
контент, что и в файле, но queryable).

## Retention

Файлы логов не удаляются приложением автоматически. Для production
настройте внешнюю ротацию/архивацию (например, `logrotate` поверх
существующих файлов, или экспорт в централизованное хранилище логов) — эта
часть намеренно оставлена на усмотрение конкретной инфраструктуры
развёртывания (ТЗ §42: полноценный SaaS-мониторинг не обязателен сейчас,
но архитектура должна позволять его добавить — она позволяет: логи уже
структурированы и разделены по потокам).
