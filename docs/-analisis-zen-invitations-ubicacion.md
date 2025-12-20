# Análisis: Ubicación de ZEN Invitations

## 📋 Contexto

**ZEN Invitations** es un módulo complejo en planeación que combina múltiples funcionalidades:
- Builder de invitaciones digitales (similar a portfolios con DnD)
- Gestión de contactos de invitados
- Envío masivo (email + WhatsApp)
- Landing page semi-personalizable con DnD
- Confirmación de invitados
- Lista de invitados (confirmados, cancelados, mensajes enviados)
- Datos del evento
- Detalles para invitados
- Mesa de regalos
- Asignación de mesas por invitados
- Sistema DnD

**Base arquitectónica:** Portfolios (`/content/portfolios`) como referencia para el builder.

---

## 🔍 Análisis de Dependencias

### Funcionalidades por Módulo

#### 1. **Builder de Invitaciones** (Similar a Portfolios)
- **Ubicación actual:** Content (portfolios)
- **Dependencias:** Sistema DnD, ContentBlocks, Media Management
- **Independencia:** ✅ Alta (puede funcionar solo)

#### 2. **Gestión de Contactos/Invitados**
- **Ubicación actual:** Commercial (`/commercial/contacts`)
- **Dependencias:** `studio_contacts` table
- **Independencia:** ⚠️ Media (usa estructura existente)

#### 3. **Envío Masivo (Email + WhatsApp)**
- **Ubicación actual:** Commercial (`/commercial/email`)
- **Dependencias:** Sistema de email, WhatsApp API
- **Independencia:** ⚠️ Media (requiere infraestructura)

#### 4. **Gestión de Eventos**
- **Ubicación actual:** Commercial (`/commercial/promises`)
- **Dependencias:** `studio_eventos`, `studio_event_types`
- **Independencia:** ⚠️ Media (usa estructura existente)

#### 5. **Confirmación de Invitados**
- **Ubicación actual:** No existe (nuevo)
- **Dependencias:** Contactos, Eventos
- **Independencia:** ❌ Baja (depende de otros)

#### 6. **Mesa de Regalos**
- **Ubicación actual:** No existe (nuevo)
- **Dependencias:** Eventos, posiblemente Business
- **Independencia:** ⚠️ Media (puede ser independiente)

#### 7. **Asignación de Mesas**
- **Ubicación actual:** No existe (nuevo)
- **Dependencias:** Invitados, Eventos
- **Independencia:** ❌ Baja (depende de otros)

---

## 🎯 Análisis de Ubicación

### Opción A: Módulo Independiente (Addon) - **RECOMENDADO**

**Estructura:**
```
/builder/invitations/
├── builder/              # Editor de invitaciones (similar a portfolios)
├── invitados/            # Gestión de invitados
├── envios/               # Envío masivo
├── confirmaciones/       # Panel de confirmaciones
├── mesas/                # Asignación de mesas
└── mesa-regalos/         # Mesa de regalos
```

**Ventajas:**
- ✅ **Independencia funcional:** Todo en un lugar
- ✅ **Reutiliza arquitectura:** Builder basado en portfolios
- ✅ **Flexibilidad de pricing:** Addon separado ($12-15/mes)
- ✅ **Escalabilidad:** Fácil agregar funcionalidades
- ✅ **Claridad:** Usuario sabe qué está contratando

**Desventajas:**
- ⚠️ **Dependencias cruzadas:** Necesita acceso a contacts y eventos
- ⚠️ **Complejidad técnica:** Verificación de módulos relacionados

**Dependencias necesarias:**
- `studio_contacts` (leer/escribir)
- `studio_eventos` (leer/escribir)
- Sistema de email/WhatsApp
- Storage para media de invitaciones

### Opción B: Integrado en Commercial

**Estructura:**
```
/commercial/
├── invitations/          # Nuevo sub-módulo
│   ├── builder/
│   ├── invitados/
│   └── ...
```

