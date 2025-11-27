'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/shadcn/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { obtenerCrewMembers } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';
import { CrewMemberForm } from './CrewMemberForm';
import { CrewMemberCard } from './CrewMemberCard';

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
  const [activeTab, setActiveTab] = useState<'lista' | 'crear'>('lista');
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
    }
  }, [isOpen, loadData]);

  const handleMemberClick = (memberId: string) => {
    if (mode === 'select' && onMemberSelect) {
      onMemberSelect(memberId);
      onClose();
    }
  };

  const handleCrewCreated = () => {
    setActiveTab('lista');
    loadData();
    toast.success('Personal creado exitosamente');
  };

  const handleCrewUpdated = () => {
    setEditingMember(null);
    setActiveTab('lista');
    loadData();
    toast.success('Personal actualizado exitosamente');
  };

  const handleCrewDeleted = () => {
    setActiveTab('lista');
    loadData();
    toast.success('Personal eliminado exitosamente');
  };

  // Filtrar miembros por búsqueda
  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenar alfabéticamente
  const sortedMembers = [...filteredMembers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full max-w-2xl bg-zinc-900 border-zinc-800 sm:max-w-2xl overflow-y-auto max-h-[80vh]">
        <SheetHeader>
          <SheetTitle className="text-xl">Gestión de Personal</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lista' | 'crear')} className="mt-6">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="crear">
              {editingMember ? 'Editar' : 'Crear'}
            </TabsTrigger>
          </TabsList>

          {/* TAB: LISTA */}
          <TabsContent value="lista" className="space-y-4 mt-6">
            {mode === 'manage' && (
              <div className="flex gap-2">
                <ZenInput
                  placeholder="Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  startIcon={<Search className="h-4 w-4" />}
                  className="flex-1"
                />
                <ZenButton
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setEditingMember(null);
                    setActiveTab('crear');
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Crear
                </ZenButton>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-zinc-400">Cargando personal...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400 mb-4">No hay personal registrado</p>
                {mode === 'manage' && (
                  <ZenButton
                    size="sm"
                    onClick={() => {
                      setEditingMember(null);
                      setActiveTab('crear');
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
                No hay coincidencias para "{searchTerm}"
              </div>
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
                      setActiveTab('crear');
                    }}
                    onDelete={handleCrewDeleted}
                    studioSlug={studioSlug}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: CREAR/EDITAR */}
          <TabsContent value="crear" className="mt-6">
            {mode === 'manage' ? (
              <CrewMemberForm
                studioSlug={studioSlug}
                initialMember={editingMember}
                onSuccess={editingMember ? handleCrewUpdated : handleCrewCreated}
                onCancel={() => {
                  setEditingMember(null);
                  setActiveTab('lista');
                }}
              />
            ) : (
              <div className="text-center py-12 text-zinc-400">
                Este modo no permite crear personal
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
