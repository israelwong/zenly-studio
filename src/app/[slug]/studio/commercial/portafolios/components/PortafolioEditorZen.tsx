'use client';

import React, { useState, useCallback } from 'react';
import { ZenButton, ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle } from '@/components/ui/zen';
import { Plus, Image, Video, Edit, Trash2, GripVertical } from 'lucide-react';
import { PortafolioData, Portafolio, PortafolioItem } from '../types';
import { PortafolioModal } from './PortafolioModal';
import { PortafolioItemModal } from './PortafolioItemModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortablePortafolioItem } from './SortablePortafolioItem';

interface PortafolioEditorZenProps {
    studioSlug: string;
    data: PortafolioData | null;
    loading: boolean;
}

export function PortafolioEditorZen({ studioSlug, data, loading }: PortafolioEditorZenProps) {
    const [portfolios, setPortfolios] = useState<Portafolio[]>(data?.portfolios || []);
    const [selectedPortfolio, setSelectedPortfolio] = useState<Portafolio | null>(null);
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PortafolioItem | null>(null);
    const [editingPortfolio, setEditingPortfolio] = useState<Portafolio | null>(null);
    const [editingItem, setEditingItem] = useState<PortafolioItem | null>(null);

    // Sensores para drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Manejar creación de portafolio
    const handleCreatePortfolio = useCallback(() => {
        setEditingPortfolio(null);
        setShowPortfolioModal(true);
    }, []);

    // Manejar edición de portafolio
    const handleEditPortfolio = useCallback((portfolio: Portafolio) => {
        setEditingPortfolio(portfolio);
        setShowPortfolioModal(true);
    }, []);

    // Manejar eliminación de portafolio
    const handleDeletePortfolio = useCallback((portfolioId: string) => {
        setPortfolios(prev => prev.filter(p => p.id !== portfolioId));
    }, []);

    // Manejar creación de item
    const handleCreateItem = useCallback((portfolio: Portafolio) => {
        setSelectedPortfolio(portfolio);
        setEditingItem(null);
        setShowItemModal(true);
    }, []);

    // Manejar edición de item
    const handleEditItem = useCallback((item: PortafolioItem, portfolio: Portafolio) => {
        setSelectedPortfolio(portfolio);
        setEditingItem(item);
        setShowItemModal(true);
    }, []);

    // Manejar eliminación de item
    const handleDeleteItem = useCallback((itemId: string, portfolioId: string) => {
        setPortfolios(prev => prev.map(portfolio =>
            portfolio.id === portfolioId
                ? { ...portfolio, items: portfolio.items.filter(item => item.id !== itemId) }
                : portfolio
        ));
    }, []);

    // Manejar drag and drop de portfolios
    const handlePortfoliosDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = portfolios.findIndex(p => p.id === active.id);
        const newIndex = portfolios.findIndex(p => p.id === over.id);
        const reorderedPortfolios = arrayMove(portfolios, oldIndex, newIndex);
        setPortfolios(reorderedPortfolios);
    };

    // Manejar drag and drop de items
    const handleItemsDragEnd = (event: any, portfolioId: string) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const portfolio = portfolios.find(p => p.id === portfolioId);
        if (!portfolio) return;

        const oldIndex = portfolio.items.findIndex(item => item.id === active.id);
        const newIndex = portfolio.items.findIndex(item => item.id === over.id);
        const reorderedItems = arrayMove(portfolio.items, oldIndex, newIndex);

        setPortfolios(prev => prev.map(p =>
            p.id === portfolioId
                ? { ...p, items: reorderedItems }
                : p
        ));
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-zinc-800/50 rounded animate-pulse"></div>
                <div className="h-32 bg-zinc-800/50 rounded animate-pulse"></div>
                <div className="h-32 bg-zinc-800/50 rounded animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con botón de crear */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-zinc-100">Portafolios</h3>
                    <p className="text-sm text-zinc-400">Gestiona tus proyectos y trabajos destacados</p>
                </div>
                <ZenButton
                    onClick={handleCreatePortfolio}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Portafolio
                </ZenButton>
            </div>

            {/* Lista de portafolios */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handlePortfoliosDragEnd}
            >
                <SortableContext items={portfolios.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                        {portfolios.map((portfolio) => (
                            <ZenCard key={portfolio.id} variant="outline" className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <GripVertical className="h-4 w-4 text-zinc-500 cursor-grab" />
                                            <h4 className="font-medium text-zinc-100">{portfolio.title}</h4>
                                            {portfolio.category && (
                                                <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full">
                                                    {portfolio.category}
                                                </span>
                                            )}
                                        </div>
                                        {portfolio.description && (
                                            <p className="text-sm text-zinc-400 mb-3">{portfolio.description}</p>
                                        )}

                                        {/* Items del portafolio */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-zinc-300">
                                                    Items ({portfolio.items.length})
                                                </span>
                                                <ZenButton
                                                    onClick={() => handleCreateItem(portfolio)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-1"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    Agregar Item
                                                </ZenButton>
                                            </div>

                                            {portfolio.items.length > 0 && (
                                                <DndContext
                                                    sensors={sensors}
                                                    collisionDetection={closestCenter}
                                                    onDragEnd={(event) => handleItemsDragEnd(event, portfolio.id)}
                                                >
                                                    <SortableContext items={portfolio.items.map(item => item.id)} strategy={verticalListSortingStrategy}>
                                                        <div className="space-y-2">
                                                            {portfolio.items.map((item) => (
                                                                <SortablePortafolioItem
                                                                    key={item.id}
                                                                    item={item}
                                                                    portfolio={portfolio}
                                                                    onEdit={handleEditItem}
                                                                    onDelete={handleDeleteItem}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 ml-4">
                                        <ZenButton
                                            onClick={() => handleEditPortfolio(portfolio)}
                                            variant="outline"
                                            size="sm"
                                            className="p-2"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </ZenButton>
                                        <ZenButton
                                            onClick={() => handleDeletePortfolio(portfolio.id)}
                                            variant="outline"
                                            size="sm"
                                            className="p-2 text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </ZenButton>
                                    </div>
                                </div>
                            </ZenCard>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Modales */}
            {showPortfolioModal && (
                <PortafolioModal
                    isOpen={showPortfolioModal}
                    onClose={() => setShowPortfolioModal(false)}
                    portfolio={editingPortfolio}
                    onSave={(portfolioData) => {
                        if (editingPortfolio) {
                            setPortfolios(prev => prev.map(p =>
                                p.id === editingPortfolio.id
                                    ? { ...p, ...portfolioData }
                                    : p
                            ));
                        } else {
                            const newPortfolio: Portafolio = {
                                id: `portfolio-${Date.now()}`,
                                ...portfolioData,
                                items: [],
                                order: portfolios.length
                            };
                            setPortfolios(prev => [...prev, newPortfolio]);
                        }
                        setShowPortfolioModal(false);
                    }}
                />
            )}

            {showItemModal && selectedPortfolio && (
                <PortafolioItemModal
                    isOpen={showItemModal}
                    onClose={() => setShowItemModal(false)}
                    item={editingItem}
                    portfolio={selectedPortfolio}
                    onSave={(itemData) => {
                        if (editingItem) {
                            setPortfolios(prev => prev.map(portfolio =>
                                portfolio.id === selectedPortfolio.id
                                    ? {
                                        ...portfolio,
                                        items: portfolio.items.map(item =>
                                            item.id === editingItem.id
                                                ? { ...item, ...itemData }
                                                : item
                                        )
                                    }
                                    : portfolio
                            ));
                        } else {
                            const newItem: PortafolioItem = {
                                id: `item-${Date.now()}`,
                                ...itemData,
                                order: selectedPortfolio.items.length
                            };
                            setPortfolios(prev => prev.map(portfolio =>
                                portfolio.id === selectedPortfolio.id
                                    ? { ...portfolio, items: [...portfolio.items, newItem] }
                                    : portfolio
                            ));
                        }
                        setShowItemModal(false);
                    }}
                />
            )}
        </div>
    );
}

