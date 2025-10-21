"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ZenCard } from "@/components/ui/zen";
import { AlertCircle, HardDrive } from "lucide-react";
import { calcularStorageCompleto, type StorageStats } from "@/lib/actions/studio/builder/catalogo/calculate-storage.actions";
import { useStorageRefreshListener } from "@/hooks/useStorageRefresh";

interface StorageIndicatorProps {
    studioSlug: string;
    quotaLimitBytes?: number;
    className?: string;
}

/**
 * Componente que muestra el uso de almacenamiento del studio
 * Obtiene datos en tiempo real calculados desde tablas de media
 * FUENTE ÚNICA DE VERDAD: calcularStorageCompleto
 */
export function StorageIndicator({
    studioSlug,
    quotaLimitBytes = 10 * 1024 * 1024 * 1024, // 10GB default
    className = "",
}: StorageIndicatorProps) {
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
    
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

    const totalBytes = storageStats?.totalBytes || 0;
    const percentageUsed = (totalBytes / quotaLimitBytes) * 100;

    const getProgressColor = () => {
        if (percentageUsed > 90) return "bg-red-500";
        if (percentageUsed > 70) return "bg-yellow-500";
        return "bg-green-500";
    };

    const getProgressBgColor = () => {
        if (percentageUsed > 90) return "bg-red-100";
        if (percentageUsed > 70) return "bg-yellow-100";
        return "bg-green-100";
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    const usedFormatted = formatBytes(totalBytes);
    const quotaFormatted = formatBytes(quotaLimitBytes);
    const percentageFormatted = Math.round(percentageUsed * 10) / 10;

    if (isLoading) {
        return (
            <ZenCard className={`p-4 ${className}`}>
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                    <div className="h-2 bg-zinc-800 rounded"></div>
                </div>
            </ZenCard>
        );
    }

    return (
        <ZenCard
            className={`p-4 ${className} cursor-pointer transition-colors hover:bg-zinc-800/50`}
            onClick={() => storageStats && storageStats.sections.length > 0 && setIsBreakdownOpen(!isBreakdownOpen)}
        >
            <div className="space-y-2">
                {/* Encabezado */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-zinc-400" />
                        <h3 className="text-sm font-semibold text-zinc-200">
                            Almacenamiento
                        </h3>
                    </div>
                    {percentageUsed > 90 && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                </div>

                {/* Barra de progreso + Botón colapsable en una fila */}
                <div className="space-y-2">
                    {/* Info text */}
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">
                            {usedFormatted} / {quotaFormatted}
                        </span>
                        <span
                            className={`font-medium ${percentageUsed > 90
                                ? "text-red-400"
                                : percentageUsed > 70
                                    ? "text-yellow-400"
                                    : "text-green-400"
                                }`}
                        >
                            {percentageFormatted}%
                        </span>
                    </div>

                    {/* Progress bar + Collapse chevron same row */}
                    <div className="flex items-center gap-2">
                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${getProgressBgColor()}`}>
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
                                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                            />
                        </div>

                        {/* Chevron icono */}
                        {storageStats && storageStats.sections.length > 0 && (
                            <span className="flex-shrink-0 text-zinc-400 text-sm">
                                ▼
                            </span>
                        )}
                    </div>
                </div>

                {/* Desglose expandible */}
                {storageStats && storageStats.sections.length > 0 && isBreakdownOpen && (
                    <div className="space-y-2 p-3 rounded border border-zinc-700 bg-zinc-800/30">
                        <div className="space-y-1">
                            {storageStats.sections.map((section) => (
                                <div key={section.sectionId} className="flex justify-between text-xs">
                                    <span className="truncate text-zinc-400">{section.sectionName}</span>
                                    <span className="flex-shrink-0 text-zinc-300">{formatBytes(section.subtotal)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2 border-t border-zinc-700">
                            <div className="flex justify-between text-xs text-zinc-300 mb-1">
                                <span>Total Categorías:</span>
                                <span>{formatBytes(storageStats.categoriesGlobalBytes)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-zinc-300">
                                <span>Total Items:</span>
                                <span>{formatBytes(storageStats.itemsGlobalBytes)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Advertencia si está cerca del límite */}
                {percentageUsed > 90 && (
                    <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">
                            ⚠️ Casi alcanzaste el límite de almacenamiento. Considera actualizar
                            tu plan.
                        </p>
                    </div>
                )}
            </div>
        </ZenCard>
    );
}
