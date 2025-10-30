"use client";

import { useState, useEffect, useCallback } from "react";
import { PortfolioCard } from "./PortfolioCard";
import { EmptyState } from "./EmptyState";
import { getStudioPortfoliosBySlug } from "@/lib/actions/studio/builder/portfolios/portfolios.actions";
import { ZenSelect } from "@/components/ui/zen";
import { Loader2 } from "lucide-react";
import { StudioPortfolio } from "@/types/studio-portfolios";

interface PortfoliosListProps {
    studioSlug: string;
}

export function PortfoliosList({ studioSlug }: PortfoliosListProps) {
    const [portfolios, setPortfolios] = useState<StudioPortfolio[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");

    const loadPortfolios = useCallback(async () => {
        setLoading(true);
        try {
            const filters = filter === "all" ? undefined : {
                is_published: filter === "published",
                category: filter !== "all" && filter !== "published" ? filter as "portfolio" | "blog" | "promo" : undefined,
            };

            const result = await getStudioPortfoliosBySlug(studioSlug, filters);
            if (result.success) {
                setPortfolios(result.data);
            }
        } catch (error) {
            console.error("Error loading portfolios:", error);
        } finally {
            setLoading(false);
        }
    }, [filter, studioSlug]);

    useEffect(() => {
        loadPortfolios();
    }, [loadPortfolios]);

    const filterOptions = [
        { value: "all", label: "Todos" },
        { value: "published", label: "Publicados" },
        { value: "portfolio", label: "Portfolio" },
        { value: "blog", label: "Blog" },
        { value: "promo", label: "Promoción" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (portfolios.length === 0) {
        return <EmptyState studioSlug={studioSlug} />;
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
                <ZenSelect
                    value={filter}
                    onValueChange={setFilter}
                    options={filterOptions}
                    placeholder="Filtrar portfolios"
                />
                <span className="text-sm text-zinc-400">
                    {portfolios.length} portfolio{portfolios.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Portfolios Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolios.map((portfolio) => (
                    <PortfolioCard
                        key={portfolio.id}
                        portfolio={portfolio}
                        studioSlug={studioSlug}
                        onUpdate={loadPortfolios}
                    />
                ))}
            </div>
        </div>
    );
}

