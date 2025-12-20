'use client';

import React from 'react';
import { Users, Phone, Mail, Edit, MoreVertical, Trash2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { ZenButton, ZenBadge, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { eliminarCrewMember, checkCrewMemberAssociations } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';
import { ZenConfirmModal } from '@/components/ui/zen';

interface Skill {
  id: string;
  name: string;
  color: string | null;
  icono: string | null;
  is_primary: boolean;
}

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tipo: string;
  status: string;
  skills: Skill[];
  fixed_salary: number | null;
  salary_frequency?: string | null;
  variable_salary: number | null;
  account: {
    id: string;
    email: string;
    is_active: boolean;
  } | null;
}

interface CrewMembersCardViewProps {
  members: CrewMember[];
  loading: boolean;
  onMemberClick?: (memberId: string) => void;
  onEdit: (memberId: string) => void;
  onDelete: (memberId: string) => void;
  studioSlug: string;
}

export function CrewMembersCardView({
  members,
  loading,
  onMemberClick,
  onEdit,
  onDelete,
  studioSlug,
}: CrewMembersCardViewProps) {
  const [menuOpen, setMenuOpen] = React.useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deletingMember, setDeletingMember] = React.useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
      OPERATIVO: 'success',
      ADMINISTRATIVO: 'default',
      PROVEEDOR: 'secondary',
    };
    const labels: Record<string, string> = {
      OPERATIVO: 'Operativo',
      ADMINISTRATIVO: 'Administrativo',
      PROVEEDOR: 'Proveedor',
    };
    return (
      <ZenBadge variant={variants[tipo] || 'default'} size="sm" className="rounded-full">
        {labels[tipo] || tipo}
      </ZenBadge>
    );
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
    setMenuOpen(null);
  };

  const handleSendWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    setMenuOpen(null);
  };

  const handleSendEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
    setMenuOpen(null);
  };

  const handleDeleteClick = async (memberId: string, memberName: string) => {
    try {
      // Verificar asociaciones antes de mostrar el modal
      const checkResult = await checkCrewMemberAssociations(studioSlug, memberId);

      if (!checkResult.success) {
        toast.error(checkResult.error || 'Error al verificar asociaciones');
        return;
      }

      if (checkResult.hasAssociations) {
        // Mensaje de error específico según el tipo de asociación
        if (checkResult.hasEvents && checkResult.hasTasks) {
          toast.error('No se puede eliminar porque tiene eventos y tareas asociadas.');
        } else if (checkResult.hasEvents) {
          toast.error('No se puede eliminar porque tiene eventos asociados.');
        } else if (checkResult.hasTasks) {
          toast.error('No se puede eliminar porque tiene tareas asociadas.');
        }
        return;
      }

      // Si no tiene asociaciones, abrir modal de confirmación
      setDeletingMember({ id: memberId, name: memberName });
      setDeleteModalOpen(true);
    } catch (error) {
      console.error('Error checking crew member associations:', error);
      toast.error('Error al verificar asociaciones del personal');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMember) return;

    try {
      setIsDeleting(true);

      // Llamar onDelete primero para actualización optimista
      onDelete(deletingMember.id);

      // Eliminar en servidor
      const result = await eliminarCrewMember(studioSlug, deletingMember.id);

      if (result.success) {
        toast.success('Personal eliminado exitosamente');
        setDeleteModalOpen(false);
        setDeletingMember(null);
      } else {
        toast.error(result.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting crew member:', error);
      toast.error('Error al eliminar personal');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatSalary = (fixed: number | null, variable: number | null) => {
    if (fixed) {
      return `$${fixed.toLocaleString('es-MX')}/mes`;
    }
    if (variable) {
      return `Variable: $${variable.toLocaleString('es-MX')}`;
    }
    return 'Honorarios variables';
  };

  if (loading && members.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-zinc-800/50 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-zinc-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-700 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-zinc-700 rounded w-full" />
              <div className="h-3 bg-zinc-700 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
        <p className="text-zinc-400">No se encontró personal</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {members.map((member) => {
        const initials = member.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        const primarySkill = member.skills.find((s) => s.is_primary);
        const otherSkills = member.skills.filter((s) => !s.is_primary);

        return (
          <div
            key={member.id}
            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-all cursor-pointer group"
            onClick={() => {
              onMemberClick?.(member.id);
              onEdit(member.id);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="w-12 h-12 flex-shrink-0">
                  <AvatarFallback className="bg-emerald-600/20 text-emerald-400 text-sm">
                    {initials || <Users className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-white truncate group-hover:text-emerald-400 transition-colors">
                      {member.name}
                    </h3>
                    {getTipoBadge(member.tipo)}
                  </div>
                  {member.email && (
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400 truncate">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  {!member.email && member.phone && (
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400 truncate">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <ZenDropdownMenu
                  open={menuOpen === member.id}
                  onOpenChange={(open) => setMenuOpen(open ? member.id : null)}
                >
                  <ZenDropdownMenuTrigger asChild>
                    <ZenButton
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </ZenButton>
                  </ZenDropdownMenuTrigger>
                  <ZenDropdownMenuContent align="end">
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(member.id);
                        setMenuOpen(null);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </ZenDropdownMenuItem>
                    <ZenDropdownMenuSeparator />
                    {member.phone && (
                      <>
                        <ZenDropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCall(member.phone!);
                          }}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Llamar
                        </ZenDropdownMenuItem>
                        <ZenDropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsApp(member.phone!);
                          }}
                        >
                          <WhatsAppIcon className="mr-2 h-4 w-4" />
                          WhatsApp
                        </ZenDropdownMenuItem>
                      </>
                    )}
                    {member.email && (
                      <ZenDropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendEmail(member.email!);
                        }}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </ZenDropdownMenuItem>
                    )}
                    <ZenDropdownMenuSeparator />
                    <ZenDropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(null);
                        handleDeleteClick(member.id, member.name);
                      }}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </ZenDropdownMenuItem>
                  </ZenDropdownMenuContent>
                </ZenDropdownMenu>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {/* Skills */}
              {member.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {primarySkill && (
                    <div className="px-2 py-0.5 rounded-full text-xs font-light border border-zinc-500 text-zinc-500">
                      {primarySkill.name}
                    </div>
                  )}
                  {otherSkills.slice(0, 2).map((skill) => (
                    <div
                      key={skill.id}
                      className="px-2 py-0.5 rounded-full text-xs border border-zinc-700"
                      style={{
                        color: skill.color || '#a1a1aa',
                      }}
                    >
                      {skill.name}
                    </div>
                  ))}
                  {otherSkills.length > 2 && (
                    <div className="px-2 py-0.5 rounded-full text-xs text-zinc-500 border border-zinc-700">
                      +{otherSkills.length - 2}
                    </div>
                  )}
                </div>
              )}

              {/* Salario */}
              <div className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-700/50">
                <div className="truncate">
                  {formatSalary(member.fixed_salary, member.variable_salary)}
                </div>
                {member.account && (
                  <div className="mt-1 flex items-center gap-1">
                    {member.account.is_active ? (
                      <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-xs">
                        ✓ Acceso activo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-xs">
                        ⚠ Acceso inactivo
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Modal de confirmación de eliminación */}
      <ZenConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingMember(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar personal"
        description={
          deletingMember
            ? `¿Estás seguro de que deseas eliminar a ${deletingMember.name}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
        loadingText="Eliminando..."
      />
    </div>
  );
}

