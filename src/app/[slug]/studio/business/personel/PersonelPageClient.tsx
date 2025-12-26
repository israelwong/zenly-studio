'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Users, Edit, Trash2, MoreVertical } from 'lucide-react';
import { ZenButton, ZenInput, ZenBadge, ZenConfirmModal, ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription } from '@/components/ui/zen';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shadcn/table';
import {
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import { obtenerCrewMembers, eliminarCrewMember, checkCrewMemberAssociations } from '@/lib/actions/studio/crew/crew.actions';
import { toast } from 'sonner';
import { CrewMemberFormModal } from '@/components/shared/crew-members/CrewMemberFormModal';
import { Skeleton } from '@/components/ui/shadcn/Skeleton';

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
}

interface PersonelPageClientProps {
  studioSlug: string;
}

export function PersonelPageClient({ studioSlug }: PersonelPageClientProps) {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isModalOpenRef = useRef(false);

  const loadMembers = useCallback(async () => {
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
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  const handleCreate = useCallback(() => {
    setEditingMember(null);
    setIsModalOpen(true);
    isModalOpenRef.current = true;
  }, []);

  const handleEdit = useCallback((member: CrewMember) => {
    setEditingMember(member);
    setIsModalOpen(true);
    isModalOpenRef.current = true;
  }, []);

  const handleCloseModal = useCallback(() => {
    setTimeout(() => {
      setIsModalOpen(false);
      isModalOpenRef.current = false;
      setEditingMember(null);
    }, 100);
  }, []);

  const handleDelete = async (memberId: string) => {
    try {
      const checkResult = await checkCrewMemberAssociations(studioSlug, memberId);

      if (!checkResult.success) {
        toast.error(checkResult.error || 'Error al verificar asociaciones');
        return;
      }

      if (checkResult.hasAssociations) {
        if (checkResult.hasEvents && checkResult.hasTasks) {
          toast.error('No se puede eliminar porque tiene eventos y tareas asociados.');
        } else if (checkResult.hasEvents) {
          toast.error('No se puede eliminar porque tiene eventos asociados.');
        } else if (checkResult.hasTasks) {
          toast.error('No se puede eliminar porque tiene tareas asociadas.');
        }
        return;
      }

      setDeletingMemberId(memberId);
      setIsDeleteModalOpen(true);
    } catch (error) {
      console.error('Error checking associations:', error);
      toast.error('Error al verificar asociaciones');
    }
  };

  const confirmDelete = async () => {
    if (!deletingMemberId) return;

    try {
      setIsDeleting(true);
      const result = await eliminarCrewMember(studioSlug, deletingMemberId);

      if (result.success) {
        toast.success('Personal eliminado');
        setMembers((prev) => prev.filter((m) => m.id !== deletingMemberId));
      } else {
        toast.error(result.error || 'Error al eliminar personal');
      }
    } catch (error) {
      console.error('Error deleting crew member:', error);
      toast.error('Error al eliminar personal');
    } finally {
      setIsDeleteModalOpen(false);
      setDeletingMemberId(null);
      setIsDeleting(false);
    }
  };

  const handleModalSuccess = useCallback((payload: Record<string, unknown>) => {
    const memberId = editingMember?.id;
    
    // Cerrar modal primero
    setTimeout(() => {
      setIsModalOpen(false);
      isModalOpenRef.current = false;
      setEditingMember(null);
    }, 100);

    // Actualización optimista local
    if (memberId) {
      // Actualizar miembro existente
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId) {
            return {
              ...m,
              name: (payload.name as string) || m.name,
              email: (payload.email as string) || null,
              phone: (payload.phone as string) || null,
              tipo: (payload.tipo as string) || m.tipo,
              fixed_salary: payload.fixed_salary ? Number(payload.fixed_salary) : null,
              variable_salary: payload.variable_salary ? Number(payload.variable_salary) : null,
              salary_frequency: (payload.salary_frequency as string) || null,
            };
          }
          return m;
        })
      );
    } else {
      // Agregar nuevo miembro optimista
      const optimisticMember: CrewMember = {
        id: `temp-${Date.now()}`,
        name: (payload.name as string) || '',
        email: (payload.email as string) || null,
        phone: (payload.phone as string) || null,
        tipo: (payload.tipo as string) || 'OPERATIVO',
        status: 'activo',
        fixed_salary: payload.fixed_salary ? Number(payload.fixed_salary) : null,
        variable_salary: payload.variable_salary ? Number(payload.variable_salary) : null,
        salary_frequency: (payload.salary_frequency as string) || null,
        skills: [],
      };
      setMembers((prev) => [optimisticMember, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    }

    // Recargar para obtener datos completos (con skills, etc.)
    setTimeout(() => {
      loadMembers();
    }, 300);
  }, [editingMember, loadMembers]);

  const filteredMembers = members.filter((member) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.phone?.includes(search) ||
      member.tipo.toLowerCase().includes(searchLower)
    );
  });

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'OPERATIVO':
        return 'default';
      case 'ADMINISTRATIVO':
        return 'secondary';
      case 'PROVEEDOR':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatSalary = (member: CrewMember) => {
    if (member.fixed_salary) {
      const frequency = member.salary_frequency === 'weekly' ? 'semanal' :
                       member.salary_frequency === 'biweekly' ? 'quincenal' :
                       member.salary_frequency === 'monthly' ? 'mensual' : '';
      return `$${member.fixed_salary.toLocaleString()} ${frequency}`;
    }
    if (member.variable_salary) {
      return `$${member.variable_salary.toLocaleString()} variable`;
    }
    return 'Variable';
  };


  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <ZenCard variant="default" padding="none">
          <ZenCardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600/20 rounded-lg">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <ZenCardTitle>Personal</ZenCardTitle>
                  <ZenCardDescription>
                    Gestiona tu equipo de trabajo
                  </ZenCardDescription>
                </div>
              </div>
              <ZenButton onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo
              </ZenButton>
            </div>
          </ZenCardHeader>
        </ZenCard>

        {/* Búsqueda */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <ZenInput
              id="search"
              placeholder="Buscar por nombre, email, teléfono o tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
              iconClassName="h-4 w-4"
            />
          </div>
          <div className="text-sm text-zinc-400">
            {loading ? (
              <span className="text-zinc-500">Cargando...</span>
            ) : (
              <span>
                {filteredMembers.length} {filteredMembers.length === 1 ? 'miembro' : 'miembros'}
              </span>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-zinc-800/50">
                <TableHead className="text-zinc-300">Nombre</TableHead>
                <TableHead className="text-zinc-300">Contacto</TableHead>
                <TableHead className="text-zinc-300">Habilidades</TableHead>
                <TableHead className="text-zinc-300">Honorarios</TableHead>
                <TableHead className="text-zinc-300 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    <TableCell><Skeleton className="h-4 w-32 bg-zinc-700" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40 bg-zinc-700" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 bg-zinc-700" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28 bg-zinc-700" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 bg-zinc-700 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredMembers.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={5} className="text-center py-8 text-zinc-400">
                    {search ? 'No se encontraron miembros' : 'No hay miembros registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className="border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-white">{member.name}</span>
                        <span className="text-[10px] text-zinc-400">{member.tipo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      <div className="space-y-1">
                        {member.email && (
                          <div>{member.email}</div>
                        )}
                        {member.phone && (
                          <div>{member.phone}</div>
                        )}
                        {!member.email && !member.phone && (
                          <span className="text-zinc-500">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.skills.length > 0 ? (
                          member.skills.slice(0, 2).map((skill) => (
                            <ZenBadge
                              key={skill.id}
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              style={skill.color ? { borderColor: skill.color, color: skill.color } : undefined}
                            >
                              {skill.name}
                            </ZenBadge>
                          ))
                        ) : (
                          <span className="text-zinc-500 text-sm">-</span>
                        )}
                        {member.skills.length > 2 && (
                          <ZenBadge variant="outline" size="sm" className="rounded-full">
                            +{member.skills.length - 2}
                          </ZenBadge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-300 text-sm">
                      {formatSalary(member)}
                    </TableCell>
                    <TableCell className="text-right">
                      <ZenDropdownMenu>
                        <ZenDropdownMenuTrigger asChild>
                          <ZenButton variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </ZenButton>
                        </ZenDropdownMenuTrigger>
                        <ZenDropdownMenuContent align="end">
                          <ZenDropdownMenuItem onClick={() => handleEdit(member)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </ZenDropdownMenuItem>
                          <ZenDropdownMenuSeparator />
                          <ZenDropdownMenuItem
                            onClick={() => handleDelete(member.id)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </ZenDropdownMenuItem>
                        </ZenDropdownMenuContent>
                      </ZenDropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de creación/edición */}
      <CrewMemberFormModal
        studioSlug={studioSlug}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialMember={editingMember}
        onSuccess={handleModalSuccess}
        onDelete={editingMember ? () => handleDelete(editingMember.id) : undefined}
      />

      {/* Modal de confirmación de eliminación */}
      <ZenConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingMemberId(null);
        }}
        onConfirm={confirmDelete}
        title="Eliminar personal"
        description="¿Estás seguro de que deseas eliminar este miembro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />
    </>
  );
}

