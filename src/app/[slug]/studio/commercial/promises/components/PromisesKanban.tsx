'use client';

import { useState, useMemo, useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Archive, X, TableColumnsSplit, Columns2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  closestCorners,
  pointerWithin,
  getFirstCollision,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ZenInput, ZenButton } from '@/components/ui/zen';
import { PromiseKanbanCard } from './PromiseKanbanCard';
import { EventFormModal } from '@/components/shared/promises';
import { PromiseTagsManageModal } from './PromiseTagsManageModal';
import { movePromise } from '@/lib/actions/studio/commercial/promises';
import { toast } from 'sonner';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import confetti from 'canvas-confetti';

interface PromisesKanbanProps {
  studioSlug: string;
  promises: PromiseWithContact[];
  pipelineStages: PipelineStage[];
  search: string;
  onSearchChange: (search: string) => void;
  onPromiseCreated: () => void;
  onPromiseUpdated: () => void;
  onPromiseMoved: () => void;
  onPipelineStagesUpdated: () => void;
  isPromiseFormModalOpen?: boolean;
  setIsPromiseFormModalOpen?: (open: boolean) => void;
  isNavigating?: string | null;
  setIsNavigating?: (promiseId: string | null) => void;
}

function PromisesKanban({
  studioSlug,
  promises,
  pipelineStages,
  search: externalSearch,
  onSearchChange,
  onPromiseCreated,
  onPromiseUpdated,
  onPromiseMoved,
  onPipelineStagesUpdated,
  isPromiseFormModalOpen: externalIsOpen,
  setIsPromiseFormModalOpen: externalSetIsOpen,
  isNavigating,
  setIsNavigating,
}: PromisesKanbanProps) {
  const router = useRouter();
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isPromiseFormModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsPromiseFormModalOpen = externalSetIsOpen || setInternalIsOpen;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePromiseStageId, setActivePromiseStageId] = useState<string | null>(null);
  const [localPromises, setLocalPromises] = useState<PromiseWithContact[]>(promises);
  const prevPromisesRef = useRef<PromiseWithContact[]>(promises);
  const isDraggingRef = useRef(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [localSearch, setLocalSearch] = useState(externalSearch || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado local cuando cambian las promesas desde el padre
  // Evitar sincronización durante drag and drop o navegación para prevenir parpadeos
  useEffect(() => {
    // Si estamos arrastrando, no sincronizar
    if (isDraggingRef.current) {
      prevPromisesRef.current = promises;
      return;
    }

    // Si estamos navegando, no sincronizar (previene race condition)
    if (isNavigating) {
      prevPromisesRef.current = promises;
      return;
    }

    // Comparar con la referencia anterior para detectar cambios reales
    const prevPromiseIds = new Set(prevPromisesRef.current.map(p => p.promise_id).filter(Boolean));
    const newPromiseIds = new Set(promises.map(p => p.promise_id).filter(Boolean));

    const hasIdChanges =
      prevPromiseIds.size !== newPromiseIds.size ||
      [...prevPromiseIds].some(id => !newPromiseIds.has(id)) ||
      [...newPromiseIds].some(id => !prevPromiseIds.has(id));

    // Solo sincronizar si hay cambios en promise_ids (nuevas/eliminadas promesas)
    // No sincronizar por cambios de stage_id ya que se manejan con actualización optimista
    if (hasIdChanges || localPromises.length === 0) {
      setLocalPromises(promises);
    }

    prevPromisesRef.current = promises;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promises, isNavigating]);

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

  // Estrategia de detección de colisiones mejorada - solo detecta columnas, ignora cards
  const collisionDetection: CollisionDetection = (args) => {
    // Obtener todas las colisiones posibles
    const pointerIntersections = pointerWithin(args);
    const cornersCollisions = closestCorners(args);
    
    // Combinar ambas estrategias
    const allCollisions = [...pointerIntersections, ...cornersCollisions];
    
    // Filtrar para SOLO considerar columnas (stages), ignorar items sortables (promises)
    // Las columnas son los IDs de las etapas del pipeline
    const stageIds = new Set(pipelineStages.map(stage => stage.id));
    
    // Buscar solo columnas droppables, ignorar completamente los cards
    const columnCollisions = allCollisions.filter(collision => 
      stageIds.has(collision.id as string)
    );
    
    // Si encontramos una columna, devolverla
    if (columnCollisions.length > 0) {
      // Si hay múltiples columnas, usar la más cercana al puntero
      return [columnCollisions[0]];
    }
    
    // Si no hay columna detectada pero estamos arrastrando, usar la columna inicial
    // Esto evita que los cards interfieran cuando el puntero está sobre ellos
    if (activePromiseStageId && stageIds.has(activePromiseStageId)) {
      return [{ id: activePromiseStageId }];
    }
    
    // Fallback: intentar encontrar la columna más cercana usando closestCorners
    // pero filtrando solo columnas
    const closestColumn = cornersCollisions.find(collision => 
      stageIds.has(collision.id as string)
    );
    
    if (closestColumn) {
      return [closestColumn];
    }
    
    return [];
  };

  // Sincronizar búsqueda externa si cambia (solo una vez al cargar)
  useEffect(() => {
    if (externalSearch !== undefined && externalSearch !== localSearch) {
      setLocalSearch(externalSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Filtrar promesas por búsqueda local
  // También filtrar solo promesas con promise_id
  const filteredPromises = useMemo(() => {
    // Primero filtrar solo promesas con promise_id
    const promisesWithId = localPromises.filter((p) => p.promise_id !== null);
    
    if (!localSearch.trim()) return promisesWithId;

    const searchLower = localSearch.toLowerCase();
    return promisesWithId.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(searchLower);
      const emailMatch = p.email?.toLowerCase().includes(searchLower);
      const phoneMatch = p.phone.includes(localSearch);
      const eventTypeMatch = p.event_type?.name.toLowerCase().includes(searchLower);

      // Búsqueda por fecha de evento
      let dateMatch = false;
      if (p.defined_date) {
        const eventDate = new Date(p.defined_date);
        const dateStr = eventDate.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).toLowerCase();
        dateMatch = dateStr.includes(searchLower);
      }
      if (!dateMatch && p.interested_dates && p.interested_dates.length > 0) {
        dateMatch = p.interested_dates.some(date => {
          const dateObj = new Date(date);
          const dateStr = dateObj.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }).toLowerCase();
          return dateStr.includes(searchLower);
        });
      }

      // Búsqueda por agendamiento (cita)
      let agendaMatch = false;
      if (p.agenda) {
        const hasAgenda = p.agenda.date !== null;
        const isCitaKeyword = searchLower === 'cita' || searchLower === 'citas';
        const isVirtualKeyword = searchLower === 'virtual' || searchLower === 'virtuales';
        const isPresencialKeyword = searchLower === 'presencial' || searchLower === 'presenciales';

        // Si busca "cita", mostrar todas las que tienen agendamiento
        if (isCitaKeyword && hasAgenda) {
          agendaMatch = true;
        }
        // Si busca "virtual", mostrar las que tienen type_scheduling === 'virtual'
        else if (isVirtualKeyword && p.agenda.type_scheduling === 'virtual') {
          agendaMatch = true;
        }
        // Si busca "presencial", mostrar las que tienen type_scheduling === 'presencial'
        else if (isPresencialKeyword && p.agenda.type_scheduling === 'presencial') {
          agendaMatch = true;
        }
        // Búsqueda en otros campos del agendamiento
        else if (hasAgenda) {
          const addressMatch = p.agenda.address?.toLowerCase().includes(searchLower) ?? false;
          const conceptMatch = p.agenda.concept?.toLowerCase().includes(searchLower) ?? false;
          const linkMatch = p.agenda.link_meeting_url?.toLowerCase().includes(searchLower) ?? false;

          // Búsqueda por fecha de agendamiento
          let agendaDateMatch = false;
          if (p.agenda.date) {
            const agendaDate = new Date(p.agenda.date);
            const agendaDateStr = agendaDate.toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }).toLowerCase();
            agendaDateMatch = agendaDateStr.includes(searchLower);
          }

          // Búsqueda por hora de agendamiento
          const timeMatch = p.agenda.time?.toLowerCase().includes(searchLower) ?? false;

          agendaMatch = addressMatch || conceptMatch || linkMatch || agendaDateMatch || timeMatch;
        }
      }

      // Búsqueda por tags
      const tagsMatch = p.tags?.some(tag =>
        tag.name.toLowerCase().includes(searchLower) ||
        tag.slug.toLowerCase().includes(searchLower)
      );

      // Búsqueda por último log
      const logMatch = p.last_log?.content.toLowerCase().includes(searchLower);

      return nameMatch || emailMatch || phoneMatch || eventTypeMatch || dateMatch || agendaMatch || tagsMatch || logMatch;
    });
  }, [localPromises, localSearch]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    // Opcional: notificar al padre si es necesario
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

  // Ordenar promesas: por event_date (del más próximo al más lejano)
  const sortedPromises = useMemo(() => {
    return [...filteredPromises].sort((a, b) => {
      // Función helper para obtener event_date
      const getEventDate = (promise: PromiseWithContact): number => {
        // Solo usar event_date (fecha del evento confirmado)
        if (promise.event_date) {
          return new Date(promise.event_date).getTime();
        }
        return 0; // Sin fecha
      };

      const dateA = getEventDate(a);
      const dateB = getEventDate(b);

      // Si ambas tienen fecha, ordenar del más próximo al más lejano
      if (dateA !== 0 && dateB !== 0) {
        return dateA - dateB; // Más cercana primero (ascendente)
      }
      // Si solo una tiene fecha, ponerla primero
      if (dateA !== 0) return -1; // A tiene fecha, B no
      if (dateB !== 0) return 1; // B tiene fecha, A no

      // Si ninguna tiene fecha, ordenar por fecha de actualización (más reciente primero)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [filteredPromises]);

  // Filtrar stages según toggles de vista
  const visibleStages = useMemo(() => {
    const filtered = pipelineStages.filter((stage) => {
      // Ocultar archived si showArchived es false
      if (stage.slug === 'archived') {
        return showArchived;
      }
      // Ocultar canceled si showCanceled es false
      if (stage.slug === 'canceled') {
        return showCanceled;
      }
      // Mostrar siempre los demás stages
      return true;
    });
    return filtered;
  }, [pipelineStages, showArchived, showCanceled]);

  // Determinar si estamos en "vista completa" (ambos activos) o "vista compacta"
  const isFullView = showArchived && showCanceled;

  // Agrupar promises por stage (ya ordenadas)
  // Si una promesa no tiene stage_id, se asigna a la primera etapa disponible (no archivada ni cancelada)
  const promisesByStage = useMemo(() => {
    // Obtener la primera etapa activa (no archivada ni cancelada) para promesas sin stage
    const defaultStage = visibleStages
      .filter((s) => s.slug !== 'archived' && s.slug !== 'canceled')
      .sort((a, b) => a.order - b.order)[0];

    return visibleStages.reduce((acc: Record<string, PromiseWithContact[]>, stage: PipelineStage) => {
      acc[stage.id] = sortedPromises.filter((p: PromiseWithContact) => {
        // Si la promesa no tiene stage_id, asignarla a la primera etapa disponible
        if (!p.promise_pipeline_stage_id && defaultStage && stage.id === defaultStage.id) {
          return true;
        }
        return p.promise_pipeline_stage_id === stage.id;
      });
      return acc;
    }, {} as Record<string, PromiseWithContact[]>);
  }, [sortedPromises, visibleStages]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActivePromiseStageId(null);

    if (!over || active.id === over.id) {
      isDraggingRef.current = false;
      return;
    }

    const draggedPromiseId = active.id as string; // ✅ Este es promise.promise_id (unique ID)
    const newStageId = over.id as string;

    // Verificar que es un stage válido
    const stage = pipelineStages.find((s: PipelineStage) => s.id === newStageId);
    if (!stage) {
      isDraggingRef.current = false;
      return;
    }

    // ✅ FIX: Buscar por promise_id (no por contact id)
    const promise = localPromises.find((p: PromiseWithContact) => p.promise_id === draggedPromiseId);
    if (!promise || !promise.promise_id) {
      toast.error('No se pudo encontrar la promesa');
      return;
    }

    const currentStageSlug = promise.promise_pipeline_stage?.slug;
    const targetStageSlug = stage.slug;

    // Validación 1: Desde pending o negotiation NO puede ir a closing o approved
    // Estas transiciones requieren acciones específicas en las cotizaciones
    if (
      (currentStageSlug === 'pending' || currentStageSlug === 'negotiation') &&
      (targetStageSlug === 'closing' || targetStageSlug === 'approved')
    ) {
      toast.error(
        targetStageSlug === 'closing'
          ? 'No se puede mover directamente a "En Cierre". Debes pasar una cotización a cierre desde su vista detallada.'
          : 'No se puede mover directamente a "Aprobada". Debes autorizar una cotización desde la vista de cierre.'
      );
      return;
    }

    // Validación 2: Desde closing NO puede ir a pending, negotiation o approved
    // Solo puede ir a archived o canceled
    if (
      currentStageSlug === 'closing' &&
      (targetStageSlug === 'pending' || targetStageSlug === 'negotiation' || targetStageSlug === 'approved')
    ) {
      toast.error(
        'No se puede mover desde "En Cierre" a esta etapa. Si necesitas cambiar el estado, cancela el cierre de la cotización o archiva la promesa.'
      );
      return;
    }

    // Validación 3: Si la promesa está en "approved" y tiene evento asociado,
    // solo se puede mover a "archived"
    const eventId = promise.event?.id;
    const hasEvent = Boolean(
      eventId && 
      typeof eventId === 'string' && 
      eventId.trim() !== ''
    );
    
    if (
      currentStageSlug === 'approved' &&
      hasEvent &&
      targetStageSlug !== 'archived'
    ) {
      toast.error('Esta promesa tiene un evento asociado. Solo puede archivarse.');
      return;
    }

    // Guardar el stage original para revertir en caso de error
    const originalStage = promise.promise_pipeline_stage;

    // Verificar si es etapa "aprobado" para lanzar confeti de forma optimista
    const isApprovedStage = stage.slug === 'approved' || stage.name.toLowerCase().includes('aprobado');

    // Disparar confeti inmediatamente si es etapa aprobado
    if (isApprovedStage) {
      // Función para calcular y disparar confeti desde la posición de la tarjeta
      const fireConfetti = () => {
        let confettiOrigin: { x?: number; y: number } = { y: 0.9 }; // Por defecto, parte inferior de la ventana

        try {
          // Buscar el elemento en el DOM usando el ID de la promesa
          // Usar un pequeño delay para asegurar que el elemento esté en su nueva posición
          const activeElement = document.querySelector(`[data-id="${draggedPromiseId}"]`) as HTMLElement;

          if (activeElement) {
            const rect = activeElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const windowWidth = window.innerWidth;

            // Calcular posición relativa (0-1) desde el centro de la tarjeta
            const x = (rect.left + rect.width / 2) / windowWidth;
            const y = (rect.top + rect.height / 2) / windowHeight;

            confettiOrigin = { x, y };
          }
        } catch {
          // Si hay error, usar posición por defecto (parte inferior)
          console.debug('No se pudo obtener posición de la tarjeta, usando posición por defecto');
        }

        confetti({
          particleCount: 100,
          spread: 70,
          origin: confettiOrigin,
        });
      };

      // Disparar inmediatamente (el elemento puede estar en DragOverlay o en su nueva posición)
      // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
      requestAnimationFrame(() => {
        fireConfetti();
      });
    }

    // Actualización optimista local - actualizar tanto el ID como el objeto completo del stage
    setLocalPromises((prev) =>
      prev.map((p) =>
        p.promise_id === draggedPromiseId // ✅ FIX: Comparar por promise_id
          ? {
              ...p,
              promise_pipeline_stage_id: newStageId,
              promise_pipeline_stage: {
                id: stage.id,
                name: stage.name,
                slug: stage.slug,
                color: stage.color,
                order: stage.order,
              },
            }
          : p
      )
    );

    try {
      const result = await movePromise(studioSlug, {
        promise_id: promise.promise_id,
        new_stage_id: newStageId,
      });

      if (result.success) {
        toast.success('Promesa movida exitosamente');
        // No llamar onPromiseMoved() para evitar refresh completo
        // La actualización optimista ya actualizó el estado local
      } else {
        // Revertir actualización optimista en caso de error
        setLocalPromises((prev) =>
          prev.map((p) =>
            p.promise_id === draggedPromiseId // ✅ FIX: Comparar por promise_id
              ? {
                  ...p,
                  promise_pipeline_stage_id: promise.promise_pipeline_stage_id,
                  promise_pipeline_stage: originalStage,
                }
              : p
          )
        );
        toast.error(result.error || 'Error al mover promesa');
      }
    } catch (error) {
      // Revertir actualización optimista en caso de error
      setLocalPromises((prev) =>
        prev.map((p) =>
          p.promise_id === draggedPromiseId // ✅ FIX: Comparar por promise_id
            ? {
                ...p,
                promise_pipeline_stage_id: promise.promise_pipeline_stage_id,
                promise_pipeline_stage: originalStage,
              }
            : p
        )
      );
      console.error('Error moviendo promesa:', error);
      toast.error('Error al mover promesa');
    } finally {
      // Resetear flag después de completar toda la operación
      // Usar setTimeout para asegurar que la actualización optimista se haya aplicado
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const promiseId = event.active.id as string;
    setActiveId(promiseId);
    isDraggingRef.current = true;
    
    // Identificar la columna inicial donde está el card
    const promise = localPromises.find((p: PromiseWithContact) => p.promise_id === promiseId);
    if (promise?.promise_pipeline_stage?.id) {
      setActivePromiseStageId(promise.promise_pipeline_stage.id);
    }
  };

  const handlePromiseClick = (promise: PromiseWithContact) => {
    // Usar promiseId si está disponible, de lo contrario usar contactId como fallback
    const routeId = promise.promise_id || promise.id;
    
    // Cerrar overlays globales (RemindersSideSheet, etc.) antes de navegar
    window.dispatchEvent(new CustomEvent('close-overlays'));
    
    // Activar flag de navegación para prevenir revalidaciones
    if (setIsNavigating) {
      setIsNavigating(routeId);
    }

    // Usar startTransition para dar prioridad a la navegación sobre actualizaciones de fondo
    startTransition(() => {
      router.push(`/${studioSlug}/studio/commercial/promises/${routeId}`);
      
      // Limpiar flag después de un delay para permitir que la navegación se complete
      // Next.js manejará la transición, pero mantenemos el flag por seguridad
      setTimeout(() => {
        if (setIsNavigating) {
          setIsNavigating(null);
        }
      }, 1000);
    });
  };

  // Manejar eliminar promesa con actualización local
  const handlePromiseDeleted = async (promiseId: string) => {
    // Remover la promesa del estado local inmediatamente
    // No llamar a onPromiseUpdated() para evitar recargar toda la página
    // El realtime ya maneja la sincronización y la actualización local es suficiente
    setLocalPromises((prev) => prev.filter((p) => p.promise_id !== promiseId));
  };

  // Manejar archivar promesa con actualización local
  const handlePromiseArchived = async (promiseId: string) => {
    if (!studioSlug) return;

    // Marcar que estamos en proceso de archivar para evitar sincronización
    isDraggingRef.current = true;

    // Buscar la promesa
    const promise = localPromises.find((p) => p.promise_id === promiseId);
    if (!promise || !promise.promise_id) {
      isDraggingRef.current = false;
      toast.error('No se pudo encontrar la promesa');
      return;
    }

    // Buscar el stage "archived"
    const archivedStage = pipelineStages.find((s) => s.slug === 'archived');
    if (!archivedStage) {
      isDraggingRef.current = false;
      toast.error('No se encontró la etapa "Archivado"');
      return;
    }

    // Actualización optimista local
    const originalStageId = promise.promise_pipeline_stage_id;
    setLocalPromises((prev) =>
      prev.map((p) =>
        p.promise_id === promiseId
          ? {
              ...p,
              promise_pipeline_stage_id: archivedStage.id,
              promise_pipeline_stage: archivedStage,
            }
          : p
      )
    );

    try {
      const result = await movePromise(studioSlug, {
        promise_id: promiseId,
        new_stage_id: archivedStage.id,
      });

      if (!result.success) {
        toast.error(result.error || 'Error al archivar promesa');
        // Revertir si falla
        setLocalPromises((prev) =>
          prev.map((p) =>
            p.promise_id === promiseId
              ? { ...p, promise_pipeline_stage_id: originalStageId }
              : p
          )
        );
      } else {
        toast.success('Promesa archivada exitosamente');
      }
    } catch (error) {
      console.error('Error archiving promise:', error);
      toast.error('Error al archivar promesa');
      // Revertir si falla
      setLocalPromises((prev) =>
        prev.map((p) =>
          p.promise_id === promiseId
            ? { ...p, promise_pipeline_stage_id: originalStageId }
            : p
        )
      );
    } finally {
      // Permitir sincronización después de un breve delay
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };

  // ✅ FIX: Buscar promesa activa por promise_id (no contact_id)
  const activePromise = activeId
    ? localPromises.find((p: PromiseWithContact) => p.promise_id === activeId)
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
              placeholder="Buscar promesas..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              icon={Search}
              iconClassName="h-4 w-4"
              className={`h-10 ${localSearch ? 'pr-10' : ''}`}
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
          <ZenButton
            variant={isFullView ? "secondary" : "outline"}
            size="md"
            onClick={() => {
              // Toggle vista completa: activa/desactiva ambos
              const newState = !isFullView;
              setShowArchived(newState);
              setShowCanceled(newState);
            }}
            className="gap-1.5 h-10"
            title={isFullView ? "Ocultar promesas archivadas y canceladas" : "Mostrar todas las promesas (incluyendo archivadas y canceladas)"}
          >
            {isFullView ? <Columns2 className="h-4 w-4" /> : <TableColumnsSplit className="h-4 w-4" />}
            <span>{isFullView ? 'Pipeline Compacto' : 'Pipeline Completo'}</span>
          </ZenButton>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto overflow-y-hidden flex-1 min-h-0 h-full pb-4 items-stretch">
          {/* Si hay más de 3 etapas, todas tienen ancho fijo con scroll */}
          {visibleStages.length > 3 ? (
            visibleStages.map((stage: PipelineStage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                promises={promisesByStage[stage.id] || []}
                onPromiseClick={handlePromiseClick}
                studioSlug={studioSlug}
                isFlexible={false}
                onPromiseArchived={handlePromiseArchived}
                onPromiseDeleted={handlePromiseDeleted}
                onPromiseUpdated={onPromiseUpdated}
              />
            ))
          ) : (
            /* Si hay 3 o menos, las primeras 3 ocupan el ancho disponible */
            <div className="flex gap-3 flex-1 min-w-0 w-full h-full items-stretch">
              {visibleStages.map((stage: PipelineStage) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  promises={promisesByStage[stage.id] || []}
                  onPromiseClick={handlePromiseClick}
                  studioSlug={studioSlug}
                  isFlexible={true}
                  onPromiseArchived={handlePromiseArchived}
                  onPromiseDeleted={handlePromiseDeleted}
                  onPromiseUpdated={onPromiseUpdated}
                />
              ))}
            </div>
          )}
        </div>

        <DragOverlay 
          style={{ cursor: 'grabbing' }}
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activePromise ? (
            <div className="opacity-95 scale-105 rotate-3 shadow-2xl transform-gpu will-change-transform animate-in fade-in-0 zoom-in-95 duration-200">
              <PromiseKanbanCard
                promise={activePromise}
                studioSlug={studioSlug}
                onArchived={() => activePromise.promise_id && handlePromiseArchived(activePromise.promise_id)}
                onDeleted={() => activePromise.promise_id && handlePromiseDeleted(activePromise.promise_id)}
                onTagsUpdated={onPromiseUpdated}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modales */}
      <PromiseTagsManageModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        studioSlug={studioSlug}
      />
      <EventFormModal
        isOpen={isPromiseFormModalOpen}
        onClose={() => setIsPromiseFormModalOpen(false)}
        studioSlug={studioSlug}
        onSuccess={() => {
          onPromiseCreated();
          setIsPromiseFormModalOpen(false);
        }}
      />
    </div>
  );
}

export { PromisesKanban };

// Componente para cada columna del Kanban
function KanbanColumn({
  stage,
  promises,
  onPromiseClick,
  studioSlug,
  isFlexible = false,
  onPromiseArchived,
  onPromiseDeleted,
  onPromiseUpdated,
}: {
  stage: PipelineStage;
  promises: PromiseWithContact[];
  onPromiseClick: (promise: PromiseWithContact) => void;
  studioSlug: string;
  isFlexible?: boolean;
  onPromiseArchived?: (promiseId: string) => void;
  onPromiseDeleted?: (promiseId: string) => void;
  onPromiseUpdated?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${isFlexible
        ? 'flex-1 min-w-[280px]'
        : 'w-[280px] min-w-[280px] max-w-[280px] shrink-0'
        } flex flex-col rounded-lg border p-4 h-full overflow-hidden transition-all duration-300 ease-in-out ${isOver
          ? 'bg-zinc-900/90'
          : 'bg-zinc-950/60 border-zinc-800'
        }`}
      style={{
        borderColor: isOver ? stage.color : undefined,
        // Expandir área de detección con padding negativo visual pero manteniendo el área droppable
      }}
    >
      {/* Header de columna */}
      <div
        className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-700"
        style={{ borderBottomColor: stage.color + '40' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-medium text-white text-sm">{stage.name}</h3>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
          {promises.length}
        </span>
      </div>

      {/* Lista de promises - Área droppable expandida */}
      <div
        className="space-y-3 flex-1 overflow-y-auto min-h-0 -mx-2 px-2 h-full"
      >
        <SortableContext
          items={promises.map((p) => p.promise_id || p.id)} // ✅ FIX: Usar promise_id como ID único
          strategy={verticalListSortingStrategy}
        >
          {promises.map((promise) => (
            <PromiseKanbanCard
              key={promise.promise_id}
              promise={promise}
              onClick={onPromiseClick}
              studioSlug={studioSlug}
              onArchived={() => promise.promise_id && onPromiseArchived?.(promise.promise_id)}
              onDeleted={() => promise.promise_id && onPromiseDeleted?.(promise.promise_id)}
              onTagsUpdated={onPromiseUpdated}
            />
          ))}
        </SortableContext>

        {promises.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] px-4 text-center">
            <p className="text-sm text-zinc-500 font-medium mb-1">
              Sin promesas
            </p>
            <p className="text-xs text-zinc-600">
              Arrastra aquí para mover
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

