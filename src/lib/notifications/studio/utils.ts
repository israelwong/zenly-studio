import { Prisma } from '@prisma/client';
import { CreateStudioNotificationInput } from './types';
import type { studio_notifications } from '@prisma/client';

/**
 * Construye ruta dinámica desde template y params
 * También puede usar IDs directamente de la notificación si no están en route_params
 */
export function buildRoute(
    routeTemplate?: string | null,
    params?: CreateStudioNotificationInput['route_params'] | Prisma.InputJsonValue | null,
    fallbackSlug?: string | null,
    notification?: Pick<studio_notifications, 'promise_id' | 'event_id' | 'quote_id' | 'paquete_id' | 'agenda_id'> | null
): string | null {
    if (!routeTemplate) return null;

    let route = routeTemplate;
    const paramsObj = (params as Record<string, string | null | undefined>) || {};

    // Asegurar que el slug esté presente
    if (!paramsObj.slug && fallbackSlug) {
        paramsObj.slug = fallbackSlug;
    }

    // Validar que el slug esté presente antes de construir la ruta
    if (!paramsObj.slug) {
        console.warn('[buildRoute] Slug no encontrado en params ni fallback');
        return null;
    }

    // Si faltan IDs en route_params pero están en la notificación, usarlos
    if (notification) {
        if (!paramsObj.promise_id && notification.promise_id) {
            paramsObj.promise_id = notification.promise_id;
        }
        if (!paramsObj.event_id && notification.event_id) {
            paramsObj.event_id = notification.event_id;
            console.log('[buildRoute] ✅ event_id obtenido de notification:', notification.event_id);
        }
        if (!paramsObj.quote_id && notification.quote_id) {
            paramsObj.quote_id = notification.quote_id;
        }
        if (!paramsObj.paquete_id && notification.paquete_id) {
            paramsObj.paquete_id = notification.paquete_id;
        }
        if (!paramsObj.agenda_id && notification.agenda_id) {
            paramsObj.agenda_id = notification.agenda_id;
        }
    }

    console.log('[buildRoute] 📋 Parámetros disponibles:', {
        routeTemplate,
        paramsObj,
        notificationEventId: notification?.event_id,
        notificationQuoteId: notification?.quote_id,
    });

    // Manejar rutas antiguas que ya tienen el slug hardcodeado
    // Si la ruta empieza con /studio/ y tiene un slug hardcodeado, reconstruirla
    const oldRouteMatch = route.match(/^\/studio\/([a-zA-Z0-9-]+)(\/.*)?$/);
    if (oldRouteMatch) {
        const [, , restPath = ''] = oldRouteMatch;
        // Reconstruir la ruta con el formato correcto usando el slug de params
        route = `/${paramsObj.slug}/studio${restPath}`;
    }

    // Migración: Remover /builder/ de las rutas (estructura antigua)
    // Convertir /{slug}/studio/builder/... a /{slug}/studio/...
    route = route.replace(/\/builder\//g, '/');
    route = route.replace(/\/builder$/g, '');

    // Si la ruta tiene placeholders, reemplazarlos
    if (route.includes('{')) {
        Object.entries(paramsObj).forEach(([key, value]) => {
            if (value && typeof value === 'string') {
                // Reemplazar todas las ocurrencias del placeholder
                const regex = new RegExp(`\\{${key}\\}`, 'g');
                const beforeReplace = route;
                route = route.replace(regex, value);
                if (beforeReplace !== route) {
                    console.log(`[buildRoute] 🔄 Reemplazado {${key}} con ${value}:`, { before: beforeReplace, after: route });
                }
            }
        });
    }

    // Si la ruta es para promesas/eventos y tiene el ID pero no está en la ruta, agregarlo
    if (paramsObj.promise_id && route.includes('/promises') && !route.includes(paramsObj.promise_id)) {
        // Agregar el promise_id al final si no está presente
        route = route.endsWith('/promises')
            ? `${route}/${paramsObj.promise_id}`
            : route.replace('/promises', `/promises/${paramsObj.promise_id}`);
        console.log('[buildRoute] ➕ Agregado promise_id a la ruta:', route);
    }

    // Si la ruta incluye /events y tiene event_id pero el placeholder no fue reemplazado
    if (paramsObj.event_id && route.includes('/events')) {
        // Si la ruta todavía tiene el placeholder {event_id}, reemplazarlo
        if (route.includes('{event_id}')) {
            route = route.replace(/{event_id}/g, paramsObj.event_id);
            console.log('[buildRoute] 🔄 Reemplazado placeholder {event_id} restante:', route);
        }
        // Si la ruta termina en /events o tiene /events pero no el ID, agregarlo
        else if (!route.includes(paramsObj.event_id)) {
            const beforeAdd = route;
            route = route.endsWith('/events')
                ? `${route}/${paramsObj.event_id}`
                : route.replace('/events', `/events/${paramsObj.event_id}`);
            console.log('[buildRoute] ➕ Agregado event_id a la ruta:', { before: beforeAdd, after: route, event_id: paramsObj.event_id });
        }
    }

    // Validar que no queden placeholders sin reemplazar
    if (route.includes('{')) {
        const missingParams = route.match(/{(\w+)}/g);
        console.warn('[buildRoute] Ruta contiene placeholders sin reemplazar:', {
            route,
            missingParams,
            availableParams: Object.keys(paramsObj),
            paramsObj,
            notificationIds: notification ? {
                promise_id: notification.promise_id,
                event_id: notification.event_id,
                quote_id: notification.quote_id,
            } : null,
        });
        return null;
    }

    // Validar formato de ruta (debe empezar con / y tener formato válido)
    if (!route.startsWith('/')) {
        console.warn('[buildRoute] Ruta no empieza con /:', route);
        return `/${route}`;
    }

    console.log('[buildRoute] Ruta construida exitosamente:', route);
    return route;
}

