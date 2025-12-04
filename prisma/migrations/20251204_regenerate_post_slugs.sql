-- Migration: Regenerar slugs de posts existentes
-- Description: Remover sufijo de ID y usar solo título normalizado

-- Paso 1: Regenerar slugs para posts existentes usando solo el título
UPDATE "studio_posts" 
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      COALESCE(title, 'post'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
)
WHERE "slug" IS NOT NULL;

-- Paso 2: Remover guiones múltiples
UPDATE "studio_posts"
SET "slug" = REGEXP_REPLACE("slug", '-+', '-', 'g')
WHERE "slug" LIKE '%---%';

-- Paso 3: Remover guiones al inicio/final
UPDATE "studio_posts"
SET "slug" = TRIM(BOTH '-' FROM "slug")
WHERE "slug" LIKE '-%' OR "slug" LIKE '%-';

-- Paso 4: Manejar duplicados agregando sufijo numérico
-- Esta query identifica y numera duplicados
WITH numbered_posts AS (
  SELECT 
    id,
    slug,
    studio_id,
    ROW_NUMBER() OVER (PARTITION BY studio_id, slug ORDER BY created_at) as row_num
  FROM "studio_posts"
)
UPDATE "studio_posts" p
SET "slug" = CASE 
  WHEN np.row_num > 1 THEN CONCAT(np.slug, '-', np.row_num - 1)
  ELSE np.slug
END
FROM numbered_posts np
WHERE p.id = np.id AND np.row_num > 1;
