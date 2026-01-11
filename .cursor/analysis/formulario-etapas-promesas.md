# Análisis: Formulario por Etapas para Promesas

## 📋 Objetivo

Mejorar la experiencia de usuario (tanto estudio como prospecto) implementando un formulario por etapas que capture:
- Datos del interesado
- Tipo de evento y fecha
- Preferencias de servicios (momentos previos, día del evento, entrega)

---

## 🔍 Flujo Actual

### 1. Formulario Rápido en Estudio (`PromiseFormModal.tsx`)

**Ubicación:** `/src/app/[slug]/studio/commercial/promises/components/PromiseFormModal.tsx`

**Campos actuales:**
- ✅ Nombre (con búsqueda @contacto)
- ✅ Teléfono
- ✅ Email (opcional)
- ✅ Tipo de evento (requerido)
- ✅ Duración del evento (horas)
- ✅ Fecha de interés (calendario)
- ✅ Canal de adquisición (requerido)
- ✅ Red social (si canal = redes sociales)
- ✅ Referido por (si canal = referidos)

**Flujo:**
1. Usuario del estudio completa formulario
2. Al guardar, se crea/actualiza contacto y promesa
3. Si es creación nueva, redirige a página de la promesa
4. La promesa queda en estado "pending"

**Limitaciones:**
- No captura preferencias de servicios
- No diferencia entre servicios previos, día del evento y entrega
- La selección de servicios ocurre después en la creación de cotizaciones

---

### 2. Formulario Público Básico (`OfferLeadForm`)

**Ubicación:** `/src/app/[slug]/offer/[offerId]/leadform/page.tsx`

**Campos actuales:**
- ✅ Nombre completo
- ✅ Teléfono (10 dígitos, validación)
- ✅ Email (opcional o requerido según configuración)
- ✅ Fecha de interés (opcional, con validación de calendario)
- ✅ Nombre del evento (opcional)

**Flujo:**
1. Prospecto completa formulario público
2. Se valida teléfono/email contra contactos existentes
3. Se crea contacto y promesa asociada a la oferta
4. Opcionalmente redirige a página de paquetes

**Limitaciones:**
- Muy básico, solo datos de contacto
- No captura preferencias de servicios
- No diferencia etapas del servicio

---

## 🗄️ Modelos Actuales del Esquema

### `studio_promises`

```prisma
model studio_promises {
  id                              String
  studio_id                       String
  contact_id                      String
  event_type_id                   String?
  event_location                  String?
  name                            String?              // Nombre del evento
  address                         String?
  event_date                      DateTime?
  duration_hours                  Int?
  pipeline_stage_id               String?
  status                          String               @default("pending")
  defined_date                    DateTime?
  tentative_dates                 Json?                // Fechas tentativas
  // ... otros campos de configuración de share
}
```

**Relaciones:**
- `contact` → `studio_contacts` (1:1)
- `event_type` → `studio_event_types` (N:1)
- `quotes` → `studio_cotizaciones[]` (1:N)
- `offer` → `studio_offers` (N:1)

**Campos faltantes para preferencias:**
- ❌ No hay campos para servicios de interés
- ❌ No hay estructura para preferencias por etapa (previo/día/entrega)
- ❌ No hay campos para preferencias de impresos (tamaño, acabado)

---

### `studio_cotizaciones` y `studio_cotizacion_items`

**Estructura actual:**
- Las cotizaciones se crean **después** de la promesa
- Los items de cotización (`studio_cotizacion_items`) contienen servicios seleccionados
- Los servicios se relacionan con categorías (`studio_service_categories`)

**Relación:**
```
studio_promises → studio_cotizaciones → studio_cotizacion_items → studio_items
```

**Problema:** Las preferencias del prospecto no se capturan en la creación inicial de la promesa.

---

## 🎯 Requerimientos del Nuevo Formulario

### Etapa 1: Datos del Interesado
- Nombre
- Teléfono
- Correo
- Tipo de evento
- Fecha de evento

### Etapa 2: Preferencias de Servicios

#### Momentos Previos al Evento
- **Sesión previa**
  - Fotografía (checkbox)
  - Video (checkbox)
- **Impresos de sesión**
  - Cuadro (checkbox)
  - Libro (checkbox)

#### Día del Evento
- **Arreglo en domicilio** (2hrs) (checkbox)
- **Fotografía** (checkbox)
- **Video** (checkbox)
- **Cobertura de evento**
  - Duración (horas)
  - Fotografía (checkbox)
  - Video (checkbox)

#### Entrega
- **Digital** (checkbox)
- **Digital + libro impreso** (checkbox)
- **Si impreso:**
  - Tamaño (select)
  - Acabado clásico + imágenes de referencia (checkbox)
  - Acabado premium + imágenes de referencia (checkbox)

---

## 🔧 Cambios Necesarios en el Esquema

### Opción 1: Campo JSON en `studio_promises` (Rápido)

