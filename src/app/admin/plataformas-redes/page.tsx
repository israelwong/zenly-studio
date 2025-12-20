'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { SectionNavigation } from '@/components/ui/shadcn/section-navigation';
import { Plus, Eye, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { PlataformasList, PlataformaModal } from './components';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

interface PlataformaRedSocial {
    id: string;
    nombre: string;
    slug: string;
    descripcion: string | null;
    color: string | null;
    icono: string | null;
    urlBase: string | null;
    isActive: boolean;
    orden: number;
    createdAt: Date;
    updatedAt: Date;
}

export default function PlataformasRedesPage() {
    const [plataformas, setPlataformas] = useState<PlataformaRedSocial[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlataforma, setEditingPlataforma] = useState<PlataformaRedSocial | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReordering, setIsReordering] = useState(false);

    useEffect(() => {
        fetchPlataformas();
    }, []);

    const fetchPlataformas = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/plataformas-redes');
            if (!response.ok) {
                throw new Error('Error al cargar las plataformas');
            }
            const data = await response.json();
            setPlataformas(data);
        } catch (error) {
            console.error('Error fetching plataformas:', error);
            toast.error('Error al cargar las plataformas');
        } finally {
            setLoading(false);
        }
    };

    const handlePlataformaSubmit = async (plataformaData: Omit<PlataformaRedSocial, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            // Validar datos requeridos
            if (!plataformaData.nombre.trim()) {
                toast.error('El nombre de la plataforma es requerido');
                throw new Error('Nombre requerido');
            }

            if (!plataformaData.slug.trim()) {
                toast.error('El slug de la plataforma es requerido');
                throw new Error('Slug requerido');
            }

            const url = editingPlataforma ? `/api/admin/plataformas-redes/${editingPlataforma.id}` : '/api/admin/plataformas-redes';
            const method = editingPlataforma ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(plataformaData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || errorData.message || 'Error al guardar la plataforma';
                throw new Error(errorMessage);
            }

            if (editingPlataforma) {
                // Actualización optimista para edición
                setPlataformas(prevPlataformas =>
                    prevPlataformas.map(p =>
                        p.id === editingPlataforma.id ? { ...p, ...plataformaData } : p
                    )
                );
                setEditingPlataforma(null);
                setIsEditModalOpen(false);
                toast.success('Plataforma actualizada correctamente');
            } else {
                // Para creación, agregar la nueva plataforma a la lista
                const nuevaPlataforma = await response.json();
                setPlataformas(prevPlataformas => [...prevPlataformas, nuevaPlataforma]);
                toast.success('Plataforma creada correctamente');
            }
        } catch (error) {
            console.error('Error saving plataforma:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al guardar la plataforma';
            toast.error(errorMessage);
            throw error;
        }
    };

    const handleEdit = (plataforma: PlataformaRedSocial) => {
        setEditingPlataforma(plataforma);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/plataformas-redes/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la plataforma');
            }

            toast.success('Plataforma eliminada correctamente');
            fetchPlataformas();
        } catch (error) {
            console.error('Error deleting plataforma:', error);
            toast.error('Error al eliminar la plataforma');
            throw error;
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            const plataforma = plataformas.find(p => p.id === id);
            if (!plataforma) return;

            // Actualización optimista en el estado local
            setPlataformas(prevPlataformas =>
                prevPlataformas.map(p =>
                    p.id === id ? { ...p, isActive } : p
                )
            );

            const response = await fetch(`/api/admin/plataformas-redes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...plataforma, isActive }),
            });

            if (!response.ok) {
                // Revertir cambio en caso de error
                setPlataformas(prevPlataformas =>
                    prevPlataformas.map(p =>
                        p.id === id ? { ...p, isActive: !isActive } : p
                    )
                );
                throw new Error('Error al actualizar la plataforma');
            }

            toast.success(`Plataforma ${isActive ? 'activada' : 'desactivada'} correctamente`);
        } catch (error) {
            console.error('Error updating plataforma:', error);
            toast.error('Error al actualizar la plataforma');
            throw error;
        }
    };

    const handleReorder = async (reorderedPlataformas: PlataformaRedSocial[]) => {
        try {
            setIsReordering(true);

            // Actualizar el orden en el estado local primero
            setPlataformas(reorderedPlataformas);

            // Enviar actualizaciones al servidor con el orden correcto (0-based)
            const updatePromises = reorderedPlataformas.map((plataforma, index) =>
                fetch(`/api/admin/plataformas-redes/${plataforma.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...plataforma,
                        orden: index // Usar índice 0-based correctamente
                    }),
                })
            );

            const results = await Promise.allSettled(updatePromises);

            // Verificar si alguna actualización falló
            const failedUpdates = results.filter(result => result.status === 'rejected');
            if (failedUpdates.length > 0) {
                console.error('Algunas actualizaciones fallaron:', failedUpdates);
                throw new Error('Error al actualizar el orden de algunas plataformas');
            }

            toast.success('Orden actualizado correctamente');
        } catch (error) {
            console.error('Error reordering plataformas:', error);
            toast.error('Error al actualizar el orden');
            // Revertir cambios en caso de error
            fetchPlataformas();
        } finally {
            setIsReordering(false);
        }
    };

    const handleCancel = () => {
        setEditingPlataforma(null);
        setIsEditModalOpen(false);
    };

    const handleCreatePlataforma = () => {
        setEditingPlataforma(null);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <SectionNavigation
                title="Gestión de Plataformas de Redes Sociales"
                description="Configura las plataformas de redes sociales disponibles para los estudios"
                actionButton={{
                    label: "Nueva Plataforma",
                    onClick: handleCreatePlataforma,
                    icon: "Plus"
                }}
            />

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Total Plataformas</p>
                                <p className="text-xl font-bold text-white">{plataformas.length}</p>
                            </div>
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Plataformas Activas</p>
                                <p className="text-xl font-bold text-white">
                                    {plataformas.filter(plataforma => plataforma.isActive).length}
                                </p>
                            </div>
                            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <Eye className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Disponibles para Estudios</p>
                                <p className="text-xl font-bold text-white">
                                    {plataformas.filter(plataforma => plataforma.isActive).length}
                                </p>
                            </div>
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                <Users className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Plataformas List */}
            <PlataformasList
                plataformas={plataformas}
                loading={loading}
                isReordering={isReordering}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onReorder={handleReorder}
            />

            {/* Instructions */}
            <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-4">
                    <h3 className="font-medium text-white mb-2">Instrucciones</h3>
                    <ul className="text-sm text-zinc-400 space-y-1">
                        <li>• Arrastra las plataformas para reordenar la lista</li>
                        <li>• Las plataformas activas se muestran en los estudios</li>
                        <li>• Los estudios pueden seleccionar de las plataformas activas</li>
                        <li>• El orden determina la prioridad en la selección</li>
                        <li>• Usa íconos de Lucide React (facebook, instagram, twitter, etc.)</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Modal de edición */}
            <PlataformaModal
                isOpen={isEditModalOpen}
                onClose={handleCancel}
                plataforma={editingPlataforma}
                onSave={handlePlataformaSubmit}
            />
        </div>
    );
}
