"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { APP_CONFIG } from "@/lib/actions/constants/config";
import { z } from "zod";

const BUCKET_MEDIA = "media";
const MEDIA_TYPE_LOCATION = "LOCATION";

// ---- Schemas ----
const CreateLocationSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  address: z.string().optional(),
  maps_link: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  permit_cost: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ---- CRUD ----
export async function getLocations(
  studioId: string,
  filters?: { tag?: string }
): Promise<{ success: boolean; data?: Array<{ id: string; name: string; address: string | null; maps_link: string | null; phone: string | null; permit_cost: string | null; tags: string[] }>; error?: string }> {
  try {
    const where: { studio_id: string; tags?: { has: string } } = { studio_id: studioId };
    if (filters?.tag) where.tags = { has: filters.tag };
    const list = await prisma.studio_locations.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true, maps_link: true, phone: true, permit_cost: true, tags: true },
    });
    return { success: true, data: list };
  } catch (e) {
    console.error("getLocations:", e);
    return { success: false, error: "Error al listar locaciones" };
  }
}

/** Resuelve studio por slug y devuelve locaciones (para UI que solo tiene slug). */
export async function getLocationsByStudioSlug(
  studioSlug: string,
  filters?: { tag?: string }
): Promise<{ success: boolean; data?: Array<{ id: string; name: string; address: string | null; maps_link: string | null; phone: string | null; permit_cost: string | null; tags: string[] }>; error?: string }> {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });
  if (!studio) return { success: false, error: "Studio no encontrado" };
  return getLocations(studio.id, filters);
}

export async function getLocationById(
  locationId: string
): Promise<{ success: boolean; data?: { id: string; name: string; address: string | null; maps_link: string | null; phone: string | null; permit_cost: string | null; tags: string[] }; error?: string }> {
  try {
    const loc = await prisma.studio_locations.findUnique({
      where: { id: locationId },
      select: { id: true, name: true, address: true, maps_link: true, phone: true, permit_cost: true, tags: true },
    });
    if (!loc) return { success: false, error: "Locación no encontrada" };
    return { success: true, data: loc };
  } catch (e) {
    console.error("getLocationById:", e);
    return { success: false, error: "Error al obtener locación" };
  }
}

// ---- Crear locación (modal completo: nombre, dirección, link, teléfono) ----
export async function createQuickLocation(
  studioId: string,
  data: unknown
): Promise<{ success: boolean; data?: { id: string; name: string; address: string | null; maps_link: string | null; phone: string | null; permit_cost: string | null; tags: string[] }; error?: string }> {
  try {
    const parsed = CreateLocationSchema.parse(data);
    const cleanMaps = parsed.maps_link === "" ? null : parsed.maps_link ?? null;
    const tags = Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : ["SESSION"];
    const location = await prisma.studio_locations.create({
      data: {
        studio_id: studioId,
        name: parsed.name.trim(),
        address: parsed.address?.trim() || null,
        maps_link: cleanMaps,
        phone: parsed.phone?.trim() || null,
        permit_cost: parsed.permit_cost?.trim() || null,
        tags,
      },
      select: { id: true, name: true, address: true, maps_link: true, phone: true, permit_cost: true, tags: true },
    });
    return { success: true, data: { ...location } };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.errors.map((x) => x.message).join("; ");
      return { success: false, error: msg };
    }
    console.error("createQuickLocation:", e);
    return { success: false, error: "Error al crear locación" };
  }
}

/** Crea locación por slug (para UI que solo tiene studioSlug). Acepta nombre, dirección, maps_link, phone. */
export async function createQuickLocationByStudioSlug(
  studioSlug: string,
  data: unknown
): Promise<{ success: boolean; data?: { id: string; name: string; address: string | null; maps_link: string | null; phone: string | null; permit_cost: string | null; tags: string[] }; error?: string }> {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });
  if (!studio) return { success: false, error: "Studio no encontrado" };
  const result = await createQuickLocation(studio.id, data);
  if (result.success) revalidatePath(`/${studioSlug}/studio`, "layout");
  return result;
}

const UpdateLocationSchema = CreateLocationSchema;