**Ventajas:**
- ✅ Implementación rápida
- ✅ No requiere migración compleja
- ✅ Flexible para cambios futuros

**Desventajas:**
- ❌ Menos estructurado
- ❌ Más difícil de consultar/filtrar
- ❌ No aprovecha relaciones de Prisma

**Implementación:**
```prisma
model studio_promises {
  // ... campos existentes
  service_preferences Json? // Almacenar preferencias como JSON
}
```

**Estructura JSON propuesta:**
```typescript
{
  pre_event: {
    session: {
      photography: boolean;
      video: boolean;
    };
    prints: {
      cuadro: boolean;
      libro: boolean;
    };
  };
  event_day: {
    home_styling: boolean; // Arreglo en domicilio
    photography: boolean;
    video: boolean;
    coverage: {
      duration_hours: number | null;
      photography: boolean;
      video: boolean;
    };
  };
  delivery: {
    digital: boolean;
    digital_plus_book: boolean;
    printed_book: {
      enabled: boolean;
      size: string | null; // "pequeño" | "mediano" | "grande"
      finish_classic: boolean;
      finish_premium: boolean;
    };
  };
}
```

---

### Opción 2: Tabla Relacional `studio_promise_service_preferences` (Recomendado)

**Ventajas:**
- ✅ Estructurado y normalizado
- ✅ Fácil de consultar/filtrar
- ✅ Relaciones explícitas con servicios
- ✅ Escalable para futuras funcionalidades

**Desventajas:**
- ❌ Requiere migración más compleja
- ❌ Más tablas que mantener

**Implementación:**
```prisma
model studio_promise_service_preferences {
  id                String   @id @default(cuid())
  promise_id        String
  service_stage     String   // "pre_event" | "event_day" | "delivery"
  service_type      String   // "session_photography" | "session_video" | "home_styling" | etc.
  service_value     Json?    // Valores específicos (duración, tamaño, acabado)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  promise           studio_promises @relation(fields: [promise_id], references: [id], onDelete: Cascade)

  @@unique([promise_id, service_stage, service_type])
  @@index([promise_id])
}

model studio_promises {
  // ... campos existentes
  service_preferences studio_promise_service_preferences[]
}
```

**Estructura de datos:**
- `service_stage`: Etapa del servicio (pre_event, event_day, delivery)
- `service_type`: Tipo específico (session_photography, coverage_duration, printed_book_size, etc.)
- `service_value`: JSON con valores específicos (ej: `{ duration_hours: 4 }`, `{ size: "grande", finish: "premium" }`)

---

### Opción 3: Campos Específicos en `studio_promises` (No recomendado)

**Desventajas:**
- ❌ Muchos campos nullable
- ❌ Difícil de mantener
- ❌ No escalable

---

## 📊 Comparación de Opciones

| Aspecto | Opción 1 (JSON) | Opción 2 (Relacional) | Opción 3 (Campos) |
|---------|----------------|----------------------|-------------------|
| **Velocidad de implementación** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Estructura** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Consultabilidad** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| **Mantenibilidad** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## 🎨 Cambios en Componentes

### 1. Nuevo Componente: `PromiseMultiStepForm`

**Estructura propuesta:**
```
PromiseMultiStepForm/
├── Step1ContactData.tsx      // Datos del interesado
├── Step2ServicePreferences.tsx // Preferencias de servicios
├── Step3Review.tsx            // Revisión antes de guardar
└── PromiseMultiStepForm.tsx   // Contenedor con navegación
```

**Características:**
- Navegación entre etapas (anterior/siguiente)
- Validación por etapa
- Guardado progresivo (opcional)
- Preview de datos antes de guardar

---

### 2. Actualización: `PromiseFormModal.tsx`

**Opciones:**
- **A)** Reemplazar completamente con `PromiseMultiStepForm`
- **B)** Agregar toggle "Modo avanzado" que muestre formulario por etapas
- **C)** Mantener formulario rápido + opción "Agregar preferencias" después

**Recomendación:** Opción B (toggle) para mantener compatibilidad con usuarios que prefieren formulario rápido.

---

### 3. Actualización: `OfferLeadForm`

**Cambios:**
- Agregar paso 2 (preferencias) después de datos básicos
- Hacer opcional el paso 2 (configurable desde oferta)
- Guardar preferencias en promesa al crear

---

## 🔄 Cambios en Schemas de Validación

### `promises-schemas.ts`

