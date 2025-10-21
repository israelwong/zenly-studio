"use client";

import React, { useCallback } from "react";
import { ZenCard, ZenButton } from "@/components/ui/zen";
import { Plus, ArrowLeft, Tag, MoreVertical, GripVertical, Edit2, Trash2 } from "lucide-react";
import { CategoriaSkeleton } from "../shared";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Categoria {
    id: string;
    name: string;
    description?: string;
    items?: number;
    mediaSize?: number;
}

interface CategoriasListViewProps {
    seccionName: string;
    categorias: Categoria[];
    onSelectCategoria: (categoria: Categoria) => void;
    onCreateCategoria: () => void;
    onEditCategoria?: (categoria: Categoria) => void;
    onDeleteCategoria?: (categoriaId: string) => void;
    onReorderCategorias?: (categoriaIds: string[]) => Promise<void>;
    onBack: () => void;
    isLoading?: boolean;
}

// Helper para formatear bytes
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

function CategoriaCard({
    categoria,
    onSelectCategoria,
    onEditCategoria,
    onDeleteCategoria,
}: {
    categoria: Categoria;
    onSelectCategoria: (categoria: Categoria) => void;
    onEditCategoria?: (categoria: Categoria) => void;
    onDeleteCategoria?: (categoriaId: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: categoria.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const [menuOpen, setMenuOpen] = React.useState<string | null>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const cardElement = document.querySelector(`.card-${categoria.id}`);
            if (cardElement && !cardElement.contains(target)) {
                setMenuOpen(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [categoria.id]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={isDragging ? "opacity-50" : ""}
        >
            <ZenCard
                className={`p-4 hover:bg-zinc-800/80 transition-colors group cursor-move card-${categoria.id}`}
            >
                <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1"
                        title="Arrastra para reordenar"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>

                    {/* Contenido */}
                    <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onSelectCategoria(categoria)}
                    >
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-zinc-100 break-words">
                                {categoria.name}
                            </h3>
                        </div>
                        {categoria.description && (
                            <p className="text-xs text-zinc-400 break-words mb-2">
                                {categoria.description}
                            </p>
                        )}
                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                            <span>
                                {categoria.items ?? 0} item{categoria.items !== 1 ? "s" : ""}
                            </span>
                            {categoria.mediaSize !== undefined && categoria.mediaSize > 0 && (
                                <>
                                    <span>•</span>
                                    <span>
                                        {formatBytes(categoria.mediaSize)}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="relative flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(categoria.id === menuOpen ? null : categoria.id);
                            }}
                            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded transition-colors"
                            title="Opciones"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Menú desplegable */}
                        {menuOpen === categoria.id && (
                            <div className={`absolute top-full right-0 mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 py-1 card-${categoria.id}`}>
                                {onEditCategoria && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditCategoria(categoria);
                                            setMenuOpen(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors text-left"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Editar
                                    </button>
                                )}
                                {onDeleteCategoria && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteCategoria(categoria.id);
                                            setMenuOpen(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </ZenCard>
        </div>
    );
}

/**
 * Componente NIVEL 2 de navegación
 * Lista categorías de una sección específica con Drag & Drop
 */
export function CategoriasListView({
    seccionName,
    categorias,
    onSelectCategoria,
    onCreateCategoria,
    onEditCategoria,
    onDeleteCategoria,
    onReorderCategorias,
    onBack,
    isLoading = false,
}: CategoriasListViewProps) {
    const [ordenadas, setOrdenadas] = React.useState(categorias);

    React.useEffect(() => {
        setOrdenadas(categorias);
    }, [categorias]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = ordenadas.findIndex((c) => c.id === active.id);
            const newIndex = ordenadas.findIndex((c) => c.id === over.id);

            const newOrdenadas = arrayMove(ordenadas, oldIndex, newIndex);
            setOrdenadas(newOrdenadas);

            if (onReorderCategorias) {
                try {
                    await onReorderCategorias(newOrdenadas.map((c) => c.id));
                } catch (error) {
                    console.error("Error reordenando categorías:", error);
                    setOrdenadas(categorias);
                }
            }
        }
    }, [ordenadas, categorias, onReorderCategorias]);

    return (
        <div className="space-y-6">
            {/* Breadcrumb y encabezado */}
            <div>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100">{seccionName}</h2>
                        <p className="text-sm text-zinc-400 mt-1">
                            Categorías (arrastra para reordenar)
                        </p>
                    </div>
                    <ZenButton
                        onClick={onCreateCategoria}
                        variant="primary"
                        className="gap-2"
                        disabled={isLoading}
                    >
                        <Plus className="w-4 h-4" />
                        Nueva
                    </ZenButton>
                </div>
            </div>

            {/* Grid de categorías con DND */}
            {isLoading ? (
                <CategoriaSkeleton />
            ) : ordenadas.length === 0 ? (
                <ZenCard className="p-12 text-center">
                    <Tag className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-4">Sin categorías aún</p>
                    <ZenButton onClick={onCreateCategoria} variant="primary">
                        <Plus className="w-4 h-4" />
                        Crear primera categoría
                    </ZenButton>
                </ZenCard>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={ordenadas.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {ordenadas.map((categoria) => (
                                <CategoriaCard
                                    key={categoria.id}
                                    categoria={categoria}
                                    onSelectCategoria={onSelectCategoria}
                                    onEditCategoria={onEditCategoria}
                                    onDeleteCategoria={onDeleteCategoria}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