**Ventajas:**
- ✅ **Acceso directo:** Ya tiene contacts y eventos
- ✅ **Menos verificación:** Todo en un módulo
- ✅ **Flujo natural:** Invitaciones → Eventos → Promises

**Desventajas:**
- ❌ **Sobrecarga de Commercial:** Módulo muy grande
- ❌ **Menos flexibilidad:** Requiere módulo Commercial completo
- ❌ **Confusión:** Invitaciones no es "comercial" puro

### Opción C: Integrado en Content

**Estructura:**
```
/content/
├── invitations/          # Similar a portfolios
```

**Ventajas:**
- ✅ **Reutiliza builder:** Mismo sistema que portfolios
- ✅ **Lógica similar:** Builder de contenido

**Desventajas:**
- ❌ **Falta gestión:** No tiene contacts ni eventos
- ❌ **Dependencias externas:** Necesita Commercial para funcionar
- ❌ **No encaja:** Invitaciones no es solo "contenido"

### Opción D: Híbrido (Builder en Content, Gestión en Commercial)

**Estructura:**
```
/content/invitations/     # Solo builder
/commercial/invitations/  # Gestión de invitados, envíos, etc.
```

**Ventajas:**
- ✅ **Separación de concerns:** Builder vs Gestión

**Desventajas:**
- ❌ **Complejidad:** Dos ubicaciones confusas
- ❌ **UX fragmentada:** Usuario navega entre módulos
- ❌ **Mantenimiento:** Código duplicado o compartido

---

## 🏗️ Arquitectura Propuesta: Módulo Independiente

### Estructura de Directorios

```
/builder/invitations/
├── builder/                    # Editor de invitaciones (basado en portfolios)
│   ├── [id]/
│   │   └── editar/
│   │       └── page.tsx
│   ├── nuevo/
│   │   └── page.tsx
│   └── components/
│       ├── InvitationEditor.tsx      # Similar a PortfolioEditor
│       ├── InvitationBuilder.tsx      # ContentBlocksEditor adaptado
│       └── ComponentSelector.tsx      # Reutilizar de portfolios
│
├── invitados/                  # Gestión de invitados
│   ├── page.tsx
│   └── components/
│       ├── InvitadosList.tsx
│       ├── InvitadoModal.tsx
│       └── InvitadoCard.tsx
│
├── envios/                     # Envío masivo
│   ├── page.tsx
│   └── components/
│       ├── EnvioMasivo.tsx
│       ├── EmailTemplate.tsx
│       └── WhatsAppTemplate.tsx
│
├── confirmaciones/             # Panel de confirmaciones
│   ├── page.tsx
│   └── components/
│       ├── ConfirmacionesList.tsx
│       ├── ConfirmacionCard.tsx
│       └── Estadisticas.tsx
│
├── mesas/                      # Asignación de mesas
│   ├── page.tsx
│   └── components/
│       ├── MesasList.tsx
│       ├── MesaEditor.tsx
│       └── AsignacionDnD.tsx   # Sistema DnD para asignar invitados
│
└── mesa-regalos/               # Mesa de regalos
    ├── page.tsx
    └── components/
        ├── RegalosList.tsx
        └── RegaloCard.tsx
```

### Schema de Base de Datos

