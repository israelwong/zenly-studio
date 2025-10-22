'use client';

import React, { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { ZenButton, ZenInput, ZenCard } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { PaqueteItem } from './PaqueteItem';
import { PaqueteFormularioAvanzado } from './PaqueteFormularioAvanzado';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface PaquetesListProps {
    studioSlug: string;
    initialPaquetes: PaqueteFromDB[];
    onPaquetesChange: (paquetes: PaqueteFromDB[]) => void;
}

export function PaquetesList({
    studioSlug,
    initialPaquetes,
    onPaquetesChange,
}: PaquetesListProps) {
    const [paquetes, setPaquetes] = useState<PaqueteFromDB[]>(initialPaquetes);
    const [showForm, setShowForm] = useState(false);
    const [editingPaquete, setEditingPaquete] = useState<PaqueteFromDB | null>(null);

    const handleEdit = (paqueteId: string) => {
        const paquete = paquetes.find((p) => p.id === paqueteId);
        if (paquete) {
            setEditingPaquete(paquete);
            setShowForm(true);
        }
    };

    const handleDelete = (paqueteId: string) => {
        const newPaquetes = paquetes.filter((p) => p.id !== paqueteId);
        setPaquetes(newPaquetes);
        onPaquetesChange(newPaquetes);
    };

    const handleDuplicate = async (id: string) => {
        // TODO: Implementar duplicación de paquete
        console.log('Duplicar paquete:', id);
    };

    const handleSave = (savedPaquete: PaqueteFromDB) => {
        if (editingPaquete) {
            // Actualizar paquete existente
            const newPaquetes = paquetes.map((p) =>
                p.id === editingPaquete.id ? savedPaquete : p
            );
            setPaquetes(newPaquetes);
            onPaquetesChange(newPaquetes);
        } else {
            // Crear nuevo paquete
            const newPaquetes = [...paquetes, savedPaquete];
            setPaquetes(newPaquetes);
            onPaquetesChange(newPaquetes);
        }
        setShowForm(false);
        setEditingPaquete(null);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingPaquete(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <ZenButton
                    onClick={() => {
                        setEditingPaquete(null);
                        setShowForm(true);
                    }}
                    variant="primary"
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Paquete
                </ZenButton>
            </div>

            {/* Modal de formulario */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700">
                    <DialogHeader>
                        <DialogTitle className="text-white">
                            {editingPaquete ? 'Editar Paquete' : 'Nuevo Paquete'}
                        </DialogTitle>
                    </DialogHeader>
                    <PaqueteFormularioAvanzado
                        studioSlug={studioSlug}
                        paquete={editingPaquete}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                </DialogContent>
            </Dialog>

            {/* Lista de paquetes */}
            {paquetes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paquetes.map((paquete) => (
                        <PaqueteItem
                            key={paquete.id}
                            paquete={paquete}
                            studioSlug={studioSlug}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onDuplicate={handleDuplicate}
                        />
                    ))}
                </div>
            ) : (
                <ZenCard className="border-zinc-800/50">
                    <div className="p-12 text-center">
                        <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                            No hay paquetes
                        </h3>
                        <p className="text-zinc-400 mb-6">
                            Crea tu primer paquete para comenzar
                        </p>
                        <ZenButton
                            onClick={() => {
                                setEditingPaquete(null);
                                setShowForm(true);
                            }}
                            variant="primary"
                            className="flex items-center gap-2 mx-auto"
                        >
                            <Plus className="w-4 h-4" />
                            Crear Paquete
                        </ZenButton>
                    </div>
                </ZenCard>
            )}
        </div>
    );
}
