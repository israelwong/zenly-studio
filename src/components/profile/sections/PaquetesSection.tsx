import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import { PublicPaquete } from '@/types/public-profile';
import { PaqueteCarousel } from './PaqueteCarousel';
import { PaqueteCard } from './PaqueteCard';

interface PaquetesSectionProps {
    paquetes: PublicPaquete[];
}

/**
 * PaquetesSection - Display for studio packages
 * Shows packages grouped by event type with cover images and carousel for multiple packages
 */
export function PaquetesSection({ paquetes }: PaquetesSectionProps) {
    // Agrupar paquetes por tipo de evento y ordenar por el campo 'order' de studio_event_types
    const paquetesPorTipo = useMemo(() => {
        const grouped: Record<string, { paquetes: PublicPaquete[]; order: number }> = {};

        paquetes.forEach((paquete) => {
            const tipoEvento = paquete.tipo_evento || 'Sin categoría';
            // tipo_evento_order viene del campo 'order' de studio_event_types (relación 1:N)
            const tipoEventoOrder = (paquete as { tipo_evento_order?: number }).tipo_evento_order;
            if (!grouped[tipoEvento]) {
                grouped[tipoEvento] = {
                    paquetes: [],
                    order: tipoEventoOrder ?? 999999, // Sin orden al final
                };
            }
            grouped[tipoEvento].paquetes.push(paquete);
            // Todos los paquetes del mismo tipo de evento tienen el mismo order
            // pero mantenemos el mínimo por si acaso hay inconsistencias
            if (tipoEventoOrder !== undefined && grouped[tipoEvento].order > tipoEventoOrder) {
                grouped[tipoEvento].order = tipoEventoOrder;
            }
        });

        // Ordenar paquetes dentro de cada grupo por su propio order (studio_paquetes.order)
        Object.keys(grouped).forEach((tipo) => {
            grouped[tipo].paquetes.sort((a, b) => a.order - b.order);
        });

        return grouped;
    }, [paquetes]);

    if (paquetes.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="text-zinc-400 mb-2">
                    <Package className="h-12 w-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    Sin paquetes disponibles
                </h3>
                <p className="text-sm text-zinc-500">
                    Este estudio aún no tiene paquetes configurados
                </p>
            </div>
        );
    }

    // Ordenar tipos de evento por el campo 'order' de studio_event_types
    const tiposEvento = Object.keys(paquetesPorTipo).sort((a, b) => {
        return paquetesPorTipo[a].order - paquetesPorTipo[b].order;
    });

    return (
        <div className="p-4 space-y-8">
            {/* Paquetes por tipo de evento */}
            {tiposEvento.map((tipoEvento) => {
                const paquetesDelTipo = paquetesPorTipo[tipoEvento].paquetes;
                const hasMultiple = paquetesDelTipo.length > 1;

                return (
                    <div key={tipoEvento} className="space-y-4">
                        {/* Título minimalista del tipo de evento */}
                        <h3 className="text-lg font-medium text-zinc-300">
                            {tipoEvento}
                        </h3>

                        {/* Paquetes: Carousel si hay múltiples, Card si solo hay uno */}
                        {hasMultiple ? (
                            <PaqueteCarousel paquetes={paquetesDelTipo} />
                        ) : (
                            <PaqueteCard paquete={paquetesDelTipo[0]} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
