"use client";

import React from "react";
import { ContractTemplate as ContractTemplateType } from "@/types/contracts";
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardDescription,
  ZenCardContent,
  ZenButton,
  ZenBadge,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from "@/components/ui/zen";
import { MoreVertical, Edit, Copy, Power, Trash2, Star } from "lucide-react";

export interface ContractTemplateProps {
  template: ContractTemplateType;
  eventTypeName?: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
  className?: string;
}

export function ContractTemplateCard({
  template,
  eventTypeName,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
  className = "",
}: ContractTemplateProps) {
  return (
    <ZenCard variant="default" className={className}>
      <ZenCardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ZenCardTitle className="text-base">{template.name}</ZenCardTitle>
              {template.is_default && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <ZenCardDescription className="line-clamp-2">
              {template.description || "Sin descripción"}
            </ZenCardDescription>
          </div>
          <ZenDropdownMenu>
            <ZenDropdownMenuTrigger asChild>
              <ZenButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </ZenButton>
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="end">
              <ZenDropdownMenuItem onClick={onEdit} className="gap-2">
                <Edit className="w-4 h-4" />
                Editar
              </ZenDropdownMenuItem>
              <ZenDropdownMenuItem onClick={onDuplicate} className="gap-2">
                <Copy className="w-4 h-4" />
                Duplicar
              </ZenDropdownMenuItem>
              <ZenDropdownMenuSeparator />
              <ZenDropdownMenuItem onClick={onToggle} className="gap-2">
                <Power className="w-4 h-4" />
                {template.is_active ? "Desactivar" : "Activar"}
              </ZenDropdownMenuItem>
              <ZenDropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/20"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </ZenDropdownMenuItem>
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        </div>
      </ZenCardHeader>
      <ZenCardContent className="pt-4 border-t border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          {template.is_default && (
            <ZenBadge variant="default" className="bg-yellow-950/30 text-yellow-400 border-yellow-800/30">
              Por defecto
            </ZenBadge>
          )}
          {template.is_active ? (
            <ZenBadge variant="success">Activa</ZenBadge>
          ) : (
            <ZenBadge variant="secondary">Inactiva</ZenBadge>
          )}
          {eventTypeName && (
            <ZenBadge variant="secondary" className="bg-blue-950/30 text-blue-400 border-blue-800/30">
              {eventTypeName}
            </ZenBadge>
          )}
          {!eventTypeName && !template.event_type_id && (
            <ZenBadge variant="secondary">Todos los eventos</ZenBadge>
          )}
          <span className="text-xs text-zinc-600 ml-auto">v{template.version}</span>
        </div>
        <div className="mt-4 flex gap-2">
          <ZenButton
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </ZenButton>
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
          >
            <Copy className="w-4 h-4 mr-2" />
            Duplicar
          </ZenButton>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}
