# Plan: Eliminar Sistema de Solicitudes de Modificación

## 🎯 Decisión

Eliminar completamente el sistema de solicitudes de modificación de contratos porque:

- El estudio puede aplicar cambios directamente
- Dudas complejas se resuelven por WhatsApp
- Es over-engineering para este caso de uso

## 📋 Elementos a Eliminar

### 1. Componentes UI

- ✅ `src/app/[slug]/studio/business/events/[eventId]/components/ContractModificationRequestsModal.tsx`
- ✅ Botón "Solicitar modificación" en página de contrato del cliente
- ✅ Badge de contador en `EventContractCard.tsx`
- ✅ Menú item "Solicitudes de modificación" en `EventContractCard.tsx`

### 2. Server Actions

- ✅ `requestContractModificationByClient` en `contracts.actions.ts`
- ✅ `requestContractModificationByStudio` en `contracts.actions.ts`
- ✅ `getContractModificationRequests` en `contracts.actions.ts`
- ✅ `respondToContractModificationRequest` en `contracts.actions.ts`

### 3. Schemas

- ✅ `RequestContractModificationSchema` en `contracts-schemas.ts`
- ✅ `RespondContractModificationSchema` en `contracts-schemas.ts`

### 4. Notificaciones

- ✅ `src/lib/notifications/studio/helpers/contract-modification-notifications.ts`
- ✅ `src/lib/notifications/client/helpers/contract-modification-notifications.ts`
- ✅ `CONTRACT_MODIFICATION_REQUESTED` del enum `StudioNotificationType`
- ✅ `CONTRACT_MODIFICATION_APPROVED` del enum `ClientNotificationType`
- ✅ `CONTRACT_MODIFICATION_REJECTED` del enum `ClientNotificationType`

### 5. Types

- ✅ `ContractModificationRequest` interface en `types/contracts.ts`
- ✅ Relación `modification_requests` en `EventContract` type

### 6. Base de Datos (Opcional - mantener para no romper datos existentes)

- ⚠️ `studio_contract_modification_requests` table (mantener por ahora, no se usa)
- ⚠️ Relación en `studio_event_contracts` (mantener por ahora)

### 7. Migraciones

- ⚠️ `supabase/migrations/20250131000000_add_contract_modification_requests.sql` (mantener por historial)

### 8. Imports y Referencias

- ✅ Eliminar todos los imports relacionados
- ✅ Eliminar referencias en `EventContractCard.tsx`
- ✅ Eliminar referencias en página de contrato del cliente

## 🔄 Cambios en Componentes

### `EventContractCard.tsx`

- Eliminar import de `ContractModificationRequestsModal`
- Eliminar import de `getContractModificationRequests`
- Eliminar estado `pendingModificationCount`
- Eliminar `useEffect` que carga contador
- Eliminar badge en `ZenCardTitle`
- Eliminar menu item "Solicitudes de modificación"
- Eliminar modal `ContractModificationRequestsModal`

### `contrato/page.tsx` (Cliente)

- Eliminar import de `requestContractModificationByClient`
- Eliminar estado `showModificationRequestModal`
- Eliminar estado `modificationMessage`
- Eliminar estado `isRequestingModification`
- Eliminar función `handleRequestModification`
- Eliminar botón "Solicitar modificación del contrato"
- Eliminar modal de solicitud

## ✅ Checklist de Eliminación

- [ ] Eliminar componente `ContractModificationRequestsModal.tsx`
- [ ] Eliminar server actions de modificación
- [ ] Eliminar schemas de modificación
- [ ] Eliminar helpers de notificaciones
- [ ] Eliminar tipos de notificación de enums
- [ ] Eliminar interface `ContractModificationRequest`
- [ ] Limpiar `EventContractCard.tsx`
- [ ] Limpiar página de contrato del cliente
- [ ] Eliminar imports no usados
- [ ] Verificar que no queden referencias

## 📝 Notas

- **Base de datos**: Mantener tabla `studio_contract_modification_requests` por ahora para no romper datos existentes. Se puede eliminar en una migración futura si es necesario.
- **Migraciones**: Mantener migración histórica, no eliminar.
- **Notificaciones existentes**: Las notificaciones ya enviadas seguirán existiendo, pero no se crearán nuevas.
