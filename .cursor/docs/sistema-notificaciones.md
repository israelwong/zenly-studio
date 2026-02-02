# Sistema de Notificaciones - Documentación Técnica

**Versión:** 1.0  
**Fecha:** Enero 2025  
**Última actualización:** Enero 2025

---

## 📋 Tabla de Contenidos

1. [Arquitectura General](#1-arquitectura-general)
2. [Componentes Principales](#2-componentes-principales)
3. [Flujo de Funcionamiento](#3-flujo-de-funcionamiento)
4. [Hooks y Componentes UI](#4-hooks-y-componentes-ui)
5. [Problemas Comunes y Soluciones](#5-problemas-comunes-y-soluciones)
6. [Mejores Prácticas](#6-mejores-prácticas)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Arquitectura General

### 1.1 Estructura del Sistema

El sistema de notificaciones está dividido en dos contextos principales:

- **Notificaciones de Estudio** (`studio_notifications`): Para usuarios del estudio (suscriptores)
- **Notificaciones de Cliente** (`studio_client_notifications`): Para clientes en el portal

### 1.2 Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────┐
│                    UI Components                         │
│  NotificationsDropdown | NotificationsHistorySheet      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    React Hooks                          │
│  useStudioNotifications | useNotificationsHistory     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Server Actions                          │
│  getStudioNotifications | markNotificationAsClicked     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Notification Services                      │
│  studio-notification.service.ts | helpers/*              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Database (Prisma)                         │
│  studio_notifications | studio_client_notifications     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            Supabase Realtime                           │
│  Broadcast channels para sincronización en tiempo real │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Modelos de Base de Datos

#### `studio_notifications`
- **Scope**: `STUDIO` | `USER` | `ROLE`
- **Destinatario**: `user_id` (studio_user_profiles.id)
- **Uso**: Notificaciones internas del estudio

#### `studio_client_notifications`
- **Destinatario**: `contact_id` (studio_contacts.id)
- **Uso**: Notificaciones para clientes en el portal

---

## 2. Componentes Principales

### 2.1 Hooks de Cliente

#### `useStudioNotifications`
**Ubicación:** `src/hooks/useStudioNotifications.ts`

**Propósito:** Hook principal para obtener y gestionar notificaciones del estudio.

**API:**
```typescript
const {
  notifications,      // Array de notificaciones
  unreadCount,        // Contador de no leídas
  loading,            // Estado de carga
  error,              // Mensaje de error (si existe)
  markAsRead,         // Marcar como leída
  markAsClicked,      // Marcar como clickeada
  deleteNotification, // Eliminar notificación
  refresh             // Refrescar manualmente
} = useStudioNotifications({
  studioSlug: string,
  enabled?: boolean
});
```

**Flujo Interno:**
1. Obtiene `userId` desde `getCurrentUserId(studioSlug)`
2. Carga notificaciones iniciales con `getStudioNotifications()`
3. Obtiene contador de no leídas con `getUnreadNotificationsCount()`
4. Configura Realtime para escuchar cambios en tiempo real
5. Sincroniza estado local con eventos de Realtime

#### `useNotificationsHistory`
**Ubicación:** `src/hooks/useNotificationsHistory.ts`

**Propósito:** Hook para obtener historial completo de notificaciones con paginación.

**API:**
```typescript
const {
  notifications,    // Array de notificaciones
  loading,          // Estado de carga
  error,            // Mensaje de error
  hasMore,          // Si hay más notificaciones
  loadMore,         // Cargar más notificaciones
  refresh,          // Refrescar
  groupedByDate     // Notificaciones agrupadas por fecha
} = useNotificationsHistory({
  studioSlug: string,
  enabled?: boolean,
  period?: 'week' | 'month' | 'quarter' | 'year' | 'all',
  category?: string,
  search?: string
});
```

### 2.2 Componentes UI

#### `NotificationsDropdown`
**Ubicación:** `src/components/shared/notifications/NotificationsDropdown.tsx`

**Propósito:** Dropdown en el header que muestra notificaciones recientes.

**Características:**
- Muestra últimas 50 notificaciones
- Indicador de no leídas
- Animación cuando hay nuevas notificaciones
- Botón para abrir historial completo
- Navegación automática al hacer click

#### `NotificationsHistorySheet`
**Ubicación:** `src/components/shared/notifications/NotificationsHistorySheet.tsx`

**Propósito:** Sheet lateral con historial completo de notificaciones.

**Características:**
- Paginación infinita
- Filtros por período (semana, mes, trimestre, año, todo)
- Agrupación por fecha (Hoy, Ayer, Esta semana, etc.)
- Scroll infinito

### 2.3 Server Actions

**Ubicación:** `src/lib/actions/studio/notifications/notifications.actions.ts`

**Funciones principales:**
- `getStudioNotifications()` - Obtener notificaciones
- `getUnreadNotificationsCount()` - Contar no leídas
- `markNotificationAsRead()` - Marcar como leída
- `markNotificationAsClicked()` - Marcar como clickeada
- `deleteNotificationAction()` - Eliminar notificación
- `getStudioNotificationsHistory()` - Obtener historial
- `getCurrentUserId()` - Obtener ID de usuario actual

### 2.4 Servicios

**Ubicación:** `src/lib/notifications/studio/`

**Archivos principales:**
- `studio-notification.service.ts` - Servicio centralizado
- `helpers/promise-notifications.ts` - Helpers para promesas
- `helpers/event-notifications.ts` - Helpers para eventos
- `helpers/package-notifications.ts` - Helpers para paquetes
- `utils.ts` - Utilidades (buildRoute, etc.)

---

## 3. Flujo de Funcionamiento

### 3.1 Creación de Notificación

```typescript
// En un Server Action
import { notifyPromiseCreated } from '@/lib/notifications/studio';

export async function createPromise(...) {
  // ... crear promesa
  
  // Crear notificación
  await notifyPromiseCreated(
    studio.id,
    promise.id,
    contact.name,
    promise.event_type?.name || null,
    promise.defined_date?.toISOString() || null
  );
  
  return { success: true, data: promise };
}
```

**Flujo:**
1. Server Action crea notificación en BD
2. Trigger de BD emite broadcast vía Supabase Realtime
3. Hook `useStudioNotifications` recibe evento
4. Estado local se actualiza automáticamente
5. UI se re-renderiza con nueva notificación

### 3.2 Visualización de Notificaciones

```
Usuario abre dropdown
    ↓
useStudioNotifications se ejecuta
    ↓
1. Obtiene userId (getCurrentUserId)
    ↓
2. Carga notificaciones (getStudioNotifications)
    ↓
3. Obtiene contador (getUnreadNotificationsCount)
    ↓
4. Configura Realtime listener
    ↓
5. Renderiza notificaciones en UI
```

### 3.3 Interacción con Notificación

```
Usuario hace click en notificación
    ↓
handleNotificationClick()
    ↓
1. buildRoute() construye ruta dinámica
    ↓
2. markAsClicked() actualiza BD
    ↓
3. Actualización optimista en estado local
    ↓
4. router.push() navega a la ruta
    ↓
5. Realtime UPDATE event sincroniza estado
```

### 3.4 Sincronización Realtime

El sistema usa **Supabase Realtime** con broadcast channels:

**Canal:** `studio:{slug}:notifications`

**Eventos:**
- `INSERT` - Nueva notificación
- `UPDATE` - Notificación actualizada (leída, clickeada)
- `DELETE` - Notificación eliminada

**Trigger de BD:**
```sql
-- Trigger que emite broadcast cuando se crea/actualiza/elimina notificación
CREATE TRIGGER notify_studio_notification_changes
AFTER INSERT OR UPDATE OR DELETE ON studio_notifications
FOR EACH ROW EXECUTE FUNCTION broadcast_notification_changes();
```

---

## 4. Hooks y Componentes UI

### 4.1 Uso de `useStudioNotifications`

```typescript
'use client';

import { useStudioNotifications } from '@/hooks/useStudioNotifications';

export function MyComponent({ studioSlug }: { studioSlug: string }) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsClicked,
    deleteNotification,
    refresh
  } = useStudioNotifications({ studioSlug });

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <div>
      <h2>Notificaciones ({unreadCount})</h2>
      {notifications.map(notif => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onClick={() => markAsClicked(notif.id)}
          onDelete={() => deleteNotification(notif.id)}
        />
      ))}
    </div>
  );
}
```

### 4.2 Uso de `NotificationsDropdown`

```typescript
import { NotificationsDropdown } from '@/components/shared/notifications/NotificationsDropdown';

export function AppHeader({ studioSlug }: { studioSlug: string }) {
  return (
    <header>
      {/* ... otros elementos */}
      <NotificationsDropdown studioSlug={studioSlug} />
    </header>
  );
}
```

### 4.3 Crear Notificación Personalizada

```typescript
import { StudioNotificationService } from '@/lib/notifications/studio';
import { StudioNotificationScope, StudioNotificationType } from '@/lib/notifications/studio';

await StudioNotificationService.create({
  scope: StudioNotificationScope.STUDIO,
  type: StudioNotificationType.EVENT_APPROVED,
  studio_id: studioId,
  title: 'Evento aprobado',
  message: 'El evento ha sido aprobado',
  category: 'events',
  route: '/{slug}/studio/business/events/{event_id}',
  route_params: {
    slug: studioSlug,
    event_id: eventId,
  },
  metadata: {
    event_name: 'Boda',
  },
  event_id: eventId,
});
```

---

## 5. Problemas Comunes y Soluciones

### 5.1 Loading Infinito en Dropdown

**Síntoma:** El dropdown se queda mostrando spinner indefinidamente.

**Causas:**
1. `userId` no se obtiene correctamente
2. `loadNotifications()` nunca se ejecuta
3. Estado `loading` no se resetea correctamente
4. Race condition entre efectos

**Solución Implementada:**
```typescript
// Estado separado para rastrear carga de userId
const [isLoadingUserId, setIsLoadingUserId] = useState(true);

// Solo cargar notificaciones después de obtener userId
useEffect(() => {
  if (!isLoadingUserId && userId && enabled) {
    loadNotifications();
  } else if (!isLoadingUserId && !userId && enabled) {
    // Si no hay userId, establecer loading en false
    setLoading(false);
  }
}, [userId, isLoadingUserId, enabled, loadNotifications]);
```

**Verificación:**
- Revisar consola del navegador para errores
- Verificar que `getCurrentUserId()` retorna correctamente
- Comprobar que `isMountedRef.current` es `true`

### 5.2 Notificaciones No Aparecen en Tiempo Real

**Síntoma:** Las notificaciones no se actualizan automáticamente.

**Causas:**
1. Canal de Realtime no está suscrito
2. Trigger de BD no está emitiendo broadcast
3. Filtro de Realtime está excluyendo notificaciones

**Solución:**
```typescript
// Verificar que el canal está suscrito
useEffect(() => {
  const channel = createRealtimeChannel(supabase, channelConfig);
  
  channel
    .on('broadcast', { event: 'INSERT' }, (payload) => {
      // Verificar que la notificación es para este usuario
      if (notification.user_id === userId) {
        setNotifications(prev => [notification, ...prev]);
      }
    });
  
  await subscribeToChannel(channel, (status, err) => {
    if (err) console.error('Error en suscripción:', err);
  });
}, [userId]);
```

**Verificación:**
- Revisar consola para errores de Realtime
- Verificar trigger en BD: `notify_studio_notification_changes`
- Comprobar que el canal está activo en Supabase Dashboard

### 5.3 Rutas No Funcionan al Hacer Click

**Síntoma:** Al hacer click en notificación, no navega o navega a ruta incorrecta.

**Causas:**
1. `route` o `route_params` están mal formateados
2. `buildRoute()` no puede construir la ruta
3. Parámetros faltantes en `route_params`

**Solución:**
```typescript
// Verificar que buildRoute recibe todos los parámetros necesarios
const route = buildRoute(
  notification.route,
  notification.route_params,
  studioSlug,
  notification // Pasa la notificación completa para usar IDs directos
);

// Si route es null, no navegar
if (route) {
  router.push(route);
}
```

**Verificación:**
- Revisar `route` y `route_params` en BD
- Verificar logs de `buildRoute()` en consola
- Comprobar que todos los placeholders están reemplazados

### 5.4 Contador de No Leídas Incorrecto

**Síntoma:** El contador muestra número incorrecto de no leídas.

**Causas:**
1. Estado local desincronizado con BD
2. Realtime UPDATE no actualiza contador
3. Múltiples actualizaciones optimistas

**Solución:**
```typescript
// Actualización optimista + Realtime como backup
const handleMarkAsClicked = async (notificationId: string) => {
  // Actualizar estado local inmediatamente
  setNotifications(prev => 
    prev.map(n => 
      n.id === notificationId 
        ? { ...n, is_read: true }
        : n
    )
  );
  
  // Decrementar contador si no estaba leída
  const notification = notifications.find(n => n.id === notificationId);
  if (notification && !notification.is_read) {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }
  
  // Actualizar en BD (Realtime sincronizará como backup)
  await markNotificationAsClicked(notificationId, userId);
};
```

### 5.5 Error "Usuario no encontrado"

**Síntoma:** `getCurrentUserId()` retorna error.

**Causas:**
1. `studio_user_profiles` no existe para el usuario
2. `supabase_id` no coincide
3. Usuario no tiene acceso al estudio

**Solución:**
```typescript
// getCurrentUserId crea el perfil si no existe
let userProfile = await prisma.studio_user_profiles.findFirst({
  where: {
    supabase_id: authUser.id,
    studio_id: studio.id,
    is_active: true,
  },
});

// Si no existe, crear perfil
if (!userProfile) {
  userProfile = await prisma.studio_user_profiles.create({
    data: {
      email: user.email,
      supabase_id: authUser.id,
      studio_id: studio.id,
      role: 'SUSCRIPTOR',
      is_active: true,
    },
  });
}
```

---

## 6. Mejores Prácticas

### 6.1 Crear Notificaciones en Server Actions

✅ **CORRECTO:**
```typescript
export async function createPromise(...) {
  try {
    // ... crear promesa
    
    // Crear notificación (no bloquear si falla)
    try {
      await notifyPromiseCreated(...);
    } catch (notificationError) {
      console.error('Error creando notificación:', notificationError);
      // No fallar la operación principal
    }
    
    return { success: true, data: promise };
  } catch (error) {
    return { success: false, error: 'Error al crear promesa' };
  }
}
```

❌ **INCORRECTO:**
```typescript
export async function createPromise(...) {
  const promise = await prisma.promise.create(...);
  
  // ❌ No hacer await sin try-catch
  await notifyPromiseCreated(...);
  
  // ❌ No fallar si la notificación falla
  if (!notificationResult.success) {
    throw new Error('Error en notificación');
  }
  
  return promise;
}
```

### 6.2 Manejo de Estados en Hooks

✅ **CORRECTO:**
```typescript
// Estados separados para diferentes fases
const [isLoadingUserId, setIsLoadingUserId] = useState(true);
const [loading, setLoading] = useState(true);

// Cleanup correcto
useEffect(() => {
  isMountedRef.current = true;
  return () => {
    isMountedRef.current = false;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };
}, []);
```

❌ **INCORRECTO:**
```typescript
// ❌ Un solo estado para todo
const [loading, setLoading] = useState(true);

// ❌ No limpiar recursos
useEffect(() => {
  setupRealtime();
  // Falta cleanup
}, []);
```

### 6.3 Actualizaciones Optimistas

✅ **CORRECTO:**
```typescript
// Actualizar UI inmediatamente
setNotifications(prev => prev.map(...));

// Luego actualizar BD (Realtime como backup)
await markAsClicked(notificationId, userId);
```

❌ **INCORRECTO:**
```typescript
// ❌ Esperar respuesta de BD antes de actualizar UI
const result = await markAsClicked(notificationId, userId);
if (result.success) {
  setNotifications(prev => prev.map(...));
}
```

### 6.4 Manejo de Errores

✅ **CORRECTO:**
```typescript
try {
  await markAsClicked(notificationId, userId);
} catch (err) {
  console.error('[useStudioNotifications] Error:', err);
  // Revertir actualización optimista
  await loadNotifications();
}
```

❌ **INCORRECTO:**
```typescript
// ❌ Silenciar errores
try {
  await markAsClicked(notificationId, userId);
} catch (err) {
  // No hacer nada
}
```

---

## 7. Troubleshooting

### 7.1 Checklist de Diagnóstico

**Problema: Notificaciones no aparecen**

- [ ] Verificar que `getCurrentUserId()` retorna correctamente
- [ ] Comprobar que `getStudioNotifications()` retorna datos
- [ ] Revisar consola para errores de red
- [ ] Verificar que el usuario tiene `studio_user_profiles` activo
- [ ] Comprobar que `enabled` es `true` en el hook

**Problema: Loading infinito**

- [ ] Verificar que `isLoadingUserId` se establece en `false`
- [ ] Comprobar que `userId` se obtiene correctamente
- [ ] Revisar que `loadNotifications()` se ejecuta
- [ ] Verificar que `isMountedRef.current` es `true`
- [ ] Comprobar que `finally` bloque establece `loading: false`

**Problema: Realtime no funciona**

- [ ] Verificar que el canal está suscrito
- [ ] Comprobar trigger en BD: `notify_studio_notification_changes`
- [ ] Revisar logs de Supabase Realtime
- [ ] Verificar que el filtro de Realtime incluye `user_id`
- [ ] Comprobar que `setupRealtimeAuth()` se ejecuta correctamente

**Problema: Rutas no funcionan**

- [ ] Verificar `route` y `route_params` en BD
- [ ] Comprobar que `buildRoute()` recibe todos los parámetros
- [ ] Revisar logs de `buildRoute()` en consola
- [ ] Verificar que todos los placeholders están reemplazados
- [ ] Comprobar que la ruta resultante es válida

### 7.2 Comandos de Debug

```typescript
// En el hook, agregar logs temporales
console.log('[useStudioNotifications] Estado:', {
  userId,
  isLoadingUserId,
  loading,
  notificationsCount: notifications.length,
  unreadCount,
  error
});

// En buildRoute, agregar logs
console.log('[buildRoute] Input:', {
  routeTemplate,
  params,
  fallbackSlug,
  notificationIds: {
    promise_id: notification?.promise_id,
    event_id: notification?.event_id,
  }
});

console.log('[buildRoute] Output:', route);
```

### 7.3 Verificación en Base de Datos

```sql
-- Verificar notificaciones del usuario
SELECT * FROM studio_notifications
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Verificar trigger
SELECT * FROM pg_trigger
WHERE tgname = 'notify_studio_notification_changes';

-- Verificar función de broadcast
SELECT * FROM pg_proc
WHERE proname = 'broadcast_notification_changes';
```

### 7.4 Verificación en Supabase Dashboard

1. **Realtime Channels:**
   - Ir a Supabase Dashboard > Realtime
   - Verificar que el canal `studio:{slug}:notifications` está activo
   - Comprobar que hay suscriptores conectados

2. **Database Triggers:**
   - Ir a Database > Triggers
   - Verificar que `notify_studio_notification_changes` existe
   - Comprobar que está activo

3. **Logs:**
   - Ir a Logs > Realtime
   - Buscar eventos de broadcast
   - Verificar que los eventos se están emitiendo

---

## 📝 Notas Finales

- El sistema usa **actualizaciones optimistas** para mejor UX
- **Realtime** actúa como backup para sincronización
- Las notificaciones **no deben bloquear** operaciones principales
- Siempre manejar errores de notificaciones sin afectar flujo principal
- El estado `loading` debe resetearse en **todos los casos** (éxito, error, desmontaje)

---

**Última actualización:** Enero 2025  
**Mantenido por:** Equipo ZEN Platform
