"use client";

import Link from "next/link";
import { ZenButton } from "@/components/ui/zen";
import { Plus, Grid3X3 } from "lucide-react";

interface EmptyStateProps {
    studioSlug?: string;
}

export function EmptyState({ studioSlug }: EmptyStateProps) {
    return (
        <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-zinc-800 rounded-full flex items-center justify-center">
                <Grid3X3 className="w-12 h-12 text-zinc-400" />
            </div>

            <h3 className="text-xl font-semibold text-zinc-100 mb-2">
                No hay portfolios aún
            </h3>

            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                Crea tu primer portfolio para mostrar tu trabajo de forma profesional.
                Incluye bloques de contenido avanzados, galerías y más.
            </p>

            {studioSlug && (
                <Link href={`/${studioSlug}/studio/builder/content/portfolios/nuevo`}>
                    <ZenButton className="gap-2">
                        <Plus className="w-4 h-4" />
                        Crear mi primer portfolio
                    </ZenButton>
                </Link>
            )}
        </div>
    );
}

