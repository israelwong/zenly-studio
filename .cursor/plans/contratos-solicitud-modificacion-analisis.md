# Análisis: Solicitud de Modificación de Contratos y Actualización de Datos

## Contexto

El cliente puede revisar contratos publicados en su portal. Necesitamos:

1. Permitir que el cliente actualice sus datos de contacto y del evento desde la página de contrato
2. Permitir que el cliente solicite modificaciones al texto del contrato
3. Notificar al estudio cuando el cliente actualiza información
4. Gestionar las solicitudes de modificación del contrato

---

## 1. Actualización de Datos

### 1.1 Datos de Contacto (Cliente)

**Estado actual:**

- ✅ Existe `ClientProfileModal` para editar nombre, teléfono, email, dirección y avatar
- ✅ Se actualiza en `studio_contacts` mediante `actualizarPerfilCliente`
- ✅ Accesible desde el header del cliente (`ClientAvatar`)

**Propuesta:**

- Agregar botón "Actualizar datos de contacto" en la página de contrato
- Reutilizar `ClientProfileModal` existente
- **Notificación al estudio:** Crear notificación cuando el cliente actualiza datos

### 1.2 Datos del Evento

**Estado actual:**

- ✅ Existe edición inline en `InformacionEventoCard` (nombre y sede)
- ✅ Se actualiza mediante `actualizarEventoInfo` en `studio_promises`
- ⚠️ Solo permite editar nombre y sede (no fecha, tipo, etc.)

**Propuesta:**

- **Opción A (Recomendada):** Crear modal unificado `EventInfoModal` para editar datos del evento
  - Ventajas:
    - Mejor UX (modal vs inline)
    - Consistente con `ClientProfileModal`
    - Permite agregar más campos en el futuro
    - Reutilizable desde la página de contrato
  - Desventajas:
    - Requiere crear nuevo componente
    - Cambiar `InformacionEventoCard` para usar modal en vez de inline

- **Opción B:** Mantener inline pero agregar acceso desde página de contrato
  - Ventajas:
    - Menos cambios
    - Mantiene funcionalidad existente
  - Desventajas:
    - UX inconsistente (inline vs modal)
    - Menos escalable

**Recomendación: Opción A** - Crear `EventInfoModal` unificado

**Notificación al estudio:** Crear notificación cuando el cliente actualiza datos del evento

---

## 2. Solicitud de Modificación del Contrato

### 2.1 Casos de Uso

El cliente puede solicitar modificaciones cuando:

- El texto del contrato tiene errores (nombre, fecha, servicios, etc.)
- Quiere cambiar cláusulas específicas
- Necesita ajustar términos y condiciones

### 2.2 Opciones de Implementación

#### Opción A: Nuevo Modelo `studio_contract_modification_requests`

```prisma
model studio_contract_modification_requests {
  id           String   @id @default(cuid())
  contract_id  String
  requested_by String   // 'studio' | 'client'
  status       String   // 'pending', 'approved', 'rejected', 'completed'
  message      String   @db.Text
  response     String?  @db.Text // Respuesta del estudio
  metadata     Json?    // Campos específicos que se quieren modificar
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  contract studio_event_contracts @relation(...)

  @@index([contract_id, status])
  @@index([created_at])
}
```

**Ventajas:**

- ✅ Separado y específico para contratos
- ✅ Permite tracking completo de solicitudes
- ✅ Puede tener estados (pending, approved, rejected, completed)
- ✅ Permite respuesta del estudio
- ✅ Metadata para campos específicos

**Desventajas:**

- ⚠️ Requiere nueva migración
- ⚠️ Nuevo modelo en Prisma

#### Opción B: Usar `studio_contract_cancellation_logs` (extender)

**Ventajas:**

- ✅ Ya existe el modelo
- ✅ Similar estructura (contract_id, action, reason, metadata)

**Desventajas:**

- ❌ Semánticamente incorrecto (cancelación ≠ modificación)
- ❌ Confuso para el usuario
- ❌ No permite estados de aprobación

#### Opción C: Usar `studio_promise_logs`

**Ventajas:**

- ✅ Ya existe el sistema de logs
- ✅ Realtime disponible

**Desventajas:**

- ❌ El contrato está asociado al evento, no directamente a la promesa
- ❌ Menos específico para contratos
- ❌ Requiere buscar el promise_id desde el event_id

