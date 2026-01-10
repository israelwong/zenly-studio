# Sistema de Recordatorios para Promesas - ZEN Platform

**Fecha de Creación:** 2025-01-09  
**Rama:** `260109-studio-promise-recordatorios`  
**Estado:** 📋 Planificación  
**Complejidad:** MEDIA (6/10)  
**Riesgo al Sistema Actual:** BAJO (2/10)  
**Éxito Estimado:** 88-90%

---

## 📋 Resumen Ejecutivo

Sistema de recordatorios programados para promesas (y eventualmente eventos) que permite a los estudios configurar alertas automáticas para dar seguimiento a prospectos y tareas pendientes.

### Caso de Uso Principal

**Problema:** Un estudio tiene muchos prospectos y puede olvidar dar seguimiento después de compartir el link de promesa pública.

**Solución:** Botón "Recordatorios" en el toolbar de Promise que permite:
- Configurar recordatorio para contactar en N días (default: 2)
- Guardar configuración como default para todas las promesas
- Guardar solo para esta promesa específica
- Notificación automática cuando llegue la fecha programada

### Funcionalidades Principales

- ✅ **Recordatorios por Promise** (específicos o globales)
- ✅ **Recordatorios por Evento** (futuro, no en MVP)
- ✅ **Configuración de días offset** (default: 2 días)
- ✅ **Notificaciones automáticas** cuando se cumple la fecha
- ✅ **Sistema de ejecución automática** (Edge Function + pg_cron)

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

```
Base de Datos:
├── PostgreSQL (Supabase)
├── Tabla: studio_reminders
└── pg_cron (ejecución programada)

Backend:
├── Prisma ORM
├── Server Actions (CRUD recordatorios)
├── Edge Function (procesamiento automático)
└── Sistema de Notificaciones (existente)

Frontend:
├── Next.js 15 (App Router)
├── React 19
├── ZEN Design System
└── Componente ReminderButton
```

### Modelo de Datos

```prisma
model studio_reminders {
  id              String          @id @default(cuid())
  studio_id       String
  promise_id      String?
  event_id        String?
  reminder_type   ReminderType    // GLOBAL | SPECIFIC
  days_offset     Int             @default(2)
  reminder_date   DateTime
  is_active       Boolean         @default(true)
  is_completed    Boolean         @default(false)
  completed_at    DateTime?
  metadata        Json?
  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt
  
  studio          studios         @relation(...)
  promise         studio_promises? @relation(...)
  event           studio_events?  @relation(...)
  
  @@index([studio_id, is_active, reminder_date])
  @@index([promise_id])
  @@index([event_id])
  @@index([reminder_date]) WHERE is_active = true AND is_completed = false
}
```

### Flujo de Ejecución

```
1. Usuario crea recordatorio
   ↓
2. Server Action obtiene última interacción desde studio_promise_logs
   ↓
3. Calcula reminder_date = última_interacción + days_offset
   (Si no hay interacciones, usa created_at de la promise)
   ↓
4. Verifica que no existe recordatorio activo duplicado
   ↓
5. Guarda en studio_reminders con is_active = true
   ↓
6. pg_cron ejecuta Edge Function cada hora
   ↓
7. Edge Function busca recordatorios vencidos (is_active = true)
   ↓
8. Crea notificaciones usando sistema existente
   ↓
9. Marca recordatorios como completados (is_completed = true)
   ↓
10. Usuario puede activar/desactivar recordatorios manualmente
```

### Lógica de Última Interacción

**Regla:** El conteo de días inicia desde la **última interacción registrada** en `studio_promise_logs`, no desde la creación de la promesa.

**Implementación:**
- Consultar `studio_promise_logs` ordenado por `created_at DESC`
- Obtener el log más reciente
- Si existe: usar `log.created_at` como fecha base
- Si no existe: usar `promise.created_at` como fecha base
- Calcular: `reminder_date = fecha_base + days_offset`

**Tipos de interacción considerados:**
- Cualquier log en `studio_promise_logs` (notas, acciones del sistema, etc.)
- Esto asegura que el recordatorio siempre cuenta desde la última actividad real

---

