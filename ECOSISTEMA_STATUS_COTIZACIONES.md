# Ecosistema de Status de Cotizaciones

## 📋 Campos en Base de Datos

```prisma
model studio_cotizaciones {
  status           String  @default("pendiente")     // Status de autorización
  revision_of_id   String?                          // ID de cotización original (si es revisión)
  revision_number  Int     @default(1)              // Número de revisión
  revision_status  String?                          // Estado del ciclo de revisión
}
```

## 🎯 Estrategia de Validación: OPCIÓN 2

**Usamos `revision_status` como diferenciador principal** para determinar si una cotización es:

- Cotización normal
- Revisión en borrador
- Revisión activa
- Original reemplazada

## 📊 Matriz de Estados

| status      | revision_status    | revision_of_id | Significado                      | Badge                             |
| ----------- | ------------------ | -------------- | -------------------------------- | --------------------------------- |
| `pendiente` | `null`             | `null`         | Cotización nueva sin autorizar   | 🔘 Pendiente (Zinc)               |
| `aprobada`  | `null`             | `null`         | Cotización autorizada activa     | 🟢 Aprobada (Verde)               |
| `pendiente` | `pending_revision` | `{id}`         | Revisión en borrador             | 🟡 Revisión #N (Ámbar)            |
| `aprobada`  | `active`           | `{id}`         | Revisión autorizada activa       | 🟡 Revisión Activa #N (Ámbar)     |
| `aprobada`  | `pending_revision` | `null`         | Original con revisión pendiente  | 🟢 Aprobada\* (Verde + indicador) |
| `aprobada`  | `replaced`         | `null`         | Original reemplazada (archivada) | - (Archivada)                     |
| `cancelada` | -                  | -              | Cotización cancelada             | 🔴 Cancelada (Rojo)               |

## 🔄 Flujos de Estado

### 1. Crear Cotización Nueva

```typescript
{
  status: 'pendiente',
  revision_of_id: null,
  revision_number: 1,
  revision_status: null
}
```

### 2. Autorizar Cotización

```typescript
{
  status: 'aprobada',        // ✅ Cambia a aprobada
  revision_status: null      // Mantiene null
}
```

### 3. Crear Revisión de Cotización Aprobada

**Nueva revisión:**

```typescript
{
  status: 'pendiente',              // Vuelve a pendiente
  revision_of_id: originalId,       // Referencia a original
  revision_number: N,               // Número incremental
  revision_status: 'pending_revision' // ⭐ Marca como revisión
}
```

**Original marcada:**

```typescript
{
  status: 'aprobada',              // Mantiene aprobada
  revision_status: 'pending_revision' // ⭐ Indica que tiene revisión pendiente
}
```

### 4. Guardar Borrador de Revisión (updateCotizacion)

```typescript
// NO cambia status ni revision_status
// Solo actualiza: name, description, price, items
{
  status: 'pendiente',              // Se mantiene
  revision_status: 'pending_revision' // Se mantiene
}
```

### 5. Autorizar Revisión

**Revisión autorizada:**

```typescript
{
  status: 'aprobada',           // ✅ Cambia a aprobada
  revision_status: 'active'     // ⭐ Se vuelve activa
}
```

**Original archivada:**

```typescript
{
  archived: true,               // Se archiva
  revision_status: 'replaced'   // ⭐ Marcada como reemplazada
}
```

## 🏷️ Lógica de Badges (PromiseQuotesPanelCard)

### Función `getStatusVariant()`

```typescript
// PRIORIDAD: revision_status tiene precedencia sobre status

if (revisionStatus === "pending_revision" || revisionStatus === "active") {
  return "warning"; // 🟡 Ámbar - Es revisión
}

if (status === "aprobada") {
  return "success"; // 🟢 Verde - Aprobada normal
}

if (status === "rechazada" || status === "cancelada") {
  return "destructive"; // 🔴 Rojo
}

return "secondary"; // 🔘 Zinc - Pendiente
```

### Función `getStatusLabel()`

```typescript
// PRIORIDAD: revision_status primero

if (revisionStatus === "pending_revision") {
  return "Revisión"; // + #N si existe revision_number
}

if (revisionStatus === "active") {
  return "Revisión Activa"; // + #N
}

if (status === "aprobada") {
  return "Aprobada";
}

if (status === "pendiente") {
  return "Pendiente";
}

// ... otros status
```

## ✅ Validaciones Importantes

### Al actualizar cotización (updateCotizacion)

```typescript
// ❌ No permitir editar si está aprobada Y NO es revisión
if (cotizacion.status === "aprobada" && !cotizacion.revision_of_id) {
  return error; // Solo se edita creando revisión
}

// ✅ Permitir editar si es revisión pendiente
if (cotizacion.revision_status === "pending_revision") {
  // Editar libremente (es borrador de revisión)
}
```

### Al crear revisión (crearRevisionCotizacion)

```typescript
// Solo de cotizaciones aprobadas
if (cotizacion.status !== "aprobada") {
  return error;
}

// No crear revisión si ya tiene una pendiente
const revisionesPendientes = await prisma.studio_cotizaciones.count({
  where: {
    revision_of_id: cotizacionId,
    revision_status: "pending_revision",
  },
});

if (revisionesPendientes > 0) {
  return error; // Ya existe revisión pendiente
}
```

## 🎨 Colores de Badges

| Variant       | Color          | Uso                           |
| ------------- | -------------- | ----------------------------- |
| `secondary`   | Zinc (gris)    | Pendiente                     |
| `success`     | Verde          | Aprobada                      |
| `warning`     | Ámbar/Amarillo | Revisión (pendiente o activa) |
| `destructive` | Rojo           | Cancelada/Rechazada           |
| `info`        | Azul           | (Reservado para futuro)       |

## 📝 Notas Importantes

1. ⚠️ **NO existe status `'autorizada'`** - Solo se usa `'aprobada'`
2. ✅ **`revision_status` es el campo clave** para identificar revisiones
3. ✅ **Una cotización puede tener múltiples revisiones** (historial)
4. ✅ **Solo puede haber UNA revisión activa** (`revision_status: 'active'`) a la vez
5. ✅ **Las revisiones pendientes pueden editarse libremente** como borradores

## 🔗 Archivos Relacionados

- `src/lib/actions/studio/commercial/promises/cotizaciones.actions.ts` - CRUD de cotizaciones
- `src/lib/actions/studio/commercial/promises/cotizaciones-revision.actions.ts` - Lógica de revisiones
- `src/app/[slug]/studio/commercial/promises/components/PromiseQuotesPanelCard.tsx` - Badges y UI
- `prisma/schema.prisma` - Schema de DB

---

**Última actualización:** 2025-11-30
**Versión:** 2.0 (Opción 2 - revision_status como diferenciador)