#### Opción D: Solo Notificaciones con Metadata

**Ventajas:**

- ✅ Simple, sin nuevos modelos
- ✅ Ya existe el sistema de notificaciones

**Desventajas:**

- ❌ No permite tracking de estado
- ❌ No permite respuesta del estudio
- ❌ No hay historial persistente

### 2.3 Recomendación: Opción A

**Razones:**

1. **Separación de responsabilidades:** Las solicitudes de modificación son diferentes a cancelaciones
2. **Tracking completo:** Permite ver historial de solicitudes y sus estados
3. **Escalabilidad:** Puede crecer para incluir más funcionalidades (comparación de versiones, etc.)
4. **UX mejor:** El estudio puede ver todas las solicitudes pendientes y responder

---

## 3. Flujo Propuesto

### 3.1 Actualización de Datos

```
Cliente en página de contrato
  ↓
Click "Actualizar datos de contacto" → Abre ClientProfileModal
  ↓
Cliente actualiza datos → Guarda
  ↓
Notificación al estudio: "Cliente actualizó sus datos de contacto"
  ↓
Estudio recibe notificación (puede ver cambios en metadata)
```

```
Cliente en página de contrato
  ↓
Click "Actualizar datos del evento" → Abre EventInfoModal
  ↓
Cliente actualiza nombre/sede → Guarda
  ↓
Notificación al estudio: "Cliente actualizó datos del evento: [campos cambiados]"
  ↓
Estudio recibe notificación
```

### 3.2 Solicitud de Modificación del Contrato

```
Cliente en página de contrato (PUBLISHED)
  ↓
Click "Solicitar modificación" → Abre ContractModificationRequestModal
  ↓
Cliente ingresa:
  - Mensaje detallado
  - Campos específicos (opcional, metadata)
  ↓
Click "Enviar solicitud"
  ↓
Crea registro en studio_contract_modification_requests:
  - status: 'pending'
  - requested_by: 'client'
  - message: texto del cliente
  ↓
Notificación al estudio: "Cliente solicitó modificación del contrato"
  ↓
Estudio ve solicitud en:
  - Notificaciones
  - Card de contrato (badge "Solicitud pendiente")
  - Modal de solicitudes (nuevo)
  ↓
Estudio puede:
  - Aprobar → Regenera contrato con cambios
  - Rechazar → Envía respuesta al cliente
  - Solicitar más información
```

---

## 4. UI/UX Propuesta

### 4.1 Página de Contrato (Cliente)

**Sección: "¿Necesitas actualizar información?"**

```tsx
<ZenCard>
  <ZenCardHeader>
    <ZenCardTitle>¿Necesitas actualizar información?</ZenCardTitle>
  </ZenCardHeader>
  <ZenCardContent className="space-y-3">
    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
      <div>
        <p className="text-sm font-medium text-zinc-200">Datos de contacto</p>
        <p className="text-xs text-zinc-400">
          Nombre, teléfono, email, dirección
        </p>
      </div>
      <ZenButton
        size="sm"
        variant="outline"
        onClick={() => setShowProfileModal(true)}
      >
        Modificar
      </ZenButton>
    </div>

    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
      <div>
        <p className="text-sm font-medium text-zinc-200">Datos del evento</p>
        <p className="text-xs text-zinc-400">Nombre del evento, sede</p>
      </div>
      <ZenButton
        size="sm"
        variant="outline"
        onClick={() => setShowEventInfoModal(true)}
      >
        Modificar
      </ZenButton>
    </div>
  </ZenCardContent>
</ZenCard>
```

**Botón de solicitud de modificación:**

```tsx
{
  isPublished && !isSigned && (
    <ZenButton
      variant="outline"
      size="sm"
      onClick={() => setShowModificationRequestModal(true)}
      className="text-blue-400 border-blue-500/30 hover:bg-blue-950/20"
    >
      <Edit className="h-4 w-4 mr-2" />
      Solicitar modificación del contrato
    </ZenButton>
  );
}
```

### 4.2 Card de Contrato (Estudio)

**Badge de solicitud pendiente:**

```tsx
{
  hasPendingModificationRequests && (
    <ZenBadge variant="warning" className="rounded-full">
      <AlertCircle className="h-3 w-3 mr-1" />
      {pendingCount} solicitud(es) pendiente(s)
    </ZenBadge>
  );
}
```

