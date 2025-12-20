<!-- 8ca84731-023d-48eb-ae17-e0e6cfc00e74 d0d0b140-2a57-454a-b788-2e0598670598 -->
# Sistema de Ofertas Comerciales

## Objetivo

Permitir a los estudios crear ofertas comerciales con landing pages personalizables y leadforms integrados para capturar leads desde campañas de marketing (Meta Ads, Google Ads, etc.).

## Modelos Prisma Propuestos

### 1. `studio_offers`

Tabla principal para almacenar ofertas comerciales:

- `id`: String (CUID)
- `studio_id`: String (FK a studios)
- `name`: String (nombre de la oferta)
- `description`: String? (descripción breve)
- `objective`: String (enum: 'presencial' | 'virtual') - objetivo de la oferta
- `slug`: String (slug único por estudio para URL pública)
- `is_active`: Boolean (default: true)
- `created_at`: DateTime
- `updated_at`: DateTime
- Relación: `studio` → `studios`
- Relación: `landing_page` → `studio_offer_landing_pages` (1:1)
- Relación: `leadform` → `studio_offer_leadforms` (1:1)
- Índices: `@@unique([studio_id, slug])`, `@@index([studio_id, is_active])`

### 2. `studio_offer_landing_pages`

Landing page asociada a cada oferta (basada en sistema de portfolios):

- `id`: String (CUID)
- `offer_id`: String (FK a studio_offers, unique)
- `content_blocks`: Json (array de ContentBlock, reutilizando estructura de portfolios)
- `created_at`: DateTime
- `updated_at`: DateTime
- Relación: `offer` → `studio_offers` (1:1)

### 3. `studio_offer_leadforms`

Leadform asociado a cada oferta:

- `id`: String (CUID)
- `offer_id`: String (FK a studio_offers, unique)
- `title`: String? (título del formulario)
- `description`: String? (descripción del formulario)
- `success_message`: String (mensaje de éxito, default: "¡Gracias! Nos pondremos en contacto pronto.")
- `fields_config`: Json (configuración de campos personalizados)
- `created_at`: DateTime
- `updated_at`: DateTime
- Relación: `offer` → `studio_offers` (1:1)

### 4. `studio_offer_submissions`

Registro de envíos del leadform:

- `id`: String (CUID)
- `offer_id`: String (FK a studio_offers)
- `contact_id`: String? (FK a studio_contacts, nullable si aún no se crea contacto)
- `form_data`: Json (datos completos del formulario)
- `ip_address`: String?
- `user_agent`: String?
- `utm_source`: String?
- `utm_medium`: String?
- `utm_campaign`: String?
- `created_at`: DateTime
- Relación: `offer` → `studio_offers`
- Relación: `contact` → `studio_contacts` (opcional)
- Índices: `@@index([offer_id, created_at])`, `@@index([contact_id])`

## Relaciones con Sistema Existente

### Creación de Contactos

Cuando se envía el leadform:

1. Crear/actualizar contacto en `studio_contacts` con:

   - `status`: 'prospecto'
   - `acquisition_channel_id`: buscar/crear canal "Leadform" en `platform_acquisition_channels`
   - Datos básicos del formulario (nombre, teléfono, email)

2. Crear promise en `studio_promises` con:

   - `contact_id`: ID del contacto creado
   - `pipeline_stage_id`: etapa con `slug: 'pending'` (etapa "nuevo")
   - `status`: 'pending'

### Canal de Adquisición "Leadform"

- Verificar si existe canal "Leadform" en `platform_acquisition_channels`
- Si no existe, crearlo en el seed o al crear la primera oferta
- Usar este canal para todos los contactos generados desde leadforms

## Estructura de Archivos

