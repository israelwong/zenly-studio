# Análisis Profundo: Refactor de `studio_event_types` para Soporte de Covers Multimedia

**Fecha:** 26 de noviembre de 2024  
**Objetivo:** Preparar refactor para añadir soporte de diseño (Covers multimedia) a la entidad `studio_event_types`

---

## 1. Esquema Prisma Actual

### 1.1 Definición del Modelo

**Ubicación:** `prisma/schema.prisma` (líneas 1044-1065)

```prisma
model studio_event_types {
  id                 String                      @id @default(cuid())
  studio_id          String
  name               String
  status             String                      @default("active")
  order              Int                         @default(0)
  created_at         DateTime                    @default(now())
  updated_at         DateTime                    @updatedAt
  
  // Relaciones
  contract_templates studio_contract_templates[]
  quotes             studio_cotizaciones[]
  studio             studios                     @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  events             studio_events[]
  offers             studio_offers[]
  packages           studio_paquetes[]
  portfolios         studio_portfolios[]
  posts              studio_posts[]
  promises           studio_promises[]

  @@unique([studio_id, name])
  @@index([studio_id])
  @@index([studio_id, status])
}
```

### 1.2 Campos Actuales

| Campo | Tipo | Descripción | Restricciones |
|-------|------|-------------|---------------|
| `id` | String (CUID) | Identificador único | Primary Key |
| `studio_id` | String | ID del estudio | Foreign Key → `studios.id` |
| `name` | String | Nombre del tipo de evento | Único por studio (case-insensitive) |
| `status` | String | Estado (active/inactive) | Default: "active" |
| `order` | Int | Orden de visualización | Default: 0 |
| `created_at` | DateTime | Fecha de creación | Auto-generado |
| `updated_at` | DateTime | Fecha de actualización | Auto-actualizado |

### 1.3 Relaciones Identificadas

El modelo `studio_event_types` tiene **9 relaciones** con otras entidades:

1. **`contract_templates`** → `studio_contract_templates[]` (Plantillas de contrato)
2. **`quotes`** → `studio_cotizaciones[]` (Cotizaciones)
3. **`studio`** → `studios` (Estudio propietario)
4. **`events`** → `studio_events[]` (Eventos)
5. **`offers`** → `studio_offers[]` (Ofertas)
6. **`packages`** → `studio_paquetes[]` (Paquetes)
7. **`portfolios`** → `studio_portfolios[]` (Portafolios)
8. **`posts`** → `studio_posts[]` (Posts)
9. **`promises`** → `studio_promises[]` (Promesas)

**⚠️ Nota Crítica:** Todas estas relaciones deben considerarse al agregar campos multimedia, ya que podrían requerir actualizaciones en queries existentes.

---

## 2. Flujos de Creación Actuales

### 2.1 Modal de Creación Rápida (`TipoEventoQuickAddModal`)

**Ubicación:** `src/components/shared/tipos-evento/TipoEventoQuickAddModal.tsx`

**Características:**
- Modal simple con solo campo `nombre`
- Soporta creación y edición
- Z-index configurable para modales anidados
- Callback `onSuccess` para actualizar estado padre

**Uso Actual:**
- ✅ **EventFormModal** (`src/components/shared/promises/EventFormModal.tsx:1603`)
  - Se abre cuando el usuario quiere crear un tipo de evento desde el formulario de promesa
  - Z-index: `zIndex + 10` (modales anidados)

**Flujo:**
```typescript
1. Usuario hace clic en "Agregar nuevo tipo" en selector
2. Se abre TipoEventoQuickAddModal
3. Usuario ingresa nombre
4. Se llama a crearTipoEvento() (Server Action)
5. onSuccess actualiza el selector padre
6. Modal se cierra
```

### 2.2 Selector con Quick Add (`TipoEventoSelector`)

**Ubicación:** `src/components/shared/tipos-evento/TipoEventoSelector.tsx`

**Características:**
- Selector de tipo único
- Botón "Crear primer tipo" si no hay tipos
- Botón "Gestionar" que abre modal de gestión
- Integra `TipoEventoQuickAddModal` internamente

**Uso Actual:**
- Usado en formularios de portfolios, posts, etc.
- Muestra lista de tipos activos con badges de cantidad de paquetes

