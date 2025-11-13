# Sistema de Notificaciones de Estudio

Sistema centralizado de notificaciones para estudios con soporte para diferentes scopes (STUDIO, USER, ROLE), rutas dinámicas, metadata flexible y tracking de clicks.

## Estructura

```
src/lib/notifications/studio/
├── types.ts                          # Tipos y enums TypeScript
├── studio-notification.service.ts    # Servicio centralizado
├── helpers/
│   ├── promise-notifications.ts      # Helpers para promesas
│   ├── event-notifications.ts        # Helpers para eventos
│   └── package-notifications.ts      # Helpers para paquetes
└── index.ts                          # Exports principales
```

## Uso Básico

### Crear notificación para todo el estudio

```typescript
import { notifyPromiseCreated } from '@/lib/notifications/studio';

await notifyPromiseCreated(
  studioId,
  promiseId,
  contactName,
  eventType,
  eventDate
);
```

### Crear notificación personalizada

```typescript
import { StudioNotificationService } from '@/lib/notifications/studio';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '@/lib/notifications/studio';

await StudioNotificationService.create({
  scope: StudioNotificationScope.STUDIO,
  type: StudioNotificationType.EVENT_APPROVED,
  studio_id: studioId,
  title: 'Evento aprobado',
  message: 'El evento ha sido aprobado',
  category: 'events',
  priority: NotificationPriority.HIGH,
  route: '/studio/{slug}/builder/business/events/{event_id}',
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

### Marcar como leída/clickeada

```typescript
// Marcar como leída
await StudioNotificationService.markAsRead(notificationId, userId);

// Marcar como clickeada (automáticamente marca como leída)
await StudioNotificationService.markAsClicked(notificationId, userId);
```

### Obtener notificaciones

```typescript
// Todas las notificaciones
const notifications = await StudioNotificationService.getUserNotifications(
  userId,
  studioId,
  { limit: 50 }
);

// Solo no leídas
const unread = await StudioNotificationService.getUserNotifications(
  userId,
  studioId,
  { unreadOnly: true }
);

// Contar no leídas
const count = await StudioNotificationService.getUnreadCount(userId, studioId);
```

## Scopes Disponibles

- **STUDIO**: Notificación para todos los usuarios activos del estudio
- **USER**: Notificación para un usuario específico
- **ROLE**: Notificación para usuarios con un rol específico

## Tipos de Notificaciones

Ver `StudioNotificationType` en `types.ts` para la lista completa.

## Integración en Server Actions

Ejemplo de integración en `promises.actions.ts`:

```typescript
import { notifyPromiseCreated } from '@/lib/notifications/studio';

export async function createPromise(...) {
  // ... crear promesa
  
  // Crear notificación
  try {
    await notifyPromiseCreated(
      studio.id,
      promise.id,
      contact.name,
      promise.event_type?.name || null,
      promise.defined_date?.toISOString() || null
    );
  } catch (notificationError) {
    console.error('Error creando notificación:', notificationError);
    // No fallar la operación principal si falla la notificación
  }
  
  return { success: true, data: promise };
}
```

## Realtime

Las notificaciones se emiten automáticamente vía Supabase Realtime en el canal:
`studio:{slug}:notifications`

Evento: `studio_notification_created`

## Próximos Pasos

- [ ] Crear componentes UI para mostrar notificaciones
- [ ] Actualizar hook `useRealtimeNotifications` para nuevo schema
- [ ] Agregar más helpers (pagos, cotizaciones, etc.)
- [ ] Implementar filtros y búsqueda
- [ ] Agregar notificaciones programadas

