# Plan de Trabajo: Sincronización Inteligente de Agenda (Google Calendar API)

**Fecha de creación:** 2025-01-29  
**Estado:** Pendiente de implementación  
**Prioridad:** Alta

---

## 📋 Objetivo del Módulo

Implementar un sistema de sincronización bidireccional entre la agenda de De Sen y Google Calendar. El sistema debe diferenciar entre **Eventos Principales** (Coberturas/Proyectos) y **Tareas de Cronograma** (Post-producción/Logística), utilizando una jerarquía de calendarios para mantener la limpieza visual del usuario.

### Requerimientos Clave

- **Sincronización No Sustitutiva:** Los datos de la base de datos local (Supabase) son la fuente de verdad.
- **Jerarquía de Calendarios:**
  - Eventos principales → Calendario Primario del usuario
  - Tareas de cronograma → Calendario Secundario ("Tareas De Sen")
- **Invitaciones Automáticas:** El personal asignado a una tarea debe recibir una invitación de Google como attendee.
- **Timezone Dinámico:** Usar timezone del estudio o del navegador del usuario (no hardcodear).
- **Manejo de Borrado:** Sincronizar eliminaciones con Google Calendar para mantener limpieza.

---

## 🗄️ Paso 1: Análisis de Esquema (Supabase)

### Estado Actual

**Tablas identificadas:**

- `studio_events` (eventos principales) - **NO tiene** `google_event_id`
- `studio_scheduler_event_tasks` (tareas de cronograma) - **NO tiene** campos de Google Calendar
- `studio_agenda` - **YA tiene** `google_event_id` (línea 1835 del schema)
- `studios` - Tiene OAuth de Google, **NO tiene** `google_calendar_secondary_id`

**Infraestructura existente:**

- ✅ OAuth de Google configurado (`google_oauth_refresh_token`, `google_oauth_scopes`)
- ✅ Cliente de Google Drive (`getGoogleDriveClient`) reutilizable para Calendar
- ✅ Encriptación de tokens (`decryptToken`)
- ✅ `platform_config.timezone` con default "America/Mexico_City"

### Migración Propuesta

```sql
-- 1. Agregar google_event_id a studio_events
ALTER TABLE studio_eventos
ADD COLUMN google_event_id TEXT;

CREATE INDEX idx_studio_events_google_event_id
ON studio_eventos(google_event_id);

-- 2. Agregar campos de Google Calendar a studio_scheduler_event_tasks
ALTER TABLE studio_scheduler_event_tasks
ADD COLUMN google_calendar_id TEXT,
ADD COLUMN google_event_id TEXT;

CREATE INDEX idx_scheduler_tasks_google_calendar_id
ON studio_scheduler_event_tasks(google_calendar_id);
CREATE INDEX idx_scheduler_tasks_google_event_id
ON studio_scheduler_event_tasks(google_event_id);

-- 3. Agregar secondary_calendar_id a studios
ALTER TABLE studios
ADD COLUMN google_calendar_secondary_id TEXT;
```

**Cambios en Prisma Schema:**

```prisma
model studio_events {
  // ... campos existentes
  google_event_id String?
  @@index([google_event_id])
}

model studio_scheduler_event_tasks {
  // ... campos existentes
  google_calendar_id String?
  google_event_id    String?
  @@index([google_calendar_id])
  @@index([google_event_id])
}

model studios {
  // ... campos existentes
  google_calendar_secondary_id String?
}
```

---

## 🔧 Paso 2: Diseño de la Lógica de Sincronización

### 2.1 Gestión de Calendario Secundario

**Estrategia:**

1. Verificar existencia del calendario "Tareas De Sen" al conectar Google Calendar
2. Si no existe, crearlo usando `calendar.calendars.insert()`
3. Guardar `calendarId` en `studios.google_calendar_secondary_id`

**Flujo:**