### 2.3 Modal de Gestión (`TipoEventoManagementModal`)

**Ubicación:** `src/components/shared/tipos-evento/TipoEventoManagementModal.tsx`

**Características:**
- Lista completa de tipos de evento
- Edición inline (nombre)
- Eliminación con confirmación
- Creación de nuevos tipos
- Callback `onUpdate` para sincronizar estado

**Uso Actual:**
- Se abre desde `TipoEventoSelector` (botón "Gestionar")
- Se abre desde `EventTypesManager` (gestión múltiple)

### 2.4 Manager de Tipos Múltiples (`EventTypesManager`)

**Ubicación:** `src/components/shared/tipos-evento/EventTypesManager.tsx`

**Características:**
- Permite seleccionar múltiples tipos de evento
- Integra `TipoEventoQuickAddModal` y `TipoEventoManagementModal`
- Usado en formularios que requieren múltiples tipos

**Uso Actual:**
- Formularios de ofertas (lead forms)
- Configuraciones que requieren múltiples tipos

### 2.5 Resumen de Puntos de Creación

| Componente | Ubicación | Contexto | Modal Usado |
|------------|-----------|----------|-------------|
| `EventFormModal` | `src/components/shared/promises/EventFormModal.tsx` | Crear promesa | `TipoEventoQuickAddModal` |
| `TipoEventoSelector` | `src/components/shared/tipos-evento/TipoEventoSelector.tsx` | Selector simple | `TipoEventoQuickAddModal` |
| `EventTypesManager` | `src/components/shared/tipos-evento/EventTypesManager.tsx` | Selección múltiple | `TipoEventoQuickAddModal` |
| `TipoEventoManagementModal` | `src/components/shared/tipos-evento/TipoEventoManagementModal.tsx` | Gestión completa | Creación inline |

**⚠️ Observación:** Todos los modales actuales son **muy simples** (solo campo nombre). El nuevo modal enriquecido deberá reemplazarlos todos.

---

## 3. Server Actions y Funciones de Obtención

### 3.1 Server Actions Principales

**Ubicación:** `src/lib/actions/studio/negocio/tipos-evento.actions.ts`

#### 3.1.1 `obtenerTiposEvento(studioSlug: string)`

**Query Prisma:**
```typescript
prisma.studio_event_types.findMany({
  where: { studio_id },
  include: {
    _count: {
      select: { events: true }
    }
  },
  orderBy: { order: 'asc' }
})
```

**Retorna:**
- Lista completa de tipos de evento del estudio
- Incluye conteo de eventos asociados
- Ordenados por campo `order`

**Uso:**
- ✅ `TipoEventoSelector` - Carga inicial
- ✅ `EventTypesManager` - Carga inicial
- ✅ `TipoEventoManagementModal` - Carga inicial
- ✅ `PaquetesPage` - Caché con `unstable_cache` (1 hora)
- ✅ `PaquetesTipoEventoList` - Lista de tipos con paquetes

#### 3.1.2 `crearTipoEvento(studioSlug: string, data: unknown)`

**Validación:** `TipoEventoSchema` (nombre: 3-50 caracteres, status: active/inactive)

**Lógica:**
1. Valida nombre único (case-insensitive)
2. Calcula siguiente posición (`order`)
3. Crea registro
4. Revalida rutas y tags de caché

**Revalidaciones:**
- `revalidatePath(/commercial/paquetes)`
- `revalidateTag(tipos-evento-${studioSlug})`
- `revalidateTag(paquetes-shell-${studioSlug})`

#### 3.1.3 `actualizarTipoEvento(studioSlug: string, tipoId: string, data: unknown)`

**Validación:** `ActualizarTipoEventoSchema` (parcial)

**Lógica:**
- Valida nombre único si se actualiza
- Actualiza campos permitidos
- Revalida rutas y tags

#### 3.1.4 `eliminarTipoEvento(tipoId: string)`

**Validaciones de Integridad:**
- ✅ Verifica paquetes asociados
- ✅ Verifica promesas asociadas
- ✅ Verifica leads activos (no convertidos)

**Bloquea eliminación si hay relaciones activas.**

