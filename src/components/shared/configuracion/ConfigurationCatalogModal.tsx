'use client';

import React, { useState, useMemo } from 'react';
import { Search, FileText, Shield, Receipt, CreditCard, Tag, Settings } from 'lucide-react';
import { ZenDialog, ZenInput, ZenCard, ZenCardContent } from '@/components/ui/zen';
import type { LucideIcon } from 'lucide-react';

export interface ConfigurationItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  category: string;
  /** Palabras clave para búsqueda (ej: "whatsapp", "correo", "etapas") */
  keywords?: string[];
  /** Ocupa todo el ancho de la fila (super card) */
  isFullWidth?: boolean;
  /** Etiquetas "Funciones incluidas" mostradas en la card (ej: Capacidad, WhatsApp) */
  tags?: string[];
}

export interface ConfigurationSection {
  id: string;
  title: string;
  items: ConfigurationItem[];
}

interface ConfigurationCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: ConfigurationSection[];
  title?: string;
  description?: string;
}

export function ConfigurationCatalogModal({
  isOpen,
  onClose,
  sections,
  title = 'Configuración',
  description = 'Gestiona todas las configuraciones disponibles',
}: ConfigurationCatalogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar secciones e items según búsqueda
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return sections;
    }

    const query = searchQuery.toLowerCase().trim();
    return sections
      .map((section) => {
        const filteredItems = section.items.filter((item) => {
          const matchTitle = item.title.toLowerCase().includes(query);
          const matchDesc = item.description.toLowerCase().includes(query);
          const matchCategory = item.category.toLowerCase().includes(query);
          const matchKeywords =
            item.keywords?.some((k) => k.toLowerCase().includes(query)) ?? false;
          return matchTitle || matchDesc || matchCategory || matchKeywords;
        });
        return { ...section, items: filteredItems };
      })
      .filter((section) => section.items.length > 0);
  }, [sections, searchQuery]);

  const handleItemClick = (item: ConfigurationItem) => {
    // Modales anidados: no cerrar el catálogo, solo abrir el modal hijo encima
    item.onClick();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="2xl"
      zIndex={10000}
    >
      <div className="space-y-5">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <ZenInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar configuración..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Secciones */}
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
          {filteredSections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-400">No se encontraron configuraciones</p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <div key={section.id} className="space-y-2.5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {section.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const fullWidth = item.isFullWidth === true;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className={`text-left ${fullWidth ? 'md:col-span-2' : ''}`}
                      >
                        <div className="h-full rounded-lg bg-zinc-800/30 hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/50 transition-all duration-200 cursor-pointer group p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-zinc-800/50 rounded-lg group-hover:bg-zinc-700/50 transition-colors shrink-0">
                              <Icon className="h-5 w-5 text-zinc-300 group-hover:text-emerald-400 transition-colors duration-200" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors duration-200 mb-1">
                                {item.title}
                              </h4>
                              <p className={`text-xs text-zinc-400 leading-relaxed ${fullWidth ? '' : 'line-clamp-2'}`}>
                                {item.description}
                              </p>
                              {fullWidth && item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {item.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-700/60 text-zinc-400 border border-zinc-600/50"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </ZenDialog>
  );
}
