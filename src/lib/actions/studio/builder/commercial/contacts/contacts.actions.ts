'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import {
  createContactSchema,
  updateContactSchema,
  getContactsSchema,
  type CreateContactData,
  type UpdateContactData,
  type GetContactsParams,
  type ContactsListResponse,
  type ContactResponse,
  type Contact
} from '@/lib/actions/schemas/contacts-schemas';

/**
 * Obtener contactos con paginación y filtros
 */
export async function getContacts(
  studioSlug: string,
  params: GetContactsParams
): Promise<ContactsListResponse> {
  try {
    const validatedParams = getContactsSchema.parse(params);
    const { page, limit, search, status, acquisition_channel_id } = validatedParams;

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Construir filtros
    const where: any = {
      studio_id: studio.id
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (acquisition_channel_id) {
      where.acquisition_channel_id = acquisition_channel_id;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Contar total
    const total = await prisma.studio_contacts.count({ where });

    // Obtener contactos con información de eventos y promesas
    const contacts = await prisma.studio_contacts.findMany({
      where,
      include: {
        acquisition_channel: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        },
        social_network: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true
          }
        },
        referrer_contact: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        // Verificar si tiene eventos asociados (cotizaciones aprobadas con evento_id)
        cotizaciones: {
          where: {
            status: 'aprobada',
            evento_id: { not: null }
          },
          select: {
            evento_id: true
          },
          distinct: ['evento_id'],
          take: 1
        },
        // Verificar promesas sin cotizaciones aprobadas
        promises: {
          select: {
            id: true,
            quotes: {
              where: {
                status: 'aprobada'
              },
              take: 1
            }
          },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Mapear datos y determinar status dinámicamente
    const mappedContacts: Contact[] = contacts.map(contact => {
      // Determinar status basado en eventos y promesas
      const hasEvents = contact.cotizaciones.length > 0;
      const hasPromisesNoAprobadas = contact.promises.length > 0 && 
        contact.promises.some(p => p.quotes.length === 0);
      
      // Si tiene eventos asociados → cliente
      // Si solo tiene promesas no aprobadas → prospecto
      // Si no tiene ni eventos ni promesas → usar status del contacto
      let dynamicStatus = contact.status;
      if (hasEvents) {
        dynamicStatus = 'cliente';
      } else if (hasPromisesNoAprobadas) {
        dynamicStatus = 'prospecto';
      }

      return {
        id: contact.id,
        studio_id: contact.studio_id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
        avatar_url: contact.avatar_url,
        status: dynamicStatus,
        acquisition_channel_id: contact.acquisition_channel_id,
        referrer_contact_id: contact.referrer_contact_id,
        referrer_name: contact.referrer_name,
        notes: contact.notes,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
        acquisition_channel: contact.acquisition_channel ? {
          id: contact.acquisition_channel.id,
          name: contact.acquisition_channel.name,
          color: contact.acquisition_channel.color,
          icon: contact.acquisition_channel.icon
        } : null,
        social_network: contact.social_network ? {
          id: contact.social_network.id,
          name: contact.social_network.name,
          slug: contact.social_network.slug,
          color: contact.social_network.color,
          icon: contact.social_network.icon
        } : null,
        referrer_contact: contact.referrer_contact ? {
          id: contact.referrer_contact.id,
          name: contact.referrer_contact.name,
          phone: contact.referrer_contact.phone
        } : null
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        contacts: mappedContacts,
        total,
        page,
        limit,
        totalPages
      }
    };
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Obtener un contacto por ID
 */
export async function getContactById(
  studioSlug: string,
  contactId: string
): Promise<ContactResponse> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const contact = await prisma.studio_contacts.findFirst({
      where: {
        id: contactId,
        studio_id: studio.id
      },
      include: {
        acquisition_channel: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        },
        social_network: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true
          }
        },
        referrer_contact: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    if (!contact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    const mappedContact: Contact = {
      id: contact.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      avatar_url: contact.avatar_url,
      status: contact.status,
      acquisition_channel_id: contact.acquisition_channel_id,
      social_network_id: contact.social_network_id,
      referrer_contact_id: contact.referrer_contact_id,
      referrer_name: contact.referrer_name,
      notes: contact.notes,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      acquisition_channel: contact.acquisition_channel ? {
        id: contact.acquisition_channel.id,
        name: contact.acquisition_channel.name,
        color: contact.acquisition_channel.color,
        icon: contact.acquisition_channel.icon
      } : null,
      social_network: contact.social_network ? {
        id: contact.social_network.id,
        name: contact.social_network.name,
        slug: contact.social_network.slug,
        color: contact.social_network.color,
        icon: contact.social_network.icon
      } : null,
      referrer_contact: contact.referrer_contact ? {
        id: contact.referrer_contact.id,
        name: contact.referrer_contact.name,
        phone: contact.referrer_contact.phone
      } : null
    };

    return { success: true, data: mappedContact };
  } catch (error) {
    console.error('Error al obtener contacto:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Crear nuevo contacto
 */
export async function createContact(
  studioSlug: string,
  data: CreateContactData
): Promise<ContactResponse> {
  try {
    let validatedData;
    try {
      validatedData = createContactSchema.parse(data);
    } catch (error: any) {
      if (error.errors) {
        return { 
          success: false, 
          error: JSON.stringify(error.errors) 
        };
      }
      return { 
        success: false, 
        error: error.message || 'Error de validación' 
      };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el teléfono no exista (único por studio)
    const existingContactByPhone = await prisma.studio_contacts.findFirst({
      where: {
        studio_id: studio.id,
        phone: validatedData.phone
      }
    });

    if (existingContactByPhone) {
      return { success: false, error: 'Ya existe un contacto con este teléfono' };
    }

    // Verificar que el email no exista si se proporciona (único por studio)
    if (validatedData.email && validatedData.email.trim()) {
      const existingContactByEmail = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          email: validatedData.email
        }
      });

      if (existingContactByEmail) {
        return { success: false, error: 'Ya existe un contacto con este email' };
      }
    }

    const contact = await prisma.studio_contacts.create({
      data: {
        studio_id: studio.id,
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        address: validatedData.address || null,
        avatar_url: validatedData.avatar_url || null,
        status: validatedData.status,
        acquisition_channel_id: validatedData.acquisition_channel_id || null,
        social_network_id: validatedData.social_network_id || null,
        referrer_contact_id: validatedData.referrer_contact_id || null,
        referrer_name: validatedData.referrer_name || null,
        notes: validatedData.notes || null
      },
      include: {
        acquisition_channel: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        },
        referrer_contact: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    const mappedContact: Contact = {
      id: contact.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      avatar_url: contact.avatar_url,
      status: contact.status,
      acquisition_channel_id: contact.acquisition_channel_id,
      referrer_contact_id: contact.referrer_contact_id,
      referrer_name: contact.referrer_name,
      notes: contact.notes,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      acquisition_channel: contact.acquisition_channel ? {
        id: contact.acquisition_channel.id,
        name: contact.acquisition_channel.name,
        color: contact.acquisition_channel.color,
        icon: contact.acquisition_channel.icon
      } : null,
      referrer_contact: contact.referrer_contact ? {
        id: contact.referrer_contact.id,
        name: contact.referrer_contact.name,
        phone: contact.referrer_contact.phone
      } : null
    };

    revalidatePath(`/${studioSlug}/studio/builder/review_and_delete`);
    return { success: true, data: mappedContact };
  } catch (error) {
    console.error('Error al crear contacto:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Actualizar contacto
 */
export async function updateContact(
  studioSlug: string,
  data: UpdateContactData
): Promise<ContactResponse> {
  try {
    let validatedData;
    try {
      validatedData = updateContactSchema.parse(data);
    } catch (error: any) {
      if (error.errors) {
        return { 
          success: false, 
          error: JSON.stringify(error.errors) 
        };
      }
      return { 
        success: false, 
        error: error.message || 'Error de validación' 
      };
    }

    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    // Verificar que el contacto existe y pertenece al studio
    const existingContact = await prisma.studio_contacts.findFirst({
      where: {
        id: validatedData.id,
        studio_id: studio.id
      }
    });

    if (!existingContact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    // Si se actualiza el teléfono, verificar que no exista otro contacto con ese teléfono
    if (validatedData.phone && validatedData.phone !== existingContact.phone) {
      const phoneExists = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          phone: validatedData.phone,
          id: { not: validatedData.id }
        }
      });

      if (phoneExists) {
        return { success: false, error: 'Ya existe un contacto con este teléfono' };
      }
    }

    // Si se actualiza el email, verificar que no exista otro contacto con ese email
    if (validatedData.email && validatedData.email.trim() && validatedData.email !== existingContact.email) {
      const emailExists = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          email: validatedData.email,
          id: { not: validatedData.id }
        }
      });

      if (emailExists) {
        return { success: false, error: 'Ya existe un contacto con este email' };
      }
    }

    // Construir objeto de actualización solo con campos presentes
    // Si acquisition_channel_id es undefined, se establece explícitamente como null para limpiar
    const updateData: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.email !== undefined) updateData.email = validatedData.email || null;
    if (validatedData.address !== undefined) updateData.address = validatedData.address || null;
    if (validatedData.avatar_url !== undefined) updateData.avatar_url = validatedData.avatar_url || null;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    // Manejar explícitamente cuando se quiere limpiar (undefined) vs mantener valor
    if ('acquisition_channel_id' in validatedData) {
      updateData.acquisition_channel_id = validatedData.acquisition_channel_id || null;
    }
    if ('social_network_id' in validatedData) {
      updateData.social_network_id = validatedData.social_network_id || null;
    }
    if ('referrer_contact_id' in validatedData) {
      updateData.referrer_contact_id = validatedData.referrer_contact_id || null;
    }
    if (validatedData.referrer_name !== undefined) updateData.referrer_name = validatedData.referrer_name || null;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes || null;

    const contact = await prisma.studio_contacts.update({
      where: { id: validatedData.id },
      data: updateData,
      include: {
        acquisition_channel: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        },
        social_network: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true
          }
        },
        referrer_contact: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    const mappedContact: Contact = {
      id: contact.id,
      studio_id: contact.studio_id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      avatar_url: contact.avatar_url,
      status: contact.status,
      acquisition_channel_id: contact.acquisition_channel_id,
      social_network_id: contact.social_network_id,
      referrer_contact_id: contact.referrer_contact_id,
      referrer_name: contact.referrer_name,
      notes: contact.notes,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      acquisition_channel: contact.acquisition_channel ? {
        id: contact.acquisition_channel.id,
        name: contact.acquisition_channel.name,
        color: contact.acquisition_channel.color,
        icon: contact.acquisition_channel.icon
      } : null,
      social_network: contact.social_network ? {
        id: contact.social_network.id,
        name: contact.social_network.name,
        slug: contact.social_network.slug,
        color: contact.social_network.color,
        icon: contact.social_network.icon
      } : null,
      referrer_contact: contact.referrer_contact ? {
        id: contact.referrer_contact.id,
        name: contact.referrer_contact.name,
        phone: contact.referrer_contact.phone
      } : null
    };

    revalidatePath(`/${studioSlug}/studio/builder/review_and_delete`);
    return { success: true, data: mappedContact };
  } catch (error) {
    console.error('Error al actualizar contacto:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Eliminar contacto
 */
export async function deleteContact(
  studioSlug: string,
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado' };
    }

    const contact = await prisma.studio_contacts.findFirst({
      where: {
        id: contactId,
        studio_id: studio.id
      }
    });

    if (!contact) {
      return { success: false, error: 'Contacto no encontrado' };
    }

    await prisma.studio_contacts.delete({
      where: { id: contactId }
    });

    revalidatePath(`/${studioSlug}/studio/builder/review_and_delete`);
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar contacto:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Obtener canales de adquisición activos
 */
export async function getAcquisitionChannels() {
  try {
    const channels = await prisma.platform_acquisition_channels.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true
      },
      orderBy: { order: 'asc' }
    });

    return { success: true, data: channels };
  } catch (error) {
    console.error('Error al obtener canales:', error);
    return { success: false, error: 'Error interno del servidor', data: [] };
  }
}

/**
 * Obtener redes sociales activas
 */
export async function getSocialNetworks() {
  try {
    const networks = await prisma.platform_social_networks.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        icon: true
      },
      orderBy: { order: 'asc' }
    });

    return { success: true, data: networks };
  } catch (error) {
    console.error('Error al obtener redes sociales:', error);
    return { success: false, error: 'Error interno del servidor', data: [] };
  }
}

/**
 * Obtener eventos asociados a un contacto (a través de cotizaciones)
 */
export async function getContactEvents(studioSlug: string, contactId: string) {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado', data: [] };
    }

    // Obtener todas las cotizaciones del contacto
    const cotizaciones = await prisma.studio_cotizaciones.findMany({
      where: {
        studio_id: studio.id,
        contact_id: contactId
      },
      select: {
        evento_id: true
      }
    });

    // Extraer IDs únicos de eventos
    const eventoIds = Array.from(new Set(cotizaciones.map(c => c.evento_id).filter((id): id is string => id !== null)));

    if (eventoIds.length === 0) {
      return { success: true, data: [] };
    }

    // Obtener eventos con información relevante
    const eventos = await prisma.studio_events.findMany({
      where: {
        id: { in: eventoIds },
        studio_id: studio.id
      },
      select: {
        id: true,
        name: true,
        event_date: true,
        status: true,
        event_type: {
          select: {
            id: true,
            name: true
          }
        },
        cotizaciones: {
          where: {
            contact_id: contactId
          },
          select: {
            id: true,
            status: true,
            name: true
          },
          take: 1,
          orderBy: { created_at: 'desc' }
        }
      },
      orderBy: { event_date: 'desc' }
    });

    // Mapear a formato simplificado
    const mappedEvents = eventos.map(evento => ({
      id: evento.id,
      name: evento.name || 'Sin nombre',
      event_date: evento.event_date,
      status: evento.status,
      event_type: evento.event_type?.name || null,
      cotizacion: evento.cotizaciones[0] ? {
        id: evento.cotizaciones[0].id,
        status: evento.cotizaciones[0].status,
        name: evento.cotizaciones[0].name
      } : null
    }));

    return { success: true, data: mappedEvents };
  } catch (error) {
    console.error('Error al obtener eventos del contacto:', error);
    return { success: false, error: 'Error interno del servidor', data: [] };
  }
}