#### 3.1.5 `obtenerTipoEventoPorId(tipoId: string, includePackages: boolean)`

**Query opcional con `packages` si `includePackages = true`**

### 3.2 Server Action Alternativa

**Ubicación:** `src/lib/actions/studio/commercial/promises/event-types.actions.ts`

#### `getEventTypes(studioSlug: string)`

**Query Prisma:**
```typescript
prisma.studio_event_types.findMany({
  where: {
    studio_id: studio.id,
    status: 'active'
  },
  select: {
    id: true,
    name: true
  },
  orderBy: { order: 'asc' }
})
```

**Retorna:** Solo `id` y `name` (versión ligera)

**Uso:** Formularios que solo necesitan lista básica

### 3.3 Queries Directas de Prisma

**En otros archivos:**
- `getPublicPromiseData()` - Incluye `event_type` en promesas públicas
- `getPaquetesShell()` - Incluye `event_type_id` en paquetes
- `getEvents()` - Incluye `event_type` en eventos

**⚠️ Nota:** Todas estas queries deberán actualizarse para incluir nuevos campos multimedia.

---

## 4. Componentes de Preview Mobile Disponibles

### 4.1 `MobilePreviewFull`

**Ubicación:** `src/components/previews/MobilePreviewFull.tsx`

**Características:**
- Preview móvil full-page sin navbar
- Dimensiones: 375px × 812px (iPhone estándar)
- Header opcional (`hideHeader`)
- Footer opcional (`hideFooter`)
- Scroll interno
- Bordes redondeados (rounded-3xl)

**Uso Actual:**
- ✅ **LandingPageTab** (`src/app/[slug]/studio/commercial/ofertas/components/tabs/LandingPageTab.tsx:50`)
  - Preview de landing page de ofertas
  - Muestra `OfferLandingPage` dentro del preview

**Props:**
```typescript
interface MobilePreviewFullProps {
  children: React.ReactNode;
  data?: any;
  loading?: boolean;
  contentVariant?: 'post-detail' | 'faq' | string;
  onClose?: () => void;
  onBack?: () => void;
  isEditMode?: boolean;
  hidePortfolioHeader?: boolean;
  hideHeader?: boolean;
  hideFooter?: boolean;
}
```

**✅ Reutilizable para:** Preview de tipo de evento con cover multimedia

### 4.2 `MobilePreviewContainer`

**Ubicación:** `src/components/previews/MobilePreviewContainer.tsx`

**Características:**
- Contenedor más completo con `ProfileHeader`
- Navbar opcional
- Tabs de navegación
- Variantes de contenido (skeleton, faq, etc.)

**Uso Actual:**
- Builder preview
- Perfil público

**✅ Reutilizable para:** Preview más completo si se necesita header del estudio

### 4.3 `OfferCardPreview`

**Ubicación:** `src/components/previews/OfferCardPreview.tsx`

**Características:**
- Preview de card de oferta
- Soporta imagen y video como cover
- Variantes: `compact` y `full`
- Muestra descuento, fechas, tipo de evento

**Props relevantes:**
```typescript
coverMediaUrl?: string;
coverMediaType?: "image" | "video";
eventTypeName?: string;
```

**✅ Reutilizable para:** Card preview de tipo de evento (similar a ofertas)

### 4.4 Resumen de Componentes Reutilizables

| Componente | Uso Recomendado | Complejidad |
|------------|-----------------|-------------|
| `MobilePreviewFull` | Preview full-page del tipo de evento | ⭐⭐ (Simple) |
| `OfferCardPreview` | Card preview con cover multimedia | ⭐ (Muy simple) |
| `MobilePreviewContainer` | Preview con header del estudio | ⭐⭐⭐ (Complejo) |

**Recomendación:** Usar `MobilePreviewFull` para el nuevo modal enriquecido, ya que es el más simple y se adapta perfectamente al caso de uso.

---

## 5. Rutas y Navegación

### 5.1 Ruta en Sidebar

**Ubicación:** `src/app/[slug]/studio/components/sidebar/StudioSidebar.tsx:108`

```typescript
{ 
  id: 'tipo-eventos', 
  name: 'Tipos de Eventos', 
  href: `/commercial/tipo-eventos`, 
  icon: Tags 
}
```

