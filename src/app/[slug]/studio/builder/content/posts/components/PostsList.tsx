"use client";

import { useState, useEffect, useCallback } from "react";
import { PostCard } from "./PostCard";
import { EmptyState } from "./EmptyState";
import { getStudioPostsBySlug } from "@/lib/actions/studio/builder/posts";
import { ZenSelect } from "@/components/ui/zen";
import { Loader2 } from "lucide-react";
import { StudioPost } from "@/types/studio-posts";
import { toast } from "sonner";

interface PostsListProps {
    studioSlug: string;
}

export function PostsList({ studioSlug }: PostsListProps) {
    const [posts, setPosts] = useState<StudioPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [error, setError] = useState<string | null>(null);

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
                setPosts(result.data || []);
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
                        onUpdate={loadPosts}
                    />
                ))}
            </div>
        </div>
    );
}