## 📝 Checklist de Implementación

### Fase 1: Base de Datos ⏳

#### 1.1 Migración SQL
- [ ] Crear migración `YYYYMMDDHHmmss_create_studio_reminders.sql`
- [ ] Crear tabla `studio_reminders` con todos los campos
- [ ] Agregar constraint CHECK para promise_id o event_id (uno requerido)
- [ ] Crear índices optimizados:
  - [ ] `idx_reminders_studio_active` (studio_id, is_active, reminder_date)
  - [ ] `idx_reminders_promise` (promise_id)
  - [ ] `idx_reminders_event` (event_id)
  - [ ] `idx_reminders_due_date` (reminder_date) WHERE is_active = true AND is_completed = false
- [ ] Agregar foreign keys a studios, studio_promises, studio_events
- [ ] Habilitar RLS (Row Level Security)
- [ ] Crear políticas RLS:
  - [ ] SELECT: usuarios del estudio pueden ver sus recordatorios
  - [ ] INSERT: usuarios del estudio pueden crear recordatorios
  - [ ] UPDATE: usuarios del estudio pueden actualizar sus recordatorios
  - [ ] DELETE: usuarios del estudio pueden eliminar sus recordatorios
- [ ] Agregar columna `default_reminder_days` a tabla `studios` (INTEGER DEFAULT 2)
- [ ] Ejecutar migración en desarrollo
- [ ] Verificar migración exitosa

#### 1.2 Prisma Schema
- [ ] Agregar enum `ReminderType` (GLOBAL, SPECIFIC)
- [ ] Agregar modelo `studio_reminders` al schema.prisma
- [ ] Agregar relación en modelo `studios`:
  ```prisma
  reminders studio_reminders[]
  ```
- [ ] Agregar relación en modelo `studio_promises`:
  ```prisma
  reminders studio_reminders[]
  ```
- [ ] Agregar relación en modelo `studio_events`:
  ```prisma
  reminders studio_reminders[]
  ```
- [ ] Agregar campo `default_reminder_days` a modelo `studios`
- [ ] Ejecutar `npx prisma generate`
- [ ] Verificar tipos generados correctamente

---

### Fase 2: Backend - Server Actions ⏳

#### 2.1 Crear Server Actions
- [ ] Crear archivo `src/lib/actions/studio/commercial/promises/reminders.actions.ts`
- [ ] Implementar `crearRecordatorio()`:
  - [ ] Validar studioSlug y promiseId
  - [ ] Obtener studio_id desde slug
  - [ ] **Obtener última interacción desde studio_promise_logs:**
    - [ ] Query: `SELECT MAX(created_at) FROM studio_promise_logs WHERE promise_id = ?`
    - [ ] Si existe log, usar `log.created_at` como fecha base
    - [ ] Si no existe, usar `promise.created_at` como fecha base
  - [ ] **Verificar que no existe recordatorio activo duplicado:**
    - [ ] Query: `SELECT * FROM studio_reminders WHERE promise_id = ? AND is_active = true`
    - [ ] Si existe, retornar error o actualizar existente según diseño
  - [ ] Calcular reminder_date = fecha_base + days_offset
  - [ ] Crear registro en studio_reminders con is_active = true
  - [ ] Si saveAsDefault = true, actualizar studios.default_reminder_days
  - [ ] Retornar resultado con éxito/error
- [ ] Implementar `obtenerRecordatoriosPromise()`:
  - [ ] Validar studioSlug y promiseId
  - [ ] Obtener recordatorios activos de la promise
  - [ ] Incluir información relacionada (promise, studio)
  - [ ] Retornar lista ordenada por reminder_date
- [ ] Implementar `obtenerRecordatoriosActivos()`:
  - [ ] Obtener todos los recordatorios activos de un studio
  - [ ] Filtrar por tipo (GLOBAL, SPECIFIC)
  - [ ] Retornar lista ordenada
- [ ] Implementar `completarRecordatorio()`:
  - [ ] Validar reminderId pertenece al studio
  - [ ] Marcar is_completed = true
  - [ ] Guardar completed_at = now()
  - [ ] Retornar resultado
