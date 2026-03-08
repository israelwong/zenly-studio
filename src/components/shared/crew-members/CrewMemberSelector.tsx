'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/shadcn/popover';
import { obtenerCrewMembers } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';
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

interface CrewMemberSelectorProps {
  studioSlug: string;
  selectedMemberId: string | null;
  onSelect: (memberId: string | null) => void;
  placeholder?: string;
  className?: string;
  /** Muestra campo de búsqueda para filtrar por nombre */
  searchable?: boolean;
}

export function CrewMemberSelector({
  studioSlug,
  selectedMemberId,
  onSelect,
  placeholder = 'Seleccionar personal',
  className,
  searchable = false,
}: CrewMemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadMembers = async () => {
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
    };

    if (open && members.length === 0) {
      loadMembers();
    }
  }, [open, studioSlug, members.length]);

  const filteredMembers = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return members;
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, searchable, searchQuery]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearchQuery(''); }}>
      <PopoverTrigger asChild>
        <ZenButton
          variant="outline"
          size="sm"
          className={cn('justify-between min-w-[200px]', className)}
        >
          <span className="truncate">
            {selectedMember ? selectedMember.name : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </ZenButton>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-900 border-zinc-800" align="start">
        {loading ? (
          <div className="p-4 text-sm text-zinc-400">Cargando...</div>
        ) : members.length === 0 ? (
          <div className="p-4 text-sm text-zinc-400">No hay personal disponible</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {searchable && (
              <div className="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="w-full pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
            <button
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors',
                !selectedMemberId && 'bg-zinc-800'
              )}
            >
              <div className={cn('h-4 w-4 flex items-center justify-center')}>
                {!selectedMemberId && <Check className="h-4 w-4" />}
              </div>
              <span className="text-zinc-300">Sin asignar</span>
            </button>
            {(searchable ? filteredMembers : members).map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  onSelect(member.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors',
                  selectedMemberId === member.id && 'bg-zinc-800'
                )}
              >
                <div className={cn('h-4 w-4 flex items-center justify-center')}>
                  {selectedMemberId === member.id && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-300 truncate">{member.name}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    {member.tipo}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

