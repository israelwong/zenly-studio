'use server';

/**
 * Server Actions de autenticación del cliente
 * Basado en migrate/cliente/_lib/actions/auth.actions.ts
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { ClientSession, LoginData, ApiResponse } from '@/types/client';

export async function loginCliente(data: LoginData & { rememberSession?: boolean }): Promise<ApiResponse<ClientSession>> {
  try {
    // Validar que se proporcione al menos un campo
    if (!data.phone && !data.email) {
      return {
        success: false,
        message: 'Debes proporcionar teléfono o email',
      };
    }

    // Obtener studio_id del slug
    const studio = await prisma.studios.findUnique({
      where: { slug: data.studioSlug },
      select: { id: true },
    });

    if (!studio) {
      return {
        success: false,
        message: 'Estudio no encontrado',
      };
    }

    // Buscar contacto por teléfono O por email
    const whereConditions: { studio_id: string; phone?: string; email?: string } = {
      studio_id: studio.id,
    };

    if (data.phone) {
      whereConditions.phone = data.phone;
    } else if (data.email) {
      whereConditions.email = data.email;
    }

    const contact = await prisma.studio_contacts.findFirst({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        studio_id: true,
      },
    });

    if (!contact) {
      return {
        success: false,
        message: 'No se encontró un contacto con los datos proporcionados',
      };
    }

    // Verificar que el contacto tenga al menos una cotización aprobada
    const hasApprovedCotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise: {
          contact_id: contact.id,
        },
        status: { in: ['aprobada', 'autorizada', 'approved'] },
      },
      select: { id: true },
    });

    if (!hasApprovedCotizacion) {
      return {
        success: false,
        message: 'No tienes cotizaciones aprobadas disponibles',
      };
    }

    // Crear sesión (usando cookies)
    const cookieStore = await cookies();

    // Duración de la sesión basada en "recordar sesión"
    const maxAge = data.rememberSession
      ? 60 * 60 * 24 * 30  // 30 días si recordar
      : 60 * 60 * 24 * 7;  // 7 días por defecto

    // Cookie de sesión completa
    cookieStore.set(
      'cliente-session',
      JSON.stringify({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        studio_id: contact.studio_id,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge,
        sameSite: 'lax',
        path: '/',
      }
    );

    // Cookie simple para ID (usado por otros Server Actions)
    cookieStore.set('cliente-id', contact.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge,
      sameSite: 'lax',
      path: '/',
    });

    return {
      success: true,
      data: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        studio_id: contact.studio_id,
      },
    };
  } catch (error) {
    console.error('[loginCliente] Error:', error);
    return {
      success: false,
      message: 'Error de conexión. Por favor intenta de nuevo.',
    };
  }
}

export async function logoutCliente(studioSlug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('cliente-session');
  cookieStore.delete('cliente-id');
  redirect(`/${studioSlug}/cliente/login`);
}

export async function getClienteSession(): Promise<ClientSession | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('cliente-session');

    if (!session) {
      return null;
    }

    const clienteData = JSON.parse(session.value) as ClientSession;

    // Verificar que el cliente aún existe y tiene cotizaciones aprobadas
    const contact = await prisma.studio_contacts.findUnique({
      where: { id: clienteData.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        studio_id: true,
        avatar_url: true,
      },
    });

    if (!contact) {
      return null;
    }

    // Verificar que tenga al menos una cotización aprobada
    const hasApprovedCotizacion = await prisma.studio_cotizaciones.findFirst({
      where: {
        promise: {
          contact_id: contact.id,
        },
        status: { in: ['aprobada', 'autorizada', 'approved'] },
      },
      select: { id: true },
    });

    if (!hasApprovedCotizacion) {
      return null;
    }

    return {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      studio_id: contact.studio_id,
      avatar_url: contact.avatar_url,
    };
  } catch (error) {
    console.error('[getClienteSession] Error:', error);
    return null;
  }
}