- [ ] Implementar `activarDesactivarRecordatorio()`:
  - [ ] Validar reminderId pertenece al studio
  - [ ] Toggle is_active (true ↔ false)
  - [ ] Si se activa y ya pasó la fecha, recalcular reminder_date desde última interacción
  - [ ] Retornar resultado con nuevo estado
- [ ] Implementar `eliminarRecordatorio()`:
  - [ ] Validar reminderId pertenece al studio
  - [ ] Eliminar registro (hard delete por simplicidad)
  - [ ] Retornar resultado
- [ ] Implementar `obtenerDefaultReminderDays()`:
  - [ ] Obtener default_reminder_days del studio
  - [ ] Retornar valor o default 2 si es null
- [ ] Implementar `actualizarDefaultReminderDays()`:
  - [ ] Validar studioSlug
  - [ ] Actualizar studios.default_reminder_days
  - [ ] Retornar resultado

#### 2.2 Validaciones y Schemas
- [ ] Crear schema Zod para crear recordatorio:
  ```typescript
  ReminderCreateSchema = z.object({
    promiseId: z.string(),
    daysOffset: z.number().int().min(1).max(365),
    saveAsDefault: z.boolean().optional(),
    saveForThisOnly: z.boolean().optional(),
  })
  ```
- [ ] Agregar validaciones en Server Actions
- [ ] Manejar errores apropiadamente
- [ ] Agregar logging para debugging

#### 2.3 Integración con Notificaciones
- [ ] Agregar tipo `REMINDER_DUE` a enum `StudioNotificationType`
- [ ] Crear helper `src/lib/notifications/studio/helpers/reminder-notifications.ts`
- [ ] Implementar función para crear notificación de recordatorio:
  - [ ] Título: "Recordatorio: [nombre del contacto]"
  - [ ] Mensaje: "Es momento de contactar a [contacto] sobre la promesa [nombre]"
  - [ ] Route: `/${slug}/studio/commercial/promises/${promiseId}`
  - [ ] Route params: { slug, promise_id }
  - [ ] Metadata: { reminder_id, contact_name, promise_name }
- [ ] Probar creación de notificación

---

### Fase 3: Frontend - Componentes UI ⏳

#### 3.1 Componente ReminderButton
- [ ] Crear `src/app/[slug]/studio/commercial/promises/[promiseId]/components/ReminderButton.tsx`
- [ ] **Cargar recordatorios existentes al montar:**
  - [ ] Llamar a `obtenerRecordatoriosPromise()` al montar
  - [ ] Verificar si existe recordatorio activo
  - [ ] Mostrar estado actual del recordatorio si existe
- [ ] Implementar Popover con:
  - [ ] **Si NO existe recordatorio activo:**
    - [ ] Input numérico para días (default: 2)
    - [ ] Switch "Guardar por defecto para todas las promesas"
    - [ ] Switch "Guardar solo para esta promesa"
    - [ ] Botón "Programar recordatorio"
  - [ ] **Si EXISTE recordatorio activo:**
    - [ ] Mostrar información del recordatorio:
      - [ ] Fecha programada
      - [ ] Días restantes
      - [ ] Fecha base (última interacción)
    - [ ] Switch "Recordatorio activo" (toggle is_active)
    - [ ] Botón "Eliminar recordatorio"
    - [ ] Botón "Crear nuevo recordatorio" (si se quiere otro)
  - [ ] Botón "Cancelar" siempre visible
- [ ] Estado local para:
  - [ ] daysOffset (number)
  - [ ] saveAsDefault (boolean)
  - [ ] saveForThisOnly (boolean)
  - [ ] loading (boolean)
  - [ ] error (string | null)
  - [ ] recordatorioExistente (objeto | null)
  - [ ] isActive (boolean) - estado del recordatorio existente
- [ ] Cargar default_reminder_days del studio al montar
- [ ] Validar días (mínimo 1, máximo 365)
- [ ] Manejar submit del formulario
- [ ] Manejar toggle de activar/desactivar
- [ ] Mostrar loading state durante operaciones
- [ ] Mostrar mensaje de éxito/error con toast
- [ ] Cerrar popover después de éxito
- [ ] Usar componentes ZEN Design System:
  - [ ] ZenButton
  - [ ] ZenInput
  - [ ] ZenSwitch
  - [ ] ZenPopover
  - [ ] ZenBadge (para mostrar estado)