```prisma
//! INVITATIONS
model studio_invitations {
  id                  String                    @id @default(cuid())
  studio_id           String
  event_id            String?                   // Relación con evento (opcional)
  title               String
  slug                String
  description         String?
  cover_image_url     String?
  landing_page_url    String?                   // URL única de landing page
  is_published        Boolean                   @default(false)
  published_at        DateTime?
  content_blocks      studio_invitation_content_blocks[]
  invitados           studio_invitation_guests[]
  created_at          DateTime                  @default(now())
  updated_at          DateTime                  @updatedAt
  studio              studios                  @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  event               studio_eventos?           @relation(fields: [event_id], references: [id])
  
  @@unique([studio_id, slug])
  @@index([studio_id, is_published])
  @@index([event_id])
}

model studio_invitation_guests {
  id                  String                    @id @default(cuid())
  invitation_id       String
  contact_id          String?                   // Relación con contact (opcional, puede ser invitado nuevo)
  name                String
  email               String?
  phone               String?
  status              String                    @default("pending") // pending, confirmed, cancelled
  confirmed_at        DateTime?
  cancelled_at        DateTime?
  mesa_id             String?                   // Asignación de mesa
  mesa_number         Int?
  notes               String?
  sent_email_at       DateTime?
  sent_whatsapp_at    DateTime?
  created_at          DateTime                  @default(now())
  updated_at          DateTime                  @updatedAt
  invitation          studio_invitations        @relation(fields: [invitation_id], references: [id], onDelete: Cascade)
  contact             studio_contacts?          @relation(fields: [contact_id], references: [id])
  mesa                studio_invitation_tables? @relation(fields: [mesa_id], references: [id])
  
  @@index([invitation_id, status])
  @@index([contact_id])
  @@index([mesa_id])
}

model studio_invitation_tables {
  id                  String                    @id @default(cuid())
  invitation_id       String
  name                String                    // "Mesa 1", "Mesa Principal", etc.
  capacity            Int                       @default(10)
  order               Int                       @default(0)
  guests              studio_invitation_guests[]
  created_at          DateTime                  @default(now())
  updated_at          DateTime                  @updatedAt
  invitation          studio_invitations        @relation(fields: [invitation_id], references: [id], onDelete: Cascade)
  
  @@index([invitation_id, order])
}

model studio_invitation_content_blocks {
  // Similar a studio_portfolio_content_blocks
  id                  String                    @id @default(cuid())
  invitation_id       String
  type                String
  config              Json?
  order               Int                       @default(0)
  media               studio_invitation_block_media[]
  invitation          studio_invitations        @relation(fields: [invitation_id], references: [id], onDelete: Cascade)
  
  @@index([invitation_id, order])
}

model studio_invitation_gift_registry {
  id                  String                    @id @default(cuid())
  invitation_id       String
  item_name           String
  description         String?
  image_url           String?
  price               Float?
  quantity            Int                       @default(1)
  reserved_by_guest_id String?
  reserved_at         DateTime?
  order               Int                       @default(0)
  created_at          DateTime                  @default(now())
  updated_at          DateTime                  @updatedAt
  invitation          studio_invitations        @relation(fields: [invitation_id], references: [id], onDelete: Cascade)
  reserved_by         studio_invitation_guests? @relation(fields: [reserved_by_guest_id], references: [id])
  
  @@index([invitation_id, order])
  @@index([reserved_by_guest_id])
}
```

---

## 🔗 Dependencias con Otros Módulos

### Dependencias Opcionales (Pueden funcionar sin ellos)

1. **Commercial (Contacts):**
   - Leer contactos existentes
   - Crear nuevos contactos desde invitados
   - **Si no tiene Commercial:** Invitados se crean directamente

2. **Commercial (Eventos):**
   - Vincular invitación a evento existente
   - **Si no tiene Commercial:** Invitación independiente

### Dependencias Críticas (Necesarias)

1. **Sistema de Email/WhatsApp:**
   - Infraestructura de envío
   - Templates de mensajes
   - Tracking de envíos

2. **Storage:**
   - Media de invitaciones
   - Imágenes de mesa de regalos

---

## 💰 Estrategia de Pricing

### Opción 1: Addon Independiente

**Precio:** $12-15 USD/mes

**Incluye:**
- Builder de invitaciones ilimitadas
- Gestión de invitados ilimitados
- Envío masivo (email + WhatsApp)
- Landing pages personalizables
- Confirmación de invitados
- Asignación de mesas
- Mesa de regalos

**Requisitos:**
- Módulo Manager (base)
- Commercial (opcional, para vincular eventos/contactos)

### Opción 2: Integrado en Plan Pro+

**Incluido en:**
- Pro: $39/mes (Manager + Marketing + Content + Invitations)
- Enterprise: $59/mes (Todo incluido)

**Ventaja:** Mayor valor percibido

---