```typescript
async function obtenerOCrearCalendarioSecundario(studioSlug: string) {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true, google_calendar_secondary_id: true },
  });

  // Si ya existe ID guardado, verificar que sigue existiendo
  if (studio.google_calendar_secondary_id) {
    try {
      const calendar = await calendarAPI.calendars.get({
        calendarId: studio.google_calendar_secondary_id,
      });
      if (calendar.data) return calendar.data.id;
    } catch (error) {
      // Si no existe, crear uno nuevo
      console.warn(
        "[Google Calendar] Calendario secundario no encontrado, creando nuevo..."
      );
    }
  }

  // Obtener timezone del estudio o usar default
  const timezone = await obtenerTimezoneEstudio(studioSlug);

  // Crear nuevo calendario
  const newCalendar = await calendarAPI.calendars.insert({
    requestBody: {
      summary: "Tareas De Sen",
      description: "Tareas de cronograma y post-producción",
      timeZone: timezone,
    },
  });

  // Guardar ID
  await prisma.studios.update({
    where: { id: studio.id },
    data: { google_calendar_secondary_id: newCalendar.data.id },
  });

  return newCalendar.data.id;
}
```

### 2.2 Timezone Dinámico

**Estrategia de Prioridad:**

1. **Timezone del estudio** (si existe en `studios.timezone` - futuro)
2. **Timezone de `platform_config`** (default: "America/Mexico_City")
3. **Timezone del navegador** (si se pasa como parámetro desde el cliente)

**Implementación:**

```typescript
async function obtenerTimezoneEstudio(
  studioSlug: string,
  userTimezone?: string
): Promise<string> {
  // 1. Prioridad: timezone del usuario (navegador)
  if (userTimezone) {
    return userTimezone;
  }

  // 2. Buscar timezone del estudio (si se agrega en el futuro)
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { timezone: true }, // Campo futuro
  });

  if (studio?.timezone) {
    return studio.timezone;
  }

  // 3. Fallback: platform_config
  const config = await prisma.platform_config.findFirst({
    select: { timezone: true },
  });

  return config?.timezone || "America/Mexico_City";
}
```

**Uso en eventos:**

```typescript
const timezone = await obtenerTimezoneEstudio(studioSlug, userTimezone);

const eventResource = {
  summary: task.name,
  start: {
    dateTime: task.start_date.toISOString(),
    timeZone: timezone, // ✅ Dinámico
  },
  end: {
    dateTime: task.end_date.toISOString(),
    timeZone: timezone, // ✅ Dinámico
  },
};
```

### 2.3 Flujo de Invitaciones

**Estructura del evento con attendees:**

```typescript
const eventResource = {
  summary: task.name,
  description: task.description || "",
  start: {
    dateTime: task.start_date.toISOString(),
    timeZone: await obtenerTimezoneEstudio(studioSlug),
  },
  end: {
    dateTime: task.end_date.toISOString(),
    timeZone: await obtenerTimezoneEstudio(studioSlug),
  },
  attendees: await obtenerEmailsColaboradores(task.assigned_to_user_id),
  sendUpdates: "all", // Envía notificaciones automáticas
};

// Obtener emails desde user_studio_roles → users
async function obtenerEmailsColaboradores(assignedToUserId: string | null) {
  if (!assignedToUserId) return [];

  const userRole = await prisma.user_studio_roles.findUnique({
    where: { id: assignedToUserId },
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  return userRole?.user?.email ? [{ email: userRole.user.email }] : [];
}
```

**Nota:** Para eventos principales (`studio_events`), **NO incluir attendees** por defecto (opcional: cliente si se requiere).

### 2.4 Estrategia de Actualización

**Principio:** Evitar duplicados verificando `google_event_id` antes de crear.

**Flujo de actualización:**

```typescript
async function sincronizarTareaConGoogle(
  taskId: string,
  userTimezone?: string
) {
  const task = await prisma.studio_scheduler_event_tasks.findUnique({
    where: { id: taskId },
    include: {
      scheduler_instance: {
        include: {
          event: {
            include: {
              studio: true,
            },
          },
        },
      },
    },
  });

  const studio = task.scheduler_instance.event.studio;
  const calendarId = await obtenerOCrearCalendarioSecundario(studio.slug);
  const timezone = await obtenerTimezoneEstudio(studio.slug, userTimezone);

  // Si ya tiene google_event_id, actualizar
  if (task.google_event_id) {
    await calendarAPI.events.update({
      calendarId,
      eventId: task.google_event_id,
      requestBody: {
        summary: task.name,
        description: task.description || "",
        start: {
          dateTime: task.start_date.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: task.end_date.toISOString(),
          timeZone: timezone,
        },
        attendees: await obtenerEmailsColaboradores(task.assigned_to_user_id),
      },
      sendUpdates: "all",
    });
  } else {
    // Crear nuevo evento
    const event = await calendarAPI.events.insert({
      calendarId,
      requestBody: {
        summary: task.name,
        description: task.description || "",
        start: {
          dateTime: task.start_date.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: task.end_date.toISOString(),
          timeZone: timezone,
        },
        attendees: await obtenerEmailsColaboradores(task.assigned_to_user_id),
      },
      sendUpdates: "all",
    });

    // Guardar google_event_id
    await prisma.studio_scheduler_event_tasks.update({
      where: { id: taskId },
      data: {
        google_calendar_id: calendarId,
        google_event_id: event.data.id,
      },
    });
  }
}
```

