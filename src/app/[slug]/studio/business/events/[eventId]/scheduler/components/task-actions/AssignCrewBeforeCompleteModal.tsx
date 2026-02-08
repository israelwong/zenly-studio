'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenInput, ZenButton, ZenAvatar, ZenAvatarFallback, ZenSwitch } from '@/components/ui/zen';
import { ZenConfirmModal } from '@/components/ui/zen/overlays/ZenConfirmModal';
import { obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { actualizarPreferenciaCrew } from '@/lib/actions/studio/crew/crew.actions';
import { toast } from 'sonner';
import { Check, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickAddCrewModal } from '../crew-assignment/QuickAddCrewModal';

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

interface AssignCrewBeforeCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteWithoutPayment: () => void;
  onAssignAndComplete: (crewMemberId: string, skipPayment?: boolean) => Promise<void>;
  studioSlug: string;
  /** Solo presente para ítems de cotización; ausente para tareas manuales */
  itemId?: string;
  itemName: string;
  costoTotal: number;
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

export function AssignCrewBeforeCompleteModal({
  isOpen,
  onClose,
  onCompleteWithoutPayment,
  onAssignAndComplete,
  studioSlug,
  itemId,
  itemName,
  costoTotal,
}: AssignCrewBeforeCompleteModalProps) {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [rememberPreference, setRememberPreference] = useState(false);
  const [showFixedSalaryConfirmModal, setShowFixedSalaryConfirmModal] = useState(false);
  const [pendingCrewMemberId, setPendingCrewMemberId] = useState<string | null>(null);

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

  const handleAssignAndComplete = async () => {
    if (!selectedMemberId) {
      toast.error('Selecciona un miembro del equipo');
      return;
    }

    // Verificar si el miembro tiene sueldo fijo
    const selectedMember = members.find(m => m.id === selectedMemberId);
    const hasFixedSalary = selectedMember && getSalaryType(selectedMember) === 'fixed';

    if (hasFixedSalary) {
      // Mostrar modal de confirmación para sueldo fijo
      setPendingCrewMemberId(selectedMemberId);
      setShowFixedSalaryConfirmModal(true);
      return;
    }

    // Si tiene honorarios variables, proceder normalmente (skipPayment = false por defecto)
    setIsAssigning(true);
    try {
      await onAssignAndComplete(selectedMemberId, false);
      // Cerrar modal si la operación fue exitosa
      onClose();
    } catch (error) {
      // El error ya fue manejado en onAssignAndComplete con toast específico
      // Solo loguear para debugging, no mostrar toast adicional
      const errorMessage = error instanceof Error ? error.message : '';
      console.error('Error capturado en handleAssignAndComplete (ya manejado):', errorMessage);
      // No cerrar el modal si hubo un error crítico
      // El usuario puede intentar nuevamente
    } finally {
      setIsAssigning(false);
    }
  };

  const handleConfirmFixedSalary = async () => {
    if (!pendingCrewMemberId) return;

    setIsAssigning(true);
    try {
      // Pasar a pago (comportamiento normal, skipPayment = false)
      await onAssignAndComplete(pendingCrewMemberId, false);
      setShowFixedSalaryConfirmModal(false);
      setPendingCrewMemberId(null);
      onClose();
    } catch (error) {
      // El error ya se mostró en onAssignAndComplete, solo loguear
      console.error('Error en handleConfirmFixedSalary:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSkipPayment = async () => {
    if (!pendingCrewMemberId) return;

    setIsAssigning(true);
    try {
      // Completar sin pasar a pago (skipPayment = true)
      await onAssignAndComplete(pendingCrewMemberId, true);
      setShowFixedSalaryConfirmModal(false);
      setPendingCrewMemberId(null);
      onClose();
    } catch (error) {
      // El error ya se mostró en onAssignAndComplete, solo loguear
      console.error('Error en handleSkipPayment:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCompleteWithoutPayment = () => {
    onCompleteWithoutPayment();
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const hasNoCrew = !loadingMembers && members.length === 0;

  return (
    <>
      <ZenDialog
        isOpen={isOpen}
        onClose={onClose}
        title={hasNoCrew ? "¿Deseas agregar personal?" : "Asignar personal para generar pago"}
        description={
          hasNoCrew
            ? "No tienes personal registrado. Usa «Registrar personal» en el footer o completa sin asignar."
            : "Para generar el pago en nómina, asigna un miembro del equipo a esta tarea."
        }
        maxWidth="md"
        closeOnClickOutside={false}
        onCancel={onClose}
        cancelLabel="Cancelar"
        cancelVariant="secondary"
        cancelAlignRight
        zIndex={100010}
        footerLeftContent={
          <ZenButton variant="ghost" size="sm" onClick={() => setShowQuickAddModal(true)} className="gap-2">
            <UserPlus className="h-3.5 w-3.5" />
            Registrar personal
          </ZenButton>
        }
      >
        <div className="space-y-4">
          {/* Información del item */}
          <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
            <div className="text-sm text-zinc-400">Tarea:</div>
            <div className="text-sm font-medium text-zinc-200">{itemName}</div>
            {costoTotal > 0 && (
              <div className="text-xs text-zinc-500">
                Costo: <span className="text-emerald-400 font-medium">{formatCurrency(costoTotal)}</span>
              </div>
            )}
          </div>

          {/* Selector de personal o opciones cuando no hay crew */}
          {hasNoCrew ? (
            <div className="space-y-3">
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-4">
                <p className="text-sm text-amber-300 mb-2">
                  <strong>No tienes personal registrado</strong>
                </p>
                <p className="text-xs text-amber-300/80">
                  Usa &quot;Registrar personal&quot; en el footer para agregar personal, o completa la tarea sin asignar.
                </p>
              </div>

              {/* Completar sin pago en su posición */}
              <ZenButton
                onClick={handleCompleteWithoutPayment}
                variant="outline"
                className="w-full"
              >
                Completar sin pago
              </ZenButton>

              {/* Checkbox para recordar preferencia cuando no hay crew */}
              <div className="flex items-center gap-2 pt-1">
                <ZenSwitch
                  checked={rememberPreference}
                  onCheckedChange={setRememberPreference}
                />
                <label className="text-xs text-zinc-400 cursor-pointer">
                  Recordar que no tengo personal aún
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Seleccionar miembro del equipo:</label>

              <ZenInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar personal..."
                className="w-full"
              />

              {loadingMembers ? (
                <div className="space-y-1 border border-zinc-800 rounded-lg p-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="w-full flex items-center gap-2 px-2 py-2 animate-pulse"
                    >
                      <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-800" />
                      <div className="h-3 w-3 shrink-0 bg-zinc-800 rounded" />
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
                        <ZenAvatar className="h-6 w-6 shrink-0">
                          <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[10px]">
                            {getInitials(member.name)}
                          </ZenAvatarFallback>
                        </ZenAvatar>
                        <div className="h-3 w-3 flex items-center justify-center shrink-0">
                          {selectedMemberId === member.id && (
                            <Check className="h-3 w-3 text-emerald-400" />
                          )}
                        </div>
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

              {/* Asignar y completar debajo de la lista (como SelectCrewModal) */}
              <ZenButton
                className="w-full mt-2"
                size="sm"
                onClick={handleAssignAndComplete}
                disabled={!selectedMemberId || isAssigning}
                loading={isAssigning}
              >
                Asignar y completar
              </ZenButton>

              {/* Completar sin pago en su posición */}
              <ZenButton
                onClick={handleCompleteWithoutPayment}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Completar sin pago
              </ZenButton>
            </div>
          )}
        </div>
      </ZenDialog>

      {/* Modal rápido para agregar personal */}
      <QuickAddCrewModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onCrewCreated={handleCrewCreated}
        studioSlug={studioSlug}
      />

      {/* Modal de confirmación para sueldo fijo */}
      <ZenConfirmModal
        isOpen={showFixedSalaryConfirmModal}
        onClose={() => {
          setShowFixedSalaryConfirmModal(false);
          setPendingCrewMemberId(null);
        }}
        onConfirm={handleConfirmFixedSalary}
        title="¿Deseas pasar a pago?"
        description={
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">
              Este miembro del equipo cuenta con <strong className="text-amber-400">sueldo fijo</strong>.
            </p>
            <p className="text-sm text-zinc-400">
              ¿Deseas generar el pago de nómina para esta tarea?
            </p>
          </div>
        }
        confirmText="Sí, pasar a pago"
        cancelText="No, solo completar"
        variant="default"
        loading={isAssigning}
        loadingText="Procesando..."
      />
    </>
  );
}
