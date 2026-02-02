# Planes Comerciales y Lógica del Periodo de Prueba (Trial)

**Objetivo:** Mapear planes existentes, integración con onboarding y lógica técnica del trial (modelo: Trial 7 días, no Freemium).

**Última actualización:** 2026-01-31

---

## 1. Tablas relacionadas con planes

### 1.1 `platform_plans`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String (cuid) | PK |
| name | String | Nombre comercial (ej: "Basic", "Pro") |
| slug | String | Identificador único (trial, basic, pro, enterprise, unlimited) |
| description | String? | Descripción del plan |
| price_monthly | Decimal? | Precio mensual (MXN en seeds) |
| price_yearly | Decimal? | Precio anual |
| stripe_price_id | String? | Stripe Price ID (mensual) |
| stripe_price_id_yearly | String? | Stripe Price ID (anual) |
| stripe_product_id | String? | Stripe Product ID |
| features | Json? | Módulos, soporte, analytics, etc. |
| popular | Boolean | Destacado en UI |
| active | Boolean | Plan visible/contratable |
| order | Int | Orden de visualización |

**Relaciones:** `plan_limits`, `plan_services`, `studios`, `subscriptions`, `subscription_items`.

### 1.2 `plan_limits`

Límites por plan (enum `PlanLimitType`):

- EVENTS_PER_MONTH  
- STORAGE_GB  
- TEAM_MEMBERS  
- PORTFOLIOS  
- LEAD_FORMS  
- ACTIVE_CAMPAIGNS  
- GANTT_TEMPLATES  

Cada fila: `plan_id`, `limit_type`, `limit_value`, `unit`. Valor `-1` = ilimitado.

### 1.3 `studios` (campos de suscripción/trial)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| plan_id | String? | FK → platform_plans.id |
| subscription_status | SubscriptionStatus | Default: **TRIAL** |
| subscription_start | DateTime? | Inicio del periodo actual / trial |
| subscription_end | DateTime? | Fin del periodo / fin del trial |
| stripe_customer_id | String? | Stripe Customer ID |
| stripe_subscription_id | String? | Stripe Subscription ID |

El trial se controla a nivel **estudio**: `subscription_status = TRIAL` y `subscription_end` = fecha fin del trial. No es obligatorio tener fila en `subscriptions` para un estudio en trial (ver fallback en suscripcion.actions).

### 1.4 `subscriptions`

Tabla centrada en Stripe: cada fila representa una suscripción de Stripe.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| studio_id | String | FK → studios.id |
| stripe_subscription_id | String | **Requerido**, único |
| stripe_customer_id | String | **Requerido** |
| plan_id | String | FK → platform_plans.id |
| status | SubscriptionStatus | TRIAL \| ACTIVE \| CANCELLED \| PAUSED \| EXPIRED \| UNLIMITED |
| current_period_start | DateTime | Inicio del periodo de facturación |
| current_period_end | DateTime | Fin del periodo |
| billing_cycle_anchor | DateTime | Ancla del ciclo de facturación |

**Importante:** Crear una fila aquí exige `stripe_subscription_id` y `stripe_customer_id`. Un estudio en trial **sin** checkout en Stripe puede vivir solo con `studios.plan_id` + `studios.subscription_status` + `studios.subscription_start` / `subscription_end`, y la lógica de suscripción usa ese fallback (ver `suscripcion.actions.ts`).

---

## 2. Planes encontrados en código y seeds

### 2.1 Planes en base de datos (estado actual)

| order | Slug | Nombre | Precio mensual (MXN) | Precio anual (MXN) | Límites |
|-------|------|--------|----------------------|--------------------|---------|
| 0 | **trial** | Trial | 0 | 0 | 10 eventos/mes, 5 GB, 3 usuarios, 2 portfolios. **Usado en onboarding** (7 días de prueba). |
| 1 | **basic** | Starter | 299 | 2 990 | 10 eventos/mes, 5 GB, 3 usuarios, 2 portfolios |
| 2 | **pro** | Pro | 599 | 5 990 | 30 eventos/mes, 25 GB, 10 usuarios, 10 portfolios, 5 Gantt. **popular: true** |
| 3 | **enterprise** | Premium | 999 | 9 990 | Eventos/usuarios/portfolios/Gantt ilimitados (-1); 100 GB |
| 999 | **unlimited** | Plan Ilimitado | 0 | 0 | Todo ilimitado (-1). Especial (prosocial). |

