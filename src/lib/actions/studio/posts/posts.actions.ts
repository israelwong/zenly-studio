"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
    postFormSchema,
    type PostFormData,
    type PostFilters,
    type MediaItem,
} from "@/lib/actions/schemas/post-schemas";
import { StudioPost } from "@/types/studio-posts";
import { generateSlug, generateUniqueSlug } from "@/lib/utils/slug-utils";

// Tipo específico para el resultado de posts
type PostsResult =
    | { success: true; data: StudioPost[] }
    | { success: false; error: string };

// Helper para crear datos de media compatible con Prisma
function createMediaInput(
    item: MediaItem,
    postId: string,
    studioId: string,
    index: number
): Prisma.studio_post_mediaCreateManyInput {
    const mediaData: Prisma.studio_post_mediaCreateManyInput = {
        post_id: postId,
        studio_id: studioId,
        file_url: item.file_url,
        file_type: item.file_type as string, // Prisma espera string, pero validamos con Zod
        filename: item.filename,
        storage_bytes: BigInt(item.storage_bytes || 0),
        mime_type: item.mime_type || "",
        duration_seconds: item.duration_seconds ?? null,
        display_order: item.display_order ?? index,
        alt_text: item.alt_text ?? null,
        thumbnail_url: item.thumbnail_url ?? null,
        storage_path: item.storage_path,
    };

    // Manejar dimensions - Prisma acepta InputJsonValue o null
    if (item.dimensions) {
        mediaData.dimensions = item.dimensions as Prisma.InputJsonValue;
    }

    return mediaData;
}

// Tipo para convertir resultados de Prisma a StudioPost (con studio)
type PrismaPostWithStudio = Prisma.studio_postsGetPayload<{
    include: {
        event_type: { select: { id: true; name: true } };
        studio: { select: { slug: true; studio_name?: true } };
        media: { orderBy: { display_order: "asc" } };
    };
}>;

// Tipo para convertir resultados de Prisma a StudioPost (sin studio)
type PrismaPostWithoutStudio = Prisma.studio_postsGetPayload<{
    include: {
        event_type: { select: { id: true; name: true } };
        media: { orderBy: { display_order: "asc" } };
    };
}>;

// Helper para convertir media de Prisma a MediaItem
function convertPrismaMediaToMediaItem(
    media: PrismaPostWithStudio["media"][number] | PrismaPostWithoutStudio["media"][number]
): MediaItem {
    return {
        id: media.id,
        file_url: media.file_url,
        file_type: media.file_type === "image" || media.file_type === "video"
            ? media.file_type
            : "image", // Fallback seguro
        filename: media.filename,
        storage_bytes: Number(media.storage_bytes),
        mime_type: media.mime_type,
        dimensions: media.dimensions && typeof media.dimensions === "object" && !Array.isArray(media.dimensions)
            ? (media.dimensions as { width: number; height: number })
            : undefined,
        duration_seconds: media.duration_seconds ?? undefined,
        display_order: media.display_order,
        alt_text: media.alt_text ?? undefined,
        thumbnail_url: media.thumbnail_url ?? undefined,
        storage_path: media.storage_path,
    };
}

// Helper para convertir post de Prisma a StudioPost (con studio)
function convertPrismaPostToStudioPost(post: PrismaPostWithStudio): StudioPost;

// Helper para convertir post de Prisma a StudioPost (sin studio)
function convertPrismaPostToStudioPost(post: PrismaPostWithoutStudio): StudioPost;

// Implementación
function convertPrismaPostToStudioPost(
    post: PrismaPostWithStudio | PrismaPostWithoutStudio
): StudioPost {
    return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        caption: post.caption,
        is_featured: post.is_featured,
        is_published: post.is_published,
        cover_index: post.cover_index,
        created_at: post.created_at,
        updated_at: post.updated_at,
        studio_id: post.studio_id,
        event_type_id: post.event_type_id,
        tags: post.tags,
        published_at: post.published_at,
        view_count: post.view_count,
        event_type: post.event_type,
        media: post.media.map(convertPrismaMediaToMediaItem),
    };
}

/**
 * Valida si un slug existe en el studio (excluyendo un post específico si se proporciona)
 * Función pública para validación en tiempo real desde el frontend
 */
export async function checkPostSlugExists(studioSlug: string, slug: string, excludePostId?: string): Promise<boolean> {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return false;
        }

        const existing = await prisma.studio_posts.findUnique({
            where: {
                studio_id_slug: {
                    studio_id: studio.id,
                    slug: slug,
                },
            },
            select: { id: true },
        });

        // Si no existe, o si existe pero es el mismo post que estamos editando, no hay conflicto
        return !!(existing && (!excludePostId || existing.id !== excludePostId));
    } catch (error) {
        console.error('Error checking post slug:', error);
        return false;
    }
}

/**
 * Helper interno para generar slug único verificando en BD
 * Usa la utilidad compartida generateUniqueSlug
 */
async function generateUniquePostSlug(studioId: string, baseSlug: string, excludePostId?: string): Promise<string> {
    // Crear función de verificación específica para posts
    const checkExists = async (slug: string): Promise<boolean> => {
        const existing = await prisma.studio_posts.findUnique({
            where: {
                studio_id_slug: {
                    studio_id: studioId,
                    slug: slug,
                },
            },
            select: { id: true },
        });

        // Retorna true si existe Y no es el post que estamos editando
        return !!(existing && (!excludePostId || existing.id !== excludePostId));
    };

    // Usar la utilidad compartida
    return await generateUniqueSlug(baseSlug, checkExists);
}

// CREATE
export async function createStudioPost(studioId: string, data: PostFormData) {
    try {
        const validatedData = postFormSchema.parse(data);

        // Crear post con transacción para manejar media
        const post = await prisma.$transaction(async (tx) => {
            // Generar slug desde título y verificar unicidad
            const baseSlug = generateSlug(validatedData.title || 'post');
            const uniqueSlug = await generateUniquePostSlug(studioId, baseSlug);

            const newPost = await tx.studio_posts.create({
                data: {
                    studio_id: studioId,
                    slug: uniqueSlug,
                    title: validatedData.title,
                    caption: validatedData.caption,
                    cover_index: validatedData.cover_index,
                    event_type_id: validatedData.event_type_id,
                    tags: validatedData.tags,
                    is_featured: validatedData.is_featured,
                    is_published: validatedData.is_published,
                    published_at: validatedData.is_published ? new Date() : null,
                },
            });

            // Crear media items
            if (validatedData.media && validatedData.media.length > 0) {
                await tx.studio_post_media.createMany({
                    data: validatedData.media.map((item, index) =>
                        createMediaInput(item, newPost.id, studioId, index)
                    ),
                });
            }

            // Obtener post completo con relaciones
            return await tx.studio_posts.findUnique({
                where: { id: newPost.id },
                include: {
                    event_type: { select: { id: true, name: true } },
                    studio: { select: { slug: true, studio_name: true } },
                    media: { orderBy: { display_order: 'asc' } },
                },
            });
        });

        if (!post) {
            return { success: false, error: "Error al crear post" };
        }

        const convertedPost = convertPrismaPostToStudioPost(post);

        revalidatePath(`/${post.studio.slug}/profile/edit/content/posts`);
        revalidatePath(`/${post.studio.slug}/studio/posts`);
        revalidatePath(`/${post.studio.slug}`);

        // ⚠️ CACHE: Invalidar caché del perfil público
        // import { revalidateTag } from 'next/cache';
        // revalidateTag(`studio-profile-posts-${post.studio_id}`);
        // revalidateTag(`studio-profile-basic-${post.studio.slug}`); // Si afecta metadata

        return { success: true, data: convertedPost };
    } catch (error) {
        console.error("Error creating post:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error al crear post",
        };
    }
}

// READ
export async function getStudioPosts(studioId: string, filters?: PostFilters): Promise<PostsResult> {
    try {
        const posts = await prisma.studio_posts.findMany({
            where: {
                studio_id: studioId,
                ...(filters?.is_published !== undefined && { is_published: filters.is_published }),
                ...(filters?.is_featured !== undefined && { is_featured: filters.is_featured }),
                ...(filters?.event_type_id && { event_type_id: filters.event_type_id }),
            },
            include: {
                event_type: { select: { id: true, name: true } },
                media: { orderBy: { display_order: 'asc' } },
            },
            orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
        });

        const convertedPosts = posts.map(convertPrismaPostToStudioPost);

        return { success: true, data: convertedPosts };
    } catch (error) {
        console.error("Error fetching posts:", error);
        return { success: false, error: "Error al obtener posts" };
    }
}

// READ by slug - Helper para builder
export async function getStudioPostsBySlug(studioSlug: string, filters?: PostFilters): Promise<PostsResult> {
    try {
        // Obtener studioId desde slug
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        const result = await getStudioPosts(studio.id, filters);
        return result;
    } catch (error) {
        console.error("Error fetching posts by slug:", error);
        return { success: false, error: "Error al obtener posts" };
    }
}

// CREATE by slug - Helper para builder
export async function createStudioPostBySlug(studioSlug: string, data: PostFormData) {
    try {
        const studio = await prisma.studios.findUnique({
            where: { slug: studioSlug },
            select: { id: true }
        });

        if (!studio) {
            return { success: false, error: "Studio no encontrado" };
        }

        const result = await createStudioPost(studio.id, data);

        // Revalidar también la ruta de content/posts
        if (result.success) {
            revalidatePath(`/${studioSlug}/profile/edit/content/posts`);
        }

        return result;
    } catch (error) {
        console.error("Error creating post by slug:", error);
        return { success: false, error: "Error al crear post" };
    }
}

export async function getStudioPostById(postId: string) {
    try {
        const post = await prisma.studio_posts.findUnique({
            where: { id: postId },
            include: {
                event_type: { select: { id: true, name: true } },
                studio: {
                    select: {
                        id: true,
                        slug: true,
                        studio_name: true,
                        phones: {
                            where: {
                                type: 'WHATSAPP',
                                is_active: true
                            },
                            select: {
                                number: true
                            },
                            take: 1
                        }
                    },
                },
                media: {
                    select: {
                        id: true,
                        file_url: true,
                        file_type: true,
                        filename: true,
                        storage_bytes: true,
                        mime_type: true,
                        dimensions: true,
                        duration_seconds: true,
                        display_order: true,
                        alt_text: true,
                        thumbnail_url: true,
                        storage_path: true,
                    },
                    orderBy: { display_order: 'asc' }
                },
            },
        });

        if (!post) {
            return { success: false, error: "Post no encontrado" };
        }

        const convertedPost = {
            ...convertPrismaPostToStudioPost(post),
            cta_enabled: false,
            cta_action: '',
            cta_text: '',
            studio: {
                studio_name: post.studio.studio_name,
                whatsapp_number: post.studio.phones?.[0]?.number || null,
            }
        };

        return { success: true, data: convertedPost };
    } catch (error) {
        console.error("Error fetching post:", error);
        return { success: false, error: "Error al obtener post" };
    }
}

// READ by slug - Para URLs públicas SEO-friendly
export async function getStudioPostBySlug(studioSlug: string, postSlug: string) {
    try {
        const post = await prisma.studio_posts.findFirst({
            where: {
                slug: postSlug,
                studio: {
                    slug: studioSlug
                }
            },
            include: {
                event_type: { select: { id: true, name: true } },
                studio: {
                    select: {
                        id: true,
                        slug: true,
                        studio_name: true,
                        phones: {
                            where: {
                                type: 'WHATSAPP',
                                is_active: true
                            },
                            select: {
                                number: true
                            },
                            take: 1
                        }
                    },
                },
                media: {
                    select: {
                        id: true,
                        file_url: true,
                        file_type: true,
                        filename: true,
                        storage_bytes: true,
                        mime_type: true,
                        dimensions: true,
                        duration_seconds: true,
                        display_order: true,
                        alt_text: true,
                        thumbnail_url: true,
                        storage_path: true,
                    },
                    orderBy: { display_order: 'asc' }
                },
            },
        });

        if (!post) {
            return { success: false, error: "Post no encontrado" };
        }

        const convertedPost = {
            ...convertPrismaPostToStudioPost(post),
            cta_enabled: false,
            cta_action: '',
            cta_text: '',
            studio: {
                studio_name: post.studio.studio_name,
                whatsapp_number: post.studio.phones?.[0]?.number || null,
            }
        };

        return { success: true, data: convertedPost };
    } catch (error) {
        console.error("Error fetching post by slug:", error);
        return { success: false, error: "Error al obtener post" };
    }
}

// UPDATE
export async function updateStudioPost(
    postId: string,
    data: Partial<PostFormData>
) {
    try {
        const validatedData = postFormSchema.partial().parse(data);

        // Actualizar con transacción para manejar media
        const post = await prisma.$transaction(async (tx) => {
            // Obtener post y studio info primero
            const existingPost = await tx.studio_posts.findUnique({
                where: { id: postId },
                select: {
                    studio_id: true,
                    slug: true,
                    is_published: true,
                    is_featured: true
                },
            });

            if (!existingPost) {
                throw new Error("Post no encontrado");
            }

            // Construir objeto de actualización solo con campos definidos
            const updateData: {
                title?: string;
                slug?: string;
                caption?: string | null;
                cover_index?: number;
                event_type_id?: string | null;
                tags?: string[];
                is_featured?: boolean;
                is_published?: boolean;
                published_at?: Date | null;
                updated_at: Date;
            } = {
                updated_at: new Date(),
            };

            // Solo agregar campos que están presentes en validatedData
            if (validatedData.title !== undefined) updateData.title = validatedData.title;
            if (validatedData.caption !== undefined) updateData.caption = validatedData.caption;
            if (validatedData.cover_index !== undefined) updateData.cover_index = validatedData.cover_index;
            if (validatedData.event_type_id !== undefined) updateData.event_type_id = validatedData.event_type_id ?? null;
            if (validatedData.tags !== undefined) updateData.tags = validatedData.tags;

            // Actualizar slug automáticamente si cambia el título
            if (validatedData.title !== undefined) {
                const newSlug = generateSlug(validatedData.title);
                if (newSlug !== existingPost.slug) {
                    const uniqueSlug = await generateUniquePostSlug(existingPost.studio_id, newSlug, postId);
                    updateData.slug = uniqueSlug;
                }
            } else if (validatedData.slug !== undefined && validatedData.slug !== existingPost.slug) {
                // Si se proporciona slug explícitamente (sin cambiar título)
                const uniqueSlug = await generateUniquePostSlug(existingPost.studio_id, validatedData.slug, postId);
                updateData.slug = uniqueSlug;
            }

            // Solo actualizar is_featured si se proporciona explícitamente en data
            // Si se destaca un post no publicado, publicarlo automáticamente
            if (data.is_featured !== undefined) {
                updateData.is_featured = data.is_featured;

                // Si se destaca un post no publicado, publicarlo automáticamente
                if (data.is_featured && !existingPost.is_published) {
                    updateData.is_published = true;
                    updateData.published_at = new Date();
                }
            }

            // Manejar is_published y published_at (solo si se proporciona explícitamente en data)
            // NO usar validatedData porque puede tener valores por defecto
            if (data.is_published !== undefined) {
                updateData.is_published = data.is_published;
                updateData.published_at = data.is_published ? new Date() : null;
                // Si se despublica y está destacado, quitar también el destacado
                if (!data.is_published && existingPost.is_featured) {
                    updateData.is_featured = false;
                }
            }

            // Actualizar post
            await tx.studio_posts.update({
                where: { id: postId },
                data: updateData,
            });

            // Manejar actualización de media si está presente
            if (validatedData.media !== undefined) {
                // Eliminar media existente
                await tx.studio_post_media.deleteMany({
                    where: { post_id: postId },
                });

                // Crear nuevos media items
                if (validatedData.media.length > 0) {
                    await tx.studio_post_media.createMany({
                        data: validatedData.media.map((item, index) =>
                            createMediaInput(item, postId, existingPost.studio_id, index)
                        ),
                    });
                }
            }

            // Obtener post completo con relaciones
            return await tx.studio_posts.findUnique({
                where: { id: postId },
                include: {
                    event_type: { select: { id: true, name: true } },
                    studio: { select: { slug: true } },
                    media: { orderBy: { display_order: 'asc' } },
                },
            });
        });

        if (!post) {
            return { success: false, error: "Error al actualizar post" };
        }

        const convertedPost = convertPrismaPostToStudioPost(post);

        revalidatePath(`/${post.studio.slug}/profile/edit/content/posts`);
        revalidatePath(`/${post.studio.slug}/studio/posts`);
        revalidatePath(`/${post.studio.slug}`);

        // ⚠️ CACHE: Invalidar caché del perfil público
        // import { revalidateTag } from 'next/cache';
        // revalidateTag(`studio-profile-posts-${post.studio_id}`);
        // revalidateTag(`studio-profile-basic-${post.studio.slug}`); // Si afecta metadata

        return { success: true, data: convertedPost };
    } catch (error) {
        console.error("Error updating post:", error);
        return {
            success: false,
            error:
                error instanceof Error ? error.message : "Error al actualizar post",
        };
    }
}

