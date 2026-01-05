"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PortfolioCard } from "./PortfolioCard";
import { PortfolioCardSkeleton } from "./PortfolioCardSkeleton";
import { EmptyState } from "./EmptyState";
import { getStudioPortfoliosBySlug } from "@/lib/actions/studio/portfolios/portfolios.actions";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ZenButton } from "@/components/ui/zen";
import { StudioPortfolio } from "@/types/studio-portfolios";

interface PortfoliosListProps {
    studioSlug: string;
    onPortfoliosChange?: (portfolios: StudioPortfolio[]) => void;
}

export function PortfoliosList({ studioSlug, onPortfoliosChange }: PortfoliosListProps) {
    const [allPortfolios, setAllPortfolios] = useState<StudioPortfolio[]>([]); // Todos los portfolios cargados
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [error, setError] = useState<string | null>(null);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousFilteredPortfoliosRef = useRef<StudioPortfolio[]>([]);
    const onPortfoliosChangeRef = useRef(onPortfoliosChange);
    // Constante para paginación: siempre 5 portfolios por página
    const PORTFOLIOS_PER_PAGE = 5;

    // Actualizar ref cuando cambia onPortfoliosChange
    useEffect(() => {
        onPortfoliosChangeRef.current = onPortfoliosChange;
    }, [onPortfoliosChange]);

    // Filtrar portfolios localmente según el filtro seleccionado
    const filteredPortfolios = useMemo(() => {
        return allPortfolios.filter((portfolio) => {
            if (filter === "all") return true;
            if (filter === "published") return portfolio.is_published === true;
            if (filter === "unpublished") return portfolio.is_published === false && portfolio.published_at !== null;
            if (filter === "featured") return portfolio.is_featured === true;
            if (filter === "draft") return portfolio.is_published === false && portfolio.published_at === null;
            return true;
        });
    }, [allPortfolios, filter]);

    // Portfolios para la página actual (estos son los que se muestran en la lista y en el preview móvil)
    // Siempre muestra exactamente PORTFOLIOS_PER_PAGE (5) portfolios por página
    const paginatedPortfolios = useMemo(() => {
        const startIndex = (currentPage - 1) * PORTFOLIOS_PER_PAGE;
        const endIndex = startIndex + PORTFOLIOS_PER_PAGE;
        return filteredPortfolios.slice(startIndex, endIndex);
    }, [filteredPortfolios, currentPage, PORTFOLIOS_PER_PAGE]);

    // Calcular total de páginas
    const totalPages = useMemo(() => {
        return Math.ceil(filteredPortfolios.length / PORTFOLIOS_PER_PAGE);
    }, [filteredPortfolios.length, PORTFOLIOS_PER_PAGE]);

    // Resetear a página 1 cuando cambia el filtro
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    // Notificar cambios de portfolios al componente padre (portfolios de la página actual para preview móvil)
    useEffect(() => {
        if (onPortfoliosChangeRef.current) {
            // Comparar IDs para evitar notificaciones innecesarias
            const currentIds = paginatedPortfolios.map(p => p.id).sort().join(',');
            const previousIds = previousFilteredPortfoliosRef.current.map(p => p.id).sort().join(',');

            if (currentIds !== previousIds) {
                onPortfoliosChangeRef.current(paginatedPortfolios);
                previousFilteredPortfoliosRef.current = paginatedPortfolios;
            }
        }
    }, [paginatedPortfolios]); // Depender de paginatedPortfolios (página actual)

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    const loadPortfolios = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Siempre cargar todos los portfolios sin filtros del servidor
            const result = await getStudioPortfoliosBySlug(studioSlug, undefined);
            if (result.success) {
                // Los portfolios ya vienen ordenados de la DB (destacados primero, luego por creación)
                // Pero asegurémonos de que estén ordenados correctamente
                const sortedPortfolios = (result.data || []).sort((a, b) => {
                    // Destacados primero
                    if (a.is_featured && !b.is_featured) return -1;
                    if (!a.is_featured && b.is_featured) return 1;
                    // Luego por fecha de creación (más nueva primero)
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });
                setAllPortfolios(sortedPortfolios);
            } else {
                const errorMessage = result.error || "Error al cargar portfolios";
                setError(errorMessage);
                toast.error(errorMessage);
                setAllPortfolios([]);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error inesperado al cargar portfolios";
            console.error("Error loading portfolios:", error);
            setError(errorMessage);
            toast.error(errorMessage);
            setAllPortfolios([]);
        } finally {
            setLoading(false);
        }
    }, [studioSlug]); // Eliminar filter de las dependencias

    useEffect(() => {
        loadPortfolios();
    }, [loadPortfolios]);

    const filterOptions = [
        { value: "all", label: "Todos" },
        { value: "published", label: "Publicados" },
        { value: "unpublished", label: "No publicados" },
        { value: "featured", label: "Destacados" },
        { value: "draft", label: "Borradores" },
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
                    onClick={() => loadPortfolios()}
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                    Intentar nuevamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters - Botones en línea con scroll horizontal - Siempre visibles */}
            <div className="flex items-center gap-2">
                <div
                    className="flex items-center gap-2 overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                    {filterOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                // Toggle: si el filtro ya está activo, volver a "all"
                                if (filter === option.value) {
                                    setFilter("all");
                                } else {
                                    setFilter(option.value);
                                }
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${filter === option.value
                                ? 'bg-emerald-500 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <span className="text-sm text-zinc-400 whitespace-nowrap flex-shrink-0 ml-2">
                    {filteredPortfolios.length} portfolio{filteredPortfolios.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Portfolios List - Horizontal Cards */}
            {filteredPortfolios.length === 0 ? (
                <EmptyState studioSlug={studioSlug} />
            ) : (
                <>
                    <div className="space-y-3">
                        {/* Skeleton mientras se duplica */}
                        {isDuplicating && (
                            <PortfolioCardSkeleton />
                        )}
                        {paginatedPortfolios.map((portfolio) => (
                            <PortfolioCard
                                key={portfolio.id}
                                portfolio={portfolio}
                                studioSlug={studioSlug}
                                onDuplicatingStart={() => setIsDuplicating(true)}
                                onUpdate={(updatedPortfolio) => {
                                    if (updatedPortfolio === null) {
                                        // Eliminación: remover portfolio de la lista local (sin sincronización inmediata)
                                        setAllPortfolios(prevPortfolios =>
                                            prevPortfolios.filter(p => p.id !== portfolio.id)
                                        );
                                        // No sincronizar después de eliminación, solo actualizar localmente
                                        return;
                                    } else {
                                        // Actualización optimista local - inserta nuevo o actualiza existente
                                        setAllPortfolios(prevPortfolios => {
                                            // Verificar si es un nuevo portfolio (duplicación) usando el estado anterior
                                            const isNewPortfolio = !prevPortfolios.some(p => p.id === updatedPortfolio.id);

                                            let updated: StudioPortfolio[];

                                            if (isNewPortfolio) {
                                                // Duplicación: insertar nuevo portfolio al inicio de la lista
                                                updated = [updatedPortfolio, ...prevPortfolios];
                                            } else {
                                                // Actualización: reemplazar portfolio existente
                                                updated = prevPortfolios.map(p =>
                                                    p.id === updatedPortfolio.id ? updatedPortfolio : p
                                                );
                                            }

                                            // Reordenar: destacados primero, luego por creación
                                            return updated.sort((a, b) => {
                                                if (a.is_featured && !b.is_featured) return -1;
                                                if (!a.is_featured && b.is_featured) return 1;
                                                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                                return dateB - dateA;
                                            });
                                        });

                                        // Ocultar skeleton después de actualizar la lista (reemplazo instantáneo)
                                        setIsDuplicating(false);
                                    }

                                    // Sincronización silenciosa en background (sin mostrar loading)
                                    // Solo sincronizar si NO es solo un cambio de is_featured
                                    const isOnlyFeaturedChange = updatedPortfolio !== null &&
                                        updatedPortfolio.id === portfolio.id &&
                                        updatedPortfolio.is_featured !== portfolio.is_featured &&
                                        updatedPortfolio.is_published === portfolio.is_published;

                                    if (!isOnlyFeaturedChange) {
                                        // Cancela sincronización anterior si hay otra actualización
                                        if (syncTimeoutRef.current) {
                                            clearTimeout(syncTimeoutRef.current);
                                        }

                                        syncTimeoutRef.current = setTimeout(async () => {
                                            try {
                                                // Recargar todos los portfolios del servidor
                                                const result = await getStudioPortfoliosBySlug(studioSlug, undefined);
                                                if (result.success && result.data) {
                                                    // Actualizar con datos del servidor y asegurar orden correcto
                                                    const sortedPortfolios = result.data.sort((a, b) => {
                                                        if (a.is_featured && !b.is_featured) return -1;
                                                        if (!a.is_featured && b.is_featured) return 1;
                                                        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                                        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                                        return dateB - dateA;
                                                    });
                                                    setAllPortfolios(sortedPortfolios);
                                                }
                                            } catch (error) {
                                                // Fallar silenciosamente, la UI ya está actualizada
                                                console.error("Error sincronizando portfolios:", error);
                                            }
                                            syncTimeoutRef.current = null;
                                        }, 2000);
                                    }
                                }}
                            />
                        ))}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                            <div className="text-sm text-zinc-400">
                                Mostrando {paginatedPortfolios.length} de {filteredPortfolios.length} portfolios
                            </div>
                            <div className="flex items-center gap-2">
                                <ZenButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </ZenButton>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-3 py-1 text-sm rounded-md transition-colors ${currentPage === page
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <ZenButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </ZenButton>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
