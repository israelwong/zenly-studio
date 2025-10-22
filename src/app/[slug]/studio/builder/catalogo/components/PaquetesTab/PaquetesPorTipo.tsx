'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Search, Filter, Edit, Copy, Trash2, GripVertical } from 'lucide-react';
import { ZenCard, ZenButton, ZenInput, ZenBadge } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { PaqueteFormularioAvanzado } from './PaqueteFormularioAvanzado';
import { formatearMoneda } from '@/lib/actions/studio/builder/catalogo/calcular-precio';
import type { TipoEventoData } from '@/lib/actions/schemas/tipos-evento-schemas';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';

interface PaquetesPorTipoProps {
    studioSlug: string;
    tipoEvento: TipoEventoData;
    paquetes: PaqueteFromDB[];
    onNavigateToPaquete: (paquete: PaqueteFromDB) => void;
    onNavigateBack: () => void;
    onPaquetesChange: (paquetes: PaqueteFromDB[]) => void;
}

export function PaquetesPorTipo({
    studioSlug,
    tipoEvento,
    paquetes,
    onNavigateToPaquete,
    onNavigateBack,
    onPaquetesChange
}: PaquetesPorTipoProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingPaquete, setEditingPaquete] = useState<PaqueteFromDB | null>(null);

    // Filtrar paquetes
    const filteredPaquetes = paquetes.filter(paquete => {
        const matchesSearch = paquete.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || paquete.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleCrearPaquete = () => {
        setEditingPaquete(null);
        setShowForm(true);
    };

    const handleSave = (savedPaquete: PaqueteFromDB) => {
        if (editingPaquete) {
            // Actualizar paquete existente
            const newPaquetes = paquetes.map((p) =>
                p.id === editingPaquete.id ? savedPaquete : p
            );
            onPaquetesChange(newPaquetes);
        } else {
            // Crear nuevo paquete
            const newPaquetes = [...paquetes, savedPaquete];
            onPaquetesChange(newPaquetes);
        }
        setShowForm(false);
        setEditingPaquete(null);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingPaquete(null);
    };

    const handleEditPaquete = (paquete: PaqueteFromDB) => {
        onNavigateToPaquete(paquete);
    };

    const handleDuplicatePaquete = async (paquete: PaqueteFromDB) => {
        // TODO: Implementar duplicación
        console.log('Duplicar paquete:', paquete.nombre);
    };

    const handleDeletePaquete = async (paquete: PaqueteFromDB) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar el paquete "${paquete.nombre}"?`)) {
            return;
        }
        // TODO: Implementar eliminación
        console.log('Eliminar paquete:', paquete.nombre);
    };

    return (
        <div className="space-y-6">
            {/* Header con breadcrumb */}
            <div className="flex items-center gap-4">
                <ZenButton
                    variant="secondary"
                    size="sm"
                    onClick={onNavigateBack}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </ZenButton>

                <div className="flex items-center gap-2 text-zinc-400">
                    <span>Paquetes</span>
                    <span>/</span>
                    <span className="text-white font-medium">{tipoEvento.nombre}</span>
                </div>
            </div>

            {/* Header del tipo de evento */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {tipoEvento.icono && (
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <span className="text-2xl">{tipoEvento.icono}</span>
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-white">{tipoEvento.nombre}</h2>
                        {tipoEvento.descripcion && (
                            <p className="text-zinc-400 mt-1">{tipoEvento.descripcion}</p>
                        )}
                    </div>
                    <ZenBadge variant="secondary">
                        {paquetes.length} {paquetes.length === 1 ? 'paquete' : 'paquetes'}
                    </ZenBadge>
                </div>

                <ZenButton onClick={handleCrearPaquete}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Paquete
                </ZenButton>
            </div>

            {/* Filtros y búsqueda */}
            <div className="flex flex-col sm:flex-row gap-4">
                <ZenInput
                    placeholder="Buscar paquetes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                    icon={Search}
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[160px]"
                >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                </select>
            </div>

            {/* Lista de paquetes */}
            {filteredPaquetes.length === 0 ? (
                <ZenCard>
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            {searchTerm || statusFilter !== 'all'
                                ? 'No se encontraron paquetes'
                                : 'No hay paquetes configurados'
                            }
                        </h3>
                        <p className="text-zinc-400 mb-6">
                            {searchTerm || statusFilter !== 'all'
                                ? 'Intenta ajustar los filtros de búsqueda'
                                : `Crea tu primer paquete para ${tipoEvento.nombre}`
                            }
                        </p>
                        {!searchTerm && statusFilter === 'all' && (
                            <ZenButton onClick={handleCrearPaquete}>
                                <Plus className="w-4 h-4 mr-2" />
                                Crear Primer Paquete
                            </ZenButton>
                        )}
                    </div>
                </ZenCard>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                    {filteredPaquetes.map((paquete) => (
                        <ZenCard
                            key={paquete.id}
                            className="hover:scale-105 transition-transform group"
                        >
                            <div className="p-6">
                                {/* Header del paquete */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                            {paquete.nombre}
                                        </h3>
                                        {paquete.descripcion && (
                                            <p className="text-sm text-zinc-400 mt-1">
                                                {paquete.descripcion}
                                            </p>
                                        )}
                                    </div>
                                    <ZenBadge
                                        variant={paquete.status === 'active' ? 'default' : 'secondary'}
                                        className="ml-2"
                                    >
                                        {paquete.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </ZenBadge>
                                </div>

                                {/* Información financiera */}
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-zinc-400">Precio</span>
                                        <span className="text-lg font-bold text-emerald-400">
                                            {formatearMoneda(paquete.precio || 0)}
                                        </span>
                                    </div>

                                    {paquete.utilidad !== null && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-zinc-400">Utilidad</span>
                                            <span className={`text-sm font-medium ${(paquete.utilidad || 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {formatearMoneda(paquete.utilidad || 0)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-zinc-400">Servicios</span>
                                        <span className="text-sm font-medium text-zinc-300">
                                            {paquete.paquete_servicios?.length || 0} servicios
                                        </span>
                                    </div>
                                </div>

                                {/* Acciones */}
                                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-zinc-800">
                                    <ZenButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleEditPaquete(paquete)}
                                        className="flex-1"
                                    >
                                        <Edit className="w-4 h-4 mr-1" />
                                        <span className="hidden sm:inline">Editar</span>
                                    </ZenButton>

                                    <div className="flex gap-2">
                                        <ZenButton
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleDuplicatePaquete(paquete)}
                                            disabled={loading}
                                            className="flex-1 sm:flex-none"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </ZenButton>

                                        <ZenButton
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeletePaquete(paquete)}
                                            disabled={loading}
                                            className="flex-1 sm:flex-none"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </ZenButton>
                                    </div>
                                </div>
                            </div>
                        </ZenCard>
                    ))}
                </div>
            )}

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
        </div>
    );
}
