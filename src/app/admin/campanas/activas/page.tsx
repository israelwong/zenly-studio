'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { ZenInput } from '@/components/ui/zen';
import { Dialog, DialogTrigger } from '@/components/ui/shadcn/dialog';
import { Plus, Edit, Trash2, Play, Pause, Search, DollarSign, Users, Target, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { CampanaModal } from './components';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

interface Plataforma {
    id: string;
    nombre: string;
    tipo: string;
    color: string | null;
    icono: string | null;
}

interface CampañaPlataforma {
    id: string;
    presupuesto: number;
    gastoReal: number;
    leads: number;
    conversiones: number;
    plataforma?: Plataforma;
    platform_plataformas_publicidad?: Plataforma;
}

interface Campaña {
    id: string;
    nombre: string;
    descripcion: string | null;
    presupuestoTotal: number | string;
    fechaInicio: string | Date;
    fechaFin: string | Date;
    status: string;
    isActive: boolean;
    leadsGenerados: number;
    leadsSuscritos: number;
    gastoReal: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    plataformas?: CampañaPlataforma[];
    platform_campana_plataformas?: CampañaPlataforma[];
    _count: {
        leads: number;
    };
}

const statusOptions = [
    { value: 'planificada', label: 'Planificada', color: 'bg-gray-500' },
    { value: 'activa', label: 'Activa', color: 'bg-green-500' },
    { value: 'pausada', label: 'Pausada', color: 'bg-yellow-500' },
    { value: 'finalizada', label: 'Finalizada', color: 'bg-red-500' }
];

export default function CampanasActivasPage() {
    const [campanas, setCampanas] = useState<Campaña[]>([]);
    const [, setPlataformas] = useState<Plataforma[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaña, setEditingCampaña] = useState<Campaña | null>(null);

    useEffect(() => {
        fetchCampanas();
        fetchPlataformas();
    }, []);

    const fetchCampanas = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/campanas?isActive=true');
            if (!response.ok) {
                // Si es error 500, probablemente no hay datos, no mostrar error
                if (response.status === 500) {
                    setCampanas([]);
                    return;
                }
                throw new Error('Error al cargar las campañas');
            }
            const data = await response.json();
            setCampanas(data || []);
        } catch (error) {
            console.error('Error fetching campanas:', error);
            // Solo mostrar error si no es por falta de datos
            if (error instanceof Error && !error.message.includes('fetch')) {
                toast.error('Error al cargar las campañas');
            }
            setCampanas([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlataformas = async () => {
        try {
            const response = await fetch('/api/plataformas');
            if (!response.ok) {
                // Si es error 500, probablemente no hay datos, no mostrar error
                if (response.status === 500) {
                    setPlataformas([]);
                    return;
                }
                throw new Error('Error al cargar las plataformas');
            }
            const data = await response.json();
            setPlataformas(data || []);
        } catch (error) {
            console.error('Error fetching plataformas:', error);
            // Solo mostrar error si no es por falta de datos
            if (error instanceof Error && !error.message.includes('fetch')) {
                toast.error('Error al cargar las plataformas');
            }
            setPlataformas([]);
        }
    };

    const handleSaveCampaña = async (campañaData: {
        nombre: string;
        descripcion: string;
        presupuestoTotal: number;
        fechaInicio: Date;
        fechaFin: Date;
        status: string;
        isActive: boolean;
        leadsGenerados: number;
        leadsSuscritos: number;
        gastoReal: number;
        plataformas: Array<{
            plataformaId: string;
            presupuesto: number;
            gastoReal: number;
            leads: number;
            conversiones: number;
        }>;
    }) => {
        try {
            if (editingCampaña) {
                const response = await fetch(`/api/campanas/${editingCampaña.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(campañaData),
                });

                if (!response.ok) {
                    throw new Error('Error al actualizar la campaña');
                }

                const updatedCampaña = await response.json();

                // Actualizar estado local sin hacer nueva petición
                setCampanas(prevCampanas =>
                    prevCampanas.map(c =>
                        c.id === editingCampaña.id ? updatedCampaña : c
                    )
                );

                toast.success('Campaña actualizada exitosamente');
            } else {
                const response = await fetch('/api/campanas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(campañaData),
                });

                if (!response.ok) {
                    throw new Error('Error al crear la campaña');
                }

                const newCampaña = await response.json();

                // Agregar nueva campaña al estado local
                setCampanas(prevCampanas => [...prevCampanas, newCampaña]);

                toast.success('Campaña creada exitosamente');
            }

            setEditingCampaña(null);
        } catch (error) {
            console.error('Error saving campaña:', error);
            throw error; // Re-throw para que el modal maneje el error
        }
    };

    const handleEdit = (campaña: Campaña) => {
        setEditingCampaña(campaña);
        setIsModalOpen(true);
    };

    const handleOpenModal = () => {
        setEditingCampaña(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCampaña(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta campaña?')) return;

        try {
            const response = await fetch(`/api/campanas/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la campaña');
            }

            // Eliminar campaña del estado local sin hacer nueva petición
            setCampanas(prevCampanas =>
                prevCampanas.filter(c => c.id !== id)
            );

            toast.success('Campaña eliminada exitosamente');
        } catch (error) {
            console.error('Error deleting campaña:', error);
            toast.error('Error al eliminar la campaña');
        }
    };


    const filteredCampanas = campanas.filter(campaña =>
        campaña.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaña.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const statusOption = statusOptions.find(s => s.value === status);
        return (
            <Badge className={`${statusOption?.color} text-white`}>
                {statusOption?.label}
            </Badge>
        );
    };

    const calculateMetrics = (campaña: Campaña) => {
        const gastoReal = typeof campaña.gastoReal === 'string' ? parseFloat(campaña.gastoReal) : campaña.gastoReal;
        const costoAdquisicion = campaña.leadsGenerados > 0 ? gastoReal / campaña.leadsGenerados : 0;
        const costoConversion = campaña.leadsSuscritos > 0 ? gastoReal / campaña.leadsSuscritos : 0;
        const tasaConversion = campaña.leadsGenerados > 0 ? (campaña.leadsSuscritos / campaña.leadsGenerados) * 100 : 0;

        return { costoAdquisicion, costoConversion, tasaConversion };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-zinc-400">Cargando campañas...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">

            {/* Filtros y Acciones */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex-1 max-w-sm">
                        <ZenInput
                            placeholder="Buscar campañas..."
                            icon={Search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Campaña
                        </Button>
                    </DialogTrigger>
                </Dialog>
            </div>

            {/* Campañas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampanas.map(campaña => {
                    const metrics = calculateMetrics(campaña);
                    return (
                        <Card key={campaña.id} className="bg-card border-border">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-white text-lg">
                                        {campaña.nombre}
                                    </CardTitle>
                                    {getStatusBadge(campaña.status)}
                                </div>
                                {campaña.descripcion && (
                                    <CardDescription className="text-zinc-400">
                                        {campaña.descripcion}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Métricas principales */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-2">
                                        <DollarSign className="h-4 w-4 text-green-500" />
                                        <div>
                                            <p className="text-xs text-zinc-500">Presupuesto</p>
                                            <p className="text-sm font-medium text-white">
                                                ${typeof campaña.presupuestoTotal === 'string'
                                                    ? parseFloat(campaña.presupuestoTotal).toLocaleString()
                                                    : campaña.presupuestoTotal.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="text-xs text-zinc-500">Leads</p>
                                            <p className="text-sm font-medium text-white">
                                                {campaña.leadsGenerados}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Métricas calculadas */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Costo Adquisición:</span>
                                        <span className="text-white">${metrics.costoAdquisicion.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Costo Conversión:</span>
                                        <span className="text-white">${metrics.costoConversion.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Tasa Conversión:</span>
                                        <span className="text-white">{metrics.tasaConversion.toFixed(1)}%</span>
                                    </div>
                                </div>

                                {/* Período */}
                                <div className="flex items-center space-x-2 text-sm text-zinc-400">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        {new Date(campaña.fechaInicio).toLocaleDateString()} - {new Date(campaña.fechaFin).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* Plataformas */}
                                {(() => {
                                    const plataformas = campaña.plataformas || campaña.platform_campana_plataformas || [];
                                    return plataformas.length > 0 && (
                                        <div>
                                            <p className="text-xs text-zinc-500 mb-2">Plataformas:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {plataformas.slice(0, 3).map(plataforma => (
                                                    <Badge key={plataforma.id} variant="secondary" className="text-xs">
                                                        {plataforma.plataforma?.nombre || plataforma.platform_plataformas_publicidad?.nombre || 'Plataforma'}
                                                    </Badge>
                                                ))}
                                                {plataformas.length > 3 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        +{plataformas.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Acciones */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(campaña)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(campaña.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        {campaña.status === 'activa' && (
                                            <Button variant="ghost" size="sm">
                                                <Pause className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {campaña.status === 'pausada' && (
                                            <Button variant="ghost" size="sm">
                                                <Play className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filteredCampanas.length === 0 && (
                <div className="text-center py-12">
                    <Target className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-400 mb-2">
                        {campanas.length === 0 ? 'No hay campañas activas' : 'No se encontraron campañas'}
                    </h3>
                    <p className="text-zinc-500">
                        {campanas.length === 0
                            ? 'Crea tu primera campaña para comenzar'
                            : 'Ajusta los filtros para ver más resultados'
                        }
                    </p>
                </div>
            )}

            {/* Modal de Campaña */}
            <CampanaModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveCampaña}
                editingCampaña={editingCampaña}
            />
        </div>
    );
}
