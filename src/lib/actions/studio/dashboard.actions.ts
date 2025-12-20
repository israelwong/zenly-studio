"use server";

import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";

export interface DashboardStudio {
  id: string;
  name: string;
  slug: string;
  email: string;
  address: string | null;
  website: string | null;
  subscriptionStatus: string;
  plan: {
    name: string;
    priceMonthly: number;
  };
  _count: {
    eventos: number;
    contacts: number;
  };
}

export interface DashboardEvento {
  id: string;
  nombre: string;
  fecha_evento: Date;
  status: string;
  cliente: {
    nombre: string;
    email: string;
  }[];
}

export interface DashboardCliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  status: string;
}

/**
 * Obtiene los datos del dashboard del studio (modo desarrollo)
 */
export async function obtenerDashboardStudio(studioSlug: string): Promise<DashboardStudio | null> {
  return await retryDatabaseOperation(async () => {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: {
        id: true,
        studio_name: true,
        slug: true,
        email: true,
        address: true,
        website: true,
        subscription_status: true,
        _count: {
          select: {
            eventos: true,
            contacts: true,
          },
        },
      },
    });

    if (!studio) {
      return null;
    }

    // En modo desarrollo, usar datos por defecto
    return {
      ...studio,
      subscriptionStatus: studio.subscriptionStatus || "active",
      plan: {
        name: "Plan Desarrollo",
        priceMonthly: 0,
      },
    };
  });
}

/**
 * Obtiene los eventos recientes del studio (modo desarrollo)
 */
export async function obtenerEventosRecientes(studioSlug: string): Promise<DashboardEvento[]> {
  return await retryDatabaseOperation(async () => {
    try {
      const eventos = await prisma.studio_events.findMany({
        where: {
          studio: { slug: studioSlug },
        },
        select: {
          id: true,
          nombre: true,
          fecha_evento: true,
          status: true,
          cliente: {
            select: {
              nombre: true,
              email: true,
            },
          },
        },
        orderBy: { fecha_evento: "desc" },
        take: 5,
      });

      return eventos.map(evento => ({
        ...evento,
        cliente: evento.cliente || [],
      }));
    } catch (error) {
      // En modo desarrollo, retornar array vacío si hay error
      console.log('No hay eventos disponibles en modo desarrollo');
      return [];
    }
  });
}

/**
 * Obtiene los clientes recientes del studio (modo desarrollo)
 */
export async function obtenerClientesRecientes(studioSlug: string): Promise<DashboardCliente[]> {
  return await retryDatabaseOperation(async () => {
    try {
      const contacts = await prisma.studio_contacts.findMany({
        where: {
          studio: { slug: studioSlug },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
        },
        orderBy: { created_at: "desc" },
        take: 5,
      });

      return contacts.map(contact => ({
        id: contact.id,
        nombre: contact.name,
        email: contact.email || "",
        telefono: contact.phone,
        status: contact.status,
      }));
    } catch (error) {
      // En modo desarrollo, retornar array vacío si hay error
      console.log('No hay clientes disponibles en modo desarrollo');
      return [];
    }
  });
}
