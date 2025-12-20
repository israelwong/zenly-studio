"use server";

import { createClient } from '@supabase/supabase-js';
import {
  FileUploadSchema,
  FileDeleteSchema,
  FileUpdateSchema,
  ALLOWED_MIME_TYPES,
  type FileUploadForm,
  type FileDeleteForm,
  type FileUpdateForm,
  type FileUploadResult,
  type FileDeleteResult,
  type FileInfo
} from '@/lib/actions/schemas/media-schemas';
import { optimizeAvatarImage } from '@/lib/utils/image-optimizer';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('!!! FALTAN VARIABLES DE ENTORNO SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY !!!');
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
  : null;

const BUCKET_NAME = 'Studio'; // Bucket específico para Studio

// --- Helper para extraer el path desde URL ---
function getPathFromUrl(url: string): string | null {
  if (!supabaseUrl) return null;
  try {
    const urlObject = new URL(url);
    const basePath = `/storage/v1/object/public/${BUCKET_NAME}/`;
    if (urlObject.pathname.startsWith(basePath)) {
      return decodeURIComponent(urlObject.pathname.substring(basePath.length));
    }
    console.warn("No se pudo extraer el path de la URL:", url);
    return null;
  } catch (error) {
    console.error("Error al parsear la URL de Supabase:", error);
    return null;
  }
}

// --- Helper para generar paths organizados ---
export async function generateFilePath(
  studioSlug: string,
  category: string,
  subcategory?: string,
  filename?: string
): Promise<string> {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);

  let path = `studios/${studioSlug}/${category}`;

  if (subcategory) {
    path += `/${subcategory}`;
  }

  if (filename) {
    // Limpiar el nombre del archivo
    const cleanFilename = filename
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-')
      .replace(/-+/g, '-');

    const extension = cleanFilename.split('.').pop();
    const nameWithoutExt = cleanFilename.replace(`.${extension}`, '');

    path += `/${nameWithoutExt}-${timestamp}-${randomId}.${extension}`;
  } else {
    path += `/${timestamp}-${randomId}.jpg`;
  }

  return path;
}

// --- Helper para validar tipo de archivo ---
function validateFileType(file: File, allowedTypes: readonly string[]): boolean {
  return allowedTypes.includes(file.type);
}

