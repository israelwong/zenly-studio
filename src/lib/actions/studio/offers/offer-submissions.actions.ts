"use server";

import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import {
  SubmitLeadFormSchema,
  type SubmitLeadFormData,
} from "@/lib/actions/schemas/offer-schemas";
import type { SubmitLeadFormResponse } from "@/types/offers";
import { headers } from "next/headers";
import { notifyPromiseCreated } from "@/lib/notifications/studio/helpers/promise-notifications";

/**
 * Validar teléfono antes de submit
 * Retorna info del contacto existente si lo encuentra
 */
/**
 * Valida que el email no esté registrado con otro teléfono
 */
export async function validateEmailBeforeSubmit(
  studioSlug: string,
  email: string,
  phone: string
): Promise<{
  success: boolean;
  conflict?: {
    type: 'email_different_phone';
    existingPhone?: string;
  };
}> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false };
      }

      // Buscar contacto con este email
      const existingContact = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          email: email,
        },
        select: {
          id: true,
          phone: true,
        },
      });

      if (!existingContact) {
        // No existe, puede proceder
        return { success: true };
      }

      // Existe el email, verificar teléfono
      if (existingContact.phone && existingContact.phone !== phone) {
        // Email existe pero con teléfono diferente
        return {
          success: false,
          conflict: {
            type: 'email_different_phone',
            existingPhone: existingContact.phone,
          },
        };
      }

      // Email y teléfono coinciden: puede proceder
      return { success: true };
    });
  } catch (error) {
    console.error("[validateEmailBeforeSubmit] Error:", error);
    return { success: true }; // En caso de error, permitir continuar
  }
}

/**
 * Valida que el teléfono no esté registrado con otro email
 * y que no sea una solicitud duplicada para la misma fecha
 */
