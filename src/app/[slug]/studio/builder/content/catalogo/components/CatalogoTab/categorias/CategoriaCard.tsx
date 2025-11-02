"use client";

import React from "react";
import { ZenCard } from "@/components/ui/zen";
import { ChevronRight, Tag } from "lucide-react";

interface CategoriaCardProps {
    id: string;
    name: string;
    description?: string;
    itemCount: number;
    mediaCount?: number;
    onClick: () => void;
}

/**
 * Card individual para una categoría
 */
export function CategoriaCard({
    name,
    description,
    itemCount,
    mediaCount = 0,
    onClick,
}: CategoriaCardProps) {
    return (
        <ZenCard
            className="p-4 hover:bg-zinc-800/80 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                        <Tag className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
                        <h3 className="font-semibold text-zinc-100 break-words">{name}</h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                </div>

                {description && (
                    <p className="text-xs text-zinc-400 break-words">{description}</p>
                )}

                <div className="pt-2 border-t border-zinc-800 space-y-1 text-xs text-zinc-400">
                    <div className="flex justify-between">
                        <span>Items:</span>
                        <span className="font-medium">{itemCount}</span>
                    </div>
                    {mediaCount > 0 && (
                        <div className="flex justify-between">
                            <span>Media:</span>
                            <span className="font-medium">{mediaCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </ZenCard>
    );
}
