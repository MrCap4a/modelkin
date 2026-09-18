/**
 * Idempotent dev/demo seed. Safe to re-run (uses upserts keyed by natural
 * unique fields). Populates enough realistic data — matching the names,
 * prices and author/custom-order scenarios shown in design.pdf — that the
 * catalog, auth, profile/author dashboard, and admin screens are all
 * demoable immediately after `npm run db:seed`, without requiring manual
 * data entry first.
 *
 * Run via `npm run db:seed`. Imports `hashPassword` from its concrete file
 * rather than the `@modules/auth` barrel on purpose: that barrel also
 * re-exports `getCurrentUser` (application/get-current-user.ts), which
 * uses `React.cache` + `next/headers` and is only loadable inside Next's
 * own bundler — importing the barrel here would pull that in transitively
 * and crash under plain tsx.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@modules/auth/infrastructure/password-hash";
import { getS3Client } from "@infrastructure/storage";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getConfig } from "@shared/config";
import { CATALOG_TAGS } from "@shared/constants/catalog-tags";

const prisma = new PrismaClient();

// 1x1 orange PNG pixel — a real, valid (if minimal) image so <Image>/S3
// preview rendering works out of the box in dev.
const PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// Minimal valid ASCII STL cube — small but structurally real, so the 3D
// viewer and download flow have something genuine to load/serve.
const PLACEHOLDER_STL = `solid demo_cube
facet normal 0 0 -1
  outer loop
    vertex 0 0 0
    vertex 1 1 0
    vertex 1 0 0
  endloop
endfacet
facet normal 0 0 -1
  outer loop
    vertex 0 0 0
    vertex 0 1 0
    vertex 1 1 0
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 1
    vertex 1 0 1
    vertex 1 1 1
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 1
    vertex 1 1 1
    vertex 0 1 1
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 1 0 1
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex 0 0 0
    vertex 1 0 1
    vertex 0 0 1
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex 0 1 0
    vertex 1 1 1
    vertex 1 1 0
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex 0 1 0
    vertex 0 1 1
    vertex 1 1 1
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 1 1
    vertex 0 1 0
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 0 1
    vertex 0 1 1
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex 1 0 0
    vertex 1 1 0
    vertex 1 1 1
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex 1 0 0
    vertex 1 1 1
    vertex 1 0 1
  endloop
endfacet
endsolid demo_cube
`;

async function uploadPlaceholder(key: string, body: Buffer, contentType: string): Promise<void> {
  const config = getConfig().storage;
  await getS3Client().send(
    new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

interface SeedModelSpec {
  title: string;
  slug: string;
  description: string;
  priceRub: number;
  tagSlugs: string[];
  authorEmail?: string;
  status?: "DRAFT" | "PUBLISHED" | "HIDDEN";
}

const MODELS: SeedModelSpec[] = [
  {
    title: "Органайзер под отвёртки HEX",
    slug: "organayzer-pod-otvertki-hex",
    description:
      "Настенный модульный органайзер для отвёрток HEX. Секции печатаются отдельными модулями и стыкуются между собой — можно собрать органайзер под любое количество инструментов.",
    priceRub: 350,
    tagSlugs: ["organayzery"],
    authorEmail: "alex3dprint@mail.ru",
  },
  {
    title: "Кашпо «Венера» геометрическое",
    slug: "kashpo-venera-geometricheskoe",
    description:
      "Декоративное кашпо в форме геометрического бюста. High-poly модель, печатается без поддержек. Подходит для суккулентов и небольших комнатных растений.",
    priceRub: 490,
    tagSlugs: ["dekor-i-interer"],
    authorEmail: "alex3dprint@mail.ru",
  },
  {
    title: "Держатель кабеля на стол",
    slug: "derzhatel-kabelya-na-stol",
    description:
      "Гибкий зажим для фиксации кабеля на краю стола. Печатается гибким пластиком (TPU) или обычным PLA с уменьшенной плотностью заполнения.",
    priceRub: 190,
    tagSlugs: ["poleznye-veshchi"],
    authorEmail: "alex3dprint@mail.ru",
  },
  {
    title: "Кронштейн для наушников",
    slug: "kronshteyn-dlya-naushnikov",
    description:
      "Компактный кронштейн для крепления наушников под столешницу. Не требует дополнительного крепежа — держится за счёт формы паза.",
    priceRub: 290,
    tagSlugs: ["instrumenty"],
  },
  {
    title: "Модульный пенал под свёрла",
    slug: "modulnyy-penal-pod-sverla",
    description:
      "Пенал для хранения свёрл с градацией по диаметру. Секции подписаны размерами, стыкуются в ряд для удобного хранения на верстаке.",
    priceRub: 290,
    tagSlugs: ["organayzery"],
  },
  {
    title: "Настольная лампа «Плиссе»",
    slug: "nastolnaya-lampa-plisse",
    description:
      "Стильная геометрическая лампа-ночник. Модель оптимизирована для печати в режиме вазы (spiralize outer contour) без поддержек. Отлично пропускает свет при использовании прозрачного или полупрозрачного пластика.",
    priceRub: 590,
    tagSlugs: ["dekor-i-interer"],
  },
  {
    title: "Кашпо со скрытым автополивом",
    slug: "kashpo-so-skrytym-avtopolivom",
    description:
      "Кашпо со встроенным резервуаром для автополива. Внутренняя перегородка регулирует объём воды, попадающей в грунт.",
    priceRub: 390,
    tagSlugs: ["poleznye-veshchi"],
    status: "DRAFT",
  },
  {
    title: "Кронштейн крепления монитора",
    slug: "kronshteyn-krepleniya-monitora",
    description:
      "Универсальный кронштейн VESA 75/100 для настольного крепления монитора. Печатается с 100% заполнением в зоне крепёжных отверстий.",
    priceRub: 450,
    tagSlugs: ["instrumenty"],
  },
  {
    title: "Органайзер для кабелей магнитный",
    slug: "organayzer-dlya-kabeley-magnitnyy",
    description:
      "Компактный держатель кабелей с посадочным местом под магнит (не входит в комплект). Крепится к металлическим поверхностям стола.",
    priceRub: 250,
    tagSlugs: ["organayzery"],
  },
  {
    title: "Подставка для геймпада",
    slug: "podstavka-dlya-geympada",
    description:
      "Настольная подставка для геймпада с устойчивым основанием. Подходит под большинство современных контроллеров.",
    priceRub: 340,
    tagSlugs: ["dekor-i-interer"],
  },
  {
    title: "Защитные колпачки ступицы",
    slug: "zashchitnye-kolpachki-stupitsy",
    description:
      "Комплект защитных колпачков ступицы колеса. Печатается износостойким пластиком (PETG/ABS) с повышенной плотностью заполнения.",
    priceRub: 190,
    tagSlugs: ["avto"],
  },
  {
    title: "Корпус для Raspberry Pi 4",
    slug: "korpus-dlya-raspberry-pi-4",
    description:
      "Вентилируемый корпус для Raspberry Pi 4 с доступом ко всем портам и креплением под стандартный кулер 30×30 мм.",
    priceRub: 280,
    tagSlugs: ["poleznye-veshchi"],
    status: "HIDDEN",
  },
];

const CUSTOM_ORDERS = [
  {
    name: "Александр Петров",
    contactType: "TELEGRAM" as const,
    contactValue: "@alex_print3d",
    description:
      "Нужен прочный кронштейн для книжной полки под углом ровно 45 градусов. Ширина паза под саму доску должна быть 20 мм. Нам необходимо предусмотреть крепление под два винта М4 в потай. Нагрузка будет приличной, поэтому модель должна быть рассчитана под плотное заполнение PLA-пластиком.",
    status: "IN_PROGRESS" as const,
  },
  {
    name: "Дмитрий",
    contactType: "PHONE" as const,
    contactValue: "+7 900 123-45-67",
    description: "Переходник для автомобильного компрессора с резьбой 1/4.",
    status: "IN_PROGRESS" as const,
  },
  {
    name: "Ольга",
    contactType: "MAX" as const,
    contactValue: "olga.print",
    description: "Декоративная ваза в форме кристалла высотой 300мм.",
    status: "WAITING_FOR_REPLY" as const,
  },
  {
    name: "Иван С.",
    contactType: "TELEGRAM" as const,
    contactValue: "@ivan_s",
    description: "Заглушка вентиляции для мастерской по чертежу.",
    status: "COMPLETED" as const,
  },
];

async function main() {
  console.log("Seeding database...");

  const adminPasswordHash = await hashPassword("Admin12345!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@modelkin.ru" },
    update: {},
    create: {
      email: "admin@modelkin.ru",
      passwordHash: adminPasswordHash,
      name: "Константин К.",
      role: "ADMIN",
    },
  });

  const authorPasswordHash = await hashPassword("Password12345!");
  const author = await prisma.user.upsert({
    where: { email: "alex3dprint@mail.ru" },
    update: {},
    create: {
      email: "alex3dprint@mail.ru",
      passwordHash: authorPasswordHash,
      name: "Александр Макаров",
      role: "USER",
    },
  });

  const buyerPasswordHash = await hashPassword("Password12345!");
  const buyer = await prisma.user.upsert({
    where: { email: "maria@example.com" },
    update: {},
    create: {
      email: "maria@example.com",
      passwordHash: buyerPasswordHash,
      name: "Мария С.",
      role: "USER",
    },
  });

  console.log(`Users: admin=${admin.email}, author=${author.email}, buyer=${buyer.email}`);

  const tagBySlug = new Map<string, string>();
  for (const tag of CATALOG_TAGS) {
    const row = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: { slug: tag.slug, name: tag.name },
    });
    tagBySlug.set(tag.slug, row.id);
  }

  const previewPng = Buffer.from(PLACEHOLDER_PNG_BASE64, "base64");
  const stlBuffer = Buffer.from(PLACEHOLDER_STL, "utf-8");

  const modelIdBySlug = new Map<string, string>();

  for (const spec of MODELS) {
    const authorId = spec.authorEmail === author.email ? author.id : null;
    const status = spec.status ?? "PUBLISHED";

    const model = await prisma.model.upsert({
      where: { slug: spec.slug },
      update: {
        title: spec.title,
        description: spec.description,
        price: spec.priceRub * 100,
        status,
        authorId,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
      create: {
        title: spec.title,
        slug: spec.slug,
        description: spec.description,
        price: spec.priceRub * 100,
        status,
        authorId,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });
    modelIdBySlug.set(spec.slug, model.id);

    await prisma.modelTag.deleteMany({ where: { modelId: model.id } });
    for (const tagSlug of spec.tagSlugs) {
      const tagId = tagBySlug.get(tagSlug);
      if (tagId) {
        await prisma.modelTag.create({ data: { modelId: model.id, tagId } });
      }
    }

    const existingImage = await prisma.modelImage.findFirst({ where: { modelId: model.id } });
    if (!existingImage) {
      const imageKey = `previews/${model.id}.png`;
      await uploadPlaceholder(imageKey, previewPng, "image/png");
      await prisma.modelImage.create({
        data: { modelId: model.id, storageKey: imageKey, sortOrder: 0, alt: spec.title },
      });
    }

    const existingFile = await prisma.modelFile.findFirst({ where: { modelId: model.id } });
    if (!existingFile) {
      const fileKey = `models/${model.id}.stl`;
      await uploadPlaceholder(fileKey, stlBuffer, "model/stl");
      await prisma.modelFile.create({
        data: {
          modelId: model.id,
          storageKey: fileKey,
          originalName: `${spec.slug}.stl`,
          mimeType: "model/stl",
          size: stlBuffer.byteLength,
        },
      });
    }
  }

  console.log(`Models: ${MODELS.length}`);

  // --- Demo purchase history: `buyer` owns the three models authored by
  // `author`, so the author balance / sales-history screens (§ "Кабинет
  // автора") have real data instead of being empty on first run.
  const commissionBps = getConfig().commerce.platformCommissionBps;
  const authoredSlugs = MODELS.filter((m) => m.authorEmail === author.email).map((m) => m.slug);

  const existingOrder = await prisma.order.findFirst({
    where: { userId: buyer.id, status: "PAID" },
  });

  if (!existingOrder && authoredSlugs.length > 0) {
    const items = authoredSlugs.map((slug) => {
      const spec = MODELS.find((m) => m.slug === slug)!;
      const priceSnapshot = spec.priceRub * 100;
      const authorEarningAmount = Math.round((priceSnapshot * (10000 - commissionBps)) / 10000);
      return {
        modelId: modelIdBySlug.get(slug)!,
        titleSnapshot: spec.title,
        priceSnapshot,
        authorId: author.id,
        commissionBps,
        authorEarningAmount,
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.priceSnapshot, 0);

    const order = await prisma.order.create({
      data: {
        userId: buyer.id,
        status: "PAID",
        totalAmount,
        items: { create: items },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "mock",
        providerPaymentId: `mock_seed_${order.id}`,
        status: "PAID",
        amount: totalAmount,
      },
    });

    for (const item of order.items) {
      await prisma.userModelOwnership.create({
        data: { userId: buyer.id, modelId: item.modelId, orderItemId: item.id },
      });
    }

    console.log(`Seeded a PAID demo order (${order.id}) with ${order.items.length} item(s).`);
  }

  // --- Custom orders (admin demo data, matches design.pdf mockups) --------
  for (const co of CUSTOM_ORDERS) {
    const existing = await prisma.customOrder.findFirst({
      where: { name: co.name, description: co.description },
    });
    if (!existing) {
      await prisma.customOrder.create({
        data: {
          name: co.name,
          contactType: co.contactType,
          contactValue: co.contactValue,
          description: co.description,
          status: co.status,
        },
      });
    }
  }
  console.log(`Custom orders: ${CUSTOM_ORDERS.length}`);

  console.log("Seed complete.");
  console.log("");
  console.log("Demo accounts:");
  console.log("  admin:  admin@modelkin.ru / Admin12345!");
  console.log("  author: alex3dprint@mail.ru / Password12345!");
  console.log("  buyer:  maria@example.com / Password12345!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