#### 3.2 Integración en PromiseDetailToolbar
- [ ] Importar ReminderButton en `PromiseDetailToolbar.tsx`
- [ ] Agregar botón después del grupo "Agendar" o antes de "Bitácora"
- [ ] Pasar props necesarias:
  - [ ] studioSlug
  - [ ] promiseId
- [ ] Verificar que no rompe layout existente
- [ ] Probar en diferentes tamaños de pantalla

#### 3.3 Lista de Recordatorios (Opcional - Fase 2)
- [ ] Crear componente para mostrar recordatorios activos
- [ ] Mostrar en PromiseCardView o sección separada
- [ ] Mostrar fecha programada y días restantes
- [ ] Mostrar fecha base (última interacción)
- [ ] Switch para activar/desactivar recordatorio
- [ ] Botón para completar manualmente
- [ ] Botón para eliminar

---

### Fase 4: Edge Function - Procesamiento Automático ⏳

#### 4.1 Crear Edge Function
- [ ] Crear carpeta `supabase/functions/process-reminders/`
- [ ] Crear `index.ts` con estructura básica:
  ```typescript
  import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
  ```
- [ ] Implementar función principal:
  - [ ] Conectar a Supabase usando SERVICE_ROLE_KEY
  - [ ] Query para obtener recordatorios vencidos:
    ```sql
    SELECT * FROM studio_reminders
    WHERE reminder_date <= NOW()
      AND is_active = true
      AND is_completed = false
    ORDER BY studio_id, reminder_date
    ```
  - [ ] Agrupar por studio_id
  - [ ] Para cada grupo, procesar recordatorios
- [ ] Implementar `processRemindersForStudio()`:
  - [ ] Obtener información de promise/event
  - [ ] **Verificar que recordatorio sigue activo** (is_active = true)
  - [ ] **Verificar que no se completó ya** (is_completed = false)
  - [ ] Crear notificación usando helper
  - [ ] Marcar recordatorio como completado (is_completed = true)
  - [ ] **NO desactivar automáticamente** (is_active sigue true, usuario decide)
  - [ ] Manejar errores individuales (no fallar todo el batch)
- [ ] Agregar logging para debugging
- [ ] Retornar respuesta JSON con estadísticas:
  ```json
  {
    "processed": 10,
    "notifications_created": 10,
    "errors": 0
  }
  ```

#### 4.2 Testing Local de Edge Function
- [ ] Instalar Supabase CLI si no está instalado
- [ ] Ejecutar `supabase functions serve process-reminders`
- [ ] Probar con datos de prueba
- [ ] Verificar creación de notificaciones
- [ ] Verificar marcado como completado
- [ ] Verificar manejo de errores

#### 4.3 Deploy Edge Function
- [ ] Ejecutar `supabase functions deploy process-reminders`
- [ ] Verificar deploy exitoso
- [ ] Probar endpoint manualmente con curl/Postman
- [ ] Verificar logs en Supabase Dashboard

---

### Fase 5: Configuración pg_cron ⏳