**⚠️ Observación:** La ruta `/commercial/tipo-eventos` está definida en el sidebar, pero **NO se encontró la página correspondiente** en el codebase.

**Implicación:** Probablemente la ruta está planificada pero no implementada. El nuevo modal enriquecido podría servir tanto para:
1. Creación rápida (modales actuales)
2. Edición completa (nueva ruta dedicada)

### 5.2 Ruta de Configuración

**Ubicación:** `src/app/[slug]/studio/components/layout/StudioLayoutWrapper.tsx:235`

```typescript
{
  id: 'tipos-evento',
  title: 'Tipos de Evento',
  description: 'Gestiona los tipos de eventos disponibles para tus promesas',
  icon: Package,
  onClick: () => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-event-types-modal'));
    }, 100);
  }
}
```

**Implicación:** Actualmente se abre un modal global. Podría redirigir a la nueva ruta dedicada.

---

## 6. Schemas y Validación

### 6.1 Schema Actual

**Ubicación:** `src/lib/actions/schemas/tipos-evento-schemas.ts`

**TipoEventoSchema:**
```typescript
z.object({
  nombre: z.string().min(3).max(50).trim(),
  status: z.enum(['active', 'inactive']).default('active')
})
```

**TipoEventoData Interface:**
```typescript
interface TipoEventoData {
  id: string;
  studio_id?: string;
  nombre: string;
  status: string;
  orden: number;
  color?: string;        // ⚠️ No existe en Prisma
  createdAt: Date;
  updatedAt: Date;
  icono?: string;       // ⚠️ No existe en Prisma
  descripcion?: string; // ⚠️ No existe en Prisma
  paquetes?: PaqueteData[];
  _count?: { eventos: number };
}
```

**⚠️ Discrepancia Crítica:** El interface `TipoEventoData` incluye campos (`color`, `icono`, `descripcion`) que **NO existen en el esquema Prisma actual**. Esto sugiere que:
1. Estos campos fueron planificados pero no implementados
2. O hay una migración pendiente
3. O el interface está desactualizado

**Recomendación:** Verificar si estos campos existen en la base de datos real antes de agregar campos multimedia.

---

## 7. Caché y Revalidación

### 7.1 Tags de Caché Identificados

- `tipos-evento-${studioSlug}` - Invalidado en crear/actualizar/eliminar
- `paquetes-shell-${studioSlug}` - Invalidado cuando cambian tipos (por relación)

### 7.2 Rutas Revalidadas

- `/${studioSlug}/studio/commercial/paquetes` - Revalidada en cambios de tipos

**⚠️ Consideración:** Al agregar campos multimedia, considerar:
- Nuevos tags de caché para covers
- Revalidación de rutas públicas que muestren tipos de evento
- Invalidación de CDN si se usa para almacenar multimedia

---

## 8. Puntos de Inyección en UI

### 8.1 Formularios que Usan Tipos de Evento

1. **Formulario de Promesa** (`EventFormModal`)
   - Selector de tipo de evento
   - Quick add disponible

2. **Formulario de Paquete** (`PaqueteEditor`)
   - Selector de tipo de evento
   - Quick add disponible

3. **Formulario de Portafolio**
   - `TipoEventoSelector` integrado

4. **Formulario de Post**
   - `TipoEventoSelector` integrado

5. **Formulario de Oferta** (Lead Form)
   - `EventTypesManager` (selección múltiple)

### 8.2 Vistas que Muestran Tipos de Evento

1. **Página de Paquetes** (`PaquetesPage`)
   - Lista de tipos con sus paquetes
   - `PaquetesTipoEventoList` component

2. **Vistas Públicas**
   - Promesas públicas muestran `event_type_name`
   - Ofertas públicas muestran tipos asociados

---

## 9. Recomendaciones para el Refactor

### 9.1 Migración de Base de Datos

**Campos a Agregar:**
```prisma
model studio_event_types {
  // ... campos existentes ...
  
  // Nuevos campos multimedia
  cover_image_url    String?  // URL de imagen de portada
  cover_video_url    String?  // URL de video de portada
  cover_media_type   String?  // "image" | "video" | null
  description        String?  // Descripción del tipo de evento
  color              String?  // Color de identificación (hex)
  icon               String?  // Nombre de icono (lucide-react)
}
```

