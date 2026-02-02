# Refactor: Posts con CUID + URLs Cortas

## 📋 Objetivo
Migrar posts de slugs únicos a CUID, usando sistema de URLs cortas para compartir.

## 🎯 Beneficios
- ✅ Sin validación de unicidad de slugs
- ✅ Sin conflictos por títulos similares
- ✅ URLs cortas amigables para compartir
- ✅ Menos complejidad en mantenimiento

---

## 📝 Plan de Trabajo

### Fase 1: Migración de Base de Datos

#### 1.1 Schema - Extender `studio_short_urls` para posts
- [x] Crear migración SQL en `supabase/migrations/`
- [x] Hacer `promise_id` opcional (ALTER COLUMN)
- [x] Agregar `post_id` opcional (TEXT, FK a `studio_posts`)
- [x] Agregar constraint: `CHECK (promise_id IS NOT NULL OR post_id IS NOT NULL)`
- [x] Agregar índice: `@@index([studio_id, post_id])`
- [x] Agregar FK constraint: `post_id` → `studio_posts.id` ON DELETE CASCADE
- [x] Actualizar Prisma schema (`prisma/schema.prisma`)

#### 1.2 Schema - Posts (mantener slug opcional para migración)
- [x] Hacer `slug` opcional en `studio_posts` (para migración gradual)
- [x] Remover constraint único `@@unique([studio_id, slug])` (o mantenerlo opcional)
- [x] Crear migración SQL para hacer slug nullable

---

### Fase 2: Funciones de Acciones

#### 2.1 URLs Cortas para Posts
- [x] Crear `getOrCreatePostShortUrl(studioSlug, postId)` en `promise-short-url.actions.ts`
- [x] Reutilizar lógica de `getOrCreateShortUrl` pero para posts
- [x] `original_url`: `/{studioSlug}?post={postId}` (CUID)
- [x] Verificar si ya existe short URL para el post
- [x] Generar código único si no existe
- [x] Retornar `{ shortCode, shortUrl }`

#### 2.2 Resolver URLs Cortas (ya funciona, verificar)
- [x] Verificar que `resolveShortUrl` funciona con posts (usa `original_url`)
- [x] Actualizar tipo de retorno para incluir `postId` opcional

#### 2.3 Limpieza de Short URLs al eliminar post
- [x] Modificar `deleteStudioPost()` en `posts.actions.ts`
- [x] Agregar eliminación de short URLs asociadas antes de eliminar post
- [x] Query: `DELETE FROM studio_short_urls WHERE post_id = ?`
- [x] Usar `deleteMany` para limpieza explícita (CASCADE también lo haría)

---

### Fase 3: Cambiar URLs de Posts (Slug → CUID)

#### 3.1 Funciones de lectura
- [x] Modificar `getStudioPostBySlug()` → `getStudioPostById()`
- [x] Cambiar búsqueda de `slug` a `id` (CUID)
- [x] Mantener función antigua con deprecation warning (para migración)

#### 3.2 Funciones de creación/actualización
- [x] Modificar `createStudioPost()` - remover generación de slug único
- [x] Modificar `updateStudioPost()` - remover validación de slug único
- [x] Remover llamadas a `generateUniquePostSlug()`
- [x] Remover llamadas a `checkPostSlugExists()`

#### 3.3 Funciones de incremento de vistas
- [x] Modificar `incrementPostViewCount()` - cambiar de `slug` a `id`
- [x] Actualizar query para buscar por `id` en lugar de `slug`

---

### Fase 4: Componentes UI

#### 4.1 PostEditorSheet
- [x] Remover validación de slug (`isValidatingSlug`, `checkPostSlugExists`)
- [x] Remover campo de slug del formulario (o hacerlo opcional/oculto)
- [x] Cambiar preview de URL: `/{studioSlug}?post={postId}` (CUID)
- [x] Agregar botón "Compartir" que genera short URL
- [x] Implementar `getOrCreatePostShortUrl()` al hacer click
- [x] Mostrar short URL: `/s/{shortCode}`
- [x] Copiar short URL al portapapeles

#### 4.2 Navegación y URLs
- [x] Actualizar `useProfilePageLogic` - cambiar de `postSlug` a `postId`
- [x] Actualizar `buildUrl()` - usar `post={postId}` (CUID)
- [x] Actualizar `handlePostClick()` - pasar `post.id` en lugar de `post.slug`
- [x] Actualizar `ProfileContentView` - pasar `post.id` en lugar de `post.slug`
- [x] Actualizar `PostDetailModal` - recibir `postId` en lugar de `postSlug`

