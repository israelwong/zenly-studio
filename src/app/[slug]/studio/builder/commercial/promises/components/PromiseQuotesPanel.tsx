'use client';

import React, { useState } from 'react';
import { FileText, Plus, Package, Sparkles } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { toast } from 'sonner';
// Función simple para generar IDs temporales
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateFromPackage = () => {
    // TODO: Abrir modal de selección de paquetes
    toast.info('Selección de paquetes próximamente');
  };

  const handleCreateCustom = () => {
    const newQuote: TempQuote = {
      id: generateTempId(),
      name: `Cotización ${tempQuotes.length + 1}`,
      price: 0,
      type: 'custom',
      createdAt: new Date(),
    };
    onTempQuotesChange([...tempQuotes, newQuote]);
    toast.success('Cotización creada');
  };

  const handleDeleteQuote = (quoteId: string) => {
    onTempQuotesChange(tempQuotes.filter((q) => q.id !== quoteId));
    toast.success('Cotización eliminada');
  };

  if (!eventTypeId) {
    return (
      <div className="flex flex-col h-[600px] bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-zinc-500 text-center px-4">
            Selecciona un tipo de evento para crear cotizaciones
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con acciones */}
      <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="flex gap-2">
          <ZenButton
            variant="outline"
            size="sm"
            onClick={handleCreateFromPackage}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Desde Paquete
          </ZenButton>
          <ZenButton
            size="sm"
            onClick={handleCreateCustom}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Personalizada
          </ZenButton>
        </div>
      </div>

      {/* Lista de cotizaciones */}
      {tempQuotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[500px] bg-zinc-900/50 rounded-lg border border-zinc-800">
          <FileText className="h-10 w-10 text-zinc-600 mb-3" />
          <p className="text-xs text-zinc-500 text-center px-4">
            No hay cotizaciones aún. Crea una desde un paquete o personalizada.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[550px] overflow-y-auto">
          {tempQuotes.map((quote) => (
            <ZenCard key={quote.id} variant="outline">
              <ZenCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <ZenCardTitle className="text-sm">{quote.name}</ZenCardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {quote.type === 'package' ? (
                        <Package className="h-3 w-3 inline" />
                      ) : (
                        <Sparkles className="h-3 w-3 inline" />
                      )}
                    </span>
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Eliminar
                    </ZenButton>
                  </div>
                </div>
              </ZenCardHeader>
              <ZenCardContent>
                <div className="space-y-2">
                  {quote.description && (
                    <p className="text-xs text-zinc-400">{quote.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-300">
                      ${quote.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {quote.type === 'package' ? 'Desde paquete' : 'Personalizada'}
                    </span>
                  </div>
                </div>
              </ZenCardContent>
            </ZenCard>
          ))}
        </div>
      )}

      {!promiseId && tempQuotes.length > 0 && (
        <div className="p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg">
          <p className="text-xs text-blue-300">
            💡 Las cotizaciones se guardarán cuando guardes la promesa
          </p>
        </div>
      )}
    </div>
  );
}

