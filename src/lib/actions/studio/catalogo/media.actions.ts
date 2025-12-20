"use server";

import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const UploadMediaSchema = z.object({
  studioId: z.string().cuid("Studio ID must be a valid CUID"),
  entityType: z.enum(["section", "category", "item"], {
    errorMap: () => ({ message: "Entity type must be section, category, or item" }),
  }),
  entityId: z.string().cuid("Entity ID must be a valid CUID"),
  file: z.instanceof(File).refine((file) => file.size > 0, "File cannot be empty"),
  altText: z.string().optional(),
});

type UploadMediaInput = z.infer<typeof UploadMediaSchema>;

// ============================================
// FILE VALIDATION
// ============================================

const FILE_LIMITS = {
  IMAGE: {
    MAX_SIZE: 50 * 1024 * 1024, // 50 MB
    FORMATS: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  VIDEO: {
    MAX_SIZE: 500 * 1024 * 1024, // 500 MB
    FORMATS: ["video/mp4", "video/webm", "video/quicktime"],
  },
} as const;

function validateFile(file: File): { type: "IMAGE" | "VIDEO"; isValid: boolean; error?: string } {
  if (FILE_LIMITS.IMAGE.FORMATS.includes(file.type)) {
    if (file.size > FILE_LIMITS.IMAGE.MAX_SIZE) {
      return { type: "IMAGE", isValid: false, error: `Image size exceeds 50MB limit` };
    }
    return { type: "IMAGE", isValid: true };
  }

  if (FILE_LIMITS.VIDEO.FORMATS.includes(file.type)) {
    if (file.size > FILE_LIMITS.VIDEO.MAX_SIZE) {
      return { type: "VIDEO", isValid: false, error: `Video size exceeds 500MB limit` };
    }
    return { type: "VIDEO", isValid: true };
  }

  return { type: "IMAGE", isValid: false, error: "File format not supported" };
}

// ============================================
// SUPABASE STORAGE OPERATIONS
// ============================================

async function uploadToSupabase(
  studioId: string,
  entityType: string,
  entityId: string,
  file: File,
  fileType: "IMAGE" | "VIDEO"
): Promise<{ fileUrl: string; fileName: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Generate unique file path
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const fileName = `${timestamp}-${randomId}-${file.name}`;
  const filePath = `studios/${studioId}/${entityType}/${entityId}/${fileName}`;

  // Upload file
  const { data, error } = await supabase.storage.from("studio-media").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("studio-media")
    .getPublicUrl(filePath);

  return {
    fileUrl: publicUrlData.publicUrl,
    fileName: file.name,
  };
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function saveMediaToDB(
  studioId: string,
  entityType: "section" | "category" | "item",
  entityId: string,
  fileUrl: string,
  fileName: string,
  mimeType: string,
  storageBytes: number,
  fileType: "IMAGE" | "VIDEO",
  altText?: string
): Promise<string> {
  const tableName =
    entityType === "section"
      ? "studio_section_media"
      : entityType === "category"
        ? "studio_category_media"
        : "studio_item_media";

  const fieldName = `${entityType}_id`;

  // @ts-ignore - Dynamic table operations
  const media = await prisma[tableName].create({
    data: {
      [fieldName]: entityId,
      studio_id: studioId,
      file_url: fileUrl,
      file_type: fileType,
      filename: fileName,
      storage_bytes: storageBytes,
      mime_type: mimeType,
      alt_text: altText,
      display_order: 0,
    },
  });

  return media.id;
}

async function updateStorageUsage(studioId: string, storageBytes: number, entityType: string) {
  // Get or create storage usage record
  let storageUsage = await prisma.studio_storage_usage.findUnique({
    where: { studio_id: studioId },
  });

  if (!storageUsage) {
    // Get studio to know quota limit
    const studio = await prisma.studios.findUnique({
      where: { id: studioId },
      select: { plan_id: true },
    });

    // Get plan to know storage quota (default 10GB for now)
    let quotaBytes = 10 * 1024 * 1024 * 1024; // 10GB default

    if (studio?.plan_id) {
      const plan = await prisma.platform_plans.findUnique({
        where: { id: studio.plan_id },
        select: { storage_limit_gb: true },
      });
      if (plan?.storage_limit_gb) {
        quotaBytes = plan.storage_limit_gb * 1024 * 1024 * 1024;
      }
    }

    storageUsage = await prisma.studio_storage_usage.create({
      data: {
        studio_id: studioId,
        quota_limit_bytes: quotaBytes,
        total_storage_bytes: 0,
      },
    });
  }

  // Update storage counts
  const updateData: any = {
    total_storage_bytes: { increment: storageBytes },
    last_calculated_at: new Date(),
  };

  if (entityType === "section") {
    updateData.section_media_bytes = { increment: storageBytes };
  } else if (entityType === "category") {
    updateData.category_media_bytes = { increment: storageBytes };
  } else if (entityType === "item") {
    updateData.item_media_bytes = { increment: storageBytes };
  }

  await prisma.studio_storage_usage.update({
    where: { studio_id: studioId },
    data: updateData,
  });
}

async function logStorageAction(
  studioId: string,
  action: "UPLOAD" | "DELETE" | "UPDATE",
  mediaType: "SECTION" | "CATEGORY" | "ITEM",
  storageBytes: number,
  fileName: string,
  userId?: string,
  reason?: string
) {
  await prisma.studio_storage_log.create({
    data: {
      studio_id: studioId,
      action,
      media_type: mediaType,
      storage_bytes: storageBytes,
      filename: fileName,
      triggered_by_user: userId,
      reason,
    },
  });
}

// ============================================
// MAIN SERVER ACTION
// ============================================

export async function uploadMediaToEntity(
  input: unknown
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    // Validate input
    const validated = UploadMediaSchema.parse(input);

    // Validate file
    const fileValidation = validateFile(validated.file);
    if (!fileValidation.isValid) {
      return { success: false, error: fileValidation.error };
    }

    // Upload to Supabase
    const { fileUrl, fileName } = await uploadToSupabase(
      validated.studioId,
      validated.entityType,
      validated.entityId,
      validated.file,
      fileValidation.type
    );

    // Save to database
    const mediaId = await saveMediaToDB(
      validated.studioId,
      validated.entityType,
      validated.entityId,
      fileUrl,
      fileName,
      validated.file.type,
      validated.file.size,
      fileValidation.type,
      validated.altText
    );

    // Update storage usage
    await updateStorageUsage(validated.studioId, validated.file.size, validated.entityType);

    // Log storage action
    await logStorageAction(
      validated.studioId,
      "UPLOAD",
      validated.entityType.toUpperCase() as "SECTION" | "CATEGORY" | "ITEM",
      validated.file.size,
      fileName,
      undefined,
      "Media uploaded via catalog builder"
    );

    // Revalidate paths
    revalidatePath(`/studio/[slug]/commercial/catalogo`, "layout");

    return { success: true, mediaId };
  } catch (error) {
    console.error("Error uploading media:", error);

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors?.[0]?.message || error.message || 'Error de validación' };
    }

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Unknown error occurred" };
  }
}

