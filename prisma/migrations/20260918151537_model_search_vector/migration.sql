-- Full-text search support for Model (ТЗ §16: search must cover title,
-- description and tags, and must work with Russian text).
--
-- Prisma's schema DSL cannot express a STORED GENERATED column, so this is
-- raw SQL. The corresponding `searchVector Unsupported("tsvector")?` field
-- in schema.prisma exists purely so `prisma db pull`/introspection stays
-- accurate — it's never read or written through Prisma Client.
ALTER TABLE "Model"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('russian', coalesce("description", '')), 'B')
  ) STORED;

CREATE INDEX "Model_searchVector_idx" ON "Model" USING GIN ("searchVector");

-- Tags are matched separately (join ModelTag/Tag and search Tag.name) by
-- the catalog module's search use case, since tag names live in another
-- table and can't participate in a single-column generated tsvector.
