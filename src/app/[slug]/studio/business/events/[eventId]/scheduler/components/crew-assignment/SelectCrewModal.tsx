'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenInput, ZenButton, ZenAvatar, ZenAvatarFallback, ZenBadge } from '@/components/ui/zen';
import { obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { verificarConflictosColaborador } from '@/lib/actions/studio/business/events/scheduler-actions';
import { Check, UserPlus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickAddCrewModal } from './QuickAddCrewModal';

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tipo: string;
  status: string;
  fixed_salary: number | null;
  variable_salary: number | null;
}

interface SelectCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (crewMemberId: string | null) => Promise<void>;
  studioSlug: string;
  currentMemberId?: string | null;
  title?: string;
  description?: string;
  // Props opcionales para verificación de conflictos
  eventId?: string;
  taskStartDate?: Date;
  taskEndDate?: Date;
  taskId?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getSalaryType(member: CrewMember): 'fixed' | 'variable' | null {
  if (member.fixed_salary !== null && member.fixed_salary > 0) {
    return 'fixed';
  }
  if (member.variable_salary !== null && member.variable_salary > 0) {
    return 'variable';
  }
  return null;
}

export function SelectCrewModal({
  isOpen,
  onClose,
  onSelect,
  studioSlug,
  currentMemberId,
  title = 'Asignar personal',
  description = 'Selecciona un miembro del equipo para asignar a esta tarea.',
  eventId,
  taskStartDate,
  taskEndDate,
  taskId,
}: SelectCrewModalProps) {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(currentMemberId || null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [conflictCount, setConflictCount] = useState<number | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Usar refs para las fechas para evitar recreación constante
  const taskStartDateRef = useRef(taskStartDate);
  const taskEndDateRef = useRef(taskEndDate);

  useEffect(() => {
    taskStartDateRef.current = taskStartDate;
    taskEndDateRef.current = taskEndDate;
  }, [taskStartDate, taskEndDate]);

  const checkConflicts = useCallback(async (crewMemberId: string) => {
    const startDate = taskStartDateRef.current;
    const endDate = taskEndDateRef.current;

    if (!eventId || !startDate || !endDate) return;

    setCheckingConflicts(true);
    try {
      const result = await verificarConflictosColaborador(
        studioSlug,
        eventId,
        crewMemberId,
        startDate,
        endDate,
        taskId
      );

      if (result.success && result.conflictCount !== undefined) {
        setConflictCount(result.conflictCount);
      } else {
        setConflictCount(null);
      }
    } catch (error) {
      console.error('Error verificando conflictos:', error);
      setConflictCount(null);
    } finally {
      setCheckingConflicts(false);
    }
  }, [studioSlug, eventId, taskId]);

  // Sincronizar selectedMemberId con currentMemberId cuando cambia
  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId(currentMemberId || null);
      setSearchTerm('');
      setConflictCount(null);
    }
  }, [isOpen, currentMemberId]);

  // Verificar conflictos cuando se selecciona un colaborador y hay fechas disponibles
  useEffect(() => {
    if (
      selectedMemberId &&
      eventId &&
      taskStartDateRef.current &&
      taskEndDateRef.current &&
      selectedMemberId !== currentMemberId
    ) {
      checkConflicts(selectedMemberId);
    } else {
      setConflictCount(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, eventId, currentMemberId]); // checkConflicts es estable gracias a useCallback

  // Cargar miembros cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen]);

  const loadMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const result = await obtenerCrewMembers(studioSlug);
      if (result.success && result.data) {
        setMembers(result.data);
      }
    } catch (error) {
      // Error silencioso al cargar miembros
    } finally {
      setLoadingMembers(false);
    }
  }, [studioSlug]);

  // Recargar miembros cuando se cierra el modal rápido
  const handleCrewCreated = useCallback(async (crewMemberId: string) => {
    await loadMembers();
    setSelectedMemberId(crewMemberId);
  }, [loadMembers]);

  // Filtrar miembros según búsqueda
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const term = searchTerm.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.email?.toLowerCase().includes(term) ||
        m.tipo.toLowerCase().includes(term)
    );
  }, [members, searchTerm]);

  const handleSelect = async () => {
    setIsAssigning(true);
    try {
      await onSelect(selectedMemberId);
      onClose();
    } catch (error) {
      // Error manejado por el callback
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemove = async () => {
    setIsAssigning(true);
    try {
      await onSelect(null);
      onClose();
    } catch (error) {
      // Error manejado por el callback
    } finally {
      setIsAssigning(false);
    }
  };

  const hasNoCrew = !loadingMembers && members.length === 0;

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        description={description}
        maxWidth="md"
        closeOnClickOutside={false}
        onCancel={onClose}
        cancelLabel="Cancelar"
        zIndex={100010}
      >
        <div className="space-y-4">
          {/* Selector de personal o opciones cuando no hay crew */}
          {hasNoCrew ? (
            <div className="space-y-3">
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-4">
                <p className="text-sm text-amber-300 mb-2">
                  <strong>No tienes personal registrado</strong>
                </p>
                <p className="text-xs text-amber-300/80">
                  Agrega personal ahora para asignarlo a esta tarea.
                </p>
              </div>

              <ZenButton
                onClick={() => setShowQuickAddModal(true)}
                className="w-full gap-2"
                variant="secondary"
              >
                <UserPlus className="h-4 w-4" />
                Agregar personal rápidamente
              </ZenButton>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Seleccionar miembro del equipo:</label>

              {/* Input de búsqueda */}
              <ZenInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar personal..."
                className="w-full"
              />

              {/* Lista de miembros */}
              {loadingMembers ? (
                <div className="space-y-1 border border-zinc-800 rounded-lg p-2">
                  {/* Skeleton: mostrar 5 items placeholder */}
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="w-full flex items-center gap-2 px-2 py-2 animate-pulse"
                    >
                      {/* Avatar skeleton */}
                      <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-800" />

                      {/* Check indicator skeleton */}
                      <div className="h-3 w-3 shrink-0 bg-zinc-800 rounded" />

                      {/* Información skeleton */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="h-3 bg-zinc-800 rounded w-3/4" />
                        <div className="h-2 bg-zinc-800/50 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1 max-h-[280px] overflow-y-auto border border-zinc-800 rounded-lg p-2">
                  {filteredMembers.length === 0 ? (
                    <div className="text-xs text-zinc-500 py-4 text-center">
                      {searchTerm.trim() ? 'No se encontraron resultados' : 'No hay personal disponible'}
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-2 text-left text-xs hover:bg-zinc-800 rounded transition-colors',
                          selectedMemberId === member.id && 'bg-zinc-800'
                        )}
                      >
                        {/* Avatar */}
                        <ZenAvatar className="h-6 w-6 shrink-0">
                          <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[10px]">
                            {getInitials(member.name)}
                          </ZenAvatarFallback>
                        </ZenAvatar>

                        {/* Check indicator */}
                        <div className="h-3 w-3 flex items-center justify-center shrink-0">
                          {selectedMemberId === member.id && (
                            <Check className="h-3 w-3 text-emerald-400" />
                          )}
                        </div>

                        {/* Información */}
                        <div className="flex-1 min-w-0">
                          <div className="text-zinc-300 truncate">{member.name}</div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 truncate">
                            {getSalaryType(member) === 'fixed' && (
                              <span className="text-amber-400 font-medium">Sueldo fijo</span>
                            )}
                            {getSalaryType(member) === 'variable' && (
                              <span className="text-blue-400 font-medium">Honorarios variables</span>
                            )}
                            {getSalaryType(member) && <span>•</span>}
                            <span className="truncate">{member.tipo}</span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Aviso de conflictos */}
              {selectedMemberId && conflictCount !== null && conflictCount > 0 && (
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-300 font-medium mb-1">
                        Este colaborador ya tiene {conflictCount} {conflictCount === 1 ? 'tarea' : 'tareas'} en este rango de fechas
                      </p>
                      <p className="text-xs text-amber-300/70">
                        Puedes asignarlo de todas formas. El sistema permite asignación múltiple.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón para agregar personal adicional */}
              <ZenButton
                onClick={() => setShowQuickAddModal(true)}
                variant="outline"
                className="w-full gap-2 mt-2"
                size="sm"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Agregar personal adicional
              </ZenButton>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
            {!hasNoCrew && (
              <>
                <ZenButton
                  onClick={handleSelect}
                  disabled={selectedMemberId === currentMemberId || isAssigning}
                  loading={isAssigning}
                  className="w-full"
                >
                  {currentMemberId ? 'Cambiar asignación' : 'Asignar personal'}
                </ZenButton>
                {currentMemberId && (
                  <ZenButton
                    onClick={handleRemove}
                    variant="outline"
                    className="w-full"
                    disabled={isAssigning}
                  >
                    Quitar asignación
                  </ZenButton>
                )}
              </>
            )}
          </div>
        </div>
      </ZenDialog>

      {/* Modal rápido para agregar personal */}
      <QuickAddCrewModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onCrewCreated={handleCrewCreated}
        studioSlug={studioSlug}
      />
    </>
  );
}
