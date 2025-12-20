'use client';

import React, { useState } from 'react';
import { Edit, Trash2, MoreVertical, Phone, Mail, Calendar, DollarSign } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { ZenButton, ZenCard, ZenCardContent, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem, ZenDropdownMenuSeparator } from '@/components/ui/zen';
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

interface CrewMemberCardProps {
  member: {
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
  };
  mode: 'select' | 'manage';
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  studioSlug: string;
}

export function CrewMemberCard({
  member,
  mode,
  onSelect,
  onEdit,
  onDelete,
  studioSlug,
}: CrewMemberCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
    setMenuOpen(false);
  };

  const handleSendWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    setMenuOpen(false);
  };

  const handleSendEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
    setMenuOpen(false);
  };

  const handleDeleteClick = async () => {
    try {
      // Verificar asociaciones antes de mostrar el modal
      const checkResult = await checkCrewMemberAssociations(studioSlug, member.id);

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
      setDeleteModalOpen(true);
      setMenuOpen(false);
    } catch (error) {
      console.error('Error checking crew member associations:', error);
      toast.error('Error al verificar asociaciones del personal');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);

      // Llamar onDelete primero para actualización optimista
      onDelete?.();

      // Eliminar en servidor
      const result = await eliminarCrewMember(studioSlug, member.id);

      if (result.success) {
        toast.success('Personal eliminado exitosamente');
        setDeleteModalOpen(false);
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

  const tipoColor = {
    OPERATIVO: 'bg-emerald-500/20 text-emerald-300',
    ADMINISTRATIVO: 'bg-blue-500/20 text-blue-300',
    PROVEEDOR: 'bg-orange-500/20 text-orange-300',
  };

  const primarySkill = member.skills.find((s) => s.is_primary);
  const otherSkills = member.skills.filter((s) => !s.is_primary);

  const handleCardClick = () => {
    if (mode === 'select') {
      onSelect?.();
    } else if (mode === 'manage') {
      onEdit?.();
    }
  };

  return (
    <ZenCard
      variant="outlined"
      className="cursor-pointer transition-colors hover:bg-zinc-800/50"
      onClick={handleCardClick}
    >
      <ZenCardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Información Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-zinc-200 truncate">{member.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${tipoColor[member.tipo as keyof typeof tipoColor]}`}>
                {member.tipo}
              </span>
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {primarySkill && (
                <div
                  className="px-2 py-0.5 rounded-full text-xs font-medium border"
                  style={{
                    borderColor: primarySkill.color || '#6366f1',
                    color: primarySkill.color || '#6366f1',
                  }}
                >
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

            {/* Contacto */}
            <div className="space-y-1 text-sm text-zinc-400">
              {member.email && (
                <div className="flex items-center gap-2">
                  <span className="text-xs">📧</span>
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-xs">📱</span>
                  <span>{member.phone}</span>
                </div>
              )}
            </div>

            {/* Salario */}
            {(member.fixed_salary || member.variable_salary) && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-zinc-300 font-medium">
                  {member.fixed_salary
                    ? new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    }).format(member.fixed_salary)
                    : member.variable_salary
                      ? new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      }).format(member.variable_salary)
                      : ''}
                </span>
                {member.fixed_salary && member.salary_frequency && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {member.salary_frequency === 'weekly'
                        ? 'Semanal'
                        : member.salary_frequency === 'biweekly'
                          ? 'Quincenal'
                          : 'Mensual'}
                    </span>
                  </div>
                )}
                {member.variable_salary && (
                  <span className="text-xs text-zinc-500">Variable</span>
                )}
              </div>
            )}

            {/* Status Cuenta */}
            {member.account && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {member.account.is_active ? (
                  <span className="px-2 py-1 rounded bg-green-500/20 text-green-300">
                    ✓ Acceso activo
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">
                    ⚠ Acceso inactivo
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Acciones */}
          {mode === 'manage' && (
            <div className="flex-shrink-0">
              <ZenDropdownMenu
                open={menuOpen}
                onOpenChange={setMenuOpen}
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
                      onEdit?.();
                      setMenuOpen(false);
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
                      handleDeleteClick();
                    }}
                    className="text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </ZenDropdownMenuItem>
                </ZenDropdownMenuContent>
              </ZenDropdownMenu>
            </div>
          )}
        </div>
      </ZenCardContent>

      {/* Modal de confirmación de eliminación */}
      {mode === 'manage' && (
        <ZenConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Eliminar personal"
          description={`¿Estás seguro de que deseas eliminar a ${member.name}? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
          loading={isDeleting}
          loadingText="Eliminando..."
        />
      )}
    </ZenCard>
  );
}

