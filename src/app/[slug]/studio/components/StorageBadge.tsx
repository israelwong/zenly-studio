"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { HardDrive, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { calcularStorageCompleto, type StorageStats } from "@/lib/actions/shared/calculate-storage.actions";
import { useStorageRefreshListener } from "@/hooks/useStorageRefresh";

interface StorageBadgeProps {
    studioSlug: string;
    quotaLimitBytes?: number;
    className?: string;
}

/**
 * Badge compacto de almacenamiento para el header
 * Muestra uso actual y permite expandir para ver detalles
 */
export function StorageBadge({
    studioSlug,
    quotaLimitBytes = 10 * 1024 * 1024 * 1024, // 10GB default
    className = "",
}: StorageBadgeProps) {
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Suscribirse a cambios de storage
    const refreshTrigger = useStorageRefreshListener(studioSlug);

    const cargarStorage = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await calcularStorageCompleto(studioSlug);
            if (result.success && result.data) {
                setStorageStats(result.data);
            }
        } catch (error) {
            console.error("Error cargando storage:", error);
        } finally {
            setIsLoading(false);
        }
    }, [studioSlug]);

    useEffect(() => {
        cargarStorage();
    }, [cargarStorage]);

    // Recargar cuando se dispare el evento de refresh
    useEffect(() => {
        if (refreshTrigger > 0) {
            cargarStorage();
        }
    }, [refreshTrigger, cargarStorage]);

    // Cerrar panel al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded]);

    const totalBytes = storageStats?.totalBytes || 0;
    const percentageUsed = (totalBytes / quotaLimitBytes) * 100;

    const getProgressColor = () => {
        if (percentageUsed > 90) return "text-red-400";
        if (percentageUsed > 70) return "text-yellow-400";
        return "text-green-400";
    };

    const getProgressBgColor = () => {
        if (percentageUsed > 90) return "bg-red-500/20";
        if (percentageUsed > 70) return "bg-yellow-500/20";
        return "bg-green-500/20";
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatQuota = (bytes: number): string => {
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    if (isLoading) {
        return (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/50 ${className}`}>
                <HardDrive className="w-4 h-4 text-zinc-500 animate-pulse" />
                <span className="text-xs text-zinc-500">Cargando...</span>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Badge Principal */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all hover:bg-zinc-800 cursor-pointer group ${getProgressBgColor()}`}
                title={`${formatBytes(totalBytes)} / ${formatQuota(quotaLimitBytes)} (${Math.round(percentageUsed * 10) / 10}%)`}
            >
                <HardDrive className={`w-4 h-4 ${getProgressColor()}`} />
                <span className="text-xs text-zinc-300 font-medium hidden sm:inline">
                    {formatBytes(totalBytes)}
                </span>
                <span className="text-xs text-zinc-500 hidden sm:inline">
                    / {formatQuota(quotaLimitBytes)}
                </span>
                {isExpanded ? (
                    <ChevronUp className="w-3 h-3 text-zinc-400" />
                ) : (
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                )}
            </button>

            {/* Panel Expandido */}
            {isExpanded && storageStats && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
                    <div className="p-4">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-zinc-200">Almacenamiento</h3>
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-zinc-400 hover:text-zinc-200"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Barra de Progreso */}
                        <div className="mb-3">
                            <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                <span>{formatBytes(totalBytes)}</span>
                                <span>{Math.round(percentageUsed * 10) / 10}%</span>
                            </div>
                            <div className="w-full bg-zinc-700 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${percentageUsed > 90 ? "bg-red-500" :
                                        percentageUsed > 70 ? "bg-yellow-500" : "bg-green-500"
                                        }`}
                                    style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400">Categorías</span>
                                <span className="text-zinc-300 font-medium">
                                    {formatBytes(storageStats.categoriesGlobalBytes)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400">Items</span>
                                <span className="text-zinc-300 font-medium">
                                    {formatBytes(storageStats.itemsGlobalBytes)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400">Posts</span>
                                <span className="text-zinc-300 font-medium">
                                    {formatBytes(storageStats.postsGlobalBytes)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400">Portfolios</span>
                                <span className="text-zinc-300 font-medium">
                                    {formatBytes(storageStats.portfoliosGlobalBytes ?? 0)}
                                </span>
                            </div>
                        </div>

                        {/* Advertencia si está cerca del límite */}
                        {percentageUsed > 80 && (
                            <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                <span className="text-xs text-yellow-300">
                                    {percentageUsed > 90
                                        ? "Almacenamiento casi lleno"
                                        : "Almacenamiento alto"
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
