import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import { getCatalogShell } from '@/lib/actions/studio/config/catalogo.actions';
import { obtenerConfiguracionPrecios } from '@/lib/actions/studio/catalogo/utilidad.actions';
import { CatalogoClient } from './components/CatalogoClient';
import { CatalogoHeaderActions } from './components/CatalogoHeaderActions';

interface CatalogoPageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CatalogoPage({ params, searchParams }: CatalogoPageProps) {
    const { slug: studioSlug } = await params;
    const resolvedSearchParams = await searchParams;
    const openUtilidad = resolvedSearchParams?.openUtilidad === '1' || resolvedSearchParams?.openUtilidad === 'true';

    // Cachear catálogo con tag para invalidación selectiva
    // ⚠️ CRÍTICO: Tag incluye studioSlug para aislamiento entre tenants
    const getCachedCatalogShell = unstable_cache(
        async () => {
            return getCatalogShell(studioSlug);
        },
        ['catalog-shell', studioSlug], // ✅ studioSlug en keys
        {
            tags: [`catalog-shell-${studioSlug}`], // ✅ Incluye studioSlug en tags
            revalidate: false, // No cachear por tiempo, solo por tags
        }
    );

    // Cachear configuración de precios (cambia poco)
    const getCachedPreciosConfig = unstable_cache(
        async () => {
            return obtenerConfiguracionPrecios(studioSlug);
        },
        ['precios-config', studioSlug], // ✅ studioSlug en keys
        {
            tags: [`precios-config-${studioSlug}`], // ✅ Incluye studioSlug en tags
            revalidate: 3600, // 1 hora (cambia poco)
        }
    );

    // ⚠️ OPTIMIZADO: Carga completa optimizada (shell + items en una query) con caché
    const [catalogoResult, preciosResult] = await Promise.all([
        getCachedCatalogShell(),
        getCachedPreciosConfig(),
    ]);

    if (!catalogoResult.success || !catalogoResult.data) {
        return (
            <div className="space-y-6">
                <ZenCard variant="default" padding="none">
                    <ZenCardContent className="p-6">
                        <p className="text-red-400">Error al cargar el catálogo: {catalogoResult.error}</p>
                    </ZenCardContent>
                </ZenCard>
            </div>
        );
    }

    // Parsear configuración de precios
    const parseValue = (val: string | undefined, defaultValue: number): number => {
        return val ? parseFloat(val) : defaultValue;
    };

    const preciosConfig = preciosResult ? {
        utilidad_servicio: parseValue(preciosResult.utilidad_servicio, 0.30),
        utilidad_producto: parseValue(preciosResult.utilidad_producto, 0.40),
        comision_venta: parseValue(preciosResult.comision_venta, 0.10),
        sobreprecio: parseValue(preciosResult.sobreprecio, 0.05),
    } : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <ZenCard variant="default" padding="none">
                <ZenCardHeader className="border-b border-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg">
                                <ShoppingBag className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                                <ZenCardTitle>Catálogo</ZenCardTitle>
                                <ZenCardDescription>
                                    Gestiona tu catálogo de servicios y productos
                                </ZenCardDescription>
                            </div>
                        </div>
                        <CatalogoHeaderActions />
                    </div>
                </ZenCardHeader>

                <ZenCardContent className="p-6">
                    <CatalogoClient
                        studioSlug={studioSlug}
                        initialCatalogo={catalogoResult.data}
                        initialPreciosConfig={preciosConfig}
                        initialOpenUtilidad={openUtilidad}
                    />
                </ZenCardContent>
            </ZenCard>
        </div>
    );
}