**Manejo de reasignación:**

- Al cambiar `assigned_to_user_id`, actualizar `attendees` en Google Calendar
- Google notifica automáticamente con `sendUpdates: 'all'`

### 2.5 Manejo de Borrado

**Estrategia:** Sincronizar eliminaciones con Google Calendar para mantener limpieza.

**Flujo de eliminación:**

```typescript
async function eliminarEventoDeGoogle(
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    await calendarAPI.events.delete({
      calendarId,
      eventId,
      sendUpdates: "all", // Notificar a attendees que el evento fue cancelado
    });
  } catch (error) {
    // Si el evento ya no existe en Google, no es error crítico
    if (error.code === 404) {
      console.warn("[Google Calendar] Evento ya no existe en Google:", eventId);
      return;
    }
    throw error;
  }
}

async function sincronizarEliminacionTarea(taskId: string) {
  const task = await prisma.studio_scheduler_event_tasks.findUnique({
    where: { id: taskId },
    select: {
      google_calendar_id: true,
      google_event_id: true,
    },
  });

  // Solo eliminar si tiene google_event_id
  if (task?.google_event_id && task?.google_calendar_id) {
    await eliminarEventoDeGoogle(task.google_calendar_id, task.google_event_id);
  }
}

async function sincronizarEliminacionEvento(eventId: string) {
  const event = await prisma.studio_events.findUnique({
    where: { id: eventId },
    select: {
      google_event_id: true,
      studio: {
        select: {
          google_oauth_email: true, // Calendario primario del usuario
        },
      },
    },
  });

  // Solo eliminar si tiene google_event_id
  if (event?.google_event_id && event.studio?.google_oauth_email) {
    // Usar calendario primario (email del usuario)
    await eliminarEventoDeGoogle(
      event.studio.google_oauth_email,
      event.google_event_id
    );
  }
}
```

**Integración en funciones de eliminación:**

```typescript
// En eliminarSchedulerTask (línea 2584)
export async function eliminarSchedulerTask(
  studioSlug: string,
  eventId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ... validaciones existentes ...

    // Obtener google_event_id antes de eliminar
    const task = await prisma.studio_scheduler_event_tasks.findUnique({
      where: { id: taskId },
      select: {
        google_calendar_id: true,
        google_event_id: true,
      },
    });

    // Eliminar de DB
    await prisma.studio_scheduler_event_tasks.delete({
      where: { id: taskId },
    });

    // Sincronizar eliminación con Google (en background)
    if (task?.google_event_id && task?.google_calendar_id) {
      setTimeout(async () => {
        try {
          await eliminarEventoDeGoogle(
            task.google_calendar_id!,
            task.google_event_id!
          );
        } catch (error) {
          console.error("[Google Calendar] Error eliminando evento:", error);
          // No fallar la operación principal si falla la sincronización
        }
      }, 0);
    }

    revalidatePath(
      `/${studioSlug}/studio/business/events/${eventId}/scheduler`
    );
    revalidatePath(`/${studioSlug}/studio/business/events/${eventId}`);

    return { success: true };
  } catch (error) {
    // ... manejo de errores ...
  }
}
```

---

## 🔄 Paso 3: Propuesta de Refactorización

### 3.1 Funciones Identificadas

**Eventos principales:**

- `crearEventoCompleto` (`src/app/admin/_lib/actions/evento/crearEventoCompleto/`)
- `crearEvento` (`src/app/admin/_lib/actions/evento/evento.actions.ts`)
- `actualizarEvento` (mismo archivo)

**Tareas de cronograma:**