/**
 * Verificar si un contacto tiene promesas o eventos asociados
 */
export async function checkContactAssociations(
  studioSlug: string,
  contactId: string
): Promise<{ 
  success: boolean; 
  hasAssociations: boolean; 
  hasPromises: boolean; 
  hasEvents: boolean;
  error?: string 
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { 
        success: false, 
        hasAssociations: false, 
        hasPromises: false, 
        hasEvents: false,
        error: 'Studio no encontrado' 
      };
    }

    // Verificar eventos (a través de cotizaciones aprobadas que generan eventos)
    const cotizacionesAprobadas = await prisma.studio_cotizaciones.findMany({
      where: {
        studio_id: studio.id,
        contact_id: contactId,
        status: 'aprobada',
        evento_id: { not: null }
      },
      select: {
        evento_id: true
      },
      distinct: ['evento_id']
    });

    // Verificar promesas sin cotizaciones aprobadas (promesas no aprobadas)
    const promesas = await prisma.studio_promises.findMany({
      where: {
        studio_id: studio.id,
        contact_id: contactId
      },
      select: {
        id: true,
        quotes: {
          where: {
            status: 'aprobada'
          },
          take: 1
        }
      }
    });

    // Promesas sin cotizaciones aprobadas (no tienen eventos asociados)
    const promesasNoAprobadas = promesas.filter(p => p.quotes.length === 0);

    const hasEvents = cotizacionesAprobadas.length > 0;
    const hasPromises = promesasNoAprobadas.length > 0;
    const hasAssociations = hasPromises || hasEvents;

    return {
      success: true,
      hasAssociations,
      hasPromises,
      hasEvents
    };
  } catch (error) {
    console.error('Error al verificar asociaciones del contacto:', error);
    return {
      success: false,
      hasAssociations: false,
      hasPromises: false,
      hasEvents: false,
      error: 'Error interno del servidor'
    };
  }
}

