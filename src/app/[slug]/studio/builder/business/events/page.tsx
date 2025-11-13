'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Search } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenInput, ZenButton } from '@/components/ui/zen';
import { obtenerEventos } from '@/lib/actions/studio/builder/business/events/events.actions';
import type { EventoBasico } from '@/lib/actions/studio/builder/business/events/events.actions';
import { toast } from 'sonner';
import Link from 'next/link';

export default function EventsPage() {
  const params = useParams();
  const studioSlug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState<EventoBasico[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadEventos = async () => {
      try {
        setLoading(true);
        const result = await obtenerEventos(studioSlug);

        if (result.success && result.data) {
          setEventos(result.data);
        } else {
          toast.error(result.error || 'Error al cargar eventos');
        }
      } catch (error) {
        console.error('Error loading eventos:', error);
        toast.error('Error al cargar eventos');
      } finally {
        setLoading(false);
      }
    };

    loadEventos();
  }, [studioSlug]);

  const filteredEventos = eventos.filter((evento) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      evento.name?.toLowerCase().includes(searchLower) ||
      evento.contact?.name.toLowerCase().includes(searchLower) ||
      evento.event_type?.name.toLowerCase().includes(searchLower) ||
      evento.promise?.contact?.name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ZenCard variant="default" padding="none">
        <ZenCardHeader className="border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <ZenCardTitle>Eventos</ZenCardTitle>
              <ZenCardDescription>
                Gestiona tus eventos autorizados y sus pagos
              </ZenCardDescription>
            </div>
          </div>
        </ZenCardHeader>

        <ZenCardContent className="p-6">
          <div className="space-y-6">
            {/* Búsqueda */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <ZenInput
                  type="text"
                  placeholder="Buscar eventos por nombre, cliente o tipo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={Search}
                  iconPosition="left"
                />
              </div>
            </div>

            {/* Lista de eventos */}
            {loading ? (
              <div className="text-center py-12 text-zinc-400">
                Cargando eventos...
              </div>
            ) : filteredEventos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400 mb-4">
                  {search ? 'No se encontraron eventos con ese criterio' : 'No hay eventos disponibles'}
                </p>
                {!search && (
                  <p className="text-sm text-zinc-500">
                    Los eventos aparecerán aquí después de autorizar cotizaciones
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEventos.map((evento) => (
                  <Link
                    key={evento.id}
                    href={`/${studioSlug}/studio/builder/business/events/${evento.id}`}
                  >
                    <ZenCard variant="outlined" className="hover:border-blue-500/50 transition-colors cursor-pointer h-full">
                      <ZenCardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold text-white text-lg">
                              {evento.name || 'Sin nombre'}
                            </h3>
                            {evento.event_type && (
                              <p className="text-sm text-zinc-400 mt-1">
                                {evento.event_type.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2 text-sm">
                            {evento.contact && (
                              <div className="flex items-center gap-2 text-zinc-300">
                                <span className="text-zinc-500">Contacto:</span>
                                <span>{evento.contact.name}</span>
                              </div>
                            )}
                            {evento.promise?.contact && (
                              <div className="flex items-center gap-2 text-zinc-300">
                                <span className="text-zinc-500">Contacto:</span>
                                <span>{evento.promise.contact.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-zinc-300">
                              <span className="text-zinc-500">Fecha:</span>
                              <span>
                                {new Date(evento.event_date).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-800">
                            <span className="text-xs text-blue-400 font-medium">
                              Ver detalles →
                            </span>
                          </div>
                        </div>
                      </ZenCardContent>
                    </ZenCard>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </ZenCardContent>
      </ZenCard>
    </div>
  );
}