export async function updateLocation(
  studioId: string,
  locationId: string,
  data: unknown
): Promise<{ success: boolean; data?: { id: string; name: string; address: string | null; maps_link: string | null; phone: string | null; permit_cost: string | null; tags: string[] }; error?: string }> {
  try {
    const parsed = UpdateLocationSchema.parse(data);
    const cleanMaps = parsed.maps_link === "" ? null : parsed.maps_link ?? null;
    const updateData: Parameters<typeof prisma.studio_locations.update>[0]["data"] = {
      name: parsed.name.trim(),
      address: parsed.address?.trim() || null,
      maps_link: cleanMaps,
      phone: parsed.phone?.trim() || null,
      permit_cost: parsed.permit_cost?.trim() || null,
    };
    if (Array.isArray(parsed.tags)) updateData.tags = parsed.tags;
    const location = await prisma.studio_locations.update({
      where: { id: locationId, studio_id: studioId },
      data: updateData,
      select: { id: true, name: true, address: true, maps_link: true, phone: true, permit_cost: true, tags: true },
    });
    const studio = await prisma.studios.findUnique({ where: { id: studioId }, select: { slug: true } });
    if (studio?.slug) revalidatePath(`/${studio.slug}/studio`, "layout");
    return { success: true, data: location };
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.errors.map((x) => x.message).join("; ");
      return { success: false, error: msg };
    }
    console.error("updateLocation:", e);
    return { success: false, error: "Error al actualizar locación" };
  }
}

export async function updateLocationByStudioSlug(
  studioSlug: string,
  locationId: string,
  data: unknown
): Promise<{ success: boolean; data?: { id: string; name: string; address: string | null; maps_link: string | null; phone: string | null; permit_cost: string | null; tags: string[] }; error?: string }> {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });
  if (!studio) return { success: false, error: "Studio no encontrado" };
  return updateLocation(studio.id, locationId, data);
}

export async function deleteLocation(studioId: string, locationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.studio_locations.delete({
      where: { id: locationId, studio_id: studioId },
    });
    const studio = await prisma.studios.findUnique({ where: { id: studioId }, select: { slug: true } });
    if (studio?.slug) revalidatePath(`/${studio.slug}/studio`, "layout");
    return { success: true };
  } catch (e) {
    console.error("deleteLocation:", e);
    return { success: false, error: "Error al eliminar locación" };
  }
}

export async function deleteLocationByStudioSlug(
  studioSlug: string,
  locationId: string
): Promise<{ success: boolean; error?: string }> {
  const studio = await prisma.studios.findUnique({
    where: { slug: studioSlug },
    select: { id: true },
  });
  if (!studio) return { success: false, error: "Studio no encontrado" };
  return deleteLocation(studio.id, locationId);
}

// ---- Helpers storage (patrón auditoría) ----
async function ensureStorageUsage(studioId: string) {
  let usage = await prisma.studio_storage_usage.findUnique({ where: { studio_id: studioId } });
  if (!usage) {
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      select: { plan_id: true },
    });
    let quotaBytes = 10 * 1024 * 1024 * 1024;
    if (studio?.plan_id) {
      const plan = await prisma.platform_plans.findUnique({
        where: { id: studio.plan_id },
        select: { storage_limit_gb: true },
      });
      if (plan?.storage_limit_gb) quotaBytes = plan.storage_limit_gb * 1024 * 1024 * 1024;
    }
    usage = await prisma.studio_storage_usage.create({
      data: { studio_id: studioId, quota_limit_bytes: quotaBytes, total_storage_bytes: 0 },
    });
  }
  return usage;
}

async function updateLocationStorageUsage(studioId: string, bytes: number, operation: "add" | "remove") {
  await ensureStorageUsage(studioId);
  const delta = operation === "add" ? bytes : -bytes;
  await prisma.studio_storage_usage.update({
    where: { studio_id: studioId },
    data: {
      total_storage_bytes: { increment: delta },
      location_media_bytes: { increment: delta },
      last_calculated_at: new Date(),
    },
  });
}

async function logLocationStorageAction(
  studioId: string,
  action: "UPLOAD" | "DELETE",
  storageBytes: number,
  filename: string
) {
  await prisma.studio_storage_log.create({
    data: {
      studio_id: studioId,
      action,
      media_type: MEDIA_TYPE_LOCATION,
      storage_bytes: storageBytes,
      filename,
    },
  });
}

