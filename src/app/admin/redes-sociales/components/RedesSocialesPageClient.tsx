'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Eye, EyeOff, Edit, Trash2 } from 'lucide-react';
import { deletePlataformaRedSocial } from '../actions';
import { RedSocialIcon } from '@/components/ui/icons/RedSocialIcon';

interface PlataformaRedSocial {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    baseUrl: string | null;
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface RedesSocialesPageClientProps {
    plataformas: PlataformaRedSocial[];
    onCreatePlataforma?: () => void;
    onEditPlataforma?: (plataforma: PlataformaRedSocial) => void;
}

export function RedesSocialesPageClient({ plataformas, onCreatePlataforma, onEditPlataforma }: RedesSocialesPageClientProps) {
    // Calcular estadísticas
    const totalPlataformas = plataformas.length;
    const activasPlataformas = plataformas.filter(p => p.isActive).length;
    const inactivasPlataformas = totalPlataformas - activasPlataformas;

    const handleDeletePlataforma = async (id: string, nombre: string) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar la plataforma "${nombre}"?`)) {
            return;
        }

        try {
            const result = await deletePlataformaRedSocial(id);
            if (result.success) {
                // Recargar la página para ver los cambios
                window.location.reload();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error deleting plataforma:', error);
            alert('Error al eliminar la plataforma');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Total Plataformas</p>
                                <p className="text-xl font-bold text-white">{totalPlataformas}</p>
                            </div>
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">P</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-zinc-400">Plataformas Activas</p>
                                <p className="text-xl font-bold text-white">{activasPlataformas}</p>
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
                                <p className="text-xs font-medium text-zinc-400">Plataformas Inactivas</p>
                                <p className="text-xl font-bold text-white">{inactivasPlataformas}</p>
                            </div>
                            <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                                <EyeOff className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Plataformas */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Plataformas de Redes Sociales</h2>

                {plataformas.length === 0 ? (
                    <Card className="border border-border bg-card shadow-sm">
                        <CardContent className="p-8 text-center">
                            <div className="text-zinc-400 mb-4">
                                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No hay plataformas configuradas</h3>
                            <p className="text-zinc-400 mb-4">Comienza agregando las primeras plataformas de redes sociales.</p>
                            {onCreatePlataforma && (
                                <Button onClick={onCreatePlataforma} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    Agregar Primera Plataforma
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {plataformas.map((plataforma) => (
                            <Card key={plataforma.id} className="border border-border bg-card shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                                style={{ backgroundColor: plataforma.color || '#6B7280' }}
                                            >
                                                <RedSocialIcon
                                                    icono={plataforma.icon || 'default'}
                                                    className="w-6 h-6"
                                                />
                                            </div>
                                            <div>
                                                <CardTitle className="text-white text-base">{plataforma.name}</CardTitle>
                                                <p className="text-xs text-zinc-400">/{plataforma.slug}</p>
                                            </div>
                                        </div>
                                        <Badge variant={plataforma.isActive ? "default" : "secondary"}>
                                            {plataforma.isActive ? 'Activa' : 'Inactiva'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    {plataforma.description && (
                                        <p className="text-sm text-zinc-300 mb-3">{plataforma.description}</p>
                                    )}

                                    {plataforma.baseUrl && (
                                        <p className="text-xs text-zinc-400 mb-3">
                                            URL Base: <span className="text-zinc-300">{plataforma.baseUrl}</span>
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-400">
                                            Orden: {plataforma.order}
                                        </span>
                                        <div className="flex space-x-2">
                                            {onEditPlataforma && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onEditPlataforma(plataforma)}
                                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeletePlataforma(plataforma.id, plataforma.name)}
                                                className="border-red-700 text-red-300 hover:bg-red-900/20"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <Card className="border border-border bg-card shadow-sm">
                <CardContent className="p-4">
                    <h3 className="font-medium text-white mb-2">Instrucciones</h3>
                    <ul className="text-sm text-zinc-400 space-y-1">
                        <li>• Las plataformas activas aparecen disponibles para los estudios</li>
                        <li>• El orden determina la secuencia de aparición en los formularios</li>
                        <li>• La URL base se usa como prefijo para las URLs de los estudios</li>
                        <li>• Los iconos y colores ayudan a identificar visualmente cada plataforma</li>
                        <li>• Solo se pueden eliminar plataformas que no estén en uso</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
