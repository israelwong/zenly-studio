'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Search, Calendar, DollarSign, Users, Target, Eye } from 'lucide-react';
import { toast } from 'sonner';

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
    isActive: boolean;
    status: string;
    leadsGenerados: number;
    leadsSuscritos: number;
    gastoReal: number | string;
    createdAt: string | Date;
    updatedAt: string | Date;
    plataformas?: CampañaPlataforma[];
    platform_campana_plataformas?: CampañaPlataforma[];
}

const statusOptions = [
    { value: 'planificada', label: 'Planificada', color: 'bg-yellow-600' },
    { value: 'activa', label: 'Activa', color: 'bg-green-600' },
    { value: 'pausada', label: 'Pausada', color: 'bg-orange-600' },
    { value: 'finalizada', label: 'Finalizada', color: 'bg-gray-600' },
    { value: 'cancelada', label: 'Cancelada', color: 'bg-red-600' },
];

export default function CampanasHistorialPage() {
    const [campanas, setCampanas] = useState<Campaña[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCampanas();
    }, []);

    const fetchCampanas = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/campanas?isActive=false');
            if (!response.ok) {
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
            if (error instanceof Error && !error.message.includes('fetch')) {
                toast.error('Error al cargar las campañas');
            }
            setCampanas([]);
        } finally {
            setLoading(false);
        }
    };

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
                <div className="text-zinc-400">Cargando historial de campañas...</div>
            </div>
        );
    }

    const filteredCampanas = campanas.filter(campaña =>
        campaña.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaña.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Filtros */}
            <div className="flex items-center space-x-4">
                <div className="flex-1 max-w-sm">
                    <ZenInput
                        placeholder="Buscar en historial..."
                        icon={Search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Estadísticas del historial */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-400">Total Campañas</p>
                                <p className="text-2xl font-bold text-white">{campanas.length}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-zinc-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-400">Gasto Total</p>
                                <p className="text-2xl font-bold text-white">
                                    ${campanas.reduce((sum, c) => {
                                        const gasto = typeof c.gastoReal === 'string' ? parseFloat(c.gastoReal) : c.gastoReal;
                                        return sum + gasto;
                                    }, 0).toLocaleString()}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-zinc-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-400">Leads Generados</p>
                                <p className="text-2xl font-bold text-white">
                                    {campanas.reduce((sum, c) => sum + c.leadsGenerados, 0).toLocaleString()}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-zinc-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-zinc-400">Conversiones</p>
                                <p className="text-2xl font-bold text-white">
                                    {campanas.reduce((sum, c) => sum + c.leadsSuscritos, 0).toLocaleString()}
                                </p>
                            </div>
                            <Target className="h-8 w-8 text-zinc-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de campañas del historial */}
            {filteredCampanas.length === 0 ? (
                <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-8 text-center">
                        <Calendar className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No hay campañas en el historial</h3>
                        <p className="text-zinc-400">Las campañas finalizadas aparecerán aquí</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCampanas.map(campaña => {
                        const metrics = calculateMetrics(campaña);
                        return (
                            <Card key={campaña.id} className="bg-zinc-800 border-zinc-700">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-white text-lg mb-2">
                                                {campaña.nombre}
                                            </CardTitle>
                                            {campaña.descripcion && (
                                                <p className="text-zinc-400 text-sm line-clamp-2">
                                                    {campaña.descripcion}
                                                </p>
                                            )}
                                        </div>
                                        {getStatusBadge(campaña.status)}
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    {/* Fechas */}
                                    <div className="flex items-center text-sm text-zinc-400">
                                        <Calendar className="h-4 w-4 mr-2" />
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

                                    {/* Métricas */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-700">
                                        <div>
                                            <p className="text-xs text-zinc-500">Gasto Real</p>
                                            <p className="text-sm font-semibold text-white">
                                                ${typeof campaña.gastoReal === 'string' ? parseFloat(campaña.gastoReal).toLocaleString() : campaña.gastoReal.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500">Leads</p>
                                            <p className="text-sm font-semibold text-white">
                                                {campaña.leadsGenerados} → {campaña.leadsSuscritos}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500">Costo/Lead</p>
                                            <p className="text-sm font-semibold text-white">
                                                ${metrics.costoAdquisicion.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500">Conversión</p>
                                            <p className="text-sm font-semibold text-white">
                                                {metrics.tasaConversion.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex justify-end pt-2">
                                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                            <Eye className="h-4 w-4 mr-2" />
                                            Ver Detalles
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}