# Análisis: Portfolios como Addon vs Integrado en Content

## 📋 Contexto

Los **Portfolios** están actualmente ubicados en `/content/portfolios` y forman parte del módulo Content. Este análisis determina si deben permanecer integrados en el plan de Content o pueden ser un addon independiente rentable por separado.

---

## 🔍 Análisis de Dependencias

### Dependencias Directas

#### ✅ **Independiente de Módulos Core**
- **Commercial**: ❌ Sin dependencias
- **Business**: ❌ Sin dependencias
- **Content**: ⚠️ Solo ubicación física, no dependencia funcional

#### ⚠️ **Dependencias Opcionales**
- **`event_type_id`** (opcional):
  - Relación con `studio_event_types` (usado en Commercial)
  - Campo puede ser `null`
  - No es crítico para funcionamiento
  - Solo para clasificación/filtrado

#### ✅ **Dependencias de Infraestructura**
- **Storage**: Sistema propio (`portfolio_media_bytes`)
  - Tabla: `studio_portfolio_media`
  - Tracking independiente en `studio_storage_usage`
  - No comparte storage con otros módulos

- **Media Management**: Sistema completo e independiente
  - `portfolio-media.actions.ts`
  - `portfolio-content-blocks.actions.ts`
  - No depende de media de otros módulos

### Integración con Perfil Público

**Uso actual:**
```typescript
// Perfil público incluye portfolios junto con:
- items (catálogo)
- paquetes
- portfolios ← Aquí
- FAQ
- Posts
```

**Consideración:**
- Portfolios se muestran en perfil público (`/[slug]/page.tsx`)
- Puede ser condicional según módulo activo
- No es dependencia crítica, solo visualización

---

## 📊 Estructura Actual

### Archivos y Componentes

```
/content/portfolios/
├── page.tsx                    # Página principal
├── [id]/editar/page.tsx        # Editor
├── nuevo/page.tsx              # Crear nuevo
└── components/
    ├── PortfolioEditor.tsx     # Editor completo
    ├── PortfoliosList.tsx      # Lista
    ├── PortfolioCard.tsx       # Card individual
    └── ...
```

### Acciones (Server Actions)

```
/lib/actions/studio/builder/portfolios/
├── portfolios.actions.ts           # CRUD principal
├── portfolio-media.actions.ts      # Gestión de media
└── portfolio-content-blocks.actions.ts  # Bloques de contenido
```

### Schema de Base de Datos

```prisma
studio_portfolios {
  id, title, slug, description
  cover_image_url, category
  event_type_id?  // ← Opcional, no crítico
  is_published, is_featured
  // ... campos propios
}

studio_portfolio_media {
  // Sistema de media independiente
  portfolio_id, studio_id
  storage_bytes, file_url, ...
}

studio_portfolio_content_blocks {
  // Sistema de bloques de contenido
  portfolio_id, type, config, ...
}
```

**Conclusión:** Estructura completamente independiente.

---

## 💰 Análisis de Viabilidad como Addon

### ✅ **Argumentos a Favor (Addon)**

1. **Independencia Funcional**
   - No requiere otros módulos para funcionar
   - Sistema de media propio
   - Storage tracking independiente

2. **Valor de Mercado**
   - Portfolios son altamente valorados por fotógrafos
   - Puede ser diferenciador competitivo
   - Justifica precio adicional

3. **Flexibilidad de Pricing**
   - Suscriptores pueden elegir solo portfolios
   - No obliga a contratar todo Content
   - Permite planes más granulares

4. **Escalabilidad**
   - Fácil de activar/desactivar por módulo
   - No afecta otros módulos si se desactiva
   - Permite límites de uso independientes

### ⚠️ **Argumentos en Contra (Integrado)**

1. **Perfil Público**
   - Se muestra junto con otros elementos de Content
   - Puede confundir si está separado
   - Requiere lógica condicional en perfil público

2. **UX del Usuario**
   - Si tiene Content, espera portfolios incluidos
   - Separar puede parecer "cobro extra"
   - Puede afectar percepción de valor

3. **Complejidad Técnica**
   - Requiere verificación de módulo en perfil público
   - Lógica condicional en múltiples lugares
   - Más puntos de fallo

---

## 🎯 Recomendación Estratégica

### Opción A: Addon Separado (Recomendado para MVP Avanzado)

**Estructura:**
```
ZEN Content (Base)
├── Posts
├── FAQ
└── Catálogo (visualización)

ZEN Portfolios (Addon) - $12-15 USD/mes
├── Portfolios avanzados
├── Content blocks
└── Media management
```

**Ventajas:**
- ✅ Mayor flexibilidad de pricing
- ✅ Permite suscripción solo a portfolios
- ✅ Mejor segmentación de mercado
- ✅ Escalable para futuros addons

**Desventajas:**
- ⚠️ Requiere lógica condicional en perfil público
- ⚠️ Más complejidad en activación de módulos

**Implementación:**
- Verificar módulo `portfolios` en perfil público
- Mostrar sección solo si está activo
- Separar en menú de navegación

### Opción B: Integrado en Content (Recomendado para MVP Inicial)

**Estructura:**
```
ZEN Content (Todo incluido)
├── Posts
├── FAQ
├── Catálogo
└── Portfolios ← Incluido
```

