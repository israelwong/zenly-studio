"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/types";
import { 
  ConfirmClientDataSchema, 
  SignContractSchema,
  type ConfirmClientDataInput,
  type SignContractInput
} from "@/lib/actions/schemas/client-contract-schemas";
import { revalidatePath, revalidateTag } from "next/cache";
import { generateEventContract } from "@/lib/actions/studio/business/contracts/contracts.actions";
import { getDefaultContractTemplate } from "@/lib/actions/studio/business/contracts/templates.actions";

/**
 * Confirmar datos del cliente y generar contrato automáticamente
 * 
 * Flujo:
 * 1. Validar y actualizar datos del contacto
 * 2. Registrar timestamp e IP de confirmación
 * 3. Verificar si el studio tiene auto_generate_contract = true
 * 4. Si es true, generar contrato automáticamente desde plantilla default
 * 5. Actualizar status de cotización a "contract_generated"
 * 6. Notificar al cliente que el contrato está listo
 */
export async function confirmClientDataAndGenerateContract(
  studioSlug: string,
  promiseId: string,
  data: unknown
): Promise<ActionResponse<{ contract_id?: string; auto_generated: boolean }>> {
  try {
    const validated = ConfirmClientDataSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { 
        id: true,
        config: {
          select: {
            auto_generate_contract: true,
            require_contract_before_event: true,
          }
        }
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar que el contacto pertenece al studio
    const contact = await prisma.studio_contacts.findFirst({
      where: {
        id: validated.contact_id,
        studio_id: studio.id,
      },
    });

    if (!contact) {
      return { success: false, error: "Contacto no encontrado" };
    }

    // Obtener promise y cotización autorizada
    const promise = await prisma.studio_promises.findFirst({
      where: {
        id: promiseId,
        studio_id: studio.id,
        contact_id: validated.contact_id,
      },
      include: {
        cotizaciones: {
          where: {
            status: {
              in: ["preautorizada", "contract_pending"]
            }
          },
          orderBy: {
            updated_at: "desc"
          },
          take: 1,
        },
        event: {
          select: {
            id: true,
          }
        }
      }
    });

    if (!promise) {
      return { success: false, error: "Promesa no encontrada" };
    }

    if (!promise.cotizaciones || promise.cotizaciones.length === 0) {
      return { success: false, error: "No hay cotización autorizada para esta promesa" };
    }

    const cotizacion = promise.cotizaciones[0];

    // Actualizar datos del contacto con confirmación
    await prisma.studio_contacts.update({
      where: { id: validated.contact_id },
      data: {
        name: validated.name,
        phone: validated.phone,
        email: validated.email,
        address: validated.address,
        data_confirmed_at: new Date(),
        data_confirmed_ip: validated.ip_address,
        status: "cliente", // Convertir a cliente
      },
    });

    // Verificar si debe generar contrato automáticamente
    const autoGenerate = studio.config?.auto_generate_contract ?? false;
    let contractId: string | undefined;

    if (autoGenerate) {
      // Verificar que existe evento asociado
      if (!promise.event) {
        return { 
          success: false, 
          error: "No se puede generar contrato sin evento asociado. Contacte al studio." 
        };
      }

      // Verificar que existe plantilla default
      const defaultTemplate = await getDefaultContractTemplate(studio.id);
      if (!defaultTemplate) {
        return { 
          success: false, 
          error: "El studio no tiene una plantilla de contrato por defecto configurada. Contacte al studio." 
        };
      }

      // Generar contrato automáticamente
      const contractResult = await generateEventContract(studioSlug, {
        event_id: promise.event.id,
      });

      if (!contractResult.success || !contractResult.data) {
        return { 
          success: false, 
          error: contractResult.error || "Error al generar contrato automáticamente" 
        };
      }

      contractId = contractResult.data.id;

      // Publicar contrato inmediatamente para que el cliente lo vea
      await prisma.studio_event_contracts.update({
        where: { id: contractId },
        data: { status: "PUBLISHED" },
      });

      // Actualizar status de cotización a "contract_generated"
      await prisma.studio_cotizaciones.update({
        where: { id: cotizacion.id },
        data: { status: "contract_generated" },
      });
    } else {
      // Actualizar status de cotización a "contract_pending"
      await prisma.studio_cotizaciones.update({
        where: { id: cotizacion.id },
        data: { status: "contract_pending" },
      });
    }

    // Revalidar rutas
    revalidatePath(`/${studioSlug}/cliente/${validated.contact_id}`);
    revalidatePath(`/${studioSlug}/studio/commercial/promises/${promiseId}`);

    return { 
      success: true, 
      data: { 
        contract_id: contractId,
        auto_generated: autoGenerate 
      } 
    };
  } catch (error) {
    console.error("Error al confirmar datos y generar contrato:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al confirmar datos" };
  }
}

/**
 * Firmar contrato por el cliente
 * 
 * Flujo:
 * 1. Validar que el contrato existe y está en estado PUBLISHED
 * 2. Actualizar status a SIGNED con timestamp e IP
 * 3. Actualizar status de cotización a "contract_signed"
 * 4. Si require_contract_before_event = true, el studio debe autorizar evento manualmente
 * 5. Si false, crear evento automáticamente
 */
export async function signContract(
  studioSlug: string,
  contactId: string,
  data: unknown
): Promise<ActionResponse<{ event_created: boolean }>> {
  try {
    const validated = SignContractSchema.parse(data);

    // Obtener studio
    const studio = await prisma.studios.findUnique({
      where: { slug: studioSlug },
      select: { 
        id: true,
        config: {
          select: {
            require_contract_before_event: true,
          }
        }
      },
    });

    if (!studio) {
      return { success: false, error: "Studio no encontrado" };
    }

    // Verificar que el contrato existe y pertenece al contacto
    const contract = await prisma.studio_event_contracts.findFirst({
      where: {
        id: validated.contract_id,
        studio_id: studio.id,
        event: {
          contact_id: contactId,
        }
      },
      include: {
        event: {
          include: {
            cotizacion: true,
          }
        }
      }
    });

    if (!contract) {
      return { success: false, error: "Contrato no encontrado" };
    }

    if (contract.status !== "PUBLISHED") {
      return { success: false, error: "El contrato no está disponible para firma" };
    }

    if (contract.signed_at) {
      return { success: false, error: "El contrato ya fue firmado" };
    }

    // Firmar contrato
    await prisma.studio_event_contracts.update({
      where: { id: validated.contract_id },
      data: {
        status: "SIGNED",
        signed_at: new Date(),
        signed_ip: validated.ip_address,
      },
    });

    // Actualizar status de cotización
    if (contract.event.cotizacion) {
      await prisma.studio_cotizaciones.update({
        where: { id: contract.event.cotizacion.id },
        data: { status: "contract_signed" },
      });
    }

    // Revalidar rutas
    revalidatePath(`/${studioSlug}/cliente/${contactId}`);
    if (contract.event.promise_id) {
      revalidatePath(`/${studioSlug}/studio/commercial/promises/${contract.event.promise_id}`);
    }
    
    // Invalidar caché del cliente
    const eventId = contract.event.id;
    const promiseId = contract.event.promise_id;
    if (promiseId) {
      revalidateTag(`cliente-dashboard-${eventId}-${contactId}`);
      revalidateTag(`cliente-evento-${promiseId}-${contactId}`);
    }

    return { 
      success: true, 
      data: { 
        event_created: false // El evento ya existe, solo falta autorización del studio
      } 
    };
  } catch (error) {
    console.error("Error al firmar contrato:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al firmar contrato" };
  }
}

