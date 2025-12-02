"use server";

import { prisma } from "@/lib/prisma";
import { retryDatabaseOperation } from "@/lib/actions/utils/database-retry";
import {
  SubmitLeadFormSchema,
  type SubmitLeadFormData,
} from "@/lib/actions/schemas/offer-schemas";
import type { SubmitLeadFormResponse } from "@/types/offers";
import { headers } from "next/headers";

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

      // Verificar que la oferta existe y está activa
      const offer = await prisma.studio_offers.findFirst({
        where: {
          id: validatedData.offer_id,
          studio_id: studio.id,
          is_active: true,
        },
        include: {
          leadform: true,
        },
      });

      if (!offer) {
        return { success: false, error: "Oferta no encontrada o inactiva" };
      }

      if (!offer.leadform) {
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
      let visitId: string | null = null;
      if (validatedData.session_id) {
        const existingVisit = await prisma.studio_offer_visits.findFirst({
          where: {
            offer_id: validatedData.offer_id,
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
            offer_id: validatedData.offer_id,
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
        },
        create: {
          studio_id: studio.id,
          name: validatedData.name,
          phone: validatedData.phone,
          email: validatedData.email || null,
          status: "prospecto",
          acquisition_channel_id: leadformChannel?.id || null,
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
      const promise = await prisma.studio_promises.create({
        data: {
          studio_id: studio.id,
          contact_id: contact.id,
          pipeline_stage_id: nuevoStage?.id || null,
          status: "pending",
        },
      });

      // Preparar datos del formulario para guardar
      const formData: Record<string, unknown> = {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        ...(validatedData.custom_fields || {}),
      };

      // Crear submission
      const submission = await prisma.studio_offer_submissions.create({
        data: {
          offer_id: validatedData.offer_id,
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

      // Determinar URL de redirección
      const redirectUrl =
        offer.leadform.success_redirect_url ||
        `/${studioSlug}/offer/${offer.slug}/leadform?success=true`;

      return {
        success: true,
        data: {
          submission_id: submission.id,
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