**Botón para ver solicitudes:**

```tsx
<ZenButton
  variant="outline"
  size="sm"
  onClick={() => setShowModificationRequestsModal(true)}
>
  <MessageSquare className="h-4 w-4 mr-2" />
  Ver solicitudes ({pendingCount})
</ZenButton>
```

---

## 5. Notificaciones

### 5.1 Tipos de Notificación

**Cliente → Estudio:**

- `CLIENT_PROFILE_UPDATED` - Cliente actualizó datos de contacto
- `CLIENT_EVENT_INFO_UPDATED` - Cliente actualizó datos del evento
- `CONTRACT_MODIFICATION_REQUESTED` - Cliente solicitó modificación del contrato

**Estudio → Cliente:**

- `CONTRACT_MODIFICATION_APPROVED` - Estudio aprobó modificación
- `CONTRACT_MODIFICATION_REJECTED` - Estudio rechazó modificación
- `CONTRACT_MODIFICATION_RESPONSE` - Estudio respondió a solicitud

### 5.2 Metadata de Notificaciones

**CLIENT_PROFILE_UPDATED:**

```json
{
  "fields_changed": ["name", "phone"],
  "old_values": { "name": "Juan Pérez", "phone": "1234567890" },
  "new_values": { "name": "Juan Pérez García", "phone": "0987654321" }
}
```

**CLIENT_EVENT_INFO_UPDATED:**

```json
{
  "event_id": "...",
  "fields_changed": ["name", "event_location"],
  "old_values": { "name": "Boda", "event_location": "Hotel X" },
  "new_values": { "name": "Boda de Juan y María", "event_location": "Hotel Y" }
}
```

**CONTRACT_MODIFICATION_REQUESTED:**

```json
{
  "contract_id": "...",
  "request_id": "...",
  "message_preview": "El nombre del cliente está incorrecto..."
}
```

---

## 6. Implementación Propuesta

### Fase 1: Actualización de Datos

1. ✅ Crear `EventInfoModal` unificado
2. ✅ Actualizar `InformacionEventoCard` para usar modal
3. ✅ Agregar sección "¿Necesitas actualizar información?" en página de contrato
4. ✅ Agregar notificaciones cuando cliente actualiza datos

### Fase 2: Solicitud de Modificación

1. ✅ Crear modelo `studio_contract_modification_requests`
2. ✅ Crear migración SQL
3. ✅ Crear server actions para CRUD de solicitudes
4. ✅ Crear `ContractModificationRequestModal` (cliente)
5. ✅ Crear `ContractModificationRequestsModal` (estudio)
6. ✅ Agregar notificaciones bidireccionales
7. ✅ Integrar en `EventContractCard` (estudio)

### Fase 3: Integración

1. ✅ Agregar badges y contadores
2. ✅ Agregar realtime para solicitudes
3. ✅ Testing completo

---

## 7. Consideraciones Técnicas

### 7.1 Regeneración Automática

Cuando el cliente actualiza datos del evento:

- Si el contrato está en `DRAFT` o `PUBLISHED`: Regenerar automáticamente
- Si está en `SIGNED`: No regenerar (requiere nueva versión o modificación)

### 7.2 Versionado

Las solicitudes de modificación pueden generar nuevas versiones:

- Si estudio aprueba: Crear nueva versión con `change_type: "MANUAL_EDIT"`
- Si estudio regenera: Crear versión con `change_type: "AUTO_REGENERATE"`

### 7.3 Permisos

- Cliente solo puede solicitar modificaciones si contrato está `PUBLISHED`
- Cliente no puede modificar contrato directamente (solo solicitar)
- Estudio puede aprobar/rechazar solicitudes

---

## 8. Decisiones Finales

✅ **Actualización de datos:** Modal unificado `EventInfoModal`
✅ **Solicitud de modificación:** Nuevo modelo `studio_contract_modification_requests`
✅ **Notificaciones:** Sistema existente con nuevos tipos
✅ **UI:** Card con botones de acceso rápido + modal de solicitudes

---

## Próximos Pasos

1. Revisar y aprobar este análisis
2. Implementar Fase 1 (Actualización de Datos)
3. Implementar Fase 2 (Solicitud de Modificación)
4. Testing y refinamiento
