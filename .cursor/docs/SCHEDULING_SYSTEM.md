# Sistema de Agendamientos — Documentación Técnica

Documento de referencia para el sistema de citas y agendamientos. Pensado para que cualquier desarrollador pueda extender o mantener el sistema en pocos minutos.

---

## 1. Arquitectura de Datos

### Tabla y origen

- **Tabla:** `studio_agenda` (Prisma: mismo nombre).
- **Contexto:** Cada registro pertenece a un `studio_id` y se asocia a una **promesa** (`promise_id`) o a un **evento** ya creado (`evento_id`).
- **Campos clave:** `date`, `time`, `type_scheduling` ('presencial' | 'virtual'), `contexto` ('promise' | 'evento'), `status`, `concept`, `description`, `link_meeting_url`, `address`.

### El corazón: `metadata` (JSON)

El campo **`metadata`** (JSON) es el que define **qué tipo de agendamiento es** y cómo se muestra y filtra en la UI. No depender solo de `contexto` + `type_scheduling` en lógica repartida; el valor canónico es `metadata.agenda_type`.

- Se calcula en servidor en **crear** y **actualizar** con `construirMetadataAgenda()`.
- En **lectura**, si un registro antiguo no tiene `metadata.agenda_type`, se rellena con `obtenerMetadataAgenda()` (retrocompatibilidad).

### Tipos certificados (`agenda_type`)

| Valor | Descripción | Cuándo se usa |
|-------|-------------|----------------|
| `event_date` | Fecha de evento de una promesa (sin cita comercial) | `contexto === 'promise'` y sin `type_scheduling`. No se muestra en el header de agendamientos. |
| `commercial_appointment` | Cita comercial (presencial o virtual) de una promesa | `contexto === 'promise'` y con `type_scheduling`. |
| `main_event_date` | Fecha principal del evento ya creado | `contexto === 'evento'`, sin `type_scheduling`, y la fecha coincide con `event_date` de la promesa. |
| `event_appointment` | Cita/sesión/reunión dentro de un evento (presencial o virtual) | `contexto === 'evento'` y con `type_scheduling`. |
| `scheduler_task` | Tarea del Gantt/scheduler asociada al evento | `contexto === 'evento'` y existe `scheduler_task_id`. |

Además, `metadata` puede incluir: `sync_google`, `google_calendar_type` ('primary' | 'secondary'), `is_main_event_date`.

---

## 2. Sistema de Sincronización en Tiempo Real

### Evento global: `agenda-updated`

Cualquier mutación de agenda (crear, editar, eliminar) debe disparar en el **cliente**:

```ts
window.dispatchEvent(new CustomEvent('agenda-updated'));
```

**Efectos:**

- **useAgendaCount** vuelve a cargar el conteo y actualiza el badge del AppHeader.
- **AgendaPopover** vuelve a cargar la lista de los próximos agendamientos y actualiza el dropdown.

Si no se dispara este evento, el header y el popover quedarán desactualizados hasta recargar la página.

### Dónde disparar el evento

- Tras éxito de **crear** agendamiento (PromiseAppointmentCard, AgendaFormModal).
- Tras éxito de **actualizar** agendamiento (PromiseAppointmentCard, AgendaFormModal).
- Tras éxito de **eliminar** agendamiento (PromiseAppointmentCard, AgendaFormModal, EventAgendamiento, PromiseAgendamiento, AgendaButton).

Las Server Actions (`crearAgendamiento`, `actualizarAgendamiento`, `eliminarAgendamiento`) no disparan eventos; es responsabilidad del componente que las llama.

---

## 3. Lógica de Clasificación y UI

### Tabla: `agenda_type` → Icono → Color → Significado

| agenda_type | Icono (lucide) | Color (Tailwind) | Significado en UI |
|-------------|----------------|------------------|-------------------|
| `commercial_appointment` | Handshake | `text-blue-400` | Cita comercial (presencial/virtual) |
| `event_appointment` | Video | `text-purple-400` | Cita evento (sesión, reunión) |
| `main_event_date` | CalendarDays | `text-emerald-400` | Evento agendado (fecha principal) |
| `scheduler_task` | ListTodo | `text-amber-400` | Tarea (Gantt/scheduler) |
| `event_date` | — | — | No se muestra en header/popover (excluido) |

En **PromiseAppointmentCard** (solo citas comerciales) se usan MapPin (presencial) y Video (virtual) para el tipo de cita; la semántica es la misma que en el popover.

### Retrocompatibilidad (fallback sin `metadata.agenda_type`)

Si un registro no tiene `metadata` o no tiene `metadata.agenda_type`:

1. **En servidor** (al devolver items):  
   Se usa `obtenerMetadataAgenda()` con `contexto`, `type_scheduling`, `evento_id`, `promise_id`, `date` y relaciones necesarias para calcular y asignar `metadata` (incluido `agenda_type`).  
   Se aplica en: `obtenerAgendaUnificada`, `obtenerAgendamientoPorId`, `obtenerAgendamientoPorPromise`, `obtenerAgendamientosPorEvento`.

