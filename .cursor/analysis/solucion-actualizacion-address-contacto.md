# Solución: Actualización del campo Address en ContactEventInfoCard

## Problema Original

El campo `address` del contacto no se actualizaba en tiempo real en el componente `ContactEventInfoCard` después de editar y guardar desde el modal `ContactEventFormModal`. Los demás campos (name, phone, email) sí se actualizaban correctamente.

## Causa Raíz

El problema tenía dos causas principales:

### 1. Sincronización de Props Sobrescribiendo Estado Local

El componente `ContactEventInfoCard` tenía un `useEffect` que sincronizaba las props (`initialContactData`) con el estado local (`contactData`) en cada cambio:

```typescript
useEffect(() => {
  setContactData(initialContactData);
}, [initialContactData]);
```

**Problema:** El componente padre (`page.tsx`) no actualizaba su estado `promiseData` después de guardar cambios, por lo que seguía pasando valores desactualizados. Esto sobrescribía el estado local que había sido actualizado correctamente por Realtime y CustomEvent.

### 2. Falta de Evento CustomEvent en el Modal

El modal `ContactEventFormModal` no disparaba el evento `triggerContactUpdate` después de actualizar la promesa, por lo que otros componentes en la misma página no se sincronizaban.

## Solución Implementada

### 1. Sincronización de Props Solo en Montaje Inicial

Se modificó el `useEffect` en `ContactEventInfoCard` para que solo sincronice las props en el montaje inicial, ignorando actualizaciones posteriores:

```typescript
const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    setContactData(initialContactData);
    isInitialMount.current = false;
  }
}, [initialContactData]);
```

**Beneficio:** El estado local se mantiene actualizado vía Realtime y CustomEvent, sin ser sobrescrito por props desactualizadas del padre.

### 2. Disparar CustomEvent Después de Actualizar

Se agregó `triggerContactUpdate` en el modal después de actualizar exitosamente:

```typescript
// En ContactEventFormModal.tsx
import { useContactRefresh } from '@/hooks/useContactRefresh';

const { triggerContactUpdate } = useContactRefresh();

// Después de updatePromise exitoso
if (isEditMode) {
  triggerContactUpdate(result.data.id, {
    id: result.data.id,
    name: result.data.name,
    phone: result.data.phone,
    email: result.data.email,
    address: result.data.address,
  });
  
  onClose();
  if (onSuccess) {
    onSuccess();
  }
}
```

### 3. Listener de CustomEvent

Se agregó el hook `useContactUpdateListener` en `ContactEventInfoCard`:

```typescript
import { useContactUpdateListener } from '@/hooks/useContactRefresh';

useContactUpdateListener(contactId, (contact) => {
  if (contact) {
    setContactData((prev) => ({
      ...prev,
      name: contact.name || prev.name,
      phone: contact.phone || prev.phone,
      email: contact.email !== undefined ? contact.email : prev.email,
      address: contact.address !== undefined ? contact.address : prev.address,
    }));
  }
});
```

## Flujo de Actualización Final

1. Usuario edita `address` en el modal y guarda
2. `updatePromise` actualiza la BD
3. **Trigger de BD** envía broadcast de Realtime automáticamente (migración `20250201000000_add_studio_contacts_realtime_trigger.sql`)
4. **Modal** dispara `triggerContactUpdate` con los datos actualizados
5. **Realtime listener** en `ContactEventInfoCard` actualiza `contactData`
6. **CustomEvent listener** en `ContactEventInfoCard` también actualiza `contactData` (redundancia para garantizar sincronización)
7. El componente se re-renderiza mostrando el valor actualizado
8. Las props del padre NO sobrescriben el estado local porque solo se sincronizan en el montaje inicial

## Archivos Modificados

1. **`src/components/shared/contact-info/ContactEventInfoCard.tsx`**
   - Agregado `useContactUpdateListener` para escuchar CustomEvent
   - Modificado `useEffect` para sincronizar props solo en montaje inicial
   - Priorizar `contactData.address` sobre `promiseData.address` en `initialData` del modal

2. **`src/components/shared/contact-info/ContactEventFormModal.tsx`**
   - Importado `useContactRefresh`
   - Agregado `triggerContactUpdate` después de actualizar exitosamente

3. **`src/lib/actions/studio/commercial/promises/promises.actions.ts`**
   - Sin cambios necesarios (el trigger de BD ya maneja el broadcast de Realtime)

## Sistema de Sincronización

El proyecto usa **dos sistemas complementarios** para sincronizar datos:

### 1. Realtime Broadcast (Supabase)
- **Trigger de BD** automático (`studio_contacts_broadcast_trigger`)
- Envía eventos cuando se actualiza `studio_contacts`
- Canal: `studio:{studioSlug}:contacts`
- Útil para sincronizar entre pestañas/dispositivos

### 2. CustomEvent (Browser)
- Eventos del navegador (`window.dispatchEvent`)
- Sincroniza componentes en la **misma página**
- Más rápido que Realtime
- Útil para actualización inmediata de UI

**Ambos sistemas se usan en conjunto** para garantizar sincronización robusta.

## Verificación

✅ El campo `address` se actualiza correctamente en `ContactEventInfoCard` después de guardar
✅ No requiere refrescar la página
✅ Funciona tanto con Realtime como con CustomEvent
✅ Los demás campos siguen funcionando correctamente
✅ El modal muestra el valor actualizado al reabrirlo

## Notas Importantes

- El componente padre (`page.tsx`) NO necesita actualizar su estado porque el componente hijo maneja su propio estado local
- El patrón de "sincronizar solo en montaje inicial" es útil cuando el componente hijo tiene fuentes de actualización más confiables (Realtime, CustomEvent)
- El trigger de BD es la fuente principal de verdad para Realtime; no es necesario enviar broadcasts manualmente desde las actions