#### 4.3 Componentes que usan slugs de posts
- [x] Buscar todos los usos de `post.slug` en componentes
- [x] Reemplazar por `post.id` donde sea necesario
- [x] Actualizar `TopContentList` (analytics/dashboard) - usar `post.id`
- [x] Actualizar cualquier link que use `?post={slug}`

---

### Fase 5: Migración de Datos

#### 5.1 Migración de URLs existentes
- [ ] Crear script de migración para posts existentes
- [ ] Generar short URLs para posts existentes (opcional, bajo demanda)
- [ ] Mantener compatibilidad temporal con slugs (fallback)

#### 5.2 Limpieza
- [ ] Remover funciones deprecadas después de migración completa
- [ ] Remover campo `slug` de posts (opcional, puede quedarse como metadata)

---

### Fase 6: Testing y Validación

#### 6.1 Funcionalidad
- [ ] Crear post nuevo - verificar que usa CUID
- [ ] Compartir post - verificar que genera short URL
- [ ] Acceder a short URL - verificar redirección correcta
- [ ] Eliminar post - verificar que elimina short URL asociada
- [ ] Editar post - verificar que mantiene short URL existente

#### 6.2 URLs y navegación
- [ ] Verificar navegación entre posts (prev/next)
- [ ] Verificar modal de detalle de post
- [ ] Verificar links en analytics/dashboard
- [ ] Verificar compatibilidad con URLs antiguas (si aplica)

---

## 📁 Archivos a Modificar

### Migraciones SQL
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_add_post_id_to_short_urls.sql`
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_make_post_slug_optional.sql`

### Schema
- [ ] `prisma/schema.prisma` - Actualizar `studio_short_urls` y `studio_posts`

### Acciones
- [ ] `src/lib/actions/studio/commercial/promises/promise-short-url.actions.ts` - Agregar función para posts
- [ ] `src/lib/actions/studio/posts/posts.actions.ts` - Cambiar a CUID, agregar limpieza de short URLs

### Componentes
- [ ] `src/components/profile/sheets/PostEditorSheet.tsx` - Remover slug, agregar compartir
- [ ] `src/app/[slug]/profile/public/hooks/useProfilePageLogic.ts` - Cambiar a postId
- [ ] `src/app/[slug]/profile/public/ProfileContentView.tsx` - Cambiar a postId
- [ ] `src/components/profile/sections/PostDetailModal.tsx` - Cambiar a postId
- [ ] `src/app/[slug]/studio/analytics/components/TopContentList.tsx` - Cambiar a postId
- [ ] `src/app/[slug]/studio/commercial/dashboard/components/TopContentList.tsx` - Cambiar a postId

---

## 🔄 Orden de Implementación Recomendado

1. **Fase 1** - Migración BD (base para todo)
2. **Fase 2.1** - Función de short URLs para posts
3. **Fase 2.3** - Limpieza al eliminar (crítico)
4. **Fase 3** - Cambiar funciones de posts (CUID)
5. **Fase 4** - Componentes UI
6. **Fase 5** - Migración de datos
7. **Fase 6** - Testing

---

## ⚠️ Consideraciones

- **Backward compatibility**: Mantener soporte temporal para slugs durante migración
- **Cascade delete**: Short URLs se eliminan automáticamente con FK CASCADE
- **Performance**: Short URLs se crean bajo demanda (no en creación de post)
- **SEO**: Short URLs son amigables para compartir, CUID en URL interna

---

## 📊 Estado del Proyecto

**Última actualización**: 2026-01-23
**Rama**: `260123-studio-profile-public`
**Estado**: 🚧 En Progreso

### ✅ Completado
- Fase 1: Migración de Base de Datos ✅ (Migraciones ejecutadas en Supabase)
- Fase 2: Funciones de Acciones ✅
- Fase 3: Cambiar URLs de Posts (Slug → CUID) ✅
- Fase 4: Componentes UI ✅

### 🔄 Pendiente
- Testing completo (Fase 6)
- Migración de datos existentes (Fase 5) - Opcional (solo si hay posts existentes con slugs)

### 📝 Notas
- `getStudioPostBySlug` mantenida con deprecation warning para compatibilidad temporal
- `selectedPostSlug` mantenido como alias de `selectedPostId` para compatibilidad
- Slug opcional en posts (puede ser null, solo para metadata)