- `crearSchedulerTask` (`src/lib/actions/studio/business/events/events.actions.ts:2174`)
- `actualizarSchedulerTask` (mismo archivo:2283)
- `eliminarSchedulerTask` (mismo archivo:2584) - **✅ Requiere sincronización de borrado**
- `asignarCrewAItem` (mismo archivo:1895) - Puede disparar actualización

### 3.2 Arquitectura de Sincronización

**Nuevo módulo:**

```
src/lib/integrations/google-calendar/
├── client.ts              # getGoogleCalendarClient (similar a Drive)
├── sync-events.ts         # sincronizarEventoPrincipal
├── sync-tasks.ts          # sincronizarTareaCronograma
├── calendar-manager.ts    # obtenerOCrearCalendarioSecundario
├── timezone.ts            # obtenerTimezoneEstudio
└── delete-sync.ts         # eliminarEventoDeGoogle, sincronizarEliminacion*
```

**Estrategia de ejecución:**

1. **Proceso en segundo plano** (recomendado):
   - Después de `prisma.create/update`, encolar job
   - Usar `setTimeout` o cola (Bull/Redis) para no bloquear respuesta
2. **Hook post-transacción:**
   - Llamar sincronización después de `revalidatePath`
   - Manejar errores sin afectar operación principal

**Implementación sugerida:**

```typescript
// En crearSchedulerTask, después de crear la tarea:
const task = await prisma.studio_scheduler_event_tasks.create({
  /* ... */
});

// Sincronización en background (no bloquea respuesta)
setTimeout(async () => {
  try {
    await sincronizarTareaCronograma(task.id, userTimezone);
  } catch (error) {
    console.error("[Google Calendar] Error sincronizando tarea:", error);
    // Log error pero no fallar la operación principal
  }
}, 0);

return { success: true, data: task };
```

### 3.3 Puntos de Integración

**Eventos principales:**

```typescript
// Después de crear evento
const nuevoEvento = await prisma.evento.create({
  /* ... */
});
// Hook: sincronizarEventoPrincipal(nuevoEvento.id, 'primary', userTimezone);
```

**Tareas de cronograma:**

```typescript
// En crearSchedulerTask (línea 2241)
const task = await prisma.studio_scheduler_event_tasks.create({
  /* ... */
});
// Hook: sincronizarTareaCronograma(task.id, userTimezone);

// En actualizarSchedulerTask (línea 2283)
await prisma.studio_scheduler_event_tasks.update({
  /* ... */
});
// Hook: sincronizarTareaCronograma(taskId, userTimezone);

// En eliminarSchedulerTask (línea 2584)
const task = await prisma.studio_scheduler_event_tasks.findUnique({
  /* ... */
});
await prisma.studio_scheduler_event_tasks.delete({
  /* ... */
});
// Hook: sincronizarEliminacionTarea(task.google_event_id, task.google_calendar_id);
```

**Reasignación de personal:**

```typescript
// En asignarCrewAItem (línea 1895)
// Si se actualiza assigned_to_user_id, disparar sincronización
if (crewMemberId !== previousCrewMemberId) {
  // Buscar tarea asociada y sincronizar
  await sincronizarTareaCronograma(task.id, userTimezone);
}
```

---

## 📊 Resumen de Arquitectura

| Acción en De Sen                     | Destino Google             | Invitación                       | Función                              | Timezone |
| ------------------------------------ | -------------------------- | -------------------------------- | ------------------------------------ | -------- |
| Crear `studio_events`                | Calendario Primario        | No (opcional cliente)            | `sincronizarEventoPrincipal()`       | Dinámico |
| Crear `studio_scheduler_event_tasks` | Calendario "Tareas De Sen" | Sí (colaborador)                 | `sincronizarTareaCronograma()`       | Dinámico |
| Actualizar fecha de tarea            | Actualizar evento          | Sí (notificación automática)     | `sincronizarTareaCronograma()`       | Dinámico |
| Reasignar personal                   | Actualizar attendees       | Sí (notificación automática)     | `sincronizarTareaCronograma()`       | Dinámico |
| **Eliminar tarea**                   | **Eliminar evento**        | **Sí (notificación automática)** | **`sincronizarEliminacionTarea()`**  | **N/A**  |
| **Eliminar evento**                  | **Eliminar evento**        | **Sí (notificación automática)** | **`sincronizarEliminacionEvento()`** | **N/A**  |

---

## ⚙️ Consideraciones Técnicas

### 1. Scopes OAuth