## ✅ Recomendación Final

### **Módulo Independiente (Addon) - `/builder/invitations/`**

**Razones:**

1. **Arquitectura Limpia:**
   - Todo en un lugar
   - Fácil de mantener
   - Escalable

2. **Reutilización:**
   - Builder basado en portfolios (mismo sistema DnD)
   - ContentBlocks reutilizables
   - Componentes compartidos

3. **Flexibilidad:**
   - Puede funcionar sin Commercial (invitados independientes)
   - Puede vincularse a Commercial si está disponible
   - Pricing independiente

4. **UX Clara:**
   - Usuario sabe qué está contratando
   - Flujo completo en un módulo
   - No navega entre secciones

5. **Escalabilidad:**
   - Fácil agregar funcionalidades
   - No sobrecarga otros módulos
   - Permite límites de uso independientes

### Implementación Sugerida

**Fase 1: Builder (MVP)**
- Editor de invitaciones (basado en PortfolioEditor)
- ContentBlocks adaptados
- Landing page básica

**Fase 2: Gestión de Invitados**
- CRUD de invitados
- Importación desde contacts (si tiene Commercial)
- Lista de invitados

**Fase 3: Envío y Confirmación**
- Envío masivo (email + WhatsApp)
- Landing page de confirmación
- Panel de confirmaciones

**Fase 4: Funcionalidades Avanzadas**
- Asignación de mesas (DnD)
- Mesa de regalos
- Estadísticas y reportes

---

## 🔧 Integración con Módulos Existentes

### Verificación de Módulos

```typescript
// En InvitationEditor
const hasCommercial = await checkStudioModule(studioId, 'commercial');
const hasContacts = hasCommercial; // Contacts está en Commercial

// Si tiene Commercial, mostrar opción de vincular evento/contactos
// Si no, funcionar de forma independiente
```

### Uso de Contacts (Opcional)

```typescript
// Si tiene Commercial, permitir importar contactos
if (hasCommercial) {
  const contacts = await getContacts(studioSlug);
  // Mostrar selector de contactos
} else {
  // Crear invitados directamente
}
```

### Uso de Eventos (Opcional)

```typescript
// Si tiene Commercial, permitir vincular evento
if (hasCommercial) {
  const eventos = await getEventos(studioSlug);
  // Mostrar selector de eventos
} else {
  // Invitación independiente
}
```

---

## 📝 Checklist de Implementación

### Preparación
- [ ] Analizar arquitectura de portfolios en detalle
- [ ] Identificar componentes reutilizables
- [ ] Diseñar schema de base de datos
- [ ] Planificar integración con contacts/eventos

### Fase 1: Builder
- [ ] Crear estructura `/builder/invitations/`
- [ ] Adaptar PortfolioEditor → InvitationEditor
- [ ] Adaptar ContentBlocksEditor → InvitationBuilder
- [ ] Crear componentes específicos de invitaciones
- [ ] Sistema de landing pages

### Fase 2: Gestión
- [ ] CRUD de invitados
- [ ] Integración con contacts (opcional)
- [ ] Lista de invitados con filtros

### Fase 3: Envío
- [ ] Sistema de envío masivo
- [ ] Templates email/WhatsApp
- [ ] Tracking de envíos
- [ ] Landing page de confirmación

### Fase 4: Avanzado
- [ ] Asignación de mesas (DnD)
- [ ] Mesa de regalos
- [ ] Estadísticas
- [ ] Reportes

---

## 🔗 Referencias

- **Portfolios (Base):** `src/app/[slug]/studio/builder/content/portfolios/`
- **ContentBlocks:** `src/components/content-blocks/`
- **Contacts:** `src/app/[slug]/studio/builder/commercial/contacts/`
- **Eventos:** `src/app/[slug]/studio/builder/commercial/promises/`
- **DnD System:** `@dnd-kit/core` (usado en portfolios)

---

**Última actualización:** 2025-01-XX  
**Estado:** Análisis completo  
**Recomendación:** Módulo independiente `/builder/invitations/` como addon

