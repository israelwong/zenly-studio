"use client";

import React from "react";
import { ContractTemplate } from "@/types/contracts";
import {
  ZenButton,
  ZenBadge,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from "@/components/ui/zen";
import { MoreVertical, Edit, Copy, Power, Trash2, Star, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface SortableTemplateRowProps {
  template: ContractTemplate;
  onEdit: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onToggle: (templateId: string) => void;
  onDelete: (templateId: string) => void;
}

function SortableTemplateRow({
  template,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: SortableTemplateRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
    >
      <td className="w-8 py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          <GripVertical className="h-4 w-4 text-zinc-500" />
        </div>
      </td>
      <td className="py-4 px-4 w-[200px] min-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-300">
            {template.name}
          </span>
          {template.is_default && (
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <p className="text-sm text-zinc-500 line-clamp-1">
          {template.description || "Sin descripción"}
        </p>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center justify-center gap-2">
          {template.is_default && (
            <ZenBadge
              variant="default"
              className="bg-yellow-950/30 text-yellow-400 border-yellow-800/30 text-xs"
            >
              Por defecto
            </ZenBadge>
          )}
          {template.is_active ? (
            <ZenBadge variant="success" className="text-xs">
              Activa
            </ZenBadge>
          ) : (
            <ZenBadge variant="secondary" className="text-xs">
              Inactiva
            </ZenBadge>
          )}
        </div>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="text-xs text-zinc-600">v{template.version}</span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center justify-end gap-2">
          <ZenDropdownMenu>
            <ZenDropdownMenuTrigger asChild>
              <ZenButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </ZenButton>
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="end" onInteractOutside={(e) => e.preventDefault()}>
              <ZenDropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(template.id);
                }}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar
              </ZenDropdownMenuItem>
              <ZenDropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(template.id);
                }}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Duplicar
              </ZenDropdownMenuItem>
              <ZenDropdownMenuSeparator />
              <ZenDropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(template.id);
                }}
                className="gap-2"
              >
                <Power className="w-4 h-4" />
                {template.is_active ? "Desactivar" : "Activar"}
              </ZenDropdownMenuItem>
              <ZenDropdownMenuSeparator />
              <ZenDropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(template.id);
                }}
                className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </ZenDropdownMenuItem>
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        </div>
      </td>
    </tr>
  );
}

export interface ContractTemplatesTableProps {
  templates: ContractTemplate[];
  onEdit: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onToggle: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  isReordering?: boolean;
  className?: string;
}

export function ContractTemplatesTable({
  templates,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
  onDragEnd,
  isReordering = false,
  className = "",
}: ContractTemplatesTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (templates.length === 0) {
    return null;
  }

  const tableContent = (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-800">
          {onDragEnd && <th className="w-8 py-3 px-4"></th>}
          <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase w-[200px] min-w-[200px]">
            Nombre
          </th>
          <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Descripción
          </th>
          <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Estado
          </th>
          <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Versión
          </th>
          <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-400 uppercase">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {onDragEnd ? (
          <SortableContext
            items={templates.map((template) => template.id)}
            strategy={verticalListSortingStrategy}
          >
            {templates.map((template) => (
              <SortableTemplateRow
                key={template.id}
                template={template}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        ) : (
          templates.map((template) => (
            <tr
              key={template.id}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors"
            >
              <td className="py-4 px-4 w-[200px] min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-300">
                    {template.name}
                  </span>
                  {template.is_default && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                  )}
                </div>
              </td>
              <td className="py-4 px-4">
                <p className="text-sm text-zinc-500 line-clamp-1">
                  {template.description || "Sin descripción"}
                </p>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-center gap-2">
                  {template.is_default && (
                    <ZenBadge
                      variant="default"
                      className="bg-yellow-950/30 text-yellow-400 border-yellow-800/30 text-xs"
                    >
                      Por defecto
                    </ZenBadge>
                  )}
                  {template.is_active ? (
                    <ZenBadge variant="success" className="text-xs">
                      Activa
                    </ZenBadge>
                  ) : (
                    <ZenBadge variant="secondary" className="text-xs">
                      Inactiva
                    </ZenBadge>
                  )}
                </div>
              </td>
              <td className="py-4 px-4 text-center">
                <span className="text-xs text-zinc-600">v{template.version}</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-2">
                  <ZenDropdownMenu>
                    <ZenDropdownMenuTrigger asChild>
                      <ZenButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </ZenButton>
                    </ZenDropdownMenuTrigger>
                    <ZenDropdownMenuContent align="end">
                      <ZenDropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(template.id);
                        }}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(template.id);
                        }}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicar
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      <ZenDropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(template.id);
                        }}
                        className="gap-2"
                      >
                        <Power className="w-4 h-4" />
                        {template.is_active ? "Desactivar" : "Activar"}
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      <ZenDropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(template.id);
                        }}
                        className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </ZenDropdownMenuItem>
                    </ZenDropdownMenuContent>
                  </ZenDropdownMenu>
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div className={cn("relative rounded-lg border border-zinc-800 overflow-hidden", className)}>
      <div className="overflow-x-auto">
        {onDragEnd ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            {tableContent}
          </DndContext>
        ) : (
          tableContent
        )}
      </div>
      {isReordering && (
        <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 text-zinc-300">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            <span className="text-sm">Actualizando orden...</span>
          </div>
        </div>
      )}
    </div>
  );
}