// --- Helper para obtener tipo de archivo por MIME ---
function getFileTypeByMime(mimeType: string): string | null {
  for (const [type, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if ((mimes as readonly string[]).includes(mimeType)) {
      return type;
    }
  }
  return null;
}

/**
 * Sube un archivo a Supabase Storage.
 * Organiza automáticamente por studio y categorías.
 */
export async function uploadFileStorage(
  data: FileUploadForm
): Promise<FileUploadResult> {
  if (!supabaseAdmin) {
    return { success: false, error: "Cliente Supabase no inicializado." };
  }

  try {
    const validatedData = FileUploadSchema.parse(data);
    const { file, category, subcategory, studioSlug, customPath } = validatedData;

    // Validar tipo de archivo
    const fileType = getFileTypeByMime(file.type);
    if (!fileType) {
      return {
        success: false,
        error: `Tipo de archivo no permitido. Tipos soportados: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`
      };
    }

    // Validar tamaño según tipo
    const maxSizes = {
      image: 5 * 1024 * 1024,    // 5MB para imágenes
      video: 100 * 1024 * 1024,  // 100MB para videos
      document: 10 * 1024 * 1024, // 10MB para documentos
      gallery: 5 * 1024 * 1024   // 5MB para galerías
    };

    if (file.size > maxSizes[fileType as keyof typeof maxSizes]) {
      return {
        success: false,
        error: `El archivo es demasiado grande. Máximo ${maxSizes[fileType as keyof typeof maxSizes] / (1024 * 1024)}MB permitido para ${fileType}.`
      };
    }

    const filePath = customPath || await generateFilePath(studioSlug, category, subcategory, file.name);

    console.log(`[Studio] Subiendo archivo: ${BUCKET_NAME}/${filePath}`);

    // Optimizar avatares con menos compresión (solo para JPEG y PNG, no SVG)
    let fileToUpload = file;
    if (category === 'identidad' && file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        const optimized = await optimizeAvatarImage(file);
        fileToUpload = optimized.optimizedFile;
        console.log(`[Studio] Avatar optimizado: ${optimized.compressionRatio}% comprimido`);
      } catch (error) {
        console.warn(`[Studio] No se pudo optimizar avatar, usando original:`, error);
      }
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error(`Error al subir a ${filePath}:`, uploadError.message);
      throw new Error(`Error Supabase (subir): ${uploadError.message}`);
    }

    // Obtener la URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error(`Error obteniendo URL pública para: ${filePath}`);
      throw new Error(`Archivo subido pero no se pudo obtener URL.`);
    }

    const publicUrlWithTimestamp = `${urlData.publicUrl}?t=${Date.now()}`;
    console.log(`[Studio] Archivo subido exitosamente: ${publicUrlWithTimestamp}`);

    return { success: true, publicUrl: publicUrlWithTimestamp };

  } catch (error) {
    console.error(`Error en uploadFileStorage:`, error);
    return {
      success: false,
      error: `Error al subir archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Elimina un archivo de Supabase Storage usando su URL pública.
 */
export async function deleteFileStorage(
  data: FileDeleteForm
): Promise<FileDeleteResult> {
  if (!supabaseAdmin) {
    return { success: false, error: "Cliente Supabase no inicializado." };
  }

  try {
    const validatedData = FileDeleteSchema.parse(data);
    const { publicUrl } = validatedData;

    if (!publicUrl) {
      console.log("[Studio] No se proporcionó URL para eliminar.");
      return { success: true };
    }

    const filePath = getPathFromUrl(publicUrl);

    if (!filePath) {
      console.warn(`[Studio] No se pudo obtener ruta desde URL: ${publicUrl}`);
      return { success: false, error: "No se pudo determinar la ruta del archivo." };
    }

    console.log(`[Studio] Eliminando archivo: ${BUCKET_NAME}/${filePath}`);

    const { error: deleteError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (deleteError) {
      if (deleteError.message === 'The resource was not found') {
        console.log(`[Studio] Archivo no encontrado (ya eliminado): ${filePath}`);
        return { success: true }; // Éxito si no existía
      }
      console.error(`Error al eliminar ${filePath}:`, deleteError.message);
      throw new Error(`Error Supabase (eliminar): ${deleteError.message}`);
    }

    console.log(`[Studio] Archivo eliminado exitosamente: ${filePath}`);
    return { success: true };

  } catch (error) {
    console.error(`Error en deleteFileStorage:`, error);
    return {
      success: false,
      error: `Error al eliminar archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Actualiza un archivo reemplazando el anterior.
 * Elimina el archivo anterior y sube el nuevo.
 */
export async function updateFileStorage(
  data: FileUpdateForm
): Promise<FileUploadResult> {
  try {
    const validatedData = FileUpdateSchema.parse(data);
    const { file, oldPublicUrl, category, subcategory, studioSlug } = validatedData;

    // Eliminar archivo anterior si existe
    if (oldPublicUrl) {
      const deleteResult = await deleteFileStorage({
        publicUrl: oldPublicUrl,
        studioSlug
      });
      if (!deleteResult.success) {
        console.warn(`No se pudo eliminar el archivo anterior: ${deleteResult.error}`);
        // Continuar con la subida del nuevo archivo
      }
    }

    // Subir nuevo archivo
    const uploadResult = await uploadFileStorage({
      file,
      category,
      subcategory,
      studioSlug
    });

    if (!uploadResult.success) {
      return uploadResult;
    }

    console.log(`[Studio] Archivo actualizado exitosamente`);
    return uploadResult;

  } catch (error) {
    console.error(`Error en updateFileStorage:`, error);
    return {
      success: false,
      error: `Error al actualizar archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Valida si una URL pertenece al bucket de Studio
 */
export async function isStudioUrl(url: string): Promise<boolean> {
  if (!supabaseUrl) return false;
  try {
    const urlObject = new URL(url);
    const basePath = `/storage/v1/object/public/${BUCKET_NAME}/`;
    return urlObject.hostname.includes('supabase') && urlObject.pathname.startsWith(basePath);
  } catch {
    return false;
  }
}

/**
 * Obtiene información de un archivo desde su URL
 */
export async function getFileInfo(publicUrl: string): Promise<FileInfo> {
  if (!supabaseAdmin) {
    return { exists: false, error: "Cliente Supabase no inicializado." };
  }

  const filePath = getPathFromUrl(publicUrl);
  if (!filePath) {
    return { exists: false, error: "No se pudo determinar la ruta del archivo." };
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        search: filePath.split('/').pop()
      });

    if (error) {
      return { exists: false, error: error.message };
    }

    const fileInfo = data?.find(file => file.name === filePath.split('/').pop());

    if (!fileInfo) {
      return { exists: false };
    }

    return {
      exists: true,
      size: fileInfo.metadata?.size,
      lastModified: fileInfo.updated_at ? new Date(fileInfo.updated_at) : undefined,
      contentType: fileInfo.metadata?.mimetype
    };

  } catch (error) {
    return {
      exists: false,
      error: `Error al obtener información: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Persiste media en la base de datos (llamada desde cliente después de upload a Supabase)
 * Usa SERVICE_ROLE_KEY para evitar restricciones RLS
 */
export async function persistMediaMetadata(data: {
  studioSlug: string;
  categoryId?: string;
  itemId?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: 'categoria-fotos' | 'categoria-videos' | 'item-fotos' | 'item-videos';
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Aquí va la lógica de persistencia en BD
    // Esta función será llamada desde CategoriaEditorModal después de que el archivo se haya subido a Supabase
    console.log("Media metadata to persist:", data);
    return { success: true };
  } catch (error) {
    console.error("Error persisting media metadata:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}