**Consideraciones:**
- Todos los campos opcionales para mantener compatibilidad
- `cover_media_type` para distinguir entre imagen y video
- `color` e `icon` para personalización visual

### 9.2 Nuevo Modal Enriquecido Universal

**Componente Propuesto:** `TipoEventoEnrichedModal.tsx`

**Características:**
- ✅ Formulario completo (nombre, descripción, color, icono)
- ✅ Upload de cover (imagen/video)
- ✅ Preview mobile en tiempo real (`MobilePreviewFull`)
- ✅ Modo creación y edición
- ✅ Reemplaza todos los modales actuales

**Props:**
```typescript
interface TipoEventoEnrichedModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  tipoEvento?: TipoEventoData; // Para edición
  onSuccess: (tipoEvento: TipoEventoData) => void;
  mode?: 'create' | 'edit';
  zIndex?: number;
}
```

### 9.3 Actualización de Server Actions

**Modificar:**
- `crearTipoEvento()` - Aceptar campos multimedia
- `actualizarTipoEvento()` - Permitir actualizar covers
- `obtenerTiposEvento()` - Incluir campos multimedia en select

**Nuevo Schema:**
```typescript
export const TipoEventoEnrichedSchema = z.object({
  nombre: z.string().min(3).max(50).trim(),
  descripcion: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  cover_image_url: z.string().url().optional().nullable(),
  cover_video_url: z.string().url().optional().nullable(),
  cover_media_type: z.enum(['image', 'video']).optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active')
});
```

### 9.4 Actualización de Componentes Existentes

**Reemplazar:**
1. `TipoEventoQuickAddModal` → `TipoEventoEnrichedModal` (modo create)
2. `TipoEventoManagementModal` → Usar `TipoEventoEnrichedModal` para edición
3. `TipoEventoSelector` → Integrar `TipoEventoEnrichedModal` en lugar de quick add

**Mantener:**
- `TipoEventoSelector` (solo cambiar modal interno)
- `EventTypesManager` (solo cambiar modal interno)

### 9.5 Nueva Ruta Dedicada

**Ruta Propuesta:** `/[slug]/studio/commercial/tipo-eventos`

**Página:**
- Lista de tipos de evento con covers
- Grid/List view toggle
- Filtros y búsqueda
- Acciones: crear, editar, eliminar, reordenar
- Preview mobile para cada tipo

**Componente:** `TipoEventosPage.tsx`

---

## 10. Checklist de Implementación

### Fase 1: Migración de Base de Datos
- [ ] Crear migración Prisma para nuevos campos
- [ ] Verificar que campos `color`, `icono`, `descripcion` no existen (o migrarlos)
- [ ] Agregar campos multimedia: `cover_image_url`, `cover_video_url`, `cover_media_type`
- [ ] Ejecutar migración en desarrollo
- [ ] Validar integridad de datos existentes

### Fase 2: Actualización de Schemas
- [ ] Actualizar `TipoEventoSchema` con campos multimedia
- [ ] Actualizar `TipoEventoData` interface
- [ ] Crear `TipoEventoEnrichedSchema` para validación completa

### Fase 3: Server Actions
- [ ] Actualizar `crearTipoEvento()` para aceptar multimedia
- [ ] Actualizar `actualizarTipoEvento()` para multimedia
- [ ] Actualizar `obtenerTiposEvento()` para incluir campos multimedia
- [ ] Agregar función de upload de covers (si se almacena en Supabase Storage)

### Fase 4: Componente Modal Enriquecido
- [ ] Crear `TipoEventoEnrichedModal.tsx`
- [ ] Integrar `MobilePreviewFull` para preview
- [ ] Implementar upload de imagen/video
- [ ] Selector de color e icono
- [ ] Validación de formulario
- [ ] Manejo de errores

### Fase 5: Reemplazo de Modales Existentes
- [ ] Reemplazar `TipoEventoQuickAddModal` en `EventFormModal`
- [ ] Reemplazar en `TipoEventoSelector`
- [ ] Reemplazar en `EventTypesManager`
- [ ] Actualizar `TipoEventoManagementModal` para usar nuevo modal

