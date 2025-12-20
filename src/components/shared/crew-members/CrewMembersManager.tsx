'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/shadcn/sheet';
import { obtenerCrewMembers, crearCrewMember, actualizarCrewMember } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';
import { CrewMemberCard } from './CrewMemberCard';
import { CrewMemberCardSkeleton } from './CrewMemberCardSkeleton';
import { CrewMembersCardView } from './CrewMembersCardView';
import { CrewMemberFormModal } from './CrewMemberFormModal';

interface CrewMembersManagerProps {
  studioSlug: string;
  onMemberSelect?: (memberId: string) => void;
  mode?: 'select' | 'manage';
  isOpen: boolean;
  onClose: () => void;
}

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tipo: string;
  status: string;
  skills: Array<{
    id: string;
    name: string;
    color: string | null;
    icono: string | null;
    is_primary: boolean;
  }>;
  fixed_salary: number | null;
  salary_frequency?: string | null;
  variable_salary: number | null;
  account: {
    id: string;
    email: string;
    is_active: boolean;
  } | null;
}

export function CrewMembersManager({
  studioSlug,
  onMemberSelect,
  mode = 'manage',
  isOpen,
  onClose,
}: CrewMembersManagerProps) {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const formModalOpenRef = useRef(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await obtenerCrewMembers(studioSlug);

      if (result.success && result.data) {
        setMembers(result.data);
      } else {
        toast.error(result.error || 'Error al cargar personal');
      }
    } catch (error) {
      console.error('Error loading crew members:', error);
      toast.error('Error al cargar personal');
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      // Resetear estados del modal cuando se cierra el sheet
      setFormModalOpen(false);
      setEditingMember(null);
    }
  }, [isOpen, loadData]);

  // Actualizar ref cuando cambia el estado del modal
  useEffect(() => {
    formModalOpenRef.current = formModalOpen;
  }, [formModalOpen]);

  const handleMemberClick = (memberId: string) => {
    if (mode === 'select' && onMemberSelect) {
      onMemberSelect(memberId);
      onClose();
    }
  };

  const handleCloseModal = useCallback(() => {
    // Cerrar inmediatamente para sincronizar con el cierre del modal
    setFormModalOpen(false);
    formModalOpenRef.current = false;
    setEditingMember(null);
  }, []);


  const handleCrewCreated = useCallback(async (formData: Record<string, unknown>) => {
    // Guardar estado anterior para rollback
    const previousMembers = [...members];

    try {
      // Crear optimista temporal
      const tempId = `temp-${Date.now()}`;
      const optimisticMember: CrewMember = {
        id: tempId,
        name: (formData.name as string) || '',
        email: (formData.email as string) || null,
        phone: (formData.phone as string) || null,
        tipo: formData.tipo as string,
        status: 'activo',
        fixed_salary: formData.fixed_salary ? Number(formData.fixed_salary) : null,
        variable_salary: formData.variable_salary ? Number(formData.variable_salary) : null,
        skills: [],
        account: null,
      };

      // Actualización optimista local
      setMembers((prev) => [...prev, optimisticMember].sort((a, b) => a.name.localeCompare(b.name)));
      handleCloseModal();

      // Crear en servidor
      const result = await crearCrewMember(studioSlug, formData);

      if (result.success && result.data) {
        // Obtener datos completos del nuevo miembro (con skills)
        const memberResult = await obtenerCrewMembers(studioSlug);
        if (memberResult.success && memberResult.data) {
          // Encontrar el nuevo miembro por nombre (ya que no tenemos el ID real aún)
          const newMember = memberResult.data.find(
            (m) => m.name === optimisticMember.name && m.phone === optimisticMember.phone
          );
          if (newMember) {
            // Reemplazar temporal con datos reales completos
            setMembers((prev) =>
              prev
                .map((m) => (m.id === tempId ? newMember : m))
                .sort((a, b) => a.name.localeCompare(b.name))
            );
          } else {
            // Si no se encuentra, mantener el optimista y recargar todo
            setMembers(memberResult.data);
          }
        }
        toast.success('Personal creado exitosamente');
      } else {
        // Revertir en caso de error
        setMembers(previousMembers);
        toast.error(result.error || 'Error al crear personal');
      }
    } catch (error) {
      // Revertir en caso de error
      setMembers(previousMembers);
      console.error('Error creating crew member:', error);
      toast.error('Error al crear personal');
    }
  }, [members, studioSlug, handleCloseModal]);

  const handleCrewUpdated = useCallback(async (memberId: string, formData: Record<string, unknown>) => {
    // Guardar estado anterior para rollback
    const previousMembers = [...members];

    try {
      // Actualización optimista local
      const optimisticMember: CrewMember = {
        ...members.find((m) => m.id === memberId)!,
        name: (formData.name as string) || '',
        email: (formData.email as string) || null,
        phone: (formData.phone as string) || null,
        tipo: formData.tipo as string,
        fixed_salary: formData.fixed_salary ? Number(formData.fixed_salary) : null,
        variable_salary: formData.variable_salary ? Number(formData.variable_salary) : null,
      };

      setMembers((prev) =>
        prev
          .map((m) => (m.id === memberId ? optimisticMember : m))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      handleCloseModal();

      // Actualizar en servidor
      const result = await actualizarCrewMember(studioSlug, memberId, formData);

      if (result.success && result.data) {
        // Obtener datos completos del miembro actualizado (con skills)
        const memberResult = await obtenerCrewMembers(studioSlug);
        if (memberResult.success && memberResult.data) {
          // Encontrar el miembro actualizado por ID
          const updatedMember = memberResult.data.find((m) => m.id === memberId);
          if (updatedMember) {
            // Actualizar solo ese miembro con datos completos
            setMembers((prev) =>
              prev
                .map((m) => (m.id === memberId ? updatedMember : m))
                .sort((a, b) => a.name.localeCompare(b.name))
            );
          } else {
            // Si no se encuentra, recargar todo
            setMembers(memberResult.data);
          }
        }
        toast.success('Personal actualizado exitosamente');
      } else {
        // Revertir en caso de error
        setMembers(previousMembers);
        toast.error(result.error || 'Error al actualizar personal');
      }
    } catch (error) {
      // Revertir en caso de error
      setMembers(previousMembers);
      console.error('Error updating crew member:', error);
      toast.error('Error al actualizar personal');
    }
  }, [members, studioSlug, handleCloseModal]);

  const handleCrewDeleted = useCallback((memberId: string) => {
    // Actualización optimista local
    setMembers((prev) => prev.filter((m) => m.id !== memberId));

    // El componente CrewMemberCard ya maneja la eliminación en el servidor
    // Si hay error, el componente mostrará el toast y no se eliminará del estado
  }, []);

  // Filtrar miembros por búsqueda
  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar alfabéticamente
  const sortedMembers = [...filteredMembers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Prevenir que el Sheet se cierre cuando el modal está abierto
  const handleSheetOpenChange = useCallback((newOpen: boolean) => {
    // Si el modal está abierto (usando ref para evitar problemas de timing), no permitir que el Sheet se cierre
    if (!newOpen && (formModalOpen || formModalOpenRef.current)) {
      return;
    }
    onClose();
  }, [formModalOpen, onClose]);

  return (
    <>
      {/* Overlay custom del Sheet - solo visible cuando el modal NO está abierto */}
      {isOpen && !formModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[49] animate-in fade-in-0"
          onClick={onClose}
        />
      )}

      {/* SHEET: LISTA DE PERSONAL */}
      <Sheet open={isOpen} onOpenChange={handleSheetOpenChange} modal={false}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-0"
          showOverlay={false}
          onInteractOutside={(e) => {
            // Cuando el modal está abierto, no prevenir eventos para que los inputs funcionen
            // El dialog maneja su propia interacción y el Sheet no se cerrará por handleSheetOpenChange
            if (formModalOpen) {
              return;
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevenir que el Sheet se cierre con Escape cuando el modal está abierto
            if (formModalOpen) {
              e.preventDefault();
            }
          }}
        >
          {/* Header */}
          <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl font-semibold text-white">
                  Personal
                </SheetTitle>
                <SheetDescription className="text-zinc-400">
                  Gestiona el equipo de trabajo
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Contenedor con padding */}
          <div className="p-6 space-y-4">
            {/* SEARCH + CREAR */}
            {mode === 'manage' && (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1 w-full">
                  <ZenInput
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={Search}
                    iconClassName="h-4 w-4"
                  />
                </div>
                <ZenButton
                  onClick={() => {
                    setEditingMember(null);
                    setFormModalOpen(true);
                    formModalOpenRef.current = true;
                  }}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear
                </ZenButton>
              </div>
            )}

            {/* Contador */}
            <div className="text-sm text-zinc-400 min-h-[20px]">
              {loading ? (
                <span className="text-zinc-500">Cargando...</span>
              ) : (
                <span>
                  {sortedMembers.length} {sortedMembers.length === 1 ? 'persona' : 'personas'}
                </span>
              )}
            </div>

            {/* LISTA DE PERSONAL */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CrewMemberCardSkeleton key={i} />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400 mb-4">No hay personal registrado</p>
                {mode === 'manage' && (
                  <ZenButton
                    onClick={() => {
                      setEditingMember(null);
                      setFormModalOpen(true);
                      formModalOpenRef.current = true;
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Crear el primero
                  </ZenButton>
                )}
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                No hay coincidencias para &quot;{searchTerm}&quot;
              </div>
            ) : mode === 'manage' ? (
              <CrewMembersCardView
                members={sortedMembers}
                loading={false}
                onEdit={(memberId) => {
                  const member = sortedMembers.find((m) => m.id === memberId);
                  if (member) {
                    setEditingMember(member);
                    setFormModalOpen(true);
                    formModalOpenRef.current = true;
                  }
                }}
                onDelete={(memberId) => handleCrewDeleted(memberId)}
                studioSlug={studioSlug}
              />
            ) : (
              <div className="space-y-3">
                {sortedMembers.map((member) => (
                  <CrewMemberCard
                    key={member.id}
                    member={member}
                    mode={mode}
                    onSelect={() => handleMemberClick(member.id)}
                    onEdit={() => {
                      setEditingMember(member);
                      setFormModalOpen(true);
                      formModalOpenRef.current = true;
                    }}
                    onDelete={() => handleCrewDeleted(member.id)}
                    studioSlug={studioSlug}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* MODAL: CREAR/EDITAR PERSONAL */}
      {mode === 'manage' && (
        <CrewMemberFormModal
          studioSlug={studioSlug}
          isOpen={formModalOpen}
          onClose={handleCloseModal}
          initialMember={editingMember}
          onSuccess={(payload) => {
            if (editingMember) {
              handleCrewUpdated(editingMember.id, payload);
            } else {
              handleCrewCreated(payload);
            }
          }}
          onDelete={editingMember ? () => handleCrewDeleted(editingMember.id) : undefined}
        />
      )}
    </>
  );
}