2. **En cliente** (filtros y etiquetas):  
   - **Filtro header:** Si no hay `agenda_type`, se excluye `contexto === 'promise' && !type_scheduling` (event_date); el resto se incluye por `contexto` + `type_scheduling`.
   - **Etiquetas en AgendaPopover:** Se usa `agendaType` si existe; si no, `contexto === 'promise' && type_scheduling` → Cita comercial; `contexto === 'evento' && type_scheduling` → Cita evento; `contexto === 'evento' && !type_scheduling` → Evento agendado. Fallback genérico: "Agendamiento".

Así, registros antiguos sin metadata nunca aparecen como "Desconocidos" y se clasifican de forma coherente.

---

## 4. Componentes Clave

### PromiseAppointmentCard

- **Ruta:** `src/app/[slug]/studio/commercial/promises/[promiseId]/pendiente/components/PromiseAppointmentCard.tsx`
- **Función:** Formulario inline para crear/editar/cancelar la **cita comercial** de una promesa (sin modal).
- **Prevención de duplicidad:** Solo hay "cita activa" si existe un agendamiento con `status !== 'cancelado'`. Si hay cita activa, se muestra el resumen y los botones **Reprogramar** y **Cancelar cita**; el formulario de creación no se muestra.
- **Mutaciones:** Usa `crearAgendamiento`, `actualizarAgendamiento`, `eliminarAgendamiento`; tras éxito dispara `agenda-updated` y `router.refresh()`.

### AgendaPopover

- **Ruta:** `src/components/shared/agenda/AgendaPopover.tsx`
- **Función:** Dropdown en el AppHeader con los próximos agendamientos y el enlace "Abrir agendamientos".
- **Filtros de exclusión (filterAgendaForHeader):**
  - Excluye fechas pasadas.
  - Excluye `agenda_type === 'event_date'` (fechas de promesa sin cita).
  - Excluye registros sin metadata cuando `contexto === 'promise' && !type_scheduling`.
  - Ordena por fecha y toma los 6 próximos.
- Escucha `agenda-updated` y vuelve a cargar la lista con `obtenerAgendaUnificada` + `filterAgendaForHeader`.

### useAgendaCount

- **Ruta:** `src/hooks/useAgendaCount.ts`
- **Función:** Mantiene el conteo de agendamientos "activos" (los que cuenta `getAgendaCount`) para el badge del header.
- **Comportamiento:** Acepta `initialCount` (precarga desde servidor). Siempre escucha `agenda-updated` y, al recibirlo, llama a `getAgendaCount(studioSlug)` y actualiza el estado. Así el badge se actualiza sin recargar la página.

### Server Actions

- **Archivo:** `src/lib/actions/shared/agenda-unified.actions.ts`
- **Principales:** `crearAgendamiento`, `actualizarAgendamiento`, `eliminarAgendamiento`, `obtenerAgendaUnificada`, `obtenerAgendamientoPorPromise`, `obtenerAgendamientosPorEvento`, `getAgendaCount`.
- **Metadata:** En crear/actualizar se usa `construirMetadataAgenda`; en lecturas se usa `obtenerMetadataAgenda` cuando falta metadata o `agenda_type`.

---

## 5. Guía de Extensibilidad (How-to)

Para añadir agendamiento desde una **nueva interfaz** (ej. chat, perfil del cliente):

### Paso 1: Llamar a la Server Action correcta

- Cita comercial (promesa): `crearAgendamiento(studioSlug, { contexto: 'promise', promise_id, date, time?, type_scheduling: 'presencial' | 'virtual', concept?, description?, ... })`.
- Cita de evento: `crearAgendamiento(studioSlug, { contexto: 'evento', evento_id, date, time?, type_scheduling?, ... })`.

No hace falta escribir `metadata` a mano; el servidor lo calcula con `construirMetadataAgenda` usando `contexto`, `type_scheduling` y, para eventos, `isMainEventDate` cuando aplique.

### Paso 2: Disparar `agenda-updated` en el cliente

Tras un éxito de crear/actualizar/eliminar:

```ts
window.dispatchEvent(new CustomEvent('agenda-updated'));
```

Opcional: `router.refresh()` si quieres refrescar datos de servidor en la misma página.

### Paso 3: Opcional — Refrescar datos locales

Si en tu pantalla muestras una lista de agendamientos, después de la mutación puedes volver a llamar a `obtenerAgendamientoPorPromise`, `obtenerAgendamientosPorEvento` o `obtenerAgendaUnificada` según corresponda. El header y el popover ya se actualizarán solos gracias a `agenda-updated`.

### Checklist de integridad

- [ ] Payload incluye `contexto` y, si aplica, `type_scheduling` ('presencial' | 'virtual').
- [ ] Tras éxito de mutación se dispara `agenda-updated`.
- [ ] No se escribe `metadata` a mano en el payload; se deja que el servidor lo calcule.

Con esto, el nuevo flujo queda alineado con el resto del sistema (clasificación, header, popover y futuras extensiones).
