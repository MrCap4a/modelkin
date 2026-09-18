# База данных

PostgreSQL, доступ через Prisma ORM. Схема — `prisma/schema.prisma`, история
миграций — `prisma/migrations/`.

## ER-диаграмма

```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o{ PasswordResetToken : has
    User ||--o| Cart : has
    User ||--o{ Order : places
    User ||--o{ UserModelOwnership : owns
    User ||--o{ CustomOrder : submits
    User ||--o{ Model : "authors (nullable)"
    User ||--o{ AuthorPayout : requests

    Model ||--o{ ModelTag : has
    Tag ||--o{ ModelTag : has
    Model ||--o{ ModelImage : has
    Model ||--o{ ModelFile : has
    Model ||--o{ CartItem : "in"
    Model ||--o{ OrderItem : "sold as"
    Model ||--o{ UserModelOwnership : owned

    Cart ||--o{ CartItem : contains

    Order ||--o{ OrderItem : contains
    Order ||--o{ Payment : has
    OrderItem ||--o| UserModelOwnership : grants

    CustomOrder ||--o{ CustomOrderFile : has

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        string avatarUrl
        Role role
    }
    Model {
        string id PK
        string title
        string slug UK
        int price "kopecks"
        ModelStatus status
        string authorId FK "nullable"
    }
    Order {
        string id PK
        string userId FK
        OrderStatus status
        int totalAmount "kopecks"
    }
    OrderItem {
        string id PK
        string orderId FK
        string modelId FK
        string titleSnapshot
        int priceSnapshot
        string authorId "snapshot, nullable"
        int commissionBps "snapshot, nullable"
        int authorEarningAmount "snapshot, nullable"
    }
    Payment {
        string id PK
        string orderId FK
        string provider
        string providerPaymentId UK
        PaymentStatus status
        int amount
    }
    UserModelOwnership {
        string id PK
        string userId FK
        string modelId FK
        string orderItemId FK UK
    }
    AuthorPayout {
        string id PK
        string userId FK
        int amount
        PayoutStatus status
        json bankDetailsSnapshot
    }
    CustomOrder {
        string id PK
        string userId FK "nullable"
        string name
        ContactType contactType
        string contactValue
        CustomOrderStatus status
    }
```

## Сущности

Базовые сущности (`User`, `Session`, `Model`, `Tag`, `ModelTag`,
`ModelImage`, `ModelFile`, `Cart`, `CartItem`, `Order`, `OrderItem`,
`Payment`, `UserModelOwnership`, `CustomOrder`, `CustomOrderFile`) — согласно
ТЗ §12, поля см. непосредственно в `prisma/schema.prisma` (единый источник
истины, чтобы описание не расходилось с реальной схемой).

### Расширения сверх базового списка ТЗ

| Сущность | Зачем |
| --- | --- |
| `Model.authorId` | Привязка модели к зарегистрированному автору (см. ARCHITECTURE.md → «Расширение: модуль authors») |
| `OrderItem.authorId` / `.commissionBps` / `.authorEarningAmount` | Snapshot авторского вознаграждения на момент оплаты — тот же принцип, что и `priceSnapshot`/`titleSnapshot` |
| `AuthorPayout` | Заявки авторов на выплату накопленного вознаграждения |
| `PasswordResetToken` | Восстановление пароля (ТЗ §15) — токен хранится только как хэш |
| `AuditLog` | Аудит критических действий (ТЗ §30), дублирует файловый audit.log в БД для админ-экрана `/admin/audit` |
| `RateLimitBucket` | Собственный rate limiter (ТЗ §44, §67 — без внешней очереди) |
| `Job` | Абстракция background jobs (ТЗ §67) |

## Деньги

Все денежные суммы — `Int` в минимальных единицах (копейках), никогда
`Float`/`Decimal` с плавающей точкой (ТЗ §13). Пример: 199 ₽ хранится как
`19900`.

## Ключевые ограничения и индексы

