'use client';

import { useState, useCallback, useMemo, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Archive, X, MoreVertical, ExternalLink } from 'lucide-react';
import {
  ZenInput,
  ZenButton,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenAvatar,
  ZenAvatarFallback,
} from '@/components/ui/zen';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shadcn/table';
import { moveEvent } from '@/lib/actions/studio/business/events';
import { formatInitials } from '@/lib/actions/utils/formatting';
import { getRelativeDateLabel } from '@/lib/utils/date-formatter';
import { toast } from 'sonner';
import type { EventWithContact, EventPipelineStage } from '@/lib/actions/schemas/events-schemas';
import type { EventsListResponse } from '@/lib/actions/studio/business/events';
import { EventsDeferred } from './EventsDeferred';

interface EventsListClientProps {
  studioSlug: string;
  initialPipelineStages: EventPipelineStage[];
  eventsPromise: Promise<EventsListResponse>;
}

export function EventsListClient({
  studioSlug,
  initialPipelineStages,
  eventsPromise,
}: EventsListClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState<EventWithContact[]>([]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleEventsLoaded = useCallback((loadedEvents: EventWithContact[]) => {
    setEvents(loadedEvents);
  }, []);

  const archivadoStage = useMemo(
    () => initialPipelineStages.find((s) => s.slug === 'archivado'),
    [initialPipelineStages]
  );

  const filteredEvents = useMemo(() => {
    let list = events;
    if (!showArchived) {
      list = list.filter((e) => e.stage?.slug !== 'archivado');
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.contact?.name?.toLowerCase().includes(q) ||
          e.event_type?.name?.toLowerCase().includes(q) ||
          e.address?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const da = new Date(a.event_date).getTime();
      const db = new Date(b.event_date).getTime();
      return da - db;
    });
  }, [events, showArchived, search]);

  const handleVerCronograma = (eventId: string) => {
    window.dispatchEvent(new CustomEvent('close-overlays'));
    startTransition(() => {
      router.push(`/${studioSlug}/studio/business/events/${eventId}`);
    });
  };

  const handleArchivar = async (eventId: string) => {
    if (!archivadoStage) {
      toast.error('No se encontró la etapa de archivado');
      return;
    }
    setArchivingId(eventId);
    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: archivadoStage.id,
      });
      if (result.success) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  stage_id: archivadoStage.id,
                  stage: {
                    id: archivadoStage.id,
                    name: archivadoStage.name,
                    slug: archivadoStage.slug,
                    color: archivadoStage.color,
                    order: archivadoStage.order,
                    stage_type: archivadoStage.stage_type,
                  },
                }
              : e
          )
        );
        toast.success('Evento archivado');
      } else {
        toast.error(result.error || 'Error al archivar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al archivar');
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <EventsDeferred
        studioSlug={studioSlug}
        eventsPromise={eventsPromise}
        onEventsLoaded={handleEventsLoaded}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4 shrink-0">
        <div className="flex-1 w-full relative">
          <ZenInput
            id="search"
            placeholder="Buscar por nombre, cliente, tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
            iconClassName="h-4 w-4"
            className={search ? 'pr-10' : ''}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-300"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            showArchived ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
          }`}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? 'Ocultar' : 'Mostrar'} Archivados
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/60">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-400 font-medium py-3 px-4">Evento</TableHead>
              <TableHead className="text-zinc-400 font-medium py-3 px-4">Cliente</TableHead>
              <TableHead className="text-zinc-400 font-medium py-3 px-4">Fecha</TableHead>
              <TableHead className="text-zinc-400 font-medium py-3 px-4">Presupuesto</TableHead>
              <TableHead className="text-zinc-400 font-medium py-3 px-4">Tareas</TableHead>
              <TableHead className="text-zinc-400 font-medium py-3 px-4 w-[80px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow className="border-zinc-800">
                <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                  {events.length === 0 ? 'Cargando eventos...' : 'No hay eventos que coincidan'}
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <EventListRow
                  key={event.id}
                  event={event}
                  studioSlug={studioSlug}
                  archivadoStage={archivadoStage}
                  onVerCronograma={handleVerCronograma}
                  onArchivar={handleArchivar}
                  isArchiving={archivingId === event.id}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EventListRow({
  event,
  studioSlug,
  archivadoStage,
  onVerCronograma,
  onArchivar,
  isArchiving,
}: {
  event: EventWithContact;
  studioSlug: string;
  archivadoStage: EventPipelineStage | undefined;
  onVerCronograma: (id: string) => void;
  onArchivar: (id: string) => void;
  isArchiving: boolean;
}) {
  const contact = event.contact || event.promise?.contact;
  const { text: dateLabel, variant } = getRelativeDateLabel(event.event_date);
  const dateColor =
    variant === 'destructive' ? 'text-red-400' : variant === 'warning' ? 'text-amber-400' : 'text-emerald-400';
  const total = event.scheduler_tasks_total ?? 0;
  const completed = event.scheduler_tasks_completed ?? 0;
  const progressLabel = total > 0 ? `${completed}/${total}` : '—';
  const isArchived = event.stage?.slug === 'archivado';
  const percentPaid =
    event.contract_value && event.contract_value > 0
      ? ((event.paid_amount / event.contract_value) * 100).toFixed(0)
      : null;

  return (
    <TableRow
      className="border-zinc-800/50 hover:bg-zinc-900/50 transition-colors cursor-pointer group"
      onClick={() => onVerCronograma(event.id)}
    >
      <TableCell className="py-3 px-4">
        <div className="flex items-center gap-3">
          <ZenAvatar className="h-8 w-8 shrink-0">
            <ZenAvatarFallback>{formatInitials(contact?.name || event.name || 'E')}</ZenAvatarFallback>
          </ZenAvatar>
          <div className="min-w-0">
            <p className="font-medium text-zinc-100 truncate">{event.name || 'Sin nombre'}</p>
            {event.event_type && (
              <p className="text-xs text-zinc-500 truncate">{event.event_type.name}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3 px-4">
        <span className="text-sm text-zinc-300 truncate block max-w-[140px]">
          {contact?.name || '—'}
        </span>
      </TableCell>
      <TableCell className="py-3 px-4">
        <span className={`text-sm ${dateColor}`} title={dateLabel}>
          {dateLabel}
        </span>
      </TableCell>
      <TableCell className="py-3 px-4">
        {event.contract_value != null && event.contract_value > 0 ? (
          <div className="text-sm">
            <span className="text-zinc-300">
              ${event.contract_value.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            {percentPaid && (
              <span className="text-zinc-500 ml-1">({percentPaid}% pagado)</span>
            )}
          </div>
        ) : (
          <span className="text-zinc-500 text-sm">—</span>
        )}
      </TableCell>
      <TableCell className="py-3 px-4">
        <span className="text-sm text-zinc-400">{progressLabel}</span>
      </TableCell>
      <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
        <ZenDropdownMenu>
          <ZenDropdownMenuTrigger asChild>
            <ZenButton variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </ZenButton>
          </ZenDropdownMenuTrigger>
          <ZenDropdownMenuContent align="end">
            <ZenDropdownMenuItem onClick={() => onVerCronograma(event.id)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Cronograma
            </ZenDropdownMenuItem>
            {archivadoStage && !isArchived && (
              <ZenDropdownMenuItem
                onClick={() => onArchivar(event.id)}
                disabled={isArchiving}
              >
                <Archive className="h-4 w-4 mr-2" />
                {isArchiving ? 'Archivando...' : 'Archivar'}
              </ZenDropdownMenuItem>
            )}
          </ZenDropdownMenuContent>
        </ZenDropdownMenu>
      </TableCell>
    </TableRow>
  );
}
