'use client';

import { useState, useMemo, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Archive, X, Pencil, Undo2, Loader2 } from 'lucide-react';
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
import { ZenInput, ZenButton, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { PromiseKanbanCard } from './PromiseKanbanCard';
import { EventFormModal } from '@/components/shared/promises';
import { PromiseTagsManageModal } from './PromiseTagsManageModal';
import { updatePipelineStage } from '@/lib/actions/studio/commercial/promises/promise-pipeline-stages.actions';
import { movePromise } from '@/lib/actions/studio/commercial/promises';
import type { PromiseWithContact, PipelineStage } from '@/lib/actions/schemas/promises-schemas';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { getSystemStageName, isTerminalStage } from '@/lib/utils/pipeline-stage-names';
import type { PromiseTag } from '@/lib/actions/studio/commercial/promises/promise-tags.actions';
import { formatDisplayDateShort } from '@/lib/utils/date-formatter';
import { toUtcDateOnly } from '@/lib/utils/date-only';

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
  // ✅ PRESERVAR ORDEN: El orden viene de la BD, NO reordenar en frontend
  const [localPipelineStages, setLocalPipelineStages] = useState<PipelineStage[]>(pipelineStages);
  const prevPromisesRef = useRef<PromiseWithContact[]>(promises);
  const isDraggingRef = useRef(false);
  
  // Sincronizar stages locales cuando cambian desde el padre
  // ✅ PRESERVAR ORDEN: Mantener el orden que viene de la BD (NO reordenar)
  // Solo actualizar si hay cambios en el orden o en los valores de order
  // NO actualizar solo por cambios en el nombre
  useEffect(() => {
    // Verificar que el orden de los IDs sea el mismo (preservar orden local)
    const pipelineIds = pipelineStages.map(s => s.id);
    const localIds = localPipelineStages.map(s => s.id);
    
    // Verificar si hay cambios en el orden de los IDs o en los valores de order
    const hasOrderChanges = pipelineIds.length !== localIds.length ||
      pipelineIds.some((id, index) => id !== localIds[index]) ||
      pipelineStages.some((stage) => {
        const localStage = localPipelineStages.find(s => s.id === stage.id);
        return !localStage || stage.order !== localStage.order;
      });
    
    if (hasOrderChanges) {
      // ✅ PRESERVAR ORDEN: Si cambió el orden, usar el orden exacto que viene de la BD
      setLocalPipelineStages(pipelineStages);
    } else {
      // ✅ PRESERVAR ORDEN: Si solo cambió el nombre u otros campos, actualizar solo esos campos
      // manteniendo el orden local (que es el correcto de la BD)
      setLocalPipelineStages(prev => {
        // Mantener el orden local y solo actualizar campos que NO afectan el orden
        return prev.map(localStage => {
          const updatedStage = pipelineStages.find(s => s.id === localStage.id);
          if (updatedStage) {
            // ✅ IMPORTANTE: Actualizar solo name, color, etc. pero PRESERVAR el order local
            // NO copiar el order del servidor si es diferente (puede ser un problema de sincronización)
            return { 
              ...localStage, 
              name: updatedStage.name,
              color: updatedStage.color,
              // NO actualizar order - mantener el order local que es el correcto
            };
          }
          return localStage;
        });
      });
    }
  }, [pipelineStages]); // eslint-disable-line react-hooks/exhaustive-deps
  // Toggle "Mostrar Historial": columna Historial oculta por defecto
  const [showHistorial, setShowHistorial] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(`kanban-show-historial-${studioSlug}`);
      return saved !== null ? saved === 'true' : false;
    } catch (error) {
      return false;
    }
  });

  const [localSearch, setLocalSearch] = useState(externalSearch || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`kanban-show-historial-${studioSlug}`, String(showHistorial));
    } catch (error) {
      console.warn('[PromisesKanban] Error guardando preferencia de visibilidad:', error);
    }
  }, [showHistorial, studioSlug]);

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
        const normalized = toUtcDateOnly(p.defined_date);
        const dateStr = normalized ? formatDisplayDateShort(normalized).toLowerCase() : '';
        dateMatch = dateStr.includes(searchLower);
      }
      if (!dateMatch && p.interested_dates && p.interested_dates.length > 0) {
        dateMatch = p.interested_dates.some(date => {
          const normalized = toUtcDateOnly(date);
          const dateStr = normalized ? formatDisplayDateShort(normalized).toLowerCase() : '';
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
            const normalized = toUtcDateOnly(p.agenda.date);
            const agendaDateStr = normalized ? formatDisplayDateShort(normalized).toLowerCase() : '';
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

  // Slugs de columnas críticas (solo etapas activas)
  const CRITICAL_STAGE_SLUGS = ['pending', 'pendiente', 'negotiation', 'negociacion', 'closing', 'cierre', 'en_cierre'];

  // Etapa virtual "Historial" que agrupa todas las terminales
  const HISTORIAL_VIRTUAL_STAGE: PipelineStage = {
    id: 'historial-virtual',
    name: 'Historial',
    slug: 'historial',
    color: '#71717a',
    order: 999,
  };

  // Filtrar stages: solo activos + columna virtual Historial si el toggle está activo
  const visibleStages = useMemo(() => {
    const activeStages = localPipelineStages
      .filter((stage) => !isTerminalStage(stage.slug))
      .sort((a, b) => a.order - b.order);

    return showHistorial ? [...activeStages, HISTORIAL_VIRTUAL_STAGE] : activeStages;
  }, [localPipelineStages, showHistorial]);

  // IDs droppables: etapas visibles (incluye historial-virtual cuando aplica)
  const droppableStageIds = useMemo(
    () => new Set(visibleStages.map((s) => s.id)),
    [visibleStages]
  );

  // Estrategia de detección de colisiones: solo columnas, ignora cards
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointerIntersections = pointerWithin(args);
      const cornersCollisions = closestCorners(args);
      const allCollisions = [...pointerIntersections, ...cornersCollisions];

      const columnCollisions = allCollisions.filter((collision) =>
        droppableStageIds.has(collision.id as string)
      );
      if (columnCollisions.length > 0) return [columnCollisions[0]];

      if (activePromiseStageId && droppableStageIds.has(activePromiseStageId)) {
        return [{ id: activePromiseStageId }];
      }

      const closestColumn = cornersCollisions.find((collision) =>
        droppableStageIds.has(collision.id as string)
      );
      if (closestColumn) return [closestColumn];
      return [];
    },
    [droppableStageIds, activePromiseStageId]
  );

  // Función para actualizar un stage localmente (optimista)
  // ✅ PRESERVAR ORDEN: Mantener el orden que viene de la BD (NO reordenar)
  // Solo actualizar campos que no afectan el orden (name, color, etc.) - NUNCA actualizar order
  const updateLocalStage = useCallback((stageId: string, updates: Partial<PipelineStage>) => {
    setLocalPipelineStages(prev => {
      // Actualizar sin cambiar el orden (el orden viene de la BD)
      // ✅ IMPORTANTE: NO actualizar el campo 'order' ni cambiar la posición en el array
      return prev.map(stage => {
        if (stage.id === stageId) {
          // Actualizar solo campos permitidos (name, color, etc.) pero preservar order y posición
          const { order, ...allowedUpdates } = updates;
          return { ...stage, ...allowedUpdates };
        }
        return stage;
      });
    });
  }, []);
  
  // Agrupar promises por stage: activos por stage_id; terminales en historial-virtual
  const promisesByStage = useMemo(() => {
    const defaultStage = visibleStages.find((s) => s.id !== 'historial-virtual');

    return visibleStages.reduce((acc: Record<string, PromiseWithContact[]>, stage: PipelineStage) => {
      if (stage.id === 'historial-virtual') {
        acc['historial-virtual'] = sortedPromises.filter((p: PromiseWithContact) => {
          const slug = p.promise_pipeline_stage?.slug;
          return slug != null && isTerminalStage(slug);
        });
      } else {
        acc[stage.id] = sortedPromises.filter((p: PromiseWithContact) => {
          if (!p.promise_pipeline_stage_id && defaultStage && stage.id === defaultStage.id) return true;
          return p.promise_pipeline_stage_id === stage.id;
        });
      }
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

    const draggedPromiseId = active.id as string;
    let newStageId = over.id as string;

    // Al soltar en Historial, mapear a la etapa real archived
    if (newStageId === 'historial-virtual') {
      const archivedStage = pipelineStages.find((s: PipelineStage) => s.slug === 'archived');
      if (!archivedStage) {
        isDraggingRef.current = false;
        toast.error('No se encontró la etapa Archivado');
        return;
      }
      newStageId = archivedStage.id;
    }

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

        <div className="flex gap-2 w-full sm:w-auto items-center">
          {/* Divisor */}
          <div className="h-6 w-px bg-zinc-700" />
          
          {/* Toggle Mostrar Historial: columna oculta por defecto */}
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={() => setShowHistorial((prev) => !prev)}
            className="gap-1.5 h-8"
            title={showHistorial ? 'Ocultar columna Historial' : 'Mostrar columna Historial (aprobadas, archivadas, canceladas)'}
          >
            <Archive className="h-3.5 w-3.5" />
            <span className="text-xs">{showHistorial ? 'Ocultar Historial' : 'Mostrar Historial'}</span>
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
                pipelineStages={localPipelineStages}
                onPipelineStagesUpdated={onPipelineStagesUpdated}
                onUpdateLocalStage={updateLocalStage}
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
                  pipelineStages={localPipelineStages}
                  onPipelineStagesUpdated={onPipelineStagesUpdated}
                  onUpdateLocalStage={updateLocalStage}
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
                pipelineStages={localPipelineStages}
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
          // Solo refrescar si no se redirigió (modo edición)
          // En modo creación, EventFormModal ya maneja la redirección
          onPromiseCreated();
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
  pipelineStages = [],
  onPipelineStagesUpdated,
  onUpdateLocalStage,
}: {
  stage: PipelineStage;
  promises: PromiseWithContact[];
  onPromiseClick: (promise: PromiseWithContact) => void;
  studioSlug: string;
  isFlexible?: boolean;
  onPromiseArchived?: (promiseId: string) => void;
  onPromiseDeleted?: (promiseId: string) => void;
  onPromiseUpdated?: () => void;
  pipelineStages?: PipelineStage[];
  onPipelineStagesUpdated?: () => void;
  onUpdateLocalStage?: (stageId: string, updates: Partial<PipelineStage>) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const isVirtualHistorial = stage.id === 'historial-virtual';
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(stage.name);
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Paleta de colores predefinida
  const colorPalette = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#A855F7', // Violet
  ];
  
  // Obtener nombre original del sistema (no aplicar a columna virtual)
  const systemName = isVirtualHistorial ? stage.name : getSystemStageName(stage.slug);
  const isRenamed = !isVirtualHistorial && stage.name !== systemName;
  
  // Sincronizar editedName cuando cambia stage.name
  useEffect(() => {
    setEditedName(stage.name);
  }, [stage.name]);
  
  // Focus en input cuando entra en modo edición
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleSave = async () => {
    if (isVirtualHistorial) return;
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
    
    // Validar que el ID sea válido (debe ser un CUID válido)
    if (!stage.id || typeof stage.id !== 'string' || stage.id.trim() === '') {
      toast.error('ID de etapa inválido');
      setIsEditing(false);
      return;
    }
    
    // Validar formato CUID: debe empezar con 'c' o 'C' y tener al menos 8 caracteres más
    const trimmedId = stage.id.trim();
    const cuidPattern = /^[cC][^\s-]{8,}$/;
    if (!cuidPattern.test(trimmedId)) {
      console.error('[KanbanColumn] ID no es un CUID válido:', trimmedId, 'Stage:', stage.slug);
      toast.error('No se puede actualizar el nombre de esta etapa del sistema');
      setIsEditing(false);
      return;
    }
    
    // Capitalizar primera letra
    const trimmedName = editedName.trim();
    const newName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase();
    
    // ✅ Actualización optimista: actualizar inmediatamente en el DOM
    onUpdateLocalStage?.(stage.id, { name: newName });
    setIsEditing(false);
    setIsSaving(true);
    
    try {
      // ✅ Sincronizar con el servidor (sin recargar todo)
      const result = await updatePipelineStage(studioSlug, {
        id: trimmedId,
        name: newName,
      });
      
      if (result.success) {
        // ✅ Actualizar solo el nombre (NO el order ni otros campos que puedan afectar el orden)
        // El servidor devuelve todo el objeto, pero solo necesitamos actualizar el nombre
        if (result.data) {
          // Solo pasar el nombre actualizado, NO todo el objeto (para preservar el orden)
          onUpdateLocalStage?.(stage.id, { name: result.data.name });
        }
        toast.success('Nombre actualizado');
        // NO llamar a onPipelineStagesUpdated para evitar recargas innecesarias
        // La actualización optimista ya actualizó el DOM
      } else {
        // Revertir si falla
        onUpdateLocalStage?.(stage.id, { name: stage.name });
        setEditedName(stage.name);
        toast.error(result.error || 'Error al actualizar nombre');
      }
    } catch (error) {
      // Revertir si hay error
      onUpdateLocalStage?.(stage.id, { name: stage.name });
      setEditedName(stage.name);
      toast.error('Error al actualizar nombre');
      console.error('Error updating stage name:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleReset = async () => {
    if (stage.name === systemName) return;
    
    // Validar que el ID sea válido (debe ser un CUID válido)
    if (!stage.id || typeof stage.id !== 'string' || stage.id.trim() === '') {
      toast.error('ID de etapa inválido');
      return;
    }
    
    // Validar formato CUID: debe empezar con 'c' o 'C' y tener al menos 8 caracteres más
    const trimmedId = stage.id.trim();
    const cuidPattern = /^[cC][^\s-]{8,}$/;
    if (!cuidPattern.test(trimmedId)) {
      console.error('[KanbanColumn] ID no es un CUID válido:', trimmedId, 'Stage:', stage.slug);
      toast.error('No se puede restaurar el nombre de esta etapa del sistema');
      return;
    }
    
    // ✅ Actualización optimista: actualizar inmediatamente en el DOM
    onUpdateLocalStage?.(stage.id, { name: systemName });
    setIsEditing(false);
    setIsSaving(true);
    
    try {
      // ✅ Sincronizar con el servidor (sin recargar todo)
      const result = await updatePipelineStage(studioSlug, {
        id: trimmedId,
        name: systemName,
      });
      
      if (result.success) {
        // ✅ Actualizar solo el nombre (NO el order ni otros campos que puedan afectar el orden)
        if (result.data) {
          // Solo pasar el nombre actualizado, NO todo el objeto (para preservar el orden)
          onUpdateLocalStage?.(stage.id, { name: result.data.name });
        }
        toast.success('Nombre restaurado');
        // NO llamar a onPipelineStagesUpdated para evitar recargas innecesarias
        // La actualización optimista ya actualizó el DOM
      } else {
        // Revertir si falla
        onUpdateLocalStage?.(stage.id, { name: stage.name });
        toast.error(result.error || 'Error al restaurar nombre');
      }
    } catch (error) {
      // Revertir si hay error
      onUpdateLocalStage?.(stage.id, { name: stage.name });
      toast.error('Error al restaurar nombre');
      console.error('Error resetting stage name:', error);
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
    
    // Validar que el ID sea válido (debe ser un CUID válido)
    if (!stage.id || typeof stage.id !== 'string' || stage.id.trim() === '') {
      toast.error('ID de etapa inválido');
      return;
    }
    
    // Validar formato CUID: debe empezar con 'c' o 'C' y tener al menos 8 caracteres más
    const trimmedId = stage.id.trim();
    const cuidPattern = /^[cC][^\s-]{8,}$/;
    if (!cuidPattern.test(trimmedId)) {
      console.error('[KanbanColumn] ID no es un CUID válido:', trimmedId, 'Stage:', stage.slug);
      toast.error('No se puede actualizar el color de esta etapa del sistema');
      setIsColorPickerOpen(false);
      return;
    }
    
    // ✅ Actualización optimista: actualizar inmediatamente en el DOM
    onUpdateLocalStage?.(stage.id, { color: newColor });
    setIsColorPickerOpen(false);
    setIsSaving(true);
    
    try {
      // ✅ Sincronizar con el servidor
      const result = await updatePipelineStage(studioSlug, {
        id: trimmedId,
        color: newColor,
      });
      
      if (result.success) {
        if (result.data) {
          onUpdateLocalStage?.(stage.id, { color: result.data.color });
        }
        toast.success('Color actualizado');
      } else {
        // Revertir si falla
        onUpdateLocalStage?.(stage.id, { color: stage.color });
        toast.error(result.error || 'Error al actualizar color');
      }
    } catch (error) {
      // Revertir si hay error
      onUpdateLocalStage?.(stage.id, { color: stage.color });
      toast.error('Error al actualizar color');
      console.error('Error updating stage color:', error);
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
        className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-700 group"
        style={{ borderBottomColor: stage.color + '40' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!isVirtualHistorial && (
          <ZenDropdownMenu open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
            <ZenDropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsColorPickerOpen(true);
                }}
                className="w-3 h-3 rounded-full shrink-0 cursor-pointer hover:ring-2 hover:ring-zinc-600 hover:ring-offset-2 hover:ring-offset-zinc-950 transition-all"
                style={{ backgroundColor: stage.color }}
                title="Cambiar color"
              />
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="start" className="w-40 p-2">
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-400 mb-1.5">Selecciona un color</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColorChange(color);
                      }}
                      className={`w-5 h-5 rounded-full border transition-all hover:scale-110 ${
                        stage.color === color
                          ? 'border-white ring-1 ring-offset-1 ring-offset-zinc-900'
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
          )}
          {isVirtualHistorial && (
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
              title="Historial"
            />
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
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                style={{ maxWidth: '180px' }}
              />
              {editedName.trim() !== systemName && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setEditedName(systemName);
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 p-1 text-zinc-400 hover:text-blue-400 transition-colors rounded hover:bg-zinc-700/50"
                  title={`Restaurar a "${systemName}"`}
                  type="button"
                >
                  <Undo2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <h3 
                className={`font-medium text-white text-sm truncate flex-1 min-w-0 ${isVirtualHistorial ? 'cursor-default' : 'cursor-pointer hover:text-blue-400 transition-colors'}`}
                onClick={() => !isVirtualHistorial && setIsEditing(true)}
                title={isVirtualHistorial ? 'Historial' : (isRenamed ? `Etapa original: ${systemName}` : 'Clic para editar')}
              >
                {stage.name}
              </h3>
              {/* ✅ Spinner pequeño mientras se guarda */}
              {isSaving && (
                <Loader2 className="h-3 w-3 text-blue-400 animate-spin shrink-0" />
              )}
            </div>
          )}
          {!isVirtualHistorial && !isEditing && !isSaving && isHovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="shrink-0 p-0.5 text-zinc-400 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Editar nombre"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded shrink-0 ml-2">
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
              pipelineStages={pipelineStages}
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