- `User.email`, `Session.tokenHash`, `PasswordResetToken.tokenHash`,
  `Model.slug`, `Tag.slug` — уникальны.
- `CartItem` — составной PK `(cartId, modelId)`: одна модель не может быть
  добавлена в корзину дважды (ТЗ §22).
- `UserModelOwnership` — уникален по `(userId, modelId)`: повторная выдача
  владения одной и той же моделью пользователю невозможна на уровне БД, а
  не только в бизнес-логике (важно для идемпотентности webhook, ТЗ §25/§64).
- `Payment` — уникален по `(provider, providerPaymentId)`: повторный webhook
  с тем же `providerPaymentId` не создаёт вторую запись.
- `Model.searchVector` — генерируемая колонка `tsvector` (русский конфиг
  полнотекстового поиска), с GIN-индексом (см. миграцию
  `20260918151537_model_search_vector`). Добавлена raw SQL, поскольку Prisma
  DSL не умеет описывать `GENERATED ALWAYS AS ... STORED` декларативно;
  поле `searchVector Unsupported("tsvector")?` в `schema.prisma` существует
  только для согласованности при `prisma db pull`.

## Полнотекстовый поиск

`Model.searchVector` объединяет `title` (вес A) и `description` (вес B).
Поиск по тегам выполняется отдельно (JOIN `ModelTag`/`Tag`) — тег хранится в
другой таблице и не может участвовать в одноколоночном generated tsvector.

## Migration workflow

```bash
# изменить prisma/schema.prisma, затем:
npm run prisma:migrate          # создаёт + применяет новую миграцию в dev БД

# raw SQL, которое Prisma DSL не может выразить (как searchVector):
npx prisma migrate dev --name <name> --create-only
# отредактировать сгенерированный prisma/migrations/<ts>_<name>/migration.sql
npx prisma migrate dev          # применить

# production/CI — только применение существующих миграций, без генерации:
npm run prisma:migrate:deploy
```

Запрещено создавать таблицы вручную — прод-деплой обязан использовать
`prisma migrate deploy` (см. `docker-entrypoint.sh`, который выполняет его
автоматически при старте контейнера).

## Backup / restore

### PostgreSQL

Backup (пример для dev-контейнера; в production — свой хост/креды):

```bash
docker compose exec postgres pg_dump -U modelkin -d modelkin -Fc -f /tmp/modelkin.dump
docker compose cp postgres:/tmp/modelkin.dump ./backups/modelkin-$(date +%Y%m%d).dump
```

Restore:

```bash
docker compose cp ./backups/modelkin-YYYYMMDD.dump postgres:/tmp/restore.dump
docker compose exec postgres pg_restore -U modelkin -d modelkin --clean --if-exists /tmp/restore.dump
```

Production: делайте `pg_dump` по расписанию (cron/managed backup у
хостинг-провайдера БД) и храните дампы вне сервера приложения.

### Object storage (S3/MinIO)

MinIO/S3-совместимое хранилище бэкапится штатными средствами провайдера
(версионирование бакета, репликация, либо `mc mirror` в отдельный бакет):

```bash
mc mirror local/modelkin backup-target/modelkin-backup
```

Restore — обратная операция (`mc mirror backup-target/modelkin-backup
local/modelkin`). Поскольку `storageKey` в БД случаен и не зависит от
содержимого файла, восстановление объектов не требует правок в БД, если
ключи совпадают.

### Disaster recovery

1. Поднять новый PostgreSQL, выполнить `pg_restore` из последнего дампа.
2. Восстановить бакет объектного хранилища из бэкапа (тем же именем/ключами).
3. Задеплоить приложение (см. [DEPLOYMENT.md](./DEPLOYMENT.md)) с
   `DATABASE_URL`/`S3_*`, указывающими на восстановленную инфраструктуру.
4. `npx prisma migrate deploy` — на случай, если восстановленный дамп старее
   последней миграции.
5. Проверить `GET /api/health`.
