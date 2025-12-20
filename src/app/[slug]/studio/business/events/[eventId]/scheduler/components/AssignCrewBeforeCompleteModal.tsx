'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenInput, ZenButton, ZenAvatar, ZenAvatarFallback, ZenSwitch } from '@/components/ui/zen';
import { obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { actualizarPreferenciaCrew } from '@/lib/actions/studio/crew/crew.actions';
import { toast } from 'sonner';
import { Check, UserPlus } from 'lucide-react';
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

interface AssignCrewBeforeCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteWithoutPayment: () => void;
  onAssignAndComplete: (crewMemberId: string) => Promise<void>;
  studioSlug: string;
  itemId: string;
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

    setIsAssigning(true);
    try {
      // El handler del padre se encargará de asignar y completar
      await onAssignAndComplete(selectedMemberId);
      onClose();
    } catch (error) {
      toast.error('Error al asignar y completar');
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
            ? "No tienes personal registrado. Puedes agregarlo ahora o completar la tarea sin asignar personal."
            : "Para generar el pago en nómina, asigna un miembro del equipo a esta tarea."
        }
        maxWidth="md"
        closeOnClickOutside={false}
        onCancel={onClose}
        cancelLabel="Cancelar"
        zIndex={10060}
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
                  Puedes agregar personal ahora para asignarlo a esta tarea, o completar la tarea sin asignar personal.
                </p>
              </div>

              <ZenButton
                onClick={() => setShowQuickAddModal(true)}
                className="w-full gap-2"
                variant="default"
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
                <div className="text-xs text-zinc-500 py-4 text-center">Cargando...</div>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto border border-zinc-800 rounded-lg p-2">
                  {filteredMembers.length === 0 ? (
                    <div className="text-xs text-zinc-500 py-4 text-center">
                      {searchTerm.trim() ? 'No se encontraron resultados' : 'No hay personal disponible'}
                    </div>
                  ) : (
                    filteredMembers.slice(0, 5).map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-2 text-left text-xs hover:bg-zinc-800 rounded transition-colors',
                          selectedMemberId === member.id && 'bg-zinc-800'
                        )}
                      >
                        {/* Avatar */}
                        <ZenAvatar className="h-6 w-6 flex-shrink-0">
                          <ZenAvatarFallback className="bg-blue-600/20 text-blue-400 text-[10px]">
                            {getInitials(member.name)}
                          </ZenAvatarFallback>
                        </ZenAvatar>

                        {/* Check indicator */}
                        <div className="h-3 w-3 flex items-center justify-center flex-shrink-0">
                          {selectedMemberId === member.id && (
                            <Check className="h-3 w-3 text-emerald-400" />
                          )}
                        </div>

                        {/* Información */}
                        <div className="flex-1 min-w-0">
                          <div className="text-zinc-300 truncate">{member.name}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{member.tipo}</div>
                        </div>
                      </button>
                    ))
                  )}
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
              <ZenButton
                onClick={handleAssignAndComplete}
                disabled={!selectedMemberId || isAssigning}
                loading={isAssigning}
                className="w-full"
              >
                Asignar y completar
              </ZenButton>
            )}
            <ZenButton
              onClick={handleCompleteWithoutPayment}
              variant="outline"
              className="w-full"
            >
              Completar sin pago
            </ZenButton>

            {/* Checkbox para recordar preferencia cuando no hay crew */}
            {hasNoCrew && (
              <div className="flex items-center gap-2 pt-2">
                <ZenSwitch
                  checked={rememberPreference}
                  onCheckedChange={setRememberPreference}
                />
                <label className="text-xs text-zinc-400 cursor-pointer">
                  Recordar que no tengo personal aún
                </label>
              </div>
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
