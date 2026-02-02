# Análisis Técnico y Funcional - Arquitectura Tenant (Estudio)

**Plataforma:** ZENLY - Sistema Multi-tenant para Estudios Fotográficos  
**Fecha:** 2025-01-27  
**Versión:** 2.0  
**Última Actualización:** 2025-01-27  
**Área:** Arquitectura y Desarrollo

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Técnica](#arquitectura-técnica)
3. [Estructura de Rutas Tenant](#estructura-de-rutas-tenant)
4. [Módulos y Funcionalidades](#módulos-y-funcionalidades)
5. [Áreas Funcionales Detalladas](#áreas-funcionales-detalladas)
6. [Sistema de Suscripciones y Módulos](#sistema-de-suscripciones-y-módulos)
7. [APIs y Integraciones](#apis-y-integraciones)
8. [Estado de Implementación](#estado-de-implementación)
9. [Recomendaciones Comerciales](#recomendaciones-comerciales)

---

## 🎯 Resumen Ejecutivo

ZENLY es una plataforma SaaS multi-tenant diseñada específicamente para estudios fotográficos. La arquitectura está basada en **Next.js 16**, **TypeScript 5**, **React 19**, **Prisma** y **Supabase**, con un sistema modular que permite activar/desactivar funcionalidades según el plan de suscripción.

### Características Principales

- ✅ **Multi-tenant completo** con aislamiento por `slug` de estudio
- ✅ **Sistema modular** con activación/desactivación de módulos
- ✅ **Row Level Security (RLS)** implementado en Supabase para aislamiento de datos
- ✅ **Área pública** para perfil del estudio y ofertas
- ✅ **Portal del cliente** para acceso a eventos y contenido
- ✅ **Dashboard administrativo** completo para gestión del estudio
- ✅ **Sistema de suscripciones** integrado con Stripe
- ✅ **Planes definidos:** Basic, Pro, Enterprise con límites configurados
- ✅ **Sistema de autenticación** multi-rol (super_admin, agente, suscriptor)

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

```
Frontend:
├── Next.js 15.5.2 (App Router)
├── React 19.1.0
├── TypeScript 5
├── Tailwind CSS 4
└── ZEN Design System (componentes propios)

Backend:
├── Next.js Server Actions
├── Prisma ORM 6.15.0
├── PostgreSQL (Supabase)
└── Supabase (Auth, Storage, Realtime)

Infraestructura:
├── Multi-tenant por slug
├── Row Level Security (RLS)
└── Realtime subscriptions
```

### Patrón de Arquitectura

**Multi-tenant por Slug:**

- Cada estudio tiene un `slug` único (ej: `mi-estudio`)
- Rutas: `/{slug}/studio/*` para área administrativa
- Rutas: `/{slug}/*` para área pública
- Aislamiento de datos mediante `studio_id` en todas las tablas
- **Doble capa de seguridad:**
  - **Aplicación:** Filtrado por `studio_id` en todas las queries Prisma
  - **Base de datos:** Row Level Security (RLS) en Supabase como segunda capa

**Aislamiento de Datos:**

```typescript
// Patrón estándar en todas las Server Actions
const studio = await prisma.studios.findUnique({
  where: { slug: studioSlug },
  select: { id: true }
});

// Todas las queries filtran por studio_id
const promises = await prisma.studio_promises.findMany({
  where: { studio_id: studio.id }
});
```

**Row Level Security (RLS):**

- Políticas RLS activas en tablas críticas:
  - `studio_promises`
  - `studio_cotizaciones`
  - `studio_events`
  - `studio_notifications`
  - `studio_user_profiles`
  - `storage.objects` (archivos por studio)
- Verificación de acceso mediante `user_studio_roles` y `studio_user_profiles`
- Aislamiento automático a nivel de base de datos

**Separación de Responsabilidades:**

```
src/app/[slug]/
├── page.tsx              # Perfil público del estudio
├── studio/               # Área administrativa (requiere auth)
│   ├── commercial/      # Módulo comercial
│   ├── business/        # Módulo de negocio
│   └── config/          # Configuración
├── cliente/             # Portal del cliente (auth opcional)
├── offer/               # Landing pages de ofertas
├── promise/             # Páginas públicas de promesas/contratos
└── post/                 # Blog público del estudio
```

---

## 🗺️ Estructura de Rutas Tenant

### Rutas Públicas (Sin Autenticación)

| Ruta                               | Descripción                       | Estado          |
| ---------------------------------- | --------------------------------- | --------------- |
| `/{slug}`                          | Perfil público del estudio        | ✅ Implementado |
| `/{slug}/offer/[offerId]`          | Landing page de oferta comercial  | ✅ Implementado |
| `/{slug}/offer/[offerId]/leadform` | Formulario de captura de leads    | ✅ Implementado |
| `/{slug}/promise/[promiseId]`      | Router de promesa (redirige según estado) | ✅ Optimizado |
| `/{slug}/promise/[promiseId]/pendientes` | Cotizaciones pendientes | ✅ Implementado |
| `/{slug}/promise/[promiseId]/negociacion` | Cotización en negociación | ✅ Implementado |
| `/{slug}/promise/[promiseId]/cierre` | Cotización en cierre | ✅ Implementado |
| `/{slug}/post/[postSlug]`          | Post del blog público             | ✅ Implementado |
| `/{slug}/profile/portfolio/[id]`   | Portafolio público                | ✅ Implementado |
| `/{slug}/aviso-privacidad`         | Aviso de privacidad público       | ✅ Implementado |

**Optimización de Routing de Promesas:**
- ✅ Consulta ligera inicial (`getPublicPromiseRouteState`) que solo obtiene estados de cotizaciones
- ✅ Función helper centralizada (`determinePromiseRoute`) para lógica de routing consistente
- ✅ Prioridad de routing: Negociación > Cierre > Pendientes
- ✅ Uso de `startTransition` para redirecciones no bloqueantes en cliente
- ✅ Caching con `unstable_cache` para metadata

### Rutas del Cliente (Autenticación Opcional)

| Ruta                                   | Descripción                      | Estado          |
| -------------------------------------- | -------------------------------- | --------------- |
| `/{slug}/cliente`                      | Dashboard del cliente            | ✅ Implementado |
| `/{slug}/cliente/login`                | Login del cliente (por teléfono) | ✅ Implementado |
| `/{slug}/cliente/[clientId]`           | Perfil del cliente               | ✅ Implementado |
| `/{slug}/cliente/[clientId]/[eventId]` | Detalle de evento del cliente    | ✅ Implementado |

### Rutas Administrativas (Requieren Autenticación)

#### Área Comercial (`/studio/commercial/`)

| Ruta                        | Descripción                               | Estado          |
| --------------------------- | ----------------------------------------- | --------------- |
| `/commercial/dashboard`     | Dashboard con analytics y métricas        | ✅ Implementado |
| `/commercial/catalogo`      | Gestión de catálogo y paquetes            | ✅ Implementado |
| `/commercial/ofertas`       | Gestión de ofertas comerciales            | ✅ Implementado |
| `/commercial/promises`      | Gestión de promesas (leads/oportunidades) | ✅ Implementado |
| `/commercial/conversations` | Conversaciones (CRM)                      | ⚠️ Parcial      |
| `/commercial/email`         | Gestión de emails                         | ⚠️ Parcial      |

#### Área de Negocio (`/studio/business/`)

| Ruta                  | Descripción                                    | Estado          |
| --------------------- | ---------------------------------------------- | --------------- |
| `/business/events`    | Gestión de eventos autorizados                 | ✅ Implementado |
| `/business/scheduler` | Cronograma y calendarización                   | ✅ Implementado |
| `/business/personel`  | Gestión de personal                            | ✅ Implementado |
| `/business/finanzas`  | Gestión financiera (ingresos/egresos)          | ✅ Implementado |
| `/business/identity`  | Identidad del negocio (brand, social, contact) | ✅ Implementado |

#### Área de Configuración (`/studio/config/`)

| Ruta                          | Descripción                              | Estado          |
| ----------------------------- | ---------------------------------------- | --------------- |
| `/config/account/perfil`      | Perfil del usuario                       | ✅ Implementado |
| `/config/account/seguridad`   | Configuración de seguridad               | ✅ Implementado |
| `/config/account/suscripcion` | Gestión de suscripción                   | ✅ Implementado |
| `/config/contratos`           | Plantillas de contratos                  | ✅ Implementado |
| `/config/integraciones`       | Integraciones (Google, Stripe, Manychat) | ✅ Implementado |
| `/config/privacidad`          | Aviso de privacidad                      | ✅ Implementado |

---

## 🧩 Módulos y Funcionalidades

### Módulos Core (Incluidos en todos los planes)

#### 1. ZEN Manager (Core)

**Estado:** ✅ Implementado

**Funcionalidades:**

- Dashboard con analytics de contenido
- Gestión de catálogo de servicios
- Gestión de paquetes por tipo de evento
- Sistema de ofertas comerciales con landing pages
- Gestión de promesas (pipeline de ventas)
- Sistema de cotizaciones
- Gestión de eventos autorizados
- Cronograma y calendarización
- Gestión de personal
- Control financiero (ingresos/egresos)

**Rutas Principales:**

- `/studio/commercial/dashboard`
- `/studio/commercial/catalogo`
- `/studio/commercial/ofertas`
- `/studio/commercial/promises`
- `/studio/business/events`
- `/studio/business/scheduler`
- `/studio/business/finanzas`

#### 2. ZEN Marketing (Core - Pendiente Definición)

**Estado:** ⚠️ Parcialmente implementado

**Funcionalidades Implementadas:**

- Landing pages de ofertas con formularios de captura
- Sistema de leads desde ofertas
- Analytics básico de contenido
- Integración con Manychat (configuración)

**Funcionalidades Pendientes:**

- Campañas de email marketing
- Automatizaciones de marketing
- Segmentación de clientes
- Reportes de conversión

**Rutas:**

- `/studio/commercial/ofertas` (parcial)
- `/studio/commercial/conversations` (parcial)

#### 3. ZEN Magic (IA - Pendiente Definición)

**Estado:** ⚠️ Estructura base implementada

**Funcionalidades Implementadas:**

- Provider de chat (`ZenMagicChatProvider`)
- Integración en layout del studio

**Funcionalidades Pendientes:**

- Chat con IA para asistencia
- Generación de contenido
- Análisis predictivo
- Recomendaciones automáticas

### Módulos Add-ons (Fase 2+)

#### 4. ZEN Payment

**Estado:** ⚠️ Integración Stripe configurada, módulo pendiente

**Funcionalidades:**

- Procesamiento de pagos
- Gestión de métodos de pago
- Historial de transacciones
- Facturación automática

#### 5. ZEN Conversations

**Estado:** ⚠️ Estructura base

**Funcionalidades:**

- Chat integrado
- Notificaciones en tiempo real
- Historial de conversaciones

#### 6. ZEN Cloud

**Estado:** ⚠️ Integración Google Drive configurada

**Funcionalidades:**

- Almacenamiento en la nube
- Sincronización de archivos
- Galería de clientes

#### 7. ZEN Invitation

**Estado:** ⚠️ Pendiente

**Funcionalidades:**

- Sistema de invitaciones
- Gestión de accesos
- Permisos granulares

---

## 📊 Áreas Funcionales Detalladas

### 1. Área Comercial (`/studio/commercial/`)

#### 1.1 Dashboard Comercial

**Ruta:** `/studio/commercial/dashboard`

**Funcionalidades:**

- ✅ Resumen de analytics de contenido
- ✅ Top contenido más popular
- ✅ Métricas de visualizaciones
- ✅ Estadísticas de ofertas activas

**Métricas Mostradas:**

- Total de posts publicados
- Total de visualizaciones
- Total de ofertas activas
- Contenido más visitado

#### 1.2 Catálogo de Servicios

**Ruta:** `/studio/commercial/catalogo`

**Funcionalidades:**

- ✅ Gestión de categorías de servicios
- ✅ Gestión de items del catálogo
- ✅ Gestión de paquetes por tipo de evento
- ✅ Configuración de márgenes de utilidad
- ✅ Precios y descripciones
- ✅ Imágenes y medios

**Estructura:**

```
Catálogo
├── Categorías
│   ├── Servicios individuales
│   └── Secciones organizadas
└── Paquetes
    ├── Por tipo de evento
    ├── Incluye múltiples servicios
    └── Precios y condiciones
```

#### 1.3 Ofertas Comerciales

**Ruta:** `/studio/commercial/ofertas`

**Funcionalidades:**

- ✅ Creación y edición de ofertas
- ✅ Landing pages personalizables
- ✅ Formularios de captura de leads
- ✅ Configuración de condiciones comerciales
- ✅ Tracking de conversiones
- ✅ Preview de ofertas
- ✅ Publicación/archivado

**Componentes Clave:**

- Editor de landing page con bloques de contenido
- Configurador de formularios de leads
- Selector de condiciones comerciales
- Integración con analytics (GTM, Facebook Pixel)

**Flujo de Oferta:**

```
Oferta Creada
  ↓
Landing Page Configurada
  ↓
Formulario de Captura
  ↓
Lead Generado → Promise (Promesa)
```

#### 1.4 Promesas (Pipeline de Ventas)

**Ruta:** `/studio/commercial/promises`

**Funcionalidades:**

- ✅ Vista Kanban de promesas
- ✅ Pipeline configurable por estudio
- ✅ Gestión de cotizaciones
- ✅ Sistema de etiquetas
- ✅ Logs de actividad
- ✅ Compartir promesas con clientes
- ✅ Agendamiento de eventos
- ✅ Gestión de términos y condiciones
- ✅ Gestión de condiciones comerciales

**Estados del Pipeline:**

- Nuevo
- Contactado
- Cotizando
- Revisión
- Autorizado
- Evento Creado
- (Configurables por estudio)

**Integraciones:**

- Generación automática de eventos al autorizar
- Creación de cotizaciones desde promesas
- Envío de promesas a clientes

### 2. Área de Negocio (`/studio/business/`)

#### 2.1 Eventos

**Ruta:** `/studio/business/events`

**Funcionalidades:**

- ✅ Gestión completa de eventos autorizados
- ✅ Vista Kanban de eventos
- ✅ Detalle completo de evento
- ✅ Gestión de contratos
- ✅ Gestión de pagos
- ✅ Gestión de entregables
- ✅ Gestión de tareas
- ✅ Itinerario de evento
- ✅ Gestión de personal asignado
- ✅ Historial de cotizaciones
- ✅ Versiones de contratos

**Vista de Detalle de Evento:**

- Información general
- Contratos (versiones y autorizaciones)
- Cotizaciones relacionadas
- Pagos (historial y pendientes)
- Entregables
- Tareas y checklist
- Itinerario
- Personal asignado

#### 2.2 Cronograma (Scheduler)

**Ruta:** `/studio/business/scheduler`

**Funcionalidades:**

- ✅ Vista de calendario mensual
- ✅ Agrupación de eventos por fecha
- ✅ Asignación de personal
- ✅ Gestión de conflictos de fechas
- ✅ Vista de timeline
- ✅ Filtros por personal
- ✅ Gestión de costos por evento

**Características:**

- Vista de calendario interactiva
- Drag & drop de eventos
- Asignación de crew (personal)
- Detección de conflictos
- Cálculo de costos por personal

#### 2.3 Personal

**Ruta:** `/studio/business/personel`

**Funcionalidades:**

- ✅ Gestión de personal del estudio
- ✅ Asignación a eventos
- ✅ Control de pagos a personal

#### 2.4 Finanzas

**Ruta:** `/studio/business/finanzas`

**Funcionalidades:**

- ✅ Dashboard financiero con KPIs
- ✅ Gestión de ingresos
- ✅ Gestión de egresos
- ✅ Por cobrar (de eventos)
- ✅ Por pagar (a personal y proveedores)
- ✅ Gastos recurrentes
- ✅ Historial de movimientos
- ✅ Análisis por mes

**KPIs Mostrados:**

- Ingresos del mes
- Egresos del mes
- Utilidad neta
- Total por cobrar
- Total por pagar

**Módulos:**

- Movimientos (ingresos/egresos)
- Por cobrar (pagos pendientes de clientes)
- Por pagar (pagos pendientes a personal/proveedores)
- Gastos recurrentes (suscripciones, rentas, etc.)

#### 2.5 Identidad del Negocio

**Ruta:** `/studio/business/identity`

**Funcionalidades:**

- ✅ Gestión de marca (logo, nombre, slogan)
- ✅ Redes sociales
- ✅ Información de contacto
- ✅ Horarios de atención
- ✅ Zonas de trabajo
- ✅ Integración con Google Maps

**Tabs:**

- **Brand:** Logo, nombre, slogan, presentación
- **Social:** Redes sociales configuradas
- **Contact:** Teléfonos, email, dirección, horarios, zonas

### 3. Área de Configuración (`/studio/config/`)

#### 3.1 Cuenta

**Rutas:**

- `/config/account/perfil` - Perfil del usuario
- `/config/account/seguridad` - Seguridad y sesiones
- `/config/account/suscripcion` - Gestión de suscripción

**Funcionalidades:**

- ✅ Edición de perfil de usuario
- ✅ Cambio de contraseña
- ✅ Historial de sesiones
- ✅ Configuración de timeout de sesión
- ✅ Vista de plan actual
- ✅ Historial de facturación
- ✅ Cambio de plan (estructura lista)

#### 3.2 Contratos

**Ruta:** `/config/contratos`

**Funcionalidades:**

- ✅ Gestión de plantillas de contratos
- ✅ Editor de contratos con variables
- ✅ Preview de contratos
- ✅ Variables dinámicas (nombre cliente, fecha, etc.)
- ✅ Versiones de contratos

#### 3.3 Integraciones

**Ruta:** `/config/integraciones`

**Integraciones Disponibles:**

- ✅ Google Drive (almacenamiento)
- ✅ Google Calendar (calendario secundario)
- ✅ Stripe (pagos)
- ✅ Manychat (chatbot)
- ⚠️ ZEN Magic (pendiente configuración completa)

#### 3.4 Privacidad

**Ruta:** `/config/privacidad`

**Funcionalidades:**

- ✅ Gestión de aviso de privacidad
- ✅ Requisitos legales
- ✅ Estado de cumplimiento

---

## 💳 Sistema de Suscripciones y Módulos

### Arquitectura de Módulos

**Modelo de Datos:**

```prisma
platform_modules {
  id, slug, name, description
  category: CORE | ADDON
  base_price, billing_type
  is_active
}

studio_modules {
  studio_id, module_id
  is_active
  activated_at, deactivated_at
  config_data (JSON)
}

platform_plans {
  id, slug, name, description
  price_monthly, price_yearly
  stripe_price_id, stripe_price_id_yearly
  features (JSON)
  active, popular, order
}

plan_limits {
  plan_id, limit_type, limit_value, unit
  // Tipos: EVENTS_PER_MONTH, STORAGE_GB, TEAM_MEMBERS, PORTFOLIOS, etc.
}

subscriptions {
  studio_id, plan_id
  status: TRIAL | ACTIVE | CANCELED | PAST_DUE | UNLIMITED
  stripe_subscription_id
  current_period_start, current_period_end
}
```

**Helpers de Verificación:**

```typescript
// src/lib/modules/index.ts

// Verificar si un módulo está activo
checkStudioModule(studioId: string, moduleSlug: string): Promise<boolean>

// Obtener módulos activos
getActiveModules(studioId: string): Promise<Module[]>

// Verificar múltiples módulos
checkMultipleModules(studioId: string, moduleSlugs: string[]): Promise<Record<string, boolean>>

// Obtener todos los módulos con estado
getAllModulesWithStatus(studioId: string): Promise<ModuleWithActivation[]>
```

### Módulos Identificados

#### Módulos Core (Incluidos en todos los planes)

1. **manager** - ZEN Manager (gestión completa del estudio)
2. **marketing** - ZEN Marketing (CRM y marketing básico)

#### Módulos Add-ons (Pendientes de Definición)

1. **magic** - ZEN Magic (IA)
2. **payment** - ZEN Payment
3. **conversations** - ZEN Conversations
4. **cloud** - ZEN Cloud
5. **invitation** - ZEN Invitation

### Planes de Suscripción Implementados

**Plan Basic:**
- Precio: $399 MXN/mes o $3,990 MXN/año
- Módulos: `manager`
- Límites:
  - 10 eventos/mes
  - 5 GB almacenamiento
  - 3 miembros de equipo
  - 2 portfolios
- Soporte: Email

**Plan Pro:**
- Precio: $699 MXN/mes o $6,990 MXN/año
- Módulos: `manager`, `marketing`, `magic`, `pages`
- Límites:
  - 30 eventos/mes
  - 25 GB almacenamiento
  - 10 miembros de equipo
  - 10 portfolios
  - 5 templates Gantt
- Soporte: Email + Chat
- ⭐ Plan Popular

**Plan Enterprise:**
- Precio: $1,999 MXN/mes o $19,990 MXN/año
- Módulos: Todos los módulos core + add-ons
- Límites: Ilimitados
- Soporte: Dedicado 24/7
- SLA garantizado

**Plan Unlimited:**
- Plan especial para desarrollo/operación
- Sin límites
- Todos los módulos activos
- `subscription_status: UNLIMITED`

### Estado Actual

**✅ Implementado:**

- Sistema de verificación de módulos activos
- Activación/desactivación de módulos por studio
- Integración con Stripe para suscripciones
- Estructura de planes en base de datos
- **Planes definidos:** Basic, Pro, Enterprise
- **Límites por plan:** Configurados en `plan_limits`
- **Gestión de suscripciones:** Cambio de plan, historial de facturación
- **Revenue Share:** Configurado (30% por defecto)

**⚠️ Pendiente:**

- Validación automática de límites en tiempo real
- Upgrade/downgrade automático de planes
- Facturación automática por módulos add-on
- Notificaciones cuando se acercan límites
- Restricción de funcionalidades al alcanzar límites

---

## 🔌 APIs y Integraciones

### APIs Públicas

| Endpoint                     | Descripción                       | Estado |
| ---------------------------- | --------------------------------- | ------ |
| `/api/public/studios/[slug]` | Info pública del estudio          | ✅     |
| `/api/public/leads`          | Captura de leads públicos         | ✅     |
| `/api/cliente/drive`         | Acceso a Google Drive del cliente | ✅     |

### Integraciones Configuradas

#### Google OAuth

- ✅ Google Drive (almacenamiento)
- ✅ Google Calendar (calendario secundario)
- ✅ Configuración genérica para múltiples APIs

#### Stripe

- ✅ Webhooks configurados
- ✅ Gestión de suscripciones
- ✅ Métodos de pago

#### Manychat

- ✅ Webhook configurado
- ✅ Integración para captura de leads

#### Supabase

- ✅ Autenticación
- ✅ Storage
- ✅ Realtime (notificaciones en tiempo real)

### Webhooks

| Webhook                  | Descripción          | Estado |
| ------------------------ | -------------------- | ------ |
| `/api/webhooks/stripe`   | Eventos de Stripe    | ✅     |
| `/api/webhooks/manychat` | Leads desde Manychat | ✅     |
| `/api/webhooks/supabase` | Eventos de Supabase  | ✅     |

---

## 📈 Estado de Implementación

### Funcionalidades Completas (✅)

1. **Gestión de Estudio:**
   - Perfil público del estudio
   - Identidad del negocio (marca, contacto, redes)
   - Configuración de cuenta y seguridad

2. **Área Comercial:**
   - Dashboard con analytics
   - Catálogo de servicios y paquetes
   - Ofertas comerciales con landing pages
   - Pipeline de promesas (leads)
   - Sistema de cotizaciones

3. **Área de Negocio:**
   - Gestión completa de eventos
   - Cronograma y calendarización
   - Gestión de personal
   - Control financiero completo

4. **Portal del Cliente:**
   - Login por teléfono
   - Vista de eventos asignados
   - Acceso a contenido

5. **Sistema de Contratos:**
   - Plantillas editables
   - Variables dinámicas
   - Versiones y autorizaciones

### Funcionalidades Parciales (⚠️)

1. **ZEN Marketing:**
   - Landing pages ✅
   - Captura de leads ✅
   - Email marketing ⚠️
   - Automatizaciones ⚠️

2. **ZEN Magic (IA):**
   - Estructura base ✅
   - Chat provider ✅
   - Funcionalidades de IA ⚠️

3. **Conversaciones:**
   - Estructura base ✅
   - Chat completo ⚠️

4. **Integraciones:**
   - Google Drive ✅
   - Stripe ✅
   - Manychat ✅
   - Otras integraciones ⚠️

### Pendientes de Implementación (❌)

1. **Validación Automática de Límites:**
   - Verificación en tiempo real de límites de plan
   - Bloqueo de funcionalidades al alcanzar límites
   - Notificaciones proactivas cuando se acercan límites

2. **Módulos Add-ons:**
   - ZEN Payment (completo)
   - ZEN Cloud (completo)
   - ZEN Invitation

3. **Analytics Avanzado:**
   - Reportes de conversión
   - Análisis de ROI
   - Métricas de marketing

4. **Notificaciones:**
   - Sistema completo de notificaciones
   - Email automático
   - Push notifications

---

## 💼 Recomendaciones Comerciales

### 1. Planes de Suscripción Implementados

**Estado Actual:** ✅ Planes definidos y configurados en base de datos

#### Plan Basic ($399 MXN/mes o $3,990 MXN/año)

- ✅ ZEN Manager completo
- ⚠️ Límites:
  - 10 eventos/mes
  - 5 GB almacenamiento
  - 3 miembros de equipo
  - 2 portfolios
- ❌ Sin módulos add-on
- Soporte: Email

**Target:** Estudios pequeños que están comenzando

#### Plan Pro ($699 MXN/mes o $6,990 MXN/año) ⭐

- ✅ ZEN Manager completo
- ✅ ZEN Marketing
- ✅ ZEN Magic (IA)
- ✅ ZEN Pages
- ⚠️ Límites:
  - 30 eventos/mes
  - 25 GB almacenamiento
  - 10 miembros de equipo
  - 10 portfolios
  - 5 templates Gantt
- Soporte: Email + Chat
- ⭐ Plan Popular

**Target:** Estudios en crecimiento

#### Plan Enterprise ($1,999 MXN/mes o $19,990 MXN/año)

- ✅ Todos los módulos core
- ✅ Todos los módulos add-on incluidos
- ⚠️ Límites: Ilimitados
- Soporte: Dedicado 24/7
- SLA garantizado

**Target:** Estudios grandes con necesidades avanzadas

### 2. Comparativa de Planes

| Funcionalidad      | Basic        | Pro ⭐       | Enterprise   |
| ------------------ | ------------ | ----------- | ------------ |
| Precio/mes         | $399 MXN     | $699 MXN    | $1,999 MXN   |
| Precio/año         | $3,990 MXN   | $6,990 MXN  | $19,990 MXN  |
| Eventos/mes        | 10           | 30          | Ilimitado    |
| Almacenamiento     | 5 GB         | 25 GB       | Ilimitado    |
| Miembros de equipo | 3            | 10          | Ilimitado    |
| Portfolios         | 2            | 10          | Ilimitado    |
| ZEN Manager        | ✅           | ✅          | ✅           |
| ZEN Marketing      | ❌           | ✅          | ✅           |
| ZEN Magic (IA)     | ❌           | ✅          | ✅           |
| ZEN Pages          | ❌           | ✅          | ✅           |
| Módulos Add-on     | ❌           | Opcionales  | ✅ Incluidos |
| Soporte            | Email        | Email+Chat  | Dedicado 24/7|

### 3. Estrategia de Upsell

**Puntos de Conversión Identificados:**

1. **Límite de Eventos Alcanzado:**
   - ⚠️ **Pendiente:** Mostrar banner de upgrade cuando se alcance 80% del límite
   - ⚠️ **Pendiente:** Modal de upgrade con beneficios del plan superior
   - ⚠️ **Pendiente:** Bloqueo suave (permitir completar evento actual)

2. **Límite de Almacenamiento Alcanzado:**
   - ⚠️ **Pendiente:** Notificación cuando se alcance 80% del límite
   - ⚠️ **Pendiente:** Opción de upgrade o comprar almacenamiento adicional
   - ⚠️ **Pendiente:** Mostrar uso actual vs límite

3. **Funcionalidad Premium Solicitada:**
   - ⚠️ **Pendiente:** ZEN Magic: Modal de upgrade al intentar usar IA
   - ⚠️ **Pendiente:** ZEN Payment: Ofrecer al configurar pagos
   - ⚠️ **Pendiente:** ZEN Cloud: Ofrecer al alcanzar límite de almacenamiento

**Implementación Sugerida:**

```typescript
// Helper para verificar límites
async function checkPlanLimit(
  studioId: string,
  limitType: PlanLimitType
): Promise<{ used: number; limit: number; percentage: number }>

// Helper para verificar si se puede realizar acción
async function canPerformAction(
  studioId: string,
  action: 'create_event' | 'upload_file' | 'create_portfolio'
): Promise<{ allowed: boolean; reason?: string }>
```

### 4. Métricas Clave para Marketing

**KPIs a Implementar:**

1. **Adquisición:**
   - ⚠️ Registros por mes (pendiente tracking)
   - ⚠️ Conversión de trial a pago (pendiente)
   - ⚠️ Fuente de tráfico (UTM) (pendiente)

2. **Retención:**
   - ⚠️ Tasa de churn mensual (pendiente)
   - ⚠️ Tiempo promedio de uso (pendiente)
   - ⚠️ Eventos de activación completados (pendiente)

3. **Monetización:**
   - ⚠️ MRR (Monthly Recurring Revenue) (pendiente dashboard)
   - ⚠️ ARPU (Average Revenue Per User) (pendiente)
   - ⚠️ Upgrade rate (pendiente)
   - ⚠️ Add-on adoption rate (pendiente)

4. **Engagement:**
   - ✅ Eventos creados por estudio (disponible en analytics)
   - ✅ Leads capturados (disponible en analytics)
   - ⚠️ Uso de funcionalidades premium (pendiente tracking)

**Tracking Actual:**

- ✅ Analytics de contenido (posts, portfolios, ofertas)
- ✅ Visualizaciones de contenido público
- ✅ Leads capturados desde ofertas
- ⚠️ Pendiente: Tracking de uso de funcionalidades por módulo

### 5. Funcionalidades de Marketing Pendientes

**Prioridad Alta:**

1. ✅ Landing pages de ofertas (implementado)
2. ⚠️ Email marketing automatizado
3. ⚠️ Campañas de remarketing
4. ⚠️ Segmentación de clientes

**Prioridad Media:**

1. ⚠️ Reportes de conversión
2. ⚠️ A/B testing de ofertas
3. ⚠️ Integración con Facebook Ads
4. ⚠️ Pixel de conversión avanzado

**Prioridad Baja:**

1. ⚠️ Chatbot con IA
2. ⚠️ Recomendaciones automáticas
3. ⚠️ Análisis predictivo

---

## 📝 Notas Técnicas

### Optimización de Routing de Promesas Públicas

**Problema Resuelto:**
- Loop infinito de redirecciones entre rutas de promesas públicas
- Consultas pesadas en cada redirección

**Solución Implementada:**

1. **Consulta Ligera Inicial (`getPublicPromiseRouteState`):**
   ```typescript
   // Solo obtiene estados necesarios para routing
   // No carga datos completos de cotizaciones
   const routeState = await getPublicPromiseRouteState(slug, promiseId);
   ```

2. **Función Helper Centralizada (`determinePromiseRoute`):**
   ```typescript
   // Lógica de routing centralizada y reutilizable
   // Prioridad: Negociación > Cierre > Pendientes
   const targetRoute = determinePromiseRoute(cotizaciones, slug, promiseId);
   ```

3. **Redirecciones Optimizadas:**
   - Uso de `startTransition` en cliente para navegación no bloqueante
   - Una sola consulta inicial en `page.tsx`
   - Sub-páginas simplificadas que redirigen al router principal si no encuentran su estado

4. **Caching:**
   - Metadata cacheada con `unstable_cache`
   - Tags de revalidación para actualización selectiva

**Archivos Clave:**
- `/src/lib/actions/public/promesas.actions.ts` - `getPublicPromiseRouteState`
- `/src/lib/utils/public-promise-routing.ts` - `determinePromiseRoute`
- `/src/app/[slug]/promise/[promiseId]/page.tsx` - Router principal optimizado

### Seguridad

**Autenticación y Autorización:**

- ✅ **Supabase Auth** para autenticación de usuarios
- ✅ **Multi-rol:** `super_admin`, `agente`, `suscriptor`/`studio_owner`
- ✅ **Middleware de protección:** `src/proxy.ts` protege rutas administrativas
- ✅ **Verificación de acceso a studio:** Mediante `user_studio_roles` y `studio_user_profiles`
- ✅ **Timeout de sesión configurable** por usuario

**Aislamiento de Datos:**

- ✅ **Row Level Security (RLS)** en Supabase para tablas críticas:
  - `studio_promises`
  - `studio_cotizaciones` y `studio_cotizacion_items`
  - `studio_events`
  - `studio_notifications`
  - `studio_user_profiles`
  - `storage.objects` (archivos por studio)
- ✅ **Filtrado por `studio_id`** en todas las queries Prisma
- ✅ **Políticas RLS** verifican acceso mediante:
  - `user_studio_roles` (usuarios con múltiples studios)
  - `studio_user_profiles` (perfil de usuario en studio)
  - `auth.uid()` (ID de Supabase del usuario autenticado)

**Validación de Módulos:**

- ✅ **Verificación de módulos activos** antes de acceder a funcionalidades
- ✅ **Helpers centralizados** en `src/lib/modules/index.ts`
- ✅ **Protección de rutas** basada en módulos activos

### Performance

- ✅ Server Components por defecto
- ✅ Lazy loading de componentes pesados
- ✅ Optimización de imágenes (Next.js Image)
- ✅ Caching de datos estáticos

### Escalabilidad

- ✅ Multi-tenant con aislamiento por slug
- ✅ Base de datos indexada correctamente
- ✅ Realtime subscriptions optimizadas
- ⚠️ Pendiente: CDN para assets estáticos

---

## 🎯 Conclusión

La plataforma ZENLY tiene una **base sólida y funcional** para estudios fotográficos. El sistema multi-tenant está bien implementado, y las funcionalidades core están operativas.

**Fortalezas:**

- ✅ Arquitectura escalable y modular
- ✅ Funcionalidades core completas
- ✅ Portal del cliente funcional
- ✅ Sistema de contratos robusto
- ✅ Integraciones principales configuradas

**Áreas de Oportunidad:**

- ⚠️ Validación automática de límites en tiempo real
- ⚠️ Completar módulos add-on (Payment, Conversations, Cloud, Invitation)
- ⚠️ Sistema de notificaciones completo
- ⚠️ Analytics avanzado y reportes de conversión
- ⚠️ Email marketing automatizado

**Recomendación Principal:**
Priorizar la **implementación de validación automática de límites** y **sistema de notificaciones** para completar el modelo de negocio y mejorar la experiencia del usuario.

---

---

## 🔐 Autenticación y Autorización

### Sistema de Roles

**Roles de Plataforma:**

1. **super_admin:**
   - Acceso completo a `/admin`
   - Gestión de estudios, planes, módulos
   - Acceso a todos los studios

2. **agente:**
   - Acceso a `/agente`
   - Gestión de leads y campañas
   - Acceso limitado a información de studios

3. **suscriptor / studio_owner:**
   - Acceso a `/{slug}/studio/*`
   - Acceso a `/{slug}/profile/edit`
   - Gestión completa de su studio

### Flujo de Autenticación

```typescript
// src/proxy.ts - Middleware de protección

1. Verificar sesión Supabase (auth.getUser())
2. Obtener rol del usuario (user_metadata.role)
3. Verificar acceso a ruta según rol
4. Para rutas de studio: verificar acceso al studio específico
5. Redirigir a /login si no autenticado
```

### Verificación de Acceso a Studio

```typescript
// Patrón de verificación en layouts y server actions

1. Obtener studio por slug
2. Verificar que studio existe y está activo
3. Verificar que usuario tiene acceso mediante:
   - user_studio_roles (relación usuario-studio-rol)
   - studio_user_profiles (perfil de usuario en studio)
4. Aplicar filtros por studio_id en queries
```

---

## 📦 Almacenamiento y Archivos

### Storage por Studio

**Estructura de Storage:**

```
Studio/
└── studios/
    └── {slug}/
        ├── media/          # Imágenes y videos
        ├── documents/      # Documentos y contratos
        ├── portfolios/    # Portafolios
        └── offers/        # Media de ofertas
```

**RLS en Storage:**

- Políticas RLS verifican acceso al studio del path
- Usuarios solo pueden acceder a archivos de sus studios
- Verificación mediante `user_studio_roles` o `studio_user_profiles`

---

## 🔄 Integración con Stripe

### Gestión de Suscripciones

**Webhooks Implementados:**

- `customer.subscription.created` - Crear suscripción
- `customer.subscription.updated` - Actualizar suscripción
- `customer.subscription.deleted` - Cancelar suscripción
- `invoice.payment_succeeded` - Pago exitoso
- `invoice.payment_failed` - Pago fallido

**Revenue Share:**

- Configurado por defecto: 30% (`commission_rate`)
- Gestión de revenue share por estudio
- Integración con Stripe Connect (pendiente)

---

**Documento generado el:** 2025-01-27  
**Última actualización:** 2025-01-27 (Optimización de routing de promesas públicas)  
**Versión:** 2.0  
**Autor:** Análisis Técnico ZENLY Platform