**IDs en BD (referencia):** trial `d58f1ebb-2cbf-4368-849f-38ba7bc61bdf`, basic `cmidp4ygt000a8tguk89zlelc`, pro `cmidp4yvn000f8tgu65mv65xi`, enterprise `cmidp4za6000l8tguss71rgzp`, unlimited `e7217eef-f217-4eaf-9ce8-54cc15caffcf`.

El onboarding asigna el plan con `slug: "trial"` a estudios nuevos (7 días de trial). Si falta en tu entorno, usar `scripts/create-trial-plan.sql`.

### 2.2 Plan especial: Unlimited

- **Origen:** `scripts/create-unlimited-plan.sql` (y migraciones Supabase para estudio prosocial).
- **Slug:** `unlimited`
- **Nombre:** "Plan Ilimitado"
- **Descripción:** "Plan especial con acceso completo sin límites de tiempo. Gestionado manualmente."
- **Precios:** 0 (sin Stripe)
- **Stripe:** Todos los IDs en NULL (no se factura por Stripe)
- **order:** 999 (para ocultarlo de listas normales de planes)
- **Límites:** -1 en todos los `plan_limits` (EVENTS_PER_MONTH, STORAGE_GB, TEAM_MEMBERS, PORTFOLIOS, GANTT_TEMPLATES)
- **Uso:** Cuentas especiales (prosocial, Israel, pruebas internas, convenios). Asignado vía migraciones `20260107000000_migrate_demo_studio_to_prosocial.sql` y `20260108000000_fix_prosocial_unlimited_plan.sql` (studio prosocial → `plan_id = unlimited`, `subscription_status = UNLIMITED`, `subscription_end = NULL`).

### 2.3 Plan "trial" (onboarding)

- **Código:** `signup.actions.ts` usa `prisma.platform_plans.findFirst({ where: { slug: "trial", active: true } })`.
- **Uso:** Plan asignado a estudios nuevos en onboarding; el estudio queda con `subscription_status = TRIAL`, `subscription_start` = ahora, `subscription_end` = ahora + 7 días. No se crea fila en `subscriptions` hasta que exista suscripción en Stripe.
- **Nota:** El campo en el esquema es `active` (no `is_active`) en `platform_plans`.

---

## 3. Lógica del trial

### 3.1 Dónde se define la duración del trial

- **Constante global:** No existe en el código una constante tipo `TRIAL_DAYS = 7`.
- **Demo studio (seed):** Trial de **30 días**:  
  `subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)` en `01-seed.ts` (seedDemoStudio).
- **Modelo de negocio (Israel):** Trial de **7 días**, no Freemium. Eso implica que:
  - La duración de 7 días debería centralizarse (constante o config) y usarse al crear estudios en onboarding.
  - El onboarding no debería depender de un plan "free" perpetuo; debería asignar un plan de pago (ej: basic) con `subscription_status = TRIAL` y `subscription_end = now + 7 días`.

### 3.2 Cálculo de `trial_end` en creación de estudio

- **createStudioAndSubscription** hoy:
  - Busca plan `free` y, si existe, intenta crear fila en `subscriptions` (con campos que no coinciden con el esquema actual: p. ej. `started_at` en lugar de `current_period_start`/`current_period_end`/`billing_cycle_anchor`, y sin `stripe_subscription_id`/`stripe_customer_id`).
  - **No** actualiza `studios.subscription_start` ni `studios.subscription_end`.
  - **No** asigna `studios.plan_id` en el flujo actual (el estudio queda sin plan y sin fechas de trial en `studios`).

Para alinear con un trial de 7 días habría que:

1. Definir una constante (ej. en `lib/constants` o env) `TRIAL_DAYS = 7`.
2. En `createStudioAndSubscription`, después de crear el estudio:
   - Asignar `plan_id` al plan elegido para nuevos usuarios (p. ej. `basic` o un plan "trial" explícito).
   - `subscription_status = 'TRIAL'`.
   - `subscription_start = new Date()`.
   - `subscription_end = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)`.
3. No crear fila en `subscriptions` hasta que exista una suscripción en Stripe (o definir un flujo específico para trial sin Stripe con placeholders, si se desea).

### 3.3 Dónde se usa el trial en la UI

- **CurrentPlanCard** (`src/app/[slug]/studio/config/account/suscripcion/components/CurrentPlanCard.tsx`):
  - Si `subscription.status === 'TRIAL'` y existe `subscription.current_period_end`, calcula días restantes hasta esa fecha y los muestra ("X días restantes" / "Prueba activa").
- Los datos de suscripción pueden venir de:
  - Tabla `subscriptions` (cuando hay Stripe), o
  - Fallback desde `studios.plan_id` + `studios.subscription_status` + `studios.subscription_start` / `subscription_end` en `suscripcion.actions.ts` (cuando no hay fila en `subscriptions`).