#### 5.1 Habilitar pg_cron
- [ ] Verificar que Supabase Pro+ tiene pg_cron habilitado
- [ ] Si no está habilitado, habilitar extensión:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  ```
- [ ] Verificar permisos necesarios

#### 5.2 Crear Job de Cron
- [ ] Crear migración SQL para configurar cron job:
  ```sql
  SELECT cron.schedule(
    'process-reminders-hourly',
    '0 * * * *', -- Cada hora
    $$
    SELECT net.http_post(
      url := 'https://[PROJECT_REF].supabase.co/functions/v1/process-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [SERVICE_ROLE_KEY]'
      )
    );
    $$
  );
  ```
- [ ] Reemplazar `[PROJECT_REF]` con project reference real
- [ ] Reemplazar `[SERVICE_ROLE_KEY]` con SERVICE_ROLE_KEY real
- [ ] Ejecutar migración
- [ ] Verificar job creado:
  ```sql
  SELECT * FROM cron.job WHERE jobname = 'process-reminders-hourly';
  ```

#### 5.3 Verificación y Testing
- [ ] Esperar próxima hora para verificar ejecución automática
- [ ] Verificar logs de Edge Function en Supabase Dashboard
- [ ] Verificar que se crearon notificaciones
- [ ] Verificar que recordatorios se marcaron como completados
- [ ] Probar ejecución manual si es necesario

---

### Fase 6: Testing y Validación ⏳

#### 6.1 Testing Funcional
- [ ] Crear recordatorio para una promise sin interacciones previas
- [ ] Verificar que usa `promise.created_at` como fecha base
- [ ] Crear interacción en promise (log)
- [ ] Crear nuevo recordatorio
- [ ] Verificar que usa `log.created_at` como fecha base (última interacción)
- [ ] Verificar que se guarda correctamente en DB
- [ ] Verificar que reminder_date se calcula correctamente (fecha_base + days_offset)
- [ ] Probar crear recordatorio cuando ya existe uno activo
- [ ] Verificar que previene duplicados o actualiza existente según diseño
- [ ] Probar con diferentes valores de daysOffset
- [ ] Probar guardar como default
- [ ] Probar guardar solo para esta promise
- [ ] Verificar que default_reminder_days se actualiza cuando corresponde
- [ ] Crear recordatorio con fecha pasada (para testing inmediato)
- [ ] Ejecutar Edge Function manualmente
- [ ] Verificar que se crea notificación
- [ ] Verificar que recordatorio se marca como completado (is_completed = true)
- [ ] Verificar que recordatorio sigue activo (is_active = true) - no se desactiva automáticamente
- [ ] Probar activar/desactivar recordatorio manualmente
- [ ] Verificar que notificación aparece en UI
- [ ] Probar click en notificación navega a promise correcta
- [ ] Crear nueva interacción después de recordatorio completado
- [ ] Verificar que se puede crear nuevo recordatorio desde nueva interacción

#### 6.2 Testing de Edge Cases
- [ ] Promise eliminada (recordatorio debe manejarse apropiadamente)
- [ ] Studio eliminado (cascade delete debe funcionar)
- [ ] Promise sin interacciones (debe usar created_at)
- [ ] Promise con múltiples interacciones (debe usar la más reciente)
- [ ] Intentar crear recordatorio cuando ya existe uno activo
- [ ] Desactivar recordatorio antes de que se ejecute
- [ ] Activar recordatorio después de desactivarlo
- [ ] Recordatorio completado pero reactivado manualmente
- [ ] Múltiples recordatorios para misma promise (solo uno activo a la vez)
- [ ] Recordatorios con fechas muy lejanas (365+ días)
- [ ] Recordatorios con días offset = 0 (mismo día)
- [ ] Edge Function ejecutada múltiples veces (idempotencia - no debe crear notificaciones duplicadas)
- [ ] Sin recordatorios vencidos (no debe fallar)
- [ ] Error al crear notificación (no debe bloquear otros)
- [ ] Recordatorio vencido pero desactivado (no debe procesarse)

#### 6.3 Testing de UI/UX
- [ ] Botón visible en toolbar
- [ ] Popover se abre/cierra correctamente
- [ ] Input numérico valida correctamente
- [ ] Switches funcionan correctamente
- [ ] Loading states se muestran apropiadamente
- [ ] Mensajes de error son claros
- [ ] Mensajes de éxito son claros
- [ ] Responsive en mobile
- [ ] Accesibilidad (keyboard navigation, screen readers)

#### 6.4 Testing de Performance
- [ ] Query de recordatorios es rápida (< 100ms)
- [ ] Edge Function procesa 100+ recordatorios en < 5s
- [ ] No hay memory leaks en componente React
- [ ] Índices de DB funcionan correctamente

---

### Fase 7: Documentación y Cleanup ⏳

#### 7.1 Documentación
- [ ] Documentar API de Server Actions en código
- [ ] Documentar Edge Function en código
- [ ] Crear README o documentación de uso para usuarios
- [ ] Documentar configuración de pg_cron
- [ ] Documentar troubleshooting común

#### 7.2 Cleanup
- [ ] Eliminar console.logs de debugging
- [ ] Eliminar código comentado
- [ ] Verificar que no hay TODOs pendientes
- [ ] Verificar que no hay código muerto
- [ ] Optimizar imports
- [ ] Verificar formato de código (prettier/eslint)

---

## 🔧 Detalles Técnicos

### Lógica de Última Interacción - Detalles de Implementación

**Objetivo:** El recordatorio debe contar días desde la última actividad real del usuario, no desde la creación de la promesa.

**Query para obtener última interacción:**
```sql
SELECT created_at 
FROM studio_promise_logs 
WHERE promise_id = ? 
ORDER BY created_at DESC 
LIMIT 1;
```

**Lógica en Server Action:**
```typescript
// 1. Obtener última interacción
const ultimoLog = await prisma.studio_promise_logs.findFirst({
  where: { promise_id: promiseId },
  orderBy: { created_at: 'desc' },
  select: { created_at: true }
});

