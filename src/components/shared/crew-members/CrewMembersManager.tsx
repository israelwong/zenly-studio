'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { obtenerCrewMembers, obtenerCategoriasCrew } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tipo: string;
  status: string;
  category: {
    id: string;
    name: string;
  };
  fixed_salary: number | null;
  variable_salary: number | null;
}

interface CrewCategory {
  id: string;
  name: string;
  tipo: string;
  color: string | null;
  icono: string | null;
  order: number;
}

interface CrewMembersManagerProps {
  studioSlug: string;
  eventId?: string;
  onMemberSelect?: (memberId: string) => void;
  mode?: 'select' | 'manage';
  isOpen: boolean;
  onClose: () => void;
}

export function CrewMembersManager({
  studioSlug,
  eventId,
  onMemberSelect,
  mode = 'manage',
  isOpen,
  onClose,
}: CrewMembersManagerProps) {
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [categories, setCategories] = useState<CrewCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, studioSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersResult, categoriesResult] = await Promise.all([
        obtenerCrewMembers(studioSlug),
        obtenerCategoriasCrew(studioSlug),
      ]);

      if (membersResult.success && membersResult.data) {
        setMembers(membersResult.data);
      }

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data);
      }
    } catch (error) {
      console.error('Error loading crew members:', error);
      toast.error('Error al cargar personal');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (memberId: string) => {
    if (mode === 'select' && onMemberSelect) {
      onMemberSelect(memberId);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Gestión de Personal</DialogTitle>
            <ZenButton variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X className="h-4 w-4" />
            </ZenButton>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'manage' && (
            <div className="flex justify-end">
              <ZenButton size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Personal
              </ZenButton>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-zinc-400">Cargando...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              No hay personal registrado
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => {
                const categoryMembers = members.filter(
                  (m) => m.category.id === category.id
                );

                if (categoryMembers.length === 0) return null;

                return (
                  <ZenCard key={category.id} variant="outlined">
                    <ZenCardHeader>
                      <ZenCardTitle className="text-base">{category.name}</ZenCardTitle>
                    </ZenCardHeader>
                    <ZenCardContent>
                      <div className="space-y-2">
                        {categoryMembers.map((member) => (
                          <div
                            key={member.id}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:bg-zinc-800/50 transition-colors',
                              mode === 'select' && 'cursor-pointer'
                            )}
                            onClick={() => handleMemberClick(member.id)}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-zinc-200">
                                {member.name}
                              </div>
                              {member.email && (
                                <div className="text-sm text-zinc-400">{member.email}</div>
                              )}
                              {member.phone && (
                                <div className="text-sm text-zinc-400">{member.phone}</div>
                              )}
                            </div>
                            {mode === 'manage' && (
                              <div className="flex items-center gap-2">
                                <ZenButton
                                  variant="ghost"
                                  size="sm"
                                  className="p-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implementar edición
                                    toast.info('Edición próximamente disponible');
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </ZenButton>
                                <ZenButton
                                  variant="ghost"
                                  size="sm"
                                  className="p-2 text-red-400 hover:text-red-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implementar eliminación
                                    toast.info('Eliminación próximamente disponible');
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </ZenButton>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ZenCardContent>
                  </ZenCard>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

