'use client';

import React, { useState, useMemo } from 'react';
import { Link, Search } from 'lucide-react';
import { ZenButton, ZenInput, ZenDialog } from '@/components/ui/zen';
import { updateServiceLinks } from '@/lib/actions/studio/config/item-links.actions';
import { toast } from 'sonner';

export interface ItemForLink {
  id: string;
  name: string;
}

interface ItemLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  sourceItemId: string;
  sourceItemName: string;
  allItems: ItemForLink[];
  currentLinkedIds: string[];
  onSaved: () => void;
}

export function ItemLinksModal({
  isOpen,
  onClose,
  studioSlug,
  sourceItemId,
  sourceItemName,
  allItems,
  currentLinkedIds,
  onSaved,
}: ItemLinksModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(currentLinkedIds));
  const [saving, setSaving] = useState(false);

  // Sincronizar selectedIds cuando se abre con currentLinkedIds
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(currentLinkedIds));
      setSearch('');
    }
  }, [isOpen, currentLinkedIds]);

  const candidates = useMemo(() => {
    return allItems.filter(item => item.id !== sourceItemId);
  }, [allItems, sourceItemId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(item => item.name.toLowerCase().includes(q));
  }, [candidates, search]);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateServiceLinks(studioSlug, sourceItemId, Array.from(selectedIds));
      if (result.success) {
        toast.success('Vínculos guardados');
        onSaved();
        onClose();
      } else {
        toast.error(result.error ?? 'Error al guardar vínculos');
      }
    } catch (e) {
      toast.error('Error al guardar vínculos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Vínculos"
      description="Solo ítems de la misma sección."
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <ZenInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
        <div className="max-h-64 overflow-y-auto border border-zinc-700 rounded-lg divide-y divide-zinc-700">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm">
              {candidates.length === 0 ? 'No hay otros ítems en esta sección.' : 'Sin coincidencias.'}
            </div>
          ) : (
            filtered.map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-zinc-200">{item.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2">
          <ZenButton variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </ZenButton>
          <ZenButton onClick={handleSave} loading={saving}>
            Guardar vínculos
          </ZenButton>
        </div>
      </div>
    </ZenDialog>
  );
}