// 2. Determinar fecha base
const fechaBase = ultimoLog 
  ? ultimoLog.created_at 
  : promise.created_at;

// 3. Calcular reminder_date
const reminderDate = new Date(fechaBase);
reminderDate.setDate(reminderDate.getDate() + daysOffset);
```

**Tipos de logs que cuentan como interacción:**
- ✅ Notas de usuario (`user_note`)
- ✅ Acciones del sistema (`promise_created`, `stage_change`, etc.)
- ✅ WhatsApp enviado (`whatsapp_sent`)
- ✅ Perfil compartido (`profile_shared`)
- ✅ Cotización creada/actualizada (`quotation_created`, etc.)
- ✅ Cualquier log en `studio_promise_logs`

**Casos especiales:**
- Si la promise no tiene logs: usar `promise.created_at`
- Si hay múltiples logs en el mismo segundo: usar el más reciente (mayor ID)
- Si se crea recordatorio inmediatamente después de una acción: contar desde esa acción

### Prevención de Duplicados

**Regla:** Solo puede existir **un recordatorio activo** (`is_active = true`) por promise a la vez.

**Implementación:**
```typescript
// Verificar duplicado antes de crear
const recordatorioExistente = await prisma.studio_reminders.findFirst({
  where: {
    promise_id: promiseId,
    is_active: true,
    is_completed: false
  }
});

if (recordatorioExistente) {
  // Opción 1: Actualizar existente
  return await prisma.studio_reminders.update({
    where: { id: recordatorioExistente.id },
    data: { reminder_date: nuevaFecha, days_offset: daysOffset }
  });
  
  // Opción 2: Retornar error
  // return { success: false, error: 'Ya existe un recordatorio activo' };
}
```

**Comportamiento cuando se completa:**
- `is_completed = true` pero `is_active = true` (usuario decide si reactivar)
- Si usuario quiere nuevo recordatorio: puede crear uno nuevo (el anterior sigue completado)
- Si usuario quiere reactivar: cambiar `is_completed = false` y recalcular `reminder_date`

### Estructura de Archivos

```
src/
├── lib/
│   ├── actions/
│   │   └── studio/
│   │       └── commercial/
│   │           └── promises/
│   │               └── reminders.actions.ts  [NUEVO]
│   └── notifications/
│       └── studio/
│           └── helpers/
│               └── reminder-notifications.ts  [NUEVO]
├── app/
│   └── [slug]/
│       └── studio/
│           └── commercial/
│               └── promises/
│                   └── [promiseId]/
│                       └── components/
│                           └── ReminderButton.tsx  [NUEVO]

supabase/
├── functions/
│   └── process-reminders/
│       └── index.ts  [NUEVO]
└── migrations/
    └── YYYYMMDDHHmmss_create_studio_reminders.sql  [NUEVO]