```
src/
├── app/
│   └── [slug]/
│       └── offer/
│           └── [offerId]/
│               └── page.tsx          # Landing page pública
├── app/
│   └── [slug]/
│       └── studio/
│           └── offers/               # Panel de gestión (futuro)
│               ├── page.tsx          # Lista de ofertas
│               ├── nuevo/
│               │   └── page.tsx      # Crear oferta
│               └── [offerId]/
│                   └── page.tsx      # Editar oferta
├── components/
│   └── offers/
│       ├── OfferLandingPage.tsx      # Componente de landing page pública
│       ├── OfferLeadForm.tsx         # Componente de leadform
│       └── OfferEditor.tsx           # Editor de ofertas (similar a PortfolioEditor)
├── lib/
│   └── actions/
│       └── studio/
│           └── offers/
│               ├── offers.actions.ts        # CRUD de ofertas
│               ├── offer-submissions.actions.ts  # Manejo de envíos
│               └── schemas/
│                   └── offer-schemas.ts     # Schemas Zod
└── types/
    └── offers.ts                    # Types TypeScript
```

## Implementación

### Fase 1: Modelos y Migración

1. Agregar modelos a `prisma/schema.prisma`
2. Crear migración Prisma
3. Actualizar seed para crear canal "Leadform" si no existe

### Fase 2: Server Actions

1. Crear schemas Zod para validación
2. Implementar CRUD de ofertas (`createOffer`, `updateOffer`, `getOffer`, `deleteOffer`)
3. Implementar `submitOfferLeadform` que:

   - Valida datos del formulario
   - Crea/actualiza contacto
   - Crea promise con etapa "nuevo"
   - Guarda submission
   - Retorna éxito/error

### Fase 3: Componentes UI

1. `OfferEditor`: Editor similar a `PortfolioEditor` pero adaptado para ofertas

   - Reutilizar `ContentBlocksEditor` para landing page
   - Agregar sección de leadform con editor de campos personalizados

2. `OfferLandingPage`: Componente público que renderiza:

   - Landing page con content blocks
   - Leadform integrado al final

3. `OfferLeadForm`: Componente de formulario dinámico basado en `fields_config`

### Fase 4: Rutas Públicas

1. Crear ruta `[slug]/offer/[offerId]/page.tsx`
2. Implementar página pública que carga oferta y renderiza `OfferLandingPage`
3. Manejar envío de formulario y redirección

### Fase 5: Integración con Promise Kanban

- Los contactos creados desde leadforms aparecerán automáticamente en el kanban
- Canal de adquisición "Leadform" permitirá filtrar/tracking
- Etapa "nuevo" (pending) será la inicial

## Consideraciones Técnicas

1. **Reutilización de Código**: Aprovechar `ContentBlocksEditor` y estructura de portfolios para landing pages
2. **Validación**: Usar Zod para validar tanto configuración de ofertas como datos de leadform
3. **Seguridad**: Validar que el estudio tenga permisos para crear ofertas
4. **Performance**: Indexar correctamente para queries rápidas de ofertas activas
5. **UTM Tracking**: Capturar parámetros UTM para análisis de campañas

## Campos Personalizados del Leadform

El `fields_config` será un JSON con estructura:

```typescript
{
  fields: [
    {
      id: string,
      type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'date',
      label: string,
      required: boolean,
      placeholder?: string,
      options?: string[] // para select
    }
  ]
}
```

Los campos básicos (nombre, teléfono, email) siempre estarán presentes, pero el usuario puede agregar campos adicionales.

### To-dos

- [ ] Agregar modelos Prisma: studio_offers, studio_offer_landing_pages, studio_offer_leadforms, studio_offer_submissions
- [ ] Crear migración Prisma y actualizar seed para canal Leadform
- [ ] Crear schemas Zod para ofertas y leadforms (offer-schemas.ts)
- [ ] Implementar server actions: CRUD de ofertas (offers.actions.ts)
- [ ] Implementar server action submitOfferLeadform que crea contacto y promise
- [ ] Crear componente OfferEditor reutilizando ContentBlocksEditor
- [ ] Crear componente OfferLeadForm con campos dinámicos
- [ ] Crear componente OfferLandingPage para renderizado público
- [ ] Crear ruta pública [slug]/offer/[offerId]/page.tsx
- [ ] Integrar con sistema de promises para mostrar leads en kanban