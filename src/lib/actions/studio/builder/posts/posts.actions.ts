"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
    postFormSchema,
    type PostFormData,
    type PostFilters,
} from "@/lib/actions/schemas/post-schemas";
import { StudioPost } from "@/types/studio-posts";

// Tipo específico para el resultado de posts
type PostsResult =
    | { success: true; data: StudioPost[] }
    | { success: false; error: string };

// CREATE
export async function createStudioPost(studioId: string, data: PostFormData) {
    try {
        const validatedData = postFormSchema.parse(data);

        const post = await prisma.studio_posts.create({
            data: {
                studio_id: studioId,
                title: validatedData.title,
                caption: validatedData.caption,
                media: validatedData.media,
                cover_index: validatedData.cover_index,
                category: validatedData.category,
                event_type_id: validatedData.event_type_id,
                tags: validatedData.tags,
                cta_enabled: validatedData.cta_enabled,
                cta_text: validatedData.cta_text,
                cta_action: validatedData.cta_action,
                cta_link: validatedData.cta_link,
                is_featured: validatedData.is_featured,
                is_published: validatedData.is_published,
                published_at: validatedData.is_published ? new Date() : null,
            },
            include: {
                event_type: { select: { id: true, name: true } },
                studio: { select: { slug: true, studio_name: true } },
            },
        });

        revalidatePath(`/${post.studio.slug}/studio/builder/posts`);
        if (post.is_published) {
            revalidatePath(`/${post.studio.slug}/p/${post.id}`);
        }

        return { success: true, data: post };
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
                is_published: filters?.is_published,
                category: filters?.category,
                event_type_id: filters?.event_type_id,
            },
            include: {
                event_type: { select: { id: true, name: true } },
            },
            orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
        });

        return { success: true, data: posts };
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
                        whatsapp_number: true,
                    },
                },
            },
        });

        if (!post) {
            return { success: false, error: "Post no encontrado" };
        }

        return { success: true, data: post };
    } catch (error) {
        console.error("Error fetching post:", error);
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

        const post = await prisma.studio_posts.update({
            where: { id: postId },
            data: {
                ...validatedData,
                published_at: validatedData.is_published ? new Date() : undefined,
                updated_at: new Date(),
            },
            include: {
                event_type: { select: { id: true, name: true } },
                studio: { select: { slug: true } },
            },
        });

        revalidatePath(`/${post.studio.slug}/studio/builder/posts`);
        if (post.is_published) {
            revalidatePath(`/${post.studio.slug}/p/${post.id}`);
        }

        return { success: true, data: post };
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

        revalidatePath(`/${post.studio.slug}/studio/builder/posts`);

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
                studio: { select: { slug: true } },
            },
        });

        if (!post) {
            return { success: false, error: "Post no encontrado" };
        }

        const updatedPost = await prisma.studio_posts.update({
            where: { id: postId },
            data: {
                is_published: !post.is_published,
                published_at: !post.is_published ? new Date() : null,
            },
        });

        revalidatePath(`/${post.studio.slug}/studio/builder/posts`);
        revalidatePath(`/${post.studio.slug}/p/${postId}`);

        return { success: true, data: updatedPost };
    } catch (error) {
        console.error("Error toggling publish:", error);
        return { success: false, error: "Error al cambiar estado" };
    }
}

// INCREMENT VIEW COUNT
export async function incrementPostViewCount(postId: string) {
    try {
        await prisma.studio_posts.update({
            where: { id: postId },
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