```

### Dependencias Nuevas

- Ninguna (usa dependencias existentes)

### Variables de Entorno

- `SUPABASE_URL` (ya existe)
- `SUPABASE_SERVICE_ROLE_KEY` (ya existe para Edge Function)

---

## 🚨 Consideraciones y Riesgos

### Riesgos Identificados

1. **Edge Function Setup (20% riesgo)**
   - Primera Edge Function del proyecto
   - Requiere configuración manual de pg_cron
   - **Mitigación:** Documentación detallada, testing local primero

2. **Timezone Handling (10% riesgo)**
   - Recordatorios pueden ejecutarse en hora incorrecta
   - **Mitigación:** Usar UTC en DB, convertir en UI según timezone del studio

3. **Performance con muchos recordatorios (5% riesgo)**
   - Si hay 1000+ recordatorios vencidos, puede ser lento
   - **Mitigación:** Procesar en batches, índices optimizados

### Limitaciones Conocidas

- Solo funciona para Promises en MVP (Eventos en fase 2)
- Requiere Supabase Pro+ para pg_cron
- No hay UI completa para ver/editar recordatorios existentes (solo toggle activar/desactivar en botón)
- Si hay múltiples interacciones en el mismo segundo, puede haber ambigüedad en cuál usar (usar la más reciente por ID)
- No hay recordatorios recurrentes automáticos (usuario debe crear nuevo después de cada ejecución)

---

## 📊 Métricas de Éxito

### KPIs de Implementación

- ✅ Migración ejecutada sin errores
- ✅ Server Actions funcionando correctamente
- ✅ Componente UI renderizando y funcionando
- ✅ Edge Function procesando recordatorios
- ✅ pg_cron ejecutándose cada hora
- ✅ Notificaciones creándose correctamente
- ✅ 0 errores críticos en producción

### Métricas de Uso (Post-implementación)

- Número de recordatorios creados por día
- Número de notificaciones enviadas por día
- Tasa de recordatorios completados vs creados
- Tiempo promedio entre creación y ejecución

---

## 🔄 Próximos Pasos (Fase 2)

### Funcionalidades Futuras

- [ ] Recordatorios para Eventos
- [ ] UI para ver/editar recordatorios existentes
- [ ] Recordatorios recurrentes
- [ ] Recordatorios con múltiples acciones (email, WhatsApp, etc.)
- [ ] Dashboard de recordatorios pendientes
- [ ] Integración con Google Calendar (opcional)

---

## 📝 Notas de Implementación

### Decisiones de Diseño

1. **Unificar tabla para Promises y Events:** Una sola tabla `studio_reminders` con campos nullable para `promise_id` y `event_id`. Más simple y escalable.

2. **Edge Function + pg_cron vs Vercel Cron:** Elegido Edge Function por mejor performance en multi-tenant y ejecución más cercana a la base de datos.

3. **Notificaciones vs Google Calendar:** Solo notificaciones por ahora. Google Calendar puede agregarse después si es necesario.

4. **Soft delete vs Hard delete:** Hard delete por simplicidad. Si se necesita historial, cambiar a soft delete después.

5. **Conteo desde última interacción:** El recordatorio cuenta días desde la última interacción registrada en `studio_promise_logs`, no desde la creación de la promesa. Esto asegura que el recordatorio siempre refleje la actividad real más reciente.

6. **Prevención de duplicados:** Solo puede existir un recordatorio activo (`is_active = true`) por promise a la vez. Si se intenta crear otro, se debe actualizar el existente o mostrar error según diseño.

7. **Activación/Desactivación manual:** Los recordatorios pueden activarse/desactivarse manualmente por el usuario. Cuando se completa (`is_completed = true`), el recordatorio sigue activo (`is_active = true`) para que el usuario decida si quiere reactivarlo o crear uno nuevo.

8. **No auto-desactivación:** Cuando un recordatorio se ejecuta y crea la notificación, NO se desactiva automáticamente. El usuario debe decidir si quiere mantenerlo activo para futuras ejecuciones o desactivarlo manualmente.

### Convenciones de Código

- Usar ZEN Design System para todos los componentes UI
- Server Actions con validación Zod
- Manejo de errores consistente con resto de la plataforma
- Logging estructurado para debugging

---

**Última Actualización:** 2025-01-09  
**Versión del Documento:** 1.0  
**Autor:** Sistema de Implementación ZEN Platform