### Fase 6: Nueva Ruta Dedicada
- [ ] Crear `/[slug]/studio/commercial/tipo-eventos/page.tsx`
- [ ] Implementar lista/grid view
- [ ] Agregar filtros y búsqueda
- [ ] Integrar preview mobile
- [ ] Agregar acciones de gestión

### Fase 7: Actualización de Vistas Públicas
- [ ] Actualizar queries públicas para incluir covers
- [ ] Mostrar covers en promesas públicas
- [ ] Mostrar covers en ofertas públicas
- [ ] Actualizar componentes de preview público

### Fase 8: Testing y Validación
- [ ] Probar creación con covers
- [ ] Probar edición de covers
- [ ] Validar preview mobile
- [ ] Verificar revalidación de caché
- [ ] Probar en diferentes dispositivos

---

## 11. Archivos Clave a Modificar

### 11.1 Esquema y Migraciones
- `prisma/schema.prisma` - Agregar campos multimedia
- `prisma/migrations/` - Nueva migración

### 11.2 Schemas y Validación
- `src/lib/actions/schemas/tipos-evento-schemas.ts` - Actualizar schemas

### 11.3 Server Actions
- `src/lib/actions/studio/negocio/tipos-evento.actions.ts` - Actualizar funciones
- `src/lib/actions/studio/commercial/promises/event-types.actions.ts` - Incluir multimedia

### 11.4 Componentes Nuevos
- `src/components/shared/tipos-evento/TipoEventoEnrichedModal.tsx` - **NUEVO**
- `src/app/[slug]/studio/commercial/tipo-eventos/page.tsx` - **NUEVO**

### 11.5 Componentes a Modificar
- `src/components/shared/tipos-evento/TipoEventoSelector.tsx` - Cambiar modal
- `src/components/shared/tipos-evento/EventTypesManager.tsx` - Cambiar modal
- `src/components/shared/promises/EventFormModal.tsx` - Cambiar modal
- `src/app/[slug]/studio/commercial/paquetes/components/PaquetesTipoEventoList.tsx` - Mostrar covers

### 11.6 Queries Públicas
- `src/lib/actions/public/promesas.actions.ts` - Incluir covers en tipos
- `src/lib/actions/studio/offers/offers.actions.ts` - Incluir covers en tipos

---

## 12. Consideraciones Técnicas

### 12.1 Almacenamiento de Multimedia

**Opciones:**
1. **Supabase Storage** (recomendado)
   - Bucket: `event-type-covers`
   - Path: `{studio_id}/{event_type_id}/cover.{ext}`
   - Políticas RLS por studio

2. **URLs Externas**
   - Permitir URLs de servicios externos (Cloudinary, etc.)
   - Validar formato en schema

### 12.2 Optimización de Imágenes

- Usar `next/image` para covers
- Generar thumbnails automáticos
- Lazy loading en listas

### 12.3 Compatibilidad con Datos Existentes

- Todos los campos nuevos deben ser opcionales
- Valores por defecto para tipos existentes
- Migración de datos si es necesario

### 12.4 Performance

- Caché de covers con tags específicos
- CDN para covers si se usa Supabase Storage
- Lazy loading de previews

---

## 13. Conclusión

El refactor de `studio_event_types` para soporte de covers multimedia es **factible y bien estructurado**. El proyecto ya tiene:

✅ Componentes de preview mobile reutilizables  
✅ Infraestructura de modales bien definida  
✅ Server Actions modulares  
✅ Sistema de caché y revalidación  

**Próximos Pasos:**
1. Crear migración de base de datos
2. Desarrollar `TipoEventoEnrichedModal` con preview
3. Reemplazar modales existentes gradualmente
4. Implementar ruta dedicada para gestión completa

**Riesgos Identificados:**
- ⚠️ Discrepancia entre interface TypeScript y esquema Prisma (campos `color`, `icono`, `descripcion`)
- ⚠️ Múltiples puntos de creación que deben actualizarse
- ⚠️ Queries públicas que requieren actualización

**Tiempo Estimado:** 3-5 días de desarrollo + 1 día de testing

---

**Documento generado:** 26 de noviembre de 2024  
**Última actualización:** 26 de noviembre de 2024
