'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, Sparkles, Loader2 } from 'lucide-react';
import {
  ZenButton,
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { PromiseCotizacionCard } from './PromiseCotizacionCard';
import { obtenerPaquetes } from '@/lib/actions/studio/builder/paquetes/paquetes.actions';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface TempQuote {
  id: string; // cuid temporal
  name: string;
  price: number;
  description?: string;
  type: 'package' | 'custom';
  packageId?: string;
  createdAt: Date;
}

interface PromiseQuotesPanelProps {
  studioSlug: string;
  promiseId: string | null;
  eventTypeId: string | null;
  tempQuotes: TempQuote[];
  onTempQuotesChange: (quotes: TempQuote[]) => void;
}

export function PromiseQuotesPanel({
  studioSlug,
  promiseId,
  eventTypeId,
  tempQuotes,
  onTempQuotesChange,
}: PromiseQuotesPanelProps) {
  const router = useRouter();
  const [packages, setPackages] = useState<Array<{ id: string; name: string; precio: number | null }>>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadPackages = async () => {
      if (!eventTypeId) {
        setPackages([]);
        setLoadingPackages(false);
        return;
      }
      setLoadingPackages(true);
      try {
        const result = await obtenerPaquetes(studioSlug);
        if (result.success && result.data) {
          // Filtrar paquetes por tipo de evento si está disponible
          const filteredPackages = result.data
            .filter((pkg: PaqueteFromDB) => {
              // Si el paquete tiene event_types, filtrar por eventTypeId
              if (pkg.event_types) {
                return pkg.event_types.id === eventTypeId;
              }
              return true; // Si no tiene tipo de evento, incluir todos
            })
            .map((pkg: PaqueteFromDB) => ({
              id: pkg.id,
              name: pkg.name,
              precio: pkg.precio || null,
            }));
          setPackages(filteredPackages);
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };

    loadPackages();
  }, [studioSlug, eventTypeId]);

  const handleCreateFromPackage = (packageId: string) => {
    // Navegar a la ruta de nueva cotización con el paqueteId como parámetro
    const basePath = `/${studioSlug}/studio/builder/commercial/promises/cotizacion/nueva`;
    const params = new URLSearchParams();
    if (packageId) {
      params.set('paqueteId', packageId);
    }
    if (promiseId) {
      params.set('promiseId', promiseId);
    }
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ''}`);
  };

  const handleCreateCustom = () => {
    // Navegar a la ruta de nueva cotización sin paqueteId (personalizada)
    const basePath = `/${studioSlug}/studio/builder/commercial/promises/cotizacion/nueva`;
    const params = new URLSearchParams();
    if (promiseId) {
      params.set('promiseId', promiseId);
    }
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ''}`);
  };

  const handleDeleteQuote = (quoteId: string) => {
    onTempQuotesChange(tempQuotes.filter((q) => q.id !== quoteId));
  };

  const isMenuDisabled = !eventTypeId;

  return (
    <ZenCard variant="outlined" className="min-h-[300px] h-full flex flex-col">
      <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">Cotizaciones</ZenCardTitle>
          <ZenDropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <ZenDropdownMenuTrigger asChild>
              <ZenButton
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={isMenuDisabled}
              >
                <Plus className="h-3.5 w-3.5" />
              </ZenButton>
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="end" className="min-w-[200px]">
              {loadingPackages ? (
                <div className="px-2 py-3 flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando paquetes...</span>
                </div>
              ) : packages.length > 0 ? (
                <>
                  {packages.map((pkg) => (
                    <ZenDropdownMenuItem
                      key={pkg.id}
                      onClick={() => handleCreateFromPackage(pkg.id)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      <span className="flex-1">{pkg.name}</span>
                      {pkg.precio !== null && (
                        <span className="text-xs text-zinc-400 ml-2">
                          ${pkg.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </ZenDropdownMenuItem>
                  ))}
                  <ZenDropdownMenuSeparator />
                  <ZenDropdownMenuItem onClick={handleCreateCustom}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Personalizada
                  </ZenDropdownMenuItem>
                </>
              ) : (
                <ZenDropdownMenuItem onClick={handleCreateCustom}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Personalizada
                </ZenDropdownMenuItem>
              )}
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="p-4 flex-1 flex flex-col min-h-0">
        {!eventTypeId ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[200px]">
            <p className="text-xs text-zinc-500 text-center px-4">
              Selecciona un tipo de evento para crear cotizaciones
            </p>
          </div>
        ) : tempQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[200px]">
            <p className="text-xs text-zinc-500 text-center px-4">
              No hay cotizaciones asociadas a esta promesa
            </p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
            {tempQuotes.map((quote) => (
              <PromiseCotizacionCard
                key={quote.id}
                id={quote.id}
                name={quote.name}
                price={quote.price}
                description={quote.description}
                type={quote.type}
                packageId={quote.packageId}
                createdAt={quote.createdAt}
                onDelete={handleDeleteQuote}
              />
            ))}
          </div>
        )}

        {!promiseId && tempQuotes.length > 0 && (
          <div className="mt-4 p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg flex-shrink-0">
            <p className="text-xs text-blue-300">
              💡 Las cotizaciones se guardarán cuando guardes la promesa
            </p>
          </div>
        )}
      </ZenCardContent>
    </ZenCard>
  );
}