// ---- Multimedia: upload ----
export async function uploadLocationMedia(
  studioId: string,
  locationId: string,
  file: File
): Promise<{ success: boolean; data?: { id: string; url: string; storage_path: string; display_order: number }; error?: string }> {
  try {
    const supabase = await createClient();
    const isImage = APP_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      return { success: false, error: "Solo imágenes o vídeos" };
    }
    const maxSize = isImage ? APP_CONFIG.MAX_IMAGE_SIZE : APP_CONFIG.MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return { success: false, error: `El archivo no debe superar ${maxMB}MB` };
    }

    const location = await prisma.studio_locations.findFirst({
      where: { id: locationId, studio_id: studioId },
      select: { id: true, studio: { select: { slug: true } } },
    });
    if (!location) return { success: false, error: "Locación no encontrada" };

    const ts = Date.now();
    const fileName = `${ts}-${file.name}`;
    const subdir = isImage ? "images" : "videos";
    const storagePath = `studios/${studioId}/locations/${locationId}/${subdir}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_MEDIA)
      .upload(storagePath, arrayBuffer, { contentType: file.type, cacheControl: "31536000" });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(BUCKET_MEDIA).getPublicUrl(storagePath);

    const lastMedia = await prisma.studio_location_media.findFirst({
      where: { location_id: locationId },
      orderBy: { display_order: "desc" },
      select: { display_order: true },
    });
    const nextOrder = (lastMedia?.display_order ?? 0) + 1;

    const mediaRecord = await prisma.studio_location_media.create({
      data: {
        location_id: locationId,
        studio_id: studioId,
        file_url: urlData.publicUrl,
        file_type: isImage ? "image" : "video",
        filename: file.name,
        storage_bytes: BigInt(file.size),
        mime_type: file.type,
        display_order: nextOrder,
        storage_path: storagePath,
      },
    });

    await updateLocationStorageUsage(studioId, file.size, "add");
    await logLocationStorageAction(studioId, "UPLOAD", file.size, file.name);

    if (location.studio?.slug) {
      revalidatePath(`/${location.studio.slug}/studio`, "layout");
    }
    return {
      success: true,
      data: {
        id: mediaRecord.id,
        url: mediaRecord.file_url,
        storage_path: mediaRecord.storage_path,
        display_order: mediaRecord.display_order,
      },
    };
  } catch (e) {
    console.error("uploadLocationMedia:", e);
    return { success: false, error: e instanceof Error ? e.message : "Error al subir archivo" };
  }
}

// ---- Multimedia: reorder ----
export async function reorderLocationMedia(
  locationId: string,
  mediaIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const count = await prisma.studio_location_media.count({
      where: { id: { in: mediaIds }, location_id: locationId },
    });
    if (count !== mediaIds.length) return { success: false, error: "Algunos IDs no pertenecen a esta locación" };
    const first = await prisma.studio_location_media.findFirst({
      where: { location_id: locationId },
      select: { location: { select: { studio: { select: { slug: true } } } } },
    });
    await Promise.all(
      mediaIds.map((id, index) =>
        prisma.studio_location_media.update({
          where: { id },
          data: { display_order: index },
        })
      )
    );
    if (first?.location.studio.slug) {
      revalidatePath(`/${first.location.studio.slug}/studio`, "layout");
    }
    return { success: true };
  } catch (e) {
    console.error("reorderLocationMedia:", e);
    return { success: false, error: "Error al reordenar" };
  }
}

// ---- Multimedia: delete ----
export async function deleteLocationMedia(
  mediaId: string,
  studioId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const media = await prisma.studio_location_media.findFirst({
      where: { id: mediaId, studio_id: studioId },
      select: { id: true, storage_path: true, storage_bytes: true, filename: true, location: { select: { studio: { select: { slug: true } } } } },
    });
    if (!media) return { success: false, error: "Media no encontrado" };

    const bytes = Number(media.storage_bytes);
    await supabase.storage.from(BUCKET_MEDIA).remove([media.storage_path]);
    await prisma.studio_location_media.delete({ where: { id: mediaId } });
    await updateLocationStorageUsage(studioId, bytes, "remove");
    await logLocationStorageAction(studioId, "DELETE", bytes, media.filename);

    if (media.location?.studio?.slug) {
      revalidatePath(`/${media.location.studio.slug}/studio`, "layout");
    }
    return { success: true };
  } catch (e) {
    console.error("deleteLocationMedia:", e);
    return { success: false, error: "Error al eliminar archivo" };
  }
}