// DELETE
export async function deleteStudioPost(postId: string) {
    try {
        const post = await prisma.studio_posts.findUnique({
            where: { id: postId },
            select: { studio: { select: { slug: true } } },
        });

        if (!post) {
            return { success: false, error: "Post no encontrado" };
        }

        await prisma.studio_posts.delete({
            where: { id: postId },
        });

        revalidatePath(`/${post.studio.slug}/studio/posts`);

        // ⚠️ CACHE: Invalidar caché del perfil público
        // import { revalidateTag } from 'next/cache';
        // const studio = await prisma.studios.findUnique({ where: { id: post.studio_id }, select: { id: true } });
        // if (studio) revalidateTag(`studio-profile-posts-${studio.id}`);

        return { success: true };
    } catch (error) {
        console.error("Error deleting post:", error);
        return { success: false, error: "Error al eliminar post" };
    }
}

// TOGGLE PUBLISH
export async function toggleStudioPostPublish(postId: string) {
    try {
        const post = await prisma.studio_posts.findUnique({
            where: { id: postId },
            select: {
                is_published: true,
                is_featured: true,
                studio: { select: { slug: true } },
            },
        });

        if (!post) {
            return { success: false, error: "Post no encontrado" };
        }

        const newPublishedState = !post.is_published;

        // Si se despublica y está destacado, quitar también el destacado
        const updateData: {
            is_published: boolean;
            published_at: Date | null;
            is_featured?: boolean;
        } = {
            is_published: newPublishedState,
            published_at: newPublishedState ? new Date() : null,
        };

        // Si se despublica y está destacado, quitar el destacado
        if (!newPublishedState && post.is_featured) {
            updateData.is_featured = false;
        }

        const updatedPost = await prisma.studio_posts.update({
            where: { id: postId },
            data: updateData,
            include: {
                studio: { select: { slug: true } }
            }
        });

        revalidatePath(`/${updatedPost.studio.slug}/studio/posts`);
        revalidatePath(`/${updatedPost.studio.slug}`);

        return { success: true, data: updatedPost };
    } catch (error) {
        console.error("Error toggling publish:", error);
        return { success: false, error: "Error al cambiar estado" };
    }
}

// INCREMENT VIEW COUNT (por slug para URLs públicas)
export async function incrementPostViewCount(postSlug: string, studioSlug: string) {
    try {
        await prisma.studio_posts.updateMany({
            where: {
                slug: postSlug,
                studio: {
                    slug: studioSlug
                }
            },
            data: {
                view_count: {
                    increment: 1,
                },
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error incrementing view count:", error);
        return { success: false };
    }
}
