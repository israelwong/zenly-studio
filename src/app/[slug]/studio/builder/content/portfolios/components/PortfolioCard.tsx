"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ZenButton, ZenCard } from "@/components/ui/zen";
import {
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Star,
    Calendar,
    MoreVertical
} from "lucide-react";
import {
    deleteStudioPortfolio,
    toggleStudioPortfolioPublish
} from "@/lib/actions/studio/builder/portfolios/portfolios.actions";
import { toast } from "sonner";
import { MediaItem } from "@/lib/actions/schemas/post-schemas";
import { StudioPortfolio } from "@/types/studio-portfolios";

interface PortfolioCardProps {
    portfolio: StudioPortfolio;
    studioSlug: string;
    onUpdate: () => void;
}

export function PortfolioCard({ portfolio, studioSlug, onUpdate }: PortfolioCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState(false);

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar este portfolio?")) {
            return;
        }

        setIsDeleting(true);
        try {
            const result = await deleteStudioPortfolio(portfolio.id);
            if (result.success) {
                toast.success("Portfolio eliminado");
                onUpdate();
            } else {
                toast.error(result.error || "Error al eliminar portfolio");
            }
        } catch (error) {
            toast.error("Error al eliminar portfolio");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTogglePublish = async () => {
        setIsToggling(true);
        try {
            const result = await toggleStudioPortfolioPublish(portfolio.id);
            if (result.success) {
                toast.success(
                    portfolio.is_published ? "Portfolio despublicado" : "Portfolio publicado"
                );
                onUpdate();
            } else {
                toast.error(result.error || "Error al cambiar estado");
            }
        } catch (error) {
            toast.error("Error al cambiar estado");
        } finally {
            setIsToggling(false);
        }
    };

    const getCoverImage = () => {
        if (!portfolio.media || portfolio.media.length === 0) {
            // Intentar usar cover_image_url si está disponible
            if (portfolio.cover_image_url) {
                return { url: portfolio.cover_image_url, thumbnail_url: portfolio.cover_image_url } as MediaItem;
            }
            return null;
        }
        const media = Array.isArray(portfolio.media) ? portfolio.media : [];
        const coverIndex = Math.min(portfolio.cover_index || 0, media.length - 1);
        return media[coverIndex];
    };

    const coverImage = getCoverImage();

    return (
        <ZenCard className="overflow-hidden">
            {/* Cover Image */}
            <div className="aspect-square relative bg-zinc-800">
                {coverImage ? (
                    <Image
                        src={coverImage.thumbnail_url || coverImage.file_url || coverImage.url || ""}
                        alt={portfolio.title || "Portfolio"}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <Calendar className="w-12 h-12" />
                    </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                    {portfolio.is_featured && (
                        <div className="px-2 py-1 bg-yellow-500 text-black text-xs font-medium rounded">
                            <Star className="w-3 h-3 inline mr-1" />
                            Destacado
                        </div>
                    )}
                    {portfolio.is_published ? (
                        <div className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded">
                            <Eye className="w-3 h-3 inline mr-1" />
                            Publicado
                        </div>
                    ) : (
                        <div className="px-2 py-1 bg-zinc-600 text-white text-xs font-medium rounded">
                            <EyeOff className="w-3 h-3 inline mr-1" />
                            Borrador
                        </div>
                    )}
                </div>

                {/* Media Count */}
                {portfolio.media && Array.isArray(portfolio.media) && portfolio.media.length > 1 && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded">
                        {portfolio.media.length} fotos
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <div>
                    <h3 className="font-medium text-zinc-100 line-clamp-2">
                        {portfolio.title || "Sin título"}
                    </h3>
                    {(portfolio.caption || portfolio.description) && (
                        <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
                            {portfolio.caption || portfolio.description}
                        </p>
                    )}
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="capitalize">{portfolio.category || "portfolio"}</span>
                    <span>{new Date(portfolio.created_at).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Link href={`/${studioSlug}/studio/builder/content/portfolios/${portfolio.id}/editar`}>
                        <ZenButton size="sm" variant="secondary" className="flex-1">
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                        </ZenButton>
                    </Link>

                    <ZenButton
                        size="sm"
                        variant="secondary"
                        onClick={handleTogglePublish}
                        disabled={isToggling}
                    >
                        {portfolio.is_published ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </ZenButton>

                    <ZenButton
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        <Trash2 className="w-4 h-4" />
                    </ZenButton>
                </div>
            </div>
        </ZenCard>
    );
}

