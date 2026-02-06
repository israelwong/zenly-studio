'use client';

import { useState, useMemo, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Archive, X, Pencil, Loader2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  ZenInput,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
} from '@/components/ui/zen';
import { EventKanbanCard } from './EventKanbanCard';
import { moveEvent, updateEventPipelineStage } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import type { EventWithContact, EventPipelineStage } from '@/lib/actions/schemas/events-schemas';

interface EventsKanbanProps {
  studioSlug: string;
  events: EventWithContact[];
  pipelineStages: EventPipelineStage[];
  search: string;
  onSearchChange: (search: string) => void;
  onEventMoved: () => void;
  onPipelineStagesUpdated: () => void;
  isNavigating?: string | null;
  setIsNavigating?: (eventId: string | null) => void;
}

export function EventsKanban({
  studioSlug,
  events,
  pipelineStages,
  search: externalSearch,
  onSearchChange,
  onEventMoved,
  onPipelineStagesUpdated,
  isNavigating,
  setIsNavigating,
}: EventsKanbanProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeEventStageId, setActiveEventStageId] = useState<string | null>(null);
  const [localEvents, setLocalEvents] = useState<EventWithContact[]>(events);
  const prevEventsRef = useRef<EventWithContact[]>(events);
  const isDraggingRef = useRef(false);
  const [showArchived, setShowArchived] = useState(false);
  const [localSearch, setLocalSearch] = useState(externalSearch || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sortStagesByOrder = useCallback((stages: EventPipelineStage[]) =>
    [...stages].sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id))), []);

  const [localPipelineStages, setLocalPipelineStages] = useState<EventPipelineStage[]>(() =>
    sortStagesByOrder(pipelineStages)
  );

  useEffect(() => {
    const pipelineIds = pipelineStages.map((s) => s.id);
    const localIds = localPipelineStages.map((s) => s.id);
    const hasOrderChanges =
      pipelineIds.length !== localIds.length ||
      pipelineIds.some((id, index) => id !== localIds[index]) ||
      pipelineStages.some((stage) => {
        const localStage = localPipelineStages.find((s) => s.id === stage.id);
        return !localStage || stage.order !== localStage.order;
      });
    if (hasOrderChanges) {
      setLocalPipelineStages(sortStagesByOrder(pipelineStages));
    } else {
      setLocalPipelineStages((prev) =>
        sortStagesByOrder(
          prev.map((localStage) => {
            const updated = pipelineStages.find((s) => s.id === localStage.id);
            if (updated) {
              return { ...localStage, name: updated.name, color: updated.color };
            }
            return localStage;
          })
        )
      );
    }
  }, [pipelineStages]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateLocalStage = useCallback((stageId: string, updates: Partial<EventPipelineStage>) => {
    setLocalPipelineStages((prev) =>
      prev.map((stage) =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      )
    );
  }, []);

  // Sincronizar estado local cuando cambian los eventos desde el padre
  // Evitar sincronización durante drag and drop o navegación para prevenir parpadeos
  useEffect(() => {
    // Si estamos arrastrando, no sincronizar
    if (isDraggingRef.current) {
      prevEventsRef.current = events;
      return;
    }

    // Si estamos navegando, no sincronizar (previene race condition)
    if (isNavigating) {
      prevEventsRef.current = events;
      return;
    }

    // Comparar con la referencia anterior para detectar cambios reales
    const prevIds = new Set(prevEventsRef.current.map(e => e.id));
    const newIds = new Set(events.map(e => e.id));

    const hasIdChanges =
      prevIds.size !== newIds.size ||
      [...prevIds].some(id => !newIds.has(id)) ||
      [...newIds].some(id => !prevIds.has(id));

    // Solo sincronizar si hay cambios en IDs (nuevos/eliminados eventos)
    // No sincronizar por cambios de stage_id ya que se manejan con actualización optimista
    if (hasIdChanges || localEvents.length === 0) {
      setLocalEvents(events);
    }

    prevEventsRef.current = events;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, isNavigating]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Activar drag después de 8px de movimiento
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sincronizar búsqueda externa
  useEffect(() => {
    if (externalSearch !== undefined && externalSearch !== localSearch) {
      setLocalSearch(externalSearch);
    }
  }, [externalSearch, localSearch]);

  // Manejar tecla Escape para limpiar búsqueda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setLocalSearch('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtrar eventos por búsqueda local
  const filteredEvents = useMemo(() => {
    if (!localSearch.trim()) return localEvents;

    const searchLower = localSearch.toLowerCase();
    return localEvents.filter((e) => {
      const nameMatch = e.name?.toLowerCase().includes(searchLower);
      const contactMatch = e.contact?.name.toLowerCase().includes(searchLower);
      const eventTypeMatch = e.event_type?.name.toLowerCase().includes(searchLower);
      const addressMatch = e.address?.toLowerCase().includes(searchLower);

      return nameMatch || contactMatch || eventTypeMatch || addressMatch;
    });
  }, [localEvents, localSearch]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    searchInputRef.current?.focus();
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  // Ordenar eventos: por fecha de evento
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateA = new Date(a.event_date).getTime();
      const dateB = new Date(b.event_date).getTime();
      return dateA - dateB; // Más cercana primero
    });
  }, [filteredEvents]);

  // Filtrar stages según toggle de archivados; orden estricto por order (BD)
  const visibleStages = useMemo(() => {
    const base = showArchived ? localPipelineStages : localPipelineStages.filter((s) => s.slug !== 'archivado');
    return sortStagesByOrder(base);
  }, [localPipelineStages, showArchived]); // eslint-disable-line react-hooks/exhaustive-deps

  const droppableStageIds = useMemo(
    () => new Set(visibleStages.map((s) => s.id)),
    [visibleStages]
  );

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointerIntersections = pointerWithin(args);
      const cornersCollisions = closestCorners(args);
      const allCollisions = [...pointerIntersections, ...cornersCollisions];
      const columnCollisions = allCollisions.filter((c) => droppableStageIds.has(c.id as string));
      if (columnCollisions.length > 0) return [columnCollisions[0]];
      if (activeEventStageId && droppableStageIds.has(activeEventStageId)) return [{ id: activeEventStageId }];
      const closestColumn = cornersCollisions.find((c) => droppableStageIds.has(c.id as string));
      if (closestColumn) return [closestColumn];
      return [];
    },
    [droppableStageIds, activeEventStageId]
  );

  // Agrupar eventos por stage
  const eventsByStage = useMemo(() => {
    const defaultStage = visibleStages
      .filter((s) => s.slug !== 'archivado')
      .sort((a, b) => a.order - b.order)[0];

    return visibleStages.reduce((acc: Record<string, EventWithContact[]>, stage: EventPipelineStage) => {
      acc[stage.id] = sortedEvents.filter((e: EventWithContact) => {
        if (!e.stage_id && defaultStage && stage.id === defaultStage.id) {
          return true;
        }
        return e.stage_id === stage.id;
      });
      return acc;
    }, {} as Record<string, EventWithContact[]>);
  }, [sortedEvents, visibleStages]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveEventStageId(null);

    if (!over || active.id === over.id) {
      isDraggingRef.current = false;
      return;
    }

    const eventId = active.id as string;
    const newStageId = over.id as string;

    const stage = localPipelineStages.find((s: EventPipelineStage) => s.id === newStageId);
    if (!stage) {
      isDraggingRef.current = false;
      return;
    }

    const evento = localEvents.find((e: EventWithContact) => e.id === eventId);
    if (!evento) {
      toast.error('No se pudo encontrar el evento');
      isDraggingRef.current = false;
      return;
    }

    const originalStage = evento.stage;

    setLocalEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              stage_id: newStageId,
              stage: {
                id: stage.id,
                name: stage.name,
                slug: stage.slug,
                color: stage.color,
                order: stage.order,
                stage_type: stage.stage_type,
              },
            }
          : e
      )
    );

    try {
      const result = await moveEvent(studioSlug, {
        event_id: eventId,
        new_stage_id: newStageId,
      });

      if (result.success) {
        toast.success('Evento movido exitosamente');
      } else {
        setLocalEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? { ...e, stage_id: originalStage?.id ?? null, stage: originalStage }
              : e
          )
        );
        toast.error(result.error || 'Error al mover evento');
      }
    } catch (error) {
      setLocalEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, stage_id: originalStage?.id ?? null, stage: originalStage }
            : e
        )
      );
      console.error('Error moviendo evento:', error);
      toast.error('Error al mover evento');
    } finally {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    isDraggingRef.current = true;
    const ev = localEvents.find((e: EventWithContact) => e.id === id);
    if (ev?.stage_id) setActiveEventStageId(ev.stage_id);
  };

  const handleEventArchived = useCallback((eventId: string) => {
    const archivado = localPipelineStages.find((s) => s.slug === 'archivado');
    if (!archivado) return;
    setLocalEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              stage_id: archivado.id,
              stage: {
                id: archivado.id,
                name: archivado.name,
                slug: archivado.slug,
                color: archivado.color,
                order: archivado.order,
                stage_type: archivado.stage_type,
              },
            }
          : e
      )
    );
  }, [localPipelineStages]);

  const handleEventClick = (event: EventWithContact) => {
    const routeId = event.id;

    // Cerrar overlays globales antes de navegar
    window.dispatchEvent(new CustomEvent('close-overlays'));

    // Activar flag de navegación
    if (setIsNavigating) {
      setIsNavigating(routeId);
    }

    // Usar startTransition para dar prioridad a la navegación
    startTransition(() => {
      router.push(`/${studioSlug}/studio/business/events/${routeId}`);

      // Limpiar flag después de un delay
      setTimeout(() => {
        if (setIsNavigating) {
          setIsNavigating(null);
        }
      }, 1000);
    });
  };

  const activeEvent = activeId
    ? localEvents.find((e: EventWithContact) => e.id === activeId)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4 shrink-0">
        <div className="flex-1 w-full relative">
          <div className="relative">
            <ZenInput
              ref={searchInputRef}
              id="search"
              placeholder="Buscar eventos..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              icon={Search}
              iconClassName="h-4 w-4"
              className={localSearch ? 'pr-10' : ''}
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-zinc-700/50 transition-colors text-zinc-400 hover:text-zinc-300"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showArchived
              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
              }`}
          >
            <Archive className="h-3.5 w-3.5" />
            {showArchived ? 'Ocultar' : 'Mostrar'} Archivados
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col min-h-[calc(100vh-200px)]">
          <div className="flex gap-3 pb-4 items-stretch overflow-x-auto overflow-y-visible min-h-[calc(100vh-200px)]">
            {visibleStages.length > 3 ? (
              visibleStages.map((stage: EventPipelineStage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  events={eventsByStage[stage.id] || []}
                  onEventClick={handleEventClick}
                  studioSlug={studioSlug}
                  isFlexible={false}
                  onUpdateLocalStage={updateLocalStage}
                  pipelineStages={localPipelineStages}
                  onEventArchived={handleEventArchived}
                />
              ))
            ) : (
              <div className="flex gap-3 flex-1 min-w-0 w-full items-stretch">
                {visibleStages.map((stage: EventPipelineStage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    events={eventsByStage[stage.id] || []}
                    onEventClick={handleEventClick}
                    studioSlug={studioSlug}
                    isFlexible={true}
                    onUpdateLocalStage={updateLocalStage}
                    pipelineStages={localPipelineStages}
                    onEventArchived={handleEventArchived}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <DragOverlay
          style={{ cursor: 'grabbing' }}
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeEvent ? (
            <div className="opacity-95 scale-105 rotate-3 shadow-2xl transform-gpu will-change-transform animate-in fade-in-0 zoom-in-95 duration-200">
              <EventKanbanCard
                event={activeEvent}
                studioSlug={studioSlug}
                pipelineStages={localPipelineStages}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// Nombres por defecto por slug (para referencia; no hay "restore" en esta versión)
const EVENT_STAGE_DEFAULT_NAMES: Record<string, string> = {
  planeacion: 'Planeación',
  produccion: 'Producción',
  edicion: 'Edición',
  'revision-interna': 'Revisión Interna',
  entrega: 'Entrega',
  archivado: 'Archivado',
};

function getEventSystemStageName(slug: string): string {
  return EVENT_STAGE_DEFAULT_NAMES[slug] || slug;
}

// Componente para cada columna del Kanban (inline rename + color)
function KanbanColumn({
  stage,
  events,
  onEventClick,
  studioSlug,
  isFlexible = false,
  onUpdateLocalStage,
  pipelineStages = [],
  onEventArchived,
}: {
  stage: EventPipelineStage;
  events: EventWithContact[];
  onEventClick: (event: EventWithContact) => void;
  studioSlug: string;
  isFlexible?: boolean;
  onUpdateLocalStage?: (stageId: string, updates: Partial<EventPipelineStage>) => void;
  pipelineStages?: EventPipelineStage[];
  onEventArchived?: (eventId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(stage.name);
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const colorPalette = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#A855F7',
  ];

  const systemName = getEventSystemStageName(stage.slug);
  const isArchivado = stage.slug === 'archivado';

  useEffect(() => {
    setEditedName(stage.name);
  }, [stage.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (isArchivado) return;
    if (editedName.trim() === stage.name.trim()) {
      setIsEditing(false);
      return;
    }
    if (!editedName.trim()) {
      setEditedName(stage.name);
      setIsEditing(false);
      toast.error('El nombre no puede estar vacío');
      return;
    }
    const trimmedId = stage.id.trim();
    const newName = editedName.trim().charAt(0).toUpperCase() + editedName.trim().slice(1).toLowerCase();
    onUpdateLocalStage?.(stage.id, { name: newName });
    setIsEditing(false);
    setIsSaving(true);
    try {
      const result = await updateEventPipelineStage(studioSlug, { id: trimmedId, name: newName });
      if (result.success && result.data) {
        onUpdateLocalStage?.(stage.id, { name: result.data.name });
        toast.success('Nombre actualizado');
      } else {
        onUpdateLocalStage?.(stage.id, { name: stage.name });
        setEditedName(stage.name);
        toast.error(result.error || 'Error al actualizar nombre');
      }
    } catch (error) {
      onUpdateLocalStage?.(stage.id, { name: stage.name });
      setEditedName(stage.name);
      toast.error('Error al actualizar nombre');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(stage.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleColorChange = async (newColor: string) => {
    if (newColor === stage.color) {
      setIsColorPickerOpen(false);
      return;
    }
    onUpdateLocalStage?.(stage.id, { color: newColor });
    setIsColorPickerOpen(false);
    setIsSaving(true);
    try {
      const result = await updateEventPipelineStage(studioSlug, { id: stage.id, color: newColor });
      if (result.success && result.data) {
        onUpdateLocalStage?.(stage.id, { color: result.data.color });
        toast.success('Color actualizado');
      } else {
        onUpdateLocalStage?.(stage.id, { color: stage.color });
        toast.error(result.error || 'Error al actualizar color');
      }
    } catch (error) {
      onUpdateLocalStage?.(stage.id, { color: stage.color });
      toast.error('Error al actualizar color');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`${isFlexible
        ? 'flex-1 min-w-[280px]'
        : 'w-[280px] min-w-[280px] max-w-[280px] shrink-0'
        } flex flex-col min-h-0 rounded-lg border p-4 transition-all duration-300 ease-in-out ${isOver
          ? 'bg-zinc-900/90'
          : 'bg-zinc-950/60 border-zinc-800'
        }`}
      style={{
        borderColor: isOver ? stage.color : undefined,
      }}
    >
      {/* Header de columna: color + nombre editable */}
      <div
        className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-700 group shrink-0"
        style={{ borderBottomColor: stage.color + '40' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!isArchivado && (
            <ZenDropdownMenu open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
              <ZenDropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-3 h-3 rounded-full shrink-0 cursor-pointer hover:ring-2 hover:ring-zinc-600 hover:ring-offset-2 hover:ring-offset-zinc-950 transition-all"
                  style={{ backgroundColor: stage.color }}
                  title="Cambiar color"
                />
              </ZenDropdownMenuTrigger>
              <ZenDropdownMenuContent align="start" className="w-40 p-2">
                <p className="text-xs text-zinc-400 mb-1.5">Selecciona un color</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className={`w-5 h-5 rounded-full border transition-all hover:scale-110 ${
                        stage.color === color ? 'border-white ring-1 ring-offset-1 ring-offset-zinc-900' : 'border-zinc-700'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </ZenDropdownMenuContent>
            </ZenDropdownMenu>
          )}
          {isArchivado && (
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
          )}
          {isEditing ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                style={{ maxWidth: '180px' }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <h3
                className={`font-medium text-white text-sm truncate flex-1 min-w-0 capitalize ${isArchivado ? 'cursor-default' : 'cursor-pointer hover:text-zinc-100 transition-colors'}`}
                onClick={() => !isArchivado && setIsEditing(true)}
                title={isArchivado ? stage.name : 'Clic para editar'}
              >
                {stage.name}
              </h3>
              {isSaving && <Loader2 className="h-3 w-3 text-blue-400 animate-spin shrink-0" />}
            </div>
          )}
          {!isArchivado && !isEditing && !isSaving && isHovered && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="shrink-0 p-0.5 text-zinc-400 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Editar nombre"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded shrink-0 ml-2">
          {events.length}
        </span>
      </div>

      {/* Área droppable: flex-1 + min-h para alinear altura de columnas */}
      <div className="flex flex-col flex-1 min-h-[500px] -mx-2 px-2">
        <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
          <SortableContext
            items={events.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            {events.map((event) => (
              <EventKanbanCard
                key={event.id}
                event={event}
                onClick={onEventClick}
                studioSlug={studioSlug}
                pipelineStages={pipelineStages}
                onEventArchived={onEventArchived}
              />
            ))}
          </SortableContext>

          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[500px] px-4 text-center">
              <p className="text-sm text-zinc-500 font-medium mb-1">Sin eventos</p>
              <p className="text-xs text-zinc-600">Arrastra aquí para mover</p>
            </div>
          )}
        </div>
        <div className="mt-auto py-4 text-center text-xs tracking-tighter text-zinc-500/60 font-medium select-none pointer-events-none capitalize">
          {stage.name}
        </div>
      </div>
    </div>
  );
}

