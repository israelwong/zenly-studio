'use server';

import { prisma } from '@/lib/prisma';
import { createStudioNotification } from '../studio-notification.service';
import { StudioNotificationScope, StudioNotificationType, NotificationPriority } from '../types';

export async function notifyPackageCreated(
  studioId: string,
  paqueteId: string,
  packageName: string
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });
  
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.PACKAGE_CREATED,
    studio_id: studioId,
    title: 'Nuevo paquete creado',
    message: `Se creó un nuevo paquete: "${packageName}"`,
    category: 'packages',
    priority: NotificationPriority.MEDIUM,
    route: '/{slug}/studio/builder/commercial/paquetes',
    route_params: {
      slug: studio?.slug,
      paquete_id: paqueteId,
    },
    metadata: {
      package_name: packageName,
    },
    paquete_id: paqueteId,
  });
}

export async function notifyPackageUpdated(
  studioId: string,
  paqueteId: string,
  packageName: string
) {
  const studio = await prisma.studios.findUnique({
    where: { id: studioId },
    select: { slug: true },
  });
  
  return createStudioNotification({
    scope: StudioNotificationScope.STUDIO,
    type: StudioNotificationType.PACKAGE_UPDATED,
    studio_id: studioId,
    title: 'Paquete actualizado',
    message: `El paquete "${packageName}" ha sido actualizado`,
    category: 'packages',
    priority: NotificationPriority.LOW,
    route: '/{slug}/studio/builder/commercial/paquetes',
    route_params: {
      slug: studio?.slug,
      paquete_id: paqueteId,
    },
    metadata: {
      package_name: packageName,
    },
    paquete_id: paqueteId,
  });
}

