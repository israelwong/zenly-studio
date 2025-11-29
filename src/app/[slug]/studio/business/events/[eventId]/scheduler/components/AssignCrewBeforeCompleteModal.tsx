'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenInput, ZenButton, ZenAvatar, ZenAvatarFallback } from '@/components/ui/zen';
import { obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      console.error('Error loading members:', error);
    } finally {
      setLoadingMembers(false);
    }
  }, [studioSlug]);

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
      console.error('Error assigning and completing:', error);
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

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar personal para generar pago"
      description="Para generar el pago en nómina, asigna un miembro del equipo a esta tarea."
      maxWidth="md"
      closeOnClickOutside={false}
      onCancel={onClose}
      cancelLabel="Cancelar"
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

        {/* Selector de personal */}
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
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
          <ZenButton
            onClick={handleAssignAndComplete}
            disabled={!selectedMemberId || isAssigning}
            loading={isAssigning}
            className="w-full"
          >
            Asignar y completar
          </ZenButton>
          <ZenButton
            onClick={handleCompleteWithoutPayment}
            variant="outline"
            className="w-full"
          >
            Completar sin pago
          </ZenButton>
        </div>
      </div>
    </ZenDialog>
  );
}