---

## 4. Estados de suscripción (`SubscriptionStatus`)

| Valor | Uso |
|-------|-----|
| **TRIAL** | Periodo de prueba. Webhook Stripe `trialing` → se mapea a TRIAL. Default en `studios.subscription_status`. |
| **ACTIVE** | Suscripción de pago activa. |
| **CANCELLED** | Cancelada; puede seguir activa hasta `subscription_end`; después entra retención (data_retention_until). |
| **PAUSED** | Pausada. |
| **EXPIRED** | Expirada. |
| **UNLIMITED** | Plan especial sin Stripe (ej. prosocial). No depende de fechas; `subscription_end` puede ser NULL. |

En `studio-access.ts`, el acceso "completo" se da si `subscription_status === 'UNLIMITED'` o `plan?.slug === 'unlimited'`.

---

## 5. Vinculación estudio ↔ plan

1. **Al crear el estudio (onboarding):**  
   Debería asignarse `studios.plan_id` al plan de trial (y opcionalmente `subscription_status`, `subscription_start`, `subscription_end` como arriba). Hoy el código no hace esto de forma coherente y además depende de un plan "free" que no está en el seed.

2. **Tras checkout Stripe:**  
   El webhook `src/app/api/webhooks/stripe/route.ts` actualiza:
   - `studios`: `plan_id`, `subscription_status`, `subscription_start`, `subscription_end`, `stripe_customer_id`, etc.
   - Crea o actualiza fila en `subscriptions` con `plan_id`, `status`, `current_period_start`, `current_period_end`, `stripe_subscription_id`, `stripe_customer_id`.

3. **Plan especial (Israel/prosocial):**  
   Se asigna manualmente (o por migración) `plan_id = unlimited` y `subscription_status = UNLIMITED`; no se usa Stripe para ese estudio.

---

## 6. Resumen y recomendaciones

| Tema | Estado actual | Recomendación |
|------|----------------|---------------|
| Planes en seed | basic, pro, enterprise | Mantener; añadir si aplica plan "trial" o "free" según decisión de producto. |
| Plan unlimited | Definido en SQL y migraciones; usado para prosocial | Mantener; documentar que es solo para cuentas especiales. |
| Plan trial | Usado por onboarding (slug `trial`) | Debe existir en la base de datos con `active = true`. Crear con `scripts/create-trial-plan.sql` si no existe. |
| Duración del trial | No hay constante; demo usa 30 días | Introducir `TRIAL_DAYS = 7` (constante o env) y usarla en creación de estudio y, si aplica, en Stripe. |
| trial_end en onboarding | No se calcula ni se guarda en `studios` | En `createStudioAndSubscription`, setear `subscription_status = TRIAL`, `subscription_start`, `subscription_end = now + TRIAL_DAYS`, y `plan_id`. |
| Tabla subscriptions | Requiere Stripe IDs | No crear fila en onboarding hasta tener Stripe; usar solo `studios` para trial inicial. |
| Estados | TRIAL, ACTIVE, CANCELLED, PAUSED, EXPIRED, UNLIMITED | Correctos; el flujo de facturación y UI ya los contemplan. |

Con esto se tiene mapeado cómo se integran los planes con el onboarding y la lógica técnica del periodo de prueba, y qué falta para alinear con un trial de 7 días y sin Freemium.

---

## 7. Consulta SQL: planes en la base de datos

Para listar los planes que ya existen en tu base de datos (ejecutar en Supabase SQL Editor o con `tsx scripts/execute-sql.ts` sobre un archivo .sql):

```sql
-- Planes con límites
SELECT
  p.id,
  p.name,
  p.slug,
  p.description,
  p.price_monthly,
  p.price_yearly,
  p.stripe_product_id,
  p.stripe_price_id,
  p.popular,
  p.active,
  p."order",
  p.created_at,
  (
    SELECT json_agg(json_build_object(
      'limit_type', pl.limit_type,
      'limit_value', pl.limit_value,
      'unit', pl.unit
    ))
    FROM plan_limits pl
    WHERE pl.plan_id = p.id
  ) AS limits
FROM platform_plans p
ORDER BY p.active DESC, p."order" ASC, p.name ASC;
```

Versión mínima (solo slug y nombre para ver qué tienes):

```sql
SELECT id, name, slug, active, price_monthly, price_yearly, "order"
FROM platform_plans
ORDER BY "order" ASC, name ASC;
```

El onboarding usa el plan con **slug `trial`**; debe existir en la base de datos y tener `active = true`.