```typescript
// Nuevo schema para preferencias
export const servicePreferencesSchema = z.object({
  pre_event: z.object({
    session: z.object({
      photography: z.boolean().default(false),
      video: z.boolean().default(false),
    }).optional(),
    prints: z.object({
      cuadro: z.boolean().default(false),
      libro: z.boolean().default(false),
    }).optional(),
  }).optional(),
  event_day: z.object({
    home_styling: z.boolean().default(false),
    photography: z.boolean().default(false),
    video: z.boolean().default(false),
    coverage: z.object({
      duration_hours: z.number().int().positive().nullable(),
      photography: z.boolean().default(false),
      video: z.boolean().default(false),
    }).optional(),
  }).optional(),
  delivery: z.object({
    digital: z.boolean().default(false),
    digital_plus_book: z.boolean().default(false),
    printed_book: z.object({
      enabled: z.boolean().default(false),
      size: z.enum(["pequeño", "mediano", "grande"]).nullable(),
      finish_classic: z.boolean().default(false),
      finish_premium: z.boolean().default(false),
    }).optional(),
  }).optional(),
});

// Extender createPromiseSchema
export const createPromiseSchema = z.object({
  // ... campos existentes
  service_preferences: servicePreferencesSchema.optional(),
});
```

---

## 🚀 Plan de Implementación

### Fase 1: Análisis y Diseño (Actual)
- ✅ Identificar flujo actual
- ✅ Identificar modelos y relaciones
- ✅ Definir estructura de preferencias
- ✅ Evaluar opciones de implementación

### Fase 2: Cambios en Base de Datos
- [ ] Crear migración para agregar campo/tabla de preferencias
- [ ] Actualizar schema Prisma
- [ ] Generar tipos TypeScript

### Fase 3: Backend (Server Actions)
- [ ] Actualizar `createPromiseSchema` con preferencias
- [ ] Actualizar `updatePromiseSchema`
- [ ] Modificar `createPromise` para guardar preferencias
- [ ] Crear funciones de lectura de preferencias

### Fase 4: Componentes Frontend
- [ ] Crear `PromiseMultiStepForm` base
- [ ] Implementar `Step1ContactData`
- [ ] Implementar `Step2ServicePreferences`
- [ ] Implementar `Step3Review`
- [ ] Integrar en `PromiseFormModal` (toggle)
- [ ] Actualizar `OfferLeadForm` público

### Fase 5: Testing y Refinamiento
- [ ] Testing de flujo completo
- [ ] Validación de datos
- [ ] UX/UI refinements
- [ ] Documentación

---

## ⚠️ Consideraciones Importantes

### 1. Compatibilidad hacia atrás
- Las promesas existentes no tendrán preferencias
- Manejar `null` en preferencias en componentes
- No romper flujo actual de formulario rápido

### 2. Rendimiento
- Si se usa JSON, validar tamaño máximo
- Si se usa tabla relacional, considerar índices

### 3. Validación
- Validar que al menos una preferencia esté seleccionada (opcional)
- Validar coherencia (ej: si selecciona "libro impreso", debe tener tamaño)

### 4. UX
- Permitir guardar progreso (draft)
- Mostrar indicador de progreso (1/3, 2/3, 3/3)
- Permitir editar etapas anteriores

---

## 📝 Recomendación Final

### Implementar ahora (Refactor inmediato)
**Solo si:**
- ✅ Hay tiempo suficiente para implementación completa
- ✅ Se necesita capturar preferencias desde el inicio
- ✅ El equipo puede dedicar 2-3 semanas

**Implementación recomendada:**
- Opción 2 (Tabla relacional) para estructura robusta
- Toggle en `PromiseFormModal` para mantener formulario rápido
- Formulario por etapas en `OfferLeadForm` público

---

### Dejar para próxima iteración
**Si:**
- ❌ Hay otras prioridades más urgentes
- ❌ El formulario rápido actual funciona bien
- ❌ Las preferencias se pueden capturar después en cotizaciones

**Enfoque alternativo:**
- Mantener formulario rápido actual
- Capturar preferencias en el momento de crear cotización
- Agregar sección "Preferencias iniciales" en formulario de cotización

---

## 🔗 Archivos Relacionados

### Backend
- `/src/lib/actions/schemas/promises-schemas.ts`
- `/src/lib/actions/studio/commercial/promises/promises.actions.ts`
- `/prisma/schema.prisma`

### Frontend
- `/src/app/[slug]/studio/commercial/promises/components/PromiseFormModal.tsx`
- `/src/app/[slug]/offer/[offerId]/leadform/page.tsx`
- `/src/components/offers/OfferLeadForm.tsx`
- `/src/components/shared/forms/OfferLeadFormFields.tsx`

---

## 📅 Estimación de Esfuerzo

| Tarea | Tiempo Estimado |
|-------|----------------|
| Migración de BD | 2-4 horas |
| Actualización schemas | 2-3 horas |
| Server Actions | 4-6 horas |
| Componente MultiStep | 8-12 horas |
| Integración PromiseFormModal | 4-6 horas |
| Actualización OfferLeadForm | 4-6 horas |
| Testing y refinamiento | 6-8 horas |
| **Total** | **30-45 horas** |

---

**Fecha de análisis:** 2025-01-11  
**Autor:** Análisis técnico  
**Estado:** Pendiente de decisión
