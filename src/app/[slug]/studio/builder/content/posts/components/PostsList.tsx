"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostCard } from "./PostCard";
import { EmptyState } from "./EmptyState";
import { getStudioPostsBySlug } from "@/lib/actions/studio/builder/posts";
import { ZenSelect } from "@/components/ui/zen";
import { Loader2 } from "lucide-react";
import { StudioPost } from "@/types/studio-posts";
import { toast } from "sonner";

interface PostsListProps {
    studioSlug: string;
    onPostsChange?: (posts: StudioPost[]) => void;
}

export function PostsList({ studioSlug, onPostsChange }: PostsListProps) {
    const [posts, setPosts] = useState<StudioPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [error, setError] = useState<string | null>(null);
    const filterRef = useRef(filter);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Mantener filterRef actualizado
    useEffect(() => {
        filterRef.current = filter;
    }, [filter]);

    // Notificar cambios de posts al componente padre
    useEffect(() => {
        if (onPostsChange) {
            onPostsChange(posts);
        }
    }, [posts, onPostsChange]);

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Construir filtros según el valor seleccionado
            let filters;
            if (filter === "all") {
                filters = undefined; // Traer todos los posts (publicados y no publicados)
            } else if (filter === "published") {
                filters = { is_published: true };
            }

            const result = await getStudioPostsBySlug(studioSlug, filters);
            if (result.success) {
                // Los posts ya vienen ordenados de la DB (destacados primero, luego por creación)
                // Pero asegurémonos de que estén ordenados correctamente
                const sortedPosts = (result.data || []).sort((a, b) => {
                    // Destacados primero
                    if (a.is_featured && !b.is_featured) return -1;
                    if (!a.is_featured && b.is_featured) return 1;
                    // Luego por fecha de creación (más nueva primero)
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });
                setPosts(sortedPosts);
            } else {
                const errorMessage = result.error || "Error al cargar posts";
                setError(errorMessage);
                toast.error(errorMessage);
                setPosts([]);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error inesperado al cargar posts";
            console.error("Error loading posts:", error);
            setError(errorMessage);
            toast.error(errorMessage);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [filter, studioSlug]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const filterOptions = [
        { value: "all", label: "Todos" },
        { value: "published", label: "Publicados" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                    onClick={() => loadPosts()}
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                    Intentar nuevamente
                </button>
            </div>
        );
    }

    if (posts.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
                <ZenSelect
                    value={filter}
                    onValueChange={setFilter}
                    options={filterOptions}
                    placeholder="Filtrar posts"
                />
                <span className="text-sm text-zinc-400">
                    {posts.length} post{posts.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Posts List - Horizontal Cards */}
            <div className="space-y-3">
                {posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        studioSlug={studioSlug}
                        onUpdate={(updatedPost) => {
                            if (updatedPost === null) {
                                // Eliminación: remover post de la lista local
                                setPosts(prevPosts =>
                                    prevPosts.filter(p => p.id !== post.id)
                                );
                            } else {
                                // Actualización optimista local - actualiza y reordena
                                setPosts(prevPosts => {
                                    const updated = prevPosts.map(p =>
                                        p.id === updatedPost.id ? updatedPost : p
                                    );
                                    // Reordenar: destacados primero, luego por creación
                                    return updated.sort((a, b) => {
                                        if (a.is_featured && !b.is_featured) return -1;
                                        if (!a.is_featured && b.is_featured) return 1;
                                        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                        return dateB - dateA;
                                    });
                                });
                            }

                            // Sincronización silenciosa en background (sin mostrar loading)
                            // Solo sincronizar si NO es solo un cambio de is_featured
                            // porque is_featured no debe afectar is_published
                            const isOnlyFeaturedChange = updatedPost !== null &&
                                updatedPost.id === post.id &&
                                updatedPost.is_featured !== post.is_featured &&
                                updatedPost.is_published === post.is_published;

                            if (!isOnlyFeaturedChange) {
                                // Cancela sincronización anterior si hay otra actualización
                                if (syncTimeoutRef.current) {
                                    clearTimeout(syncTimeoutRef.current);
                                }

                                syncTimeoutRef.current = setTimeout(async () => {
                                    try {
                                        let filters;
                                        if (filterRef.current === "all") {
                                            filters = undefined;
                                        } else if (filterRef.current === "published") {
                                            filters = { is_published: true };
                                        }
                                        const result = await getStudioPostsBySlug(studioSlug, filters);
                                        if (result.success && result.data) {
                                            // Actualizar con datos del servidor y asegurar orden correcto
                                            const sortedPosts = result.data.sort((a, b) => {
                                                if (a.is_featured && !b.is_featured) return -1;
                                                if (!a.is_featured && b.is_featured) return 1;
                                                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                                return dateB - dateA;
                                            });
                                            setPosts(sortedPosts);
                                        }
                                    } catch (error) {
                                        // Fallar silenciosamente, la UI ya está actualizada
                                        console.error("Error sincronizando posts:", error);
                                    }
                                    syncTimeoutRef.current = null;
                                }, 2000);
                            }
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
