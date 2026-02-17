'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/shadcn/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import { STAGE_ORDER, STAGE_LABELS, STAGE_COLORS, type TaskCategoryStage } from '../../utils/scheduler-section-stages';
import type { SeccionData } from '@/lib/actions/schemas/catalogo-schemas';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, Plus, Check, X } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

export interface MoveTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName?: string;
  currentCategory: TaskCategoryStage;
  currentCatalogCategoryId?: string | null;
  secciones: SeccionData[];
  customCategoriesBySectionStage?: Map<string, Array<{ id: string; name: string }>>;
  /** Mapa de stageKey (sectionId-STAGE) -> Set de categoryIds con datos */
  categoriesWithDataByStage?: Map<string, Set<string>>;
  onConfirm: (category: TaskCategoryStage, catalogCategoryId?: string | null, catalogCategoryNombre?: string | null, shouldActivateStage?: boolean) => void;
  onAddCustomCategory?: (sectionId: string, stage: string, name: string) => Promise<void>;
}

interface Selection {
  sectionId: string | null;
  stage: TaskCategoryStage | null;
  catalogCategoryId: string | null;
  catalogCategoryNombre: string | null;
  shouldActivateStage: boolean; // Si el estado debe activarse al mover
}

export function MoveTaskModal({
  open,
  onOpenChange,
  taskName,
  currentCategory,
  currentCatalogCategoryId,
  secciones,
  customCategoriesBySectionStage = new Map(),
  categoriesWithDataByStage = new Map(),
  onConfirm,
  onAddCustomCategory,
}: MoveTaskModalProps) {
  const [openSectionId, setOpenSectionId] = useState<string | null>(secciones[0]?.id ?? null);
  const [openStageId, setOpenStageId] = useState<TaskCategoryStage | null>(null);
  const [selection, setSelection] = useState<Selection>({
    sectionId: null,
    stage: null,
    catalogCategoryId: null,
    catalogCategoryNombre: null,
    shouldActivateStage: false,
  });
  
  // Estado para crear categoría inline
  const [creatingCategoryFor, setCreatingCategoryFor] = useState<{ sectionId: string; stage: TaskCategoryStage } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  
  // Mapa local de categorías personalizadas (para actualización optimista)
  const [localCustomCategories, setLocalCustomCategories] = useState(customCategoriesBySectionStage);

  // Sincronizar categorías locales con las del prop
  useEffect(() => {
    setLocalCustomCategories(customCategoriesBySectionStage);
  }, [customCategoriesBySectionStage]);

  // Reset al abrir/cerrar modal
  useEffect(() => {
    if (!open) {
      setSelection({
        sectionId: null,
        stage: null,
        catalogCategoryId: null,
        catalogCategoryNombre: null,
        shouldActivateStage: false,
      });
      setOpenStageId(null);
      setCreatingCategoryFor(null);
      setNewCategoryName('');
    }
  }, [open]);

  // Reset stage y categoría al cambiar de sección
  useEffect(() => {
    setSelection(prev => ({
      ...prev,
      sectionId: openSectionId,
      stage: null,
      catalogCategoryId: null,
      catalogCategoryNombre: null,
      shouldActivateStage: false,
    }));
    setOpenStageId(null);
  }, [openSectionId]);

  const handleToggleStage = (stage: TaskCategoryStage) => {
    if (openStageId === stage) {
      setOpenStageId(null);
    } else {
      setOpenStageId(stage);
      setSelection(prev => ({
        ...prev,
        stage,
        catalogCategoryId: null,
        catalogCategoryNombre: null,
        shouldActivateStage: false,
      }));
    }
  };

  const handleSelectCategory = (
    sectionId: string,
    stage: TaskCategoryStage,
    catalogCategoryId: string | null,
    catalogCategoryNombre: string | null = null
  ) => {
    // Verificar si el estado tiene datos (está visible en el sidebar)
    const stageKey = `${sectionId}-${stage}`;
    const categoriesWithData = categoriesWithDataByStage.get(stageKey) || new Set<string>();
    const hasCatalogCategories = secciones
      .find(s => s.id === sectionId)?.categorias
      ?.some(cat => categoriesWithData.has(cat.id)) || false;
    const hasCustomCategories = (localCustomCategories.get(stageKey) || []).length > 0;
    const stageIsVisible = hasCatalogCategories || hasCustomCategories;

    setSelection(prev => ({
      ...prev,
      sectionId,
      stage,
      catalogCategoryId,
      catalogCategoryNombre,
      shouldActivateStage: !stageIsVisible, // Activar si no está visible
    }));
  };

  const handleStartCreateCategory = (sectionId: string, stage: TaskCategoryStage) => {
    setCreatingCategoryFor({ sectionId, stage });
    setNewCategoryName('');
  };

  const handleCancelCreateCategory = () => {
    setCreatingCategoryFor(null);
    setNewCategoryName('');
  };

  const handleConfirmCreateCategory = async () => {
    if (!creatingCategoryFor || !newCategoryName.trim()) return;
    if (!onAddCustomCategory) return;

    setIsCreatingCategory(true);
    const categoryName = newCategoryName.trim();
    const { sectionId, stage } = creatingCategoryFor;
    
    try {
      // Crear categoría en el servidor (sin actualización optimista)
      await onAddCustomCategory(sectionId, stage, categoryName);

      // Esperar a que customCategoriesBySectionStage se actualice desde el prop
      // y luego auto-seleccionar la categoría recién creada
      setTimeout(() => {
        const stageKey = `${sectionId}-${stage}`;
        const updatedCategories = customCategoriesBySectionStage.get(stageKey) || [];
        const newCategory = updatedCategories.find(cat => cat.name === categoryName);
        
        if (newCategory) {
          handleSelectCategory(sectionId, stage, newCategory.id, newCategory.name);
        }
      }, 100);

      setCreatingCategoryFor(null);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error creating category:', error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleConfirm = () => {
    if (!selection.stage || !selection.catalogCategoryId) return;
    
    // Validar que no sea la misma ubicación actual
    if (selection.stage === currentCategory && selection.catalogCategoryId === currentCatalogCategoryId) {
      return;
    }

    onConfirm(
      selection.stage,
      selection.catalogCategoryId,
      selection.catalogCategoryNombre,
      selection.shouldActivateStage
    );
    onOpenChange(false);
  };

  const canConfirm = selection.stage !== null && selection.catalogCategoryId !== null;
  const isSameLocation = selection.stage === currentCategory && selection.catalogCategoryId === currentCatalogCategoryId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[85vh]" showCloseButton>
        <DialogHeader className="shrink-0">
          <DialogTitle>Mover tarea</DialogTitle>
          {taskName && (
            <p className="text-sm text-zinc-500 font-normal truncate mt-0.5">{taskName}</p>
          )}
          <p className="text-[10px] text-zinc-500 mt-0.5">Sección → Estado → Categoría</p>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2 shrink min-h-0">
          {secciones.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
              No hay secciones disponibles
            </div>
          ) : (
            <div className="space-y-0.5 pt-1">
              {secciones.map((seccion) => {
                const isOpen = openSectionId === seccion.id;
                return (
                  <Collapsible
                    key={seccion.id}
                    open={isOpen}
                    onOpenChange={(open) => setOpenSectionId(open ? seccion.id : null)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-2 text-left text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{seccion.nombre}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-4 py-1.5 border-l-2 border-zinc-700/50 ml-2 mt-0.5 space-y-1">
                        {/* Mostrar TODOS los estados */}
                        {STAGE_ORDER.map((stage) => {
                          const stageKey = `${seccion.id}-${stage}`;
                          
                          const categoriesWithData = categoriesWithDataByStage.get(stageKey) || new Set<string>();
                          const sortedCatalogCats = [...(seccion.categorias || [])].sort((a, b) => {
                            const orderDiff = (Number(a.order) ?? 0) - (Number(b.order) ?? 0);
                            // ✅ DESEMPATE: Si order es igual, usar ID
                            if (orderDiff !== 0) return orderDiff;
                            return a.id.localeCompare(b.id);
                          });
                          const catalogInStage = sortedCatalogCats
                            .filter((cat) => categoriesWithData.has(cat.id))
                            .map((cat) => ({ id: cat.id, name: cat.nombre, order: Number(cat.order) || 0 }));
                          const maxCatalogOrder = catalogInStage.length > 0 ? Math.max(...catalogInStage.map((c) => c.order)) : -1;
                          const customInStage = (localCustomCategories.get(stageKey) || []).map((cat, i) => ({
                            id: cat.id,
                            name: cat.name,
                            order: maxCatalogOrder + 1 + i,
                          }));
                          const allCategories = [...catalogInStage, ...customInStage].sort((a, b) => {
                            const orderDiff = (Number(a.order) ?? 0) - (Number(b.order) ?? 0);
                            // ✅ DESEMPATE: Si order es igual, usar ID
                            if (orderDiff !== 0) return orderDiff;
                            return a.id.localeCompare(b.id);
                          });
                          
                          const isStageOpen = openStageId === stage;
                          const isSelected = selection.stage === stage;
                          const isCreatingForThisStage = creatingCategoryFor?.sectionId === seccion.id && creatingCategoryFor?.stage === stage;
                          
                          return (
                            <div key={stage} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => handleToggleStage(stage)}
                                className={cn(
                                  'flex items-center gap-2 w-full rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
                                  STAGE_COLORS[stage],
                                  'hover:opacity-90 cursor-pointer',
                                  isSelected && 'ring-2 ring-zinc-400'
                                )}
                              >
                                {isStageOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="font-medium text-zinc-200">{STAGE_LABELS[stage]}</span>
                                {allCategories.length === 0 && (
                                  <span className="text-[10px] text-zinc-500 ml-auto">(vacío)</span>
                                )}
                              </button>

                              {/* Contenido del estado (si está expandido) */}
                              {isStageOpen && (
                                <div className="pl-6 border-l-2 border-zinc-700/50 ml-2 space-y-1 py-1">
                                  {/* Categorías existentes */}
                                  {allCategories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => handleSelectCategory(seccion.id, stage, cat.id, cat.name)}
                                      className={cn(
                                        'w-full rounded-md border border-zinc-600 px-2.5 py-1.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors',
                                        selection.catalogCategoryId === cat.id && selection.stage === stage && 'ring-2 ring-emerald-500 bg-zinc-800'
                                      )}
                                    >
                                      {cat.name}
                                    </button>
                                  ))}
                                  
                                  {/* Formulario inline para crear categoría */}
                                  {isCreatingForThisStage ? (
                                    <div className="flex items-center gap-1 p-1 bg-zinc-800/50 rounded-md border border-zinc-700">
                                      <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleConfirmCreateCategory();
                                          if (e.key === 'Escape') handleCancelCreateCategory();
                                        }}
                                        placeholder="Nombre de categoría..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-500 px-2 py-1"
                                        autoFocus
                                        disabled={isCreatingCategory}
                                      />
                                      <button
                                        type="button"
                                        onClick={handleConfirmCreateCategory}
                                        disabled={!newCategoryName.trim() || isCreatingCategory}
                                        className="p-1 rounded hover:bg-zinc-700 text-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelCreateCategory}
                                        disabled={isCreatingCategory}
                                        className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    /* Botón "+ Crear categoría personalizada" */
                                    onAddCustomCategory && (
                                      <button
                                        type="button"
                                        onClick={() => handleStartCreateCategory(seccion.id, stage)}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors border border-dashed border-zinc-700 hover:border-zinc-600"
                                      >
                                        <Plus className="h-3.5 w-3.5 shrink-0" />
                                        <span>Crear categoría personalizada</span>
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <ZenButton
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            onClick={handleConfirm}
            disabled={!canConfirm || isSameLocation}
          >
            Mover tarea
          </ZenButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