export async function validatePhoneBeforeSubmit(
  studioSlug: string,
  phone: string,
  email?: string,
  interestDate?: string
): Promise<{
  success: boolean;
  conflict?: {
    type: 'phone_different_email' | 'duplicate_request';
    existingEmail?: string;
    existingDate?: string;
  };
}> {
  try {
    return await retryDatabaseOperation(async () => {
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false };
      }

      // Buscar contacto con este teléfono
      const existingContact = await prisma.studio_contacts.findFirst({
        where: {
          studio_id: studio.id,
          phone: phone,
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (!existingContact) {
        // No existe, puede proceder
        return { success: true };
      }

      // Existe el teléfono, verificar email
      if (email && existingContact.email && existingContact.email !== email) {
        // Teléfono existe pero con email diferente
        return {
          success: false,
          conflict: {
            type: 'phone_different_email',
            existingEmail: existingContact.email,
          },
        };
      }

      // Teléfono y email coinciden (o no hay email), verificar fecha
      if (interestDate) {
        const existingPromise = await prisma.studio_promises.findFirst({
          where: {
            contact_id: existingContact.id,
            event_date: new Date(interestDate),
          },
          select: {
            event_date: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        });

        if (existingPromise) {
          // Ya solicitó info para esta fecha
          return {
            success: false,
            conflict: {
              type: 'duplicate_request',
              existingDate: interestDate,
            },
          };
        }
      }

      // Teléfono y email coinciden, fecha diferente o sin fecha: puede proceder
      return { success: true };
    });
  } catch (error) {
    console.error("[validatePhoneBeforeSubmit] Error:", error);
    return { success: true }; // En caso de error, permitir continuar
  }
}

/**
 * Enviar leadform y crear contacto + promise
 */
export async function submitOfferLeadform(
  studioSlug: string,
  data: SubmitLeadFormData
): Promise<SubmitLeadFormResponse> {
  try {
    const validatedData = SubmitLeadFormSchema.parse(data);

    return await retryDatabaseOperation(async () => {
      // Obtener estudio por slug
      const studio = await prisma.studios.findUnique({
        where: { slug: studioSlug },
        select: { id: true },
      });

      if (!studio) {
        return { success: false, error: "Estudio no encontrado" };
      }

      // ✅ Verificar límite de promesas de prueba (máximo 2)
      const isTest = validatedData.is_test ?? false;
      if (isTest) {
        const testCount = await prisma.studio_promises.count({
          where: {
            studio_id: studio.id,
            is_test: true,
          },
        });

        if (testCount >= 2) {
          return {
            success: false,
            error: "Límite de pruebas alcanzado (máx. 2). Elimina las promesas de prueba existentes desde el CRM antes de crear nuevas.",
          };
        }
      }

      // Verificar que la oferta existe y está activa
      // En preview, offer_id puede ser "preview" - validar solo en producción
      const offer = await prisma.studio_offers.findFirst({
        where: {
          id: validatedData.offer_id,
          studio_id: studio.id,
          ...(isTest ? {} : { is_active: true }), // En test no validar is_active
        },
        include: {
          leadform: true,
        },
      });

      if (!offer && !isTest) {
        // Solo fallar si NO es test (en test, offer puede no existir aún)
        return { success: false, error: "Oferta no encontrada o inactiva" };
      }

      if (offer && !offer.leadform && !isTest) {
        return { success: false, error: "Leadform no configurado" };
      }

      // Obtener información del request
      const headersList = await headers();
      const ipAddress =
        headersList.get("x-forwarded-for")?.split(",")[0] ||
        headersList.get("x-real-ip") ||
        null;
      const userAgent = headersList.get("user-agent") || null;

      // Buscar o crear visita de tipo 'leadform' para esta sesión
      // Solo en producción (no en preview/test) y si la oferta existe
      let visitId: string | null = null;
      if (!isTest && offer) {
        if (validatedData.session_id) {
          const existingVisit = await prisma.studio_offer_visits.findFirst({
            where: {
              offer_id: offer.id,
              session_id: validatedData.session_id,
              visit_type: "leadform",
            },
            orderBy: {
              created_at: "desc",
            },
          });
          visitId = existingVisit?.id || null;
        }

        // Si no hay visita, crear una nueva
        if (!visitId) {
          const newVisit = await prisma.studio_offer_visits.create({
            data: {
              offer_id: offer.id,
              visit_type: "leadform",
              ip_address: ipAddress,
              user_agent: userAgent,
              utm_source: validatedData.utm_source || null,
              utm_medium: validatedData.utm_medium || null,
              utm_campaign: validatedData.utm_campaign || null,
              session_id: validatedData.session_id || null,
            },
          });
          visitId = newVisit.id;
        }
      }

      // Obtener canal de adquisición "Leadform"
      const leadformChannel = await prisma.platform_acquisition_channels.findFirst({
        where: {
          name: "Leadform",
          is_active: true,
        },
      });

      if (!leadformChannel) {
        console.warn(
          "[submitOfferLeadform] Canal 'Leadform' no encontrado, creando..."
        );
        // Crear canal si no existe (no debería pasar si el seed está correcto)
        const newChannel = await prisma.platform_acquisition_channels.create({
          data: {
            name: "Leadform",
            description: "Leads capturados desde formularios de ofertas comerciales",
            color: "#EC4899",
            icon: "file-text",
            order: 5,
            is_active: true,
            is_visible: true,
          },
        });
        // Usar el nuevo canal
        const channelId = newChannel.id;
      }

      // Timestamp para datos de prueba
      const testTimestamp = isTest ? new Date() : null;

      // Crear o actualizar contacto
      const contact = await prisma.studio_contacts.upsert({
        where: {
          studio_id_phone: {
            studio_id: studio.id,
            phone: validatedData.phone,
          },
        },
        update: {
          name: validatedData.name,
          email: validatedData.email || null,
          status: "prospecto",
          acquisition_channel_id: leadformChannel?.id || null,
          // ✅ Actualizar flags de prueba solo si es prueba
          ...(isTest && {
            is_test: true,
            test_created_at: testTimestamp,
          }),
        },
        create: {
          studio_id: studio.id,
          name: validatedData.name,
          phone: validatedData.phone,
          email: validatedData.email || null,
          status: "prospecto",
          acquisition_channel_id: leadformChannel?.id || null,
          // ✅ Marcar como prueba si aplica
          is_test: isTest,
          test_created_at: testTimestamp,
        },
      });

      // Obtener etapa "nuevo" (pending) del pipeline de promises
      const nuevoStage = await prisma.studio_promise_pipeline_stages.findFirst({
        where: {
          studio_id: studio.id,
          slug: "pending",
          is_active: true,
        },
        select: { id: true },
      });

      // Crear promise asociada
      // Parsear fecha de forma segura (sin cambios por zona horaria)
      let eventDate: Date | null = null;
      if (validatedData.interest_date) {
        // Si es formato YYYY-MM-DD, parsear como fecha local
        const dateMatch = validatedData.interest_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
          eventDate = new Date(validatedData.interest_date);
        }
      }

      const promise = await prisma.studio_promises.create({
        data: {
          studio_id: studio.id,
          contact_id: contact.id,
          offer_id: offer?.id || null, // ✅ Asociar con oferta (null si es preview sin oferta creada)
          pipeline_stage_id: nuevoStage?.id || null,
          status: "pending",
          event_type_id: validatedData.event_type_id || null,
          event_date: eventDate, // ✅ Guardar como event_date (parseado de forma segura)
          // ✅ Marcar como prueba si aplica
          is_test: isTest,
          test_created_at: testTimestamp,
        },
      });

      // ✅ Obtener nombre del tipo de evento si existe
      let eventTypeName: string | null = null;
      if (validatedData.event_type_id) {
        const eventType = await prisma.studio_event_types.findUnique({
          where: { id: validatedData.event_type_id },
          select: { name: true },
        });
        eventTypeName = eventType?.name || null;
      }

      // ✅ Crear notificación de nueva promesa (incluyendo pruebas con badge especial)
      try {
        await notifyPromiseCreated(
          studio.id,
          promise.id,
          validatedData.name,
          eventTypeName,
          validatedData.interest_date || null,
          isTest // ← Pasar flag para diferenciar en notificación
        );
      } catch (notifError) {
        console.error("[submitOfferLeadform] Error creando notificación:", notifError);
        // No fallar el submit si falla la notificación
      }

      // Preparar datos del formulario para guardar
      const formData: Record<string, unknown> = {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        interest_date: validatedData.interest_date || null, // ✅ NUEVO
        event_type_id: validatedData.event_type_id || null, // ✅ NUEVO
        subject: validatedData.subject || null, // ✅ LEGACY
        ...(validatedData.custom_fields || {}),
      };

      // Crear submission (solo si hay oferta real)
      let submission = null;
      if (offer) {
        submission = await prisma.studio_offer_submissions.create({
          data: {
            offer_id: offer.id,
            contact_id: contact.id,
            visit_id: visitId,
            form_data: formData,
            ip_address: ipAddress,
            user_agent: userAgent,
            utm_source: validatedData.utm_source || null,
            utm_medium: validatedData.utm_medium || null,
            utm_campaign: validatedData.utm_campaign || null,
          },
        });
      }

      // Determinar URL de redirección
      const redirectUrl = isTest
        ? null // Preview no redirige
        : (offer?.leadform?.success_redirect_url ||
          (offer ? `/${studioSlug}/offer/${offer.slug}/leadform?success=true` : null));

      return {
        success: true,
        data: {
          submission_id: submission?.id || null,
          contact_id: contact.id,
          promise_id: promise.id,
          redirect_url: redirectUrl,
        },
      };
    });
  } catch (error) {
    console.error("[submitOfferLeadform] Error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al enviar el formulario" };
  }
}
