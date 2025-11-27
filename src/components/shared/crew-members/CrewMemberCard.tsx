'use client';

import React, { useState } from 'react';
import { Edit, Trash2, AlertCircle } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent } from '@/components/ui/zen';
import { eliminarCrewMember } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';

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
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`¿Está seguro de que desea eliminar a ${member.name}?`)) {
      return;
    }

    try {
      setDeleting(true);
      const result = await eliminarCrewMember(studioSlug, member.id);

      if (result.success) {
        toast.success('Personal eliminado exitosamente');
        onDelete?.();
      } else {
        toast.error(result.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting crew member:', error);
      toast.error('Error al eliminar personal');
    } finally {
      setDeleting(false);
    }
  };

  const tipoColor = {
    OPERATIVO: 'bg-emerald-500/20 text-emerald-300',
    ADMINISTRATIVO: 'bg-blue-500/20 text-blue-300',
    PROVEEDOR: 'bg-orange-500/20 text-orange-300',
  };

  const primarySkill = member.skills.find((s) => s.is_primary);
  const otherSkills = member.skills.filter((s) => !s.is_primary);

  return (
    <ZenCard
      variant="outlined"
      className={`cursor-pointer transition-colors ${
        mode === 'select' && 'hover:bg-zinc-800/50'
      }`}
      onClick={() => mode === 'select' && onSelect?.()}
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
            <div className="flex flex-wrap gap-2 mb-3">
              {primarySkill && (
                <div
                  className="px-2 py-1 rounded-md text-xs font-medium text-white"
                  style={{
                    backgroundColor: primarySkill.color || '#6366f1',
                  }}
                >
                  {primarySkill.name}
                </div>
              )}
              {otherSkills.slice(0, 2).map((skill) => (
                <div
                  key={skill.id}
                  className="px-2 py-1 rounded-md text-xs text-zinc-300 bg-zinc-700"
                >
                  {skill.name}
                </div>
              ))}
              {otherSkills.length > 2 && (
                <div className="px-2 py-1 rounded-md text-xs text-zinc-400">
                  +{otherSkills.length - 2} más
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
            <div className="flex gap-2 flex-shrink-0">
              <ZenButton
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </ZenButton>
              <ZenButton
                variant="ghost"
                size="sm"
                className="p-2 text-red-400 hover:text-red-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={deleting}
                title="Eliminar"
              >
                {deleting ? (
                  <AlertCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </ZenButton>
            </div>
          )}
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

