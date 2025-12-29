'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Users, Edit, Trash2, MoreVertical } from 'lucide-react';
import { ZenButton, ZenInput, ZenBadge, ZenConfirmModal, ZenCard, ZenCardHeader, ZenCardTitle, ZenCardDescription, ZenCardContent } from '@/components/ui/zen';
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
import { GoogleBundleModal } from '@/components/shared/integrations/GoogleBundleModal';
import { obtenerEstadoConexion } from '@/lib/integrations/google';
import { ExternalLink, Users as UsersIcon } from 'lucide-react';

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
  const [isGoogleContactsConnected, setIsGoogleContactsConnected] = useState(false);
  const [googleContactsEmail, setGoogleContactsEmail] = useState<string | null>(null);
  const [showGoogleBundleModal, setShowGoogleBundleModal] = useState(false);
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
    verificarEstadoGoogleContacts();
  }, [loadMembers]);

  const verificarEstadoGoogleContacts = async () => {
    try {
      const status = await obtenerEstadoConexion(studioSlug);
      const hasContactsScope = status.scopes?.some((scope) => scope.includes('contacts')) || false;
      setIsGoogleContactsConnected(hasContactsScope && !!status.email);
      setGoogleContactsEmail(status.email || null);
    } catch (error) {
      console.error('Error verificando estado de Google Contacts:', error);
      setIsGoogleContactsConnected(false);
      setGoogleContactsEmail(null);
    }
  };

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
          <ZenCardContent className="p-6 space-y-4">
            {/* Barra de herramientas */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <ZenInput
                  id="search"
                  placeholder="Buscar por nombre, email, teléfono o tipo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={Search}
                  iconClassName="h-4 w-4"
                />
              </div>
              <div className="text-sm text-zinc-400 shrink-0">
                {loading ? (
                  <span className="text-zinc-500">Cargando...</span>
                ) : (
                  <span>
                    {filteredMembers.length} {filteredMembers.length === 1 ? 'miembro' : 'miembros'}
                  </span>
                )}
              </div>
              <div className="h-5 w-px bg-zinc-700 shrink-0" />
              {isGoogleContactsConnected ? (
                <ZenBadge variant="success" size="sm" className="gap-1 shrink-0">
                  <UsersIcon className="h-3 w-3" />
                  Google Contacts
                </ZenBadge>
              ) : (
                <ZenButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGoogleBundleModal(true)}
                  className="h-7 px-2 text-xs gap-1 shrink-0"
                >
                  <UsersIcon className="h-3 w-3" />
                  Conectar Google
                </ZenButton>
              )}
            </div>

            {/* Tabla */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900/80">
                      <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider py-4 px-6">
                        Nombre
                      </TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider py-4 px-6">
                        Contacto
                      </TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider py-4 px-6">
                        Habilidades
                      </TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider py-4 px-6">
                        Honorarios
                      </TableHead>
                      <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider py-4 px-6 text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-zinc-800/50">
                          <TableCell className="py-4 px-6">
                            <Skeleton className="h-5 w-32 bg-zinc-800/50" />
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <Skeleton className="h-4 w-40 bg-zinc-800/50" />
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <Skeleton className="h-6 w-24 bg-zinc-800/50" />
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <Skeleton className="h-4 w-28 bg-zinc-800/50" />
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right">
                            <Skeleton className="h-8 w-8 bg-zinc-800/50 ml-auto" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredMembers.length === 0 ? (
                      <TableRow className="border-zinc-800/50">
                        <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-zinc-600" />
                            <span className="text-sm">
                              {search ? 'No se encontraron miembros' : 'No hay miembros registrados'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member, index) => (
                        <TableRow
                          key={member.id}
                          className={`border-zinc-800/50 transition-all group ${
                            index % 2 === 0 ? 'bg-zinc-900/30' : 'bg-zinc-900/50'
                          } hover:bg-zinc-800/50 hover:border-zinc-700`}
                        >
                          <TableCell className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                                {member.name}
                              </span>
                              <span className="text-xs text-zinc-500">{member.tipo}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <div className="space-y-1">
                              {member.email && (
                                <div className="text-sm text-zinc-300">{member.email}</div>
                              )}
                              {member.phone && (
                                <div className="text-sm text-zinc-400">{member.phone}</div>
                              )}
                              {!member.email && !member.phone && (
                                <span className="text-zinc-600 text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <div className="flex flex-wrap gap-1.5">
                              {member.skills.length > 0 ? (
                                <>
                                  {member.skills.slice(0, 2).map((skill) => (
                                    <ZenBadge
                                      key={skill.id}
                                      variant="outline"
                                      size="sm"
                                      className="rounded-full text-xs text-zinc-400 border-zinc-700"
                                    >
                                      {skill.name}
                                    </ZenBadge>
                                  ))}
                                  {member.skills.length > 2 && (
                                    <ZenBadge variant="outline" size="sm" className="rounded-full text-xs text-zinc-400 border-zinc-700">
                                      +{member.skills.length - 2}
                                    </ZenBadge>
                                  )}
                                </>
                              ) : (
                                <span className="text-zinc-600 text-sm">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <span className="text-sm font-medium text-zinc-200">
                              {formatSalary(member)}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right">
                            <ZenDropdownMenu>
                              <ZenDropdownMenuTrigger asChild>
                                <ZenButton 
                                  variant="ghost" 
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
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
          </ZenCardContent>
        </ZenCard>

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

      {/* Modal de Google Bundle */}
      <GoogleBundleModal
        isOpen={showGoogleBundleModal}
        onClose={() => setShowGoogleBundleModal(false)}
        studioSlug={studioSlug}
        context="personel"
      />
    </>
  );
}