**Ventajas:**
- ✅ Simplicidad de implementación
- ✅ Mejor UX (todo en un lugar)
- ✅ Menos complejidad técnica
- ✅ Percepción de mayor valor

**Desventajas:**
- ⚠️ Menos flexibilidad de pricing
- ⚠️ No permite suscripción solo a portfolios
- ⚠️ Menor granularidad de planes

---

## 🔧 Plan de Implementación (Si se hace Addon)

### Fase 1: Separación de Módulo

1. **Crear módulo en DB:**
```sql
INSERT INTO platform_modules (slug, name, category, base_price)
VALUES ('portfolios', 'ZEN Portfolios', 'ADDON', 12.00);
```

2. **Mover rutas (opcional):**
```
/content/portfolios → /portfolios
```
O mantener en `/content/portfolios` pero verificar módulo.

3. **Verificación de módulo:**
```typescript
// En layout o página
const hasPortfolios = await checkStudioModule(studioId, 'portfolios');
if (!hasPortfolios) {
  redirect('/studio/[slug]/settings/modules');
}
```

### Fase 2: Perfil Público Condicional

```typescript
// En getStudioProfileBySlug
const hasPortfoliosModule = await checkStudioModule(studio.id, 'portfolios');

const portfolios = hasPortfoliosModule 
  ? await prisma.studio_portfolios.findMany({...})
  : [];
```

### Fase 3: UI Condicional

```typescript
// En ProfileContentView
{hasPortfoliosModule && (
  <ProfileContent variant="portfolio" data={{ portfolios }} />
)}
```

---

## 📈 Estrategia de Pricing Sugerida

### Escenario 1: Addon Separado

**Planes Base:**
- Starter: $0 (solo Manager)
- Pro: $29/mes (Manager + Marketing + Content básico)
- Enterprise: $49/mes (Todo incluido)

**Addons:**
- ZEN Portfolios: +$12/mes
- ZEN Payment: +$10/mes
- ZEN Conversations: +$15/mes

**Ventaja:** Suscriptor puede elegir solo portfolios sin Content completo.

### Escenario 2: Integrado

**Planes:**
- Starter: $0 (solo Manager)
- Pro: $39/mes (Manager + Marketing + Content completo con portfolios)
- Enterprise: $59/mes (Todo incluido)

**Ventaja:** Mayor valor percibido, más simple.

---

## ✅ Checklist de Decisión

### Criterios para Addon:
- [ ] ¿Hay demanda de portfolios sin Content completo?
- [ ] ¿Justifica precio adicional ($12-15/mes)?
- [ ] ¿Puede funcionar independientemente? ✅ (Sí)
- [ ] ¿Complejidad técnica es manejable? ✅ (Sí)

### Criterios para Integrado:
- [ ] ¿Portfolios es core de Content? ⚠️ (Parcial)
- [ ] ¿Mejora percepción de valor? ✅ (Sí)
- [ ] ¿Simplifica implementación? ✅ (Sí)
- [ ] ¿Reduce complejidad de módulos? ✅ (Sí)

---

## 🎯 Recomendación Final

### Para MVP Inicial: **Integrado en Content**

**Razones:**
1. Simplicidad de implementación
2. Mejor UX (todo en un lugar)
3. Mayor valor percibido
4. Menos complejidad técnica
5. Portfolios complementa Content naturalmente

### Para Fase 2 (Escalabilidad): **Evaluar Addon**

**Cuándo considerar separar:**
- Si hay demanda específica de portfolios sin Content
- Si se necesita mayor granularidad de pricing
- Si se agregan más funcionalidades avanzadas a portfolios
- Si el mercado valora portfolios como producto independiente

**Migración futura:**
- La estructura actual permite separación fácil
- Solo requiere verificación de módulo
- No requiere refactorización mayor

---

## 📝 Notas Técnicas

### Verificación de Módulo (Si se hace Addon)

```typescript
// Server Component
import { checkStudioModule } from '@/lib/modules';

export default async function PortfoliosPage({ params }) {
  const studio = await prisma.studios.findUnique({
    where: { slug: params.slug },
    select: { id: true }
  });
  
  const hasModule = await checkStudioModule(studio.id, 'portfolios');
  
  if (!hasModule) {
    redirect(`/${params.slug}/studio/settings/modules`);
  }
  
  // ... resto del componente
}
```

### Perfil Público Condicional

```typescript
// En getStudioProfileBySlug
const hasPortfoliosModule = await checkStudioModule(studio.id, 'portfolios');

const portfolios = hasPortfoliosModule
  ? studio.portfolios.filter(p => p.is_published)
  : [];
```

---

## 🔗 Referencias

- Componente: `src/app/[slug]/studio/builder/content/portfolios/`
- Acciones: `src/lib/actions/studio/builder/portfolios/`
- Schema: `prisma/schema.prisma` (líneas 2233-2348)
- Perfil público: `src/lib/actions/public/profile.actions.ts`
- Sistema de módulos: `src/lib/modules/index.ts`

---

**Última actualización:** 2025-01-XX  
**Estado:** Análisis completo  
**Recomendación:** Integrado en Content para MVP, evaluar Addon en Fase 2