Agregar `https://www.googleapis.com/auth/calendar` a `google_oauth_scopes` cuando se conecte Google Calendar.

### 2. Rate Limits

Google Calendar permite ~1,000 requests/100s. Implementar throttling si es necesario.

### 3. Manejo de Errores

Si falla la sincronización, **NO debe afectar** la operación principal. Usar try-catch y logging.

### 4. Sincronización Bidireccional

Esta fase es **unidireccional** (De Sen → Google). La bidireccional requiere webhooks de Google (fase futura).

### 5. Timezone

- Prioridad: Navegador → Estudio → Platform Config → Default
- Siempre usar timezone dinámico, nunca hardcodear

### 6. Borrado

- Verificar `google_event_id` antes de intentar eliminar
- Manejar errores 404 (evento ya no existe) como no críticos
- Usar `sendUpdates: 'all'` para notificar a attendees

---

## 📋 Plan de Implementación Sugerido

### Fase 1: Migración de Base de Datos

- [ ] Crear migración SQL para agregar campos
- [ ] Actualizar Prisma schema
- [ ] Ejecutar migración en desarrollo
- [ ] Verificar índices

### Fase 2: Cliente de Google Calendar

- [ ] Crear `getGoogleCalendarClient` (reutilizar patrón de Drive)
- [ ] Agregar scope `calendar` a OAuth
- [ ] Probar autenticación

### Fase 3: Gestión de Calendario Secundario

- [ ] Implementar `obtenerOCrearCalendarioSecundario`
- [ ] Probar creación y verificación de calendario
- [ ] Guardar `google_calendar_secondary_id` en DB

### Fase 4: Timezone Dinámico

- [ ] Implementar `obtenerTimezoneEstudio`
- [ ] Integrar en todas las funciones de sincronización
- [ ] Probar con diferentes timezones

### Fase 5: Sincronización de Eventos Principales

- [ ] Implementar `sincronizarEventoPrincipal`
- [ ] Integrar en `crearEvento` y `actualizarEvento`
- [ ] Probar creación y actualización

### Fase 6: Sincronización de Tareas con Invitaciones

- [ ] Implementar `obtenerEmailsColaboradores`
- [ ] Implementar `sincronizarTareaCronograma`
- [ ] Integrar en `crearSchedulerTask` y `actualizarSchedulerTask`
- [ ] Probar invitaciones automáticas

### Fase 7: Manejo de Borrado

- [ ] Implementar `eliminarEventoDeGoogle`
- [ ] Implementar `sincronizarEliminacionTarea`
- [ ] Implementar `sincronizarEliminacionEvento`
- [ ] Integrar en `eliminarSchedulerTask`
- [ ] Probar eliminación y notificaciones

### Fase 8: Hooks en Funciones Existentes

- [ ] Agregar hooks en todas las funciones identificadas
- [ ] Implementar ejecución en background
- [ ] Manejo de errores robusto

### Fase 9: Testing y Manejo de Errores

- [ ] Tests unitarios para cada función
- [ ] Tests de integración con Google Calendar API
- [ ] Manejo de edge cases (eventos eliminados, timezones inválidos, etc.)
- [ ] Documentación de errores comunes

---

## 🎯 Checklist de Validación

Antes de considerar completada la implementación:

- [ ] Eventos principales se crean en calendario primario
- [ ] Tareas se crean en calendario secundario "Tareas De Sen"
- [ ] Invitaciones se envían automáticamente a colaboradores
- [ ] Timezone se detecta dinámicamente (navegador/estudio/config)
- [ ] Actualizaciones de fecha sincronizan correctamente
- [ ] Reasignación de personal actualiza attendees
- [ ] Eliminación de tareas elimina eventos en Google
- [ ] Eliminación de eventos elimina eventos en Google
- [ ] Errores de sincronización no afectan operaciones principales
- [ ] Calendario secundario se crea automáticamente si no existe
- [ ] Rate limits de Google Calendar respetados

---

## 📝 Notas Adicionales

- **Prioridad de Timezone:** Navegador > Estudio > Platform Config > Default
- **Borrado:** Siempre verificar `google_event_id` antes de intentar eliminar
- **Errores:** Logging detallado pero no bloquear operaciones principales
- **Futuro:** Considerar sincronización bidireccional con webhooks de Google

---

**Última actualización:** 2025-01-29