// ============================================
// ADDITIONAL OPERATIONS
// ============================================

export async function deleteMediaFromEntity(mediaId: string, studioId: string) {
  try {
    // Find media record to get storage bytes
    const media = await prisma.$queryRaw`
      SELECT storage_bytes FROM (
        SELECT storage_bytes FROM studio_section_media WHERE id = ${mediaId}
        UNION ALL
        SELECT storage_bytes FROM studio_category_media WHERE id = ${mediaId}
        UNION ALL
        SELECT storage_bytes FROM studio_item_media WHERE id = ${mediaId}
      ) AS m
      LIMIT 1
    `;

    if (!media || !Array.isArray(media) || media.length === 0) {
      return { success: false, error: "Media not found" };
    }

    const storageBytes = (media[0] as any).storage_bytes;

    // Delete from database
    await prisma.$executeRaw`
      DELETE FROM studio_section_media WHERE id = ${mediaId}
      OR DELETE FROM studio_category_media WHERE id = ${mediaId}
      OR DELETE FROM studio_item_media WHERE id = ${mediaId}
    `;

    // Update storage usage
    await prisma.studio_storage_usage.update({
      where: { studio_id: studioId },
      data: {
        total_storage_bytes: { decrement: storageBytes },
        last_calculated_at: new Date(),
      },
    });

    // Log action
    await logStorageAction(studioId, "DELETE", "ITEM", storageBytes, mediaId, undefined, "Media deleted");

    return { success: true };
  } catch (error) {
    console.error("Error deleting media:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