/**
 * Obtener promesas asociadas a un contacto
 */
export async function getContactPromises(
  studioSlug: string,
  contactId: string
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    event_type_name: string | null;
    pipeline_stage_name: string | null;
    created_at: Date;
    has_approved_quote: boolean;
  }>;
  error?: string;
}> {
  try {
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { id: true }
    });

    if (!studio) {
      return { success: false, error: 'Studio no encontrado', data: [] };
    }

    const promises = await prisma.studio_promises.findMany({
      where: {
        studio_id: studio.id,
        contact_id: contactId
      },
      select: {
        id: true,
        event_type: {
          select: {
            name: true
          }
        },
        pipeline_stage: {
          select: {
            name: true
          }
        },
        created_at: true,
        quotes: {
          select: {
            id: true,
            status: true
          },
          where: {
            status: 'aprobada'
          },
          take: 1
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const mappedPromises = promises.map(promise => ({
      id: promise.id,
      event_type_name: promise.event_type?.name || null,
      pipeline_stage_name: promise.pipeline_stage?.name || null,
      created_at: promise.created_at,
      has_approved_quote: promise.quotes.length > 0
    }));

    return { success: true, data: mappedPromises };
  } catch (error) {
    console.error('Error al obtener promesas del contacto:', error);
    return { success: false, error: 'Error interno del servidor', data: [] };
  }
}

