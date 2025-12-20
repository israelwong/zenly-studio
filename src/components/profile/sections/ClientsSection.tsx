import React from 'react';
import { Users, UserPlus, Calendar, Phone, Mail, MapPin } from 'lucide-react';
import { ZenCard, ZenCardContent, ZenCardHeader, ZenCardTitle, ZenBadge, ZenButton } from '@/components/ui/zen';

interface ClientesViewProps {
    clientes?: Array<{
        id: string;
        nombre: string;
        email: string;
        telefono?: string;
        direccion?: string;
        ultima_visita?: string;
        total_sesiones: number;
        status: 'activo' | 'inactivo' | 'prospecto';
    }>;
}

/**
 * ClientesView - Client management and information
 * Shows client list, contact details, and session history
 * Used in /[slug]/client route
 */
export function ClientsSection({ clientes = [] }: ClientesViewProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'activo':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'inactivo':
                return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
            case 'prospecto':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default:
                return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'activo':
                return 'Activo';
            case 'inactivo':
                return 'Inactivo';
            case 'prospecto':
                return 'Prospecto';
            default:
                return 'Desconocido';
        }
    };

    if (clientes.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="text-zinc-400 mb-2">
                    <Users className="h-12 w-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-medium text-zinc-300 mb-2">
                    No hay clientes registrados
                </h3>
                <p className="text-sm text-zinc-500">
                    Los clientes aparecerán aquí cuando se registren
                </p>
                <ZenButton className="mt-4" variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Agregar Cliente
                </ZenButton>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                        Gestión de Clientes
                    </h2>
                    <p className="text-sm text-zinc-400">
                        {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} registrados
                    </p>
                </div>
                <ZenButton>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo Cliente
                </ZenButton>
            </div>

            {/* Clients List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientes.map((cliente) => (
                    <ZenCard key={cliente.id}>
                        <ZenCardContent className="p-4">
                            <div className="space-y-3">
                                {/* Client Info */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-zinc-100 truncate">
                                            {cliente.nombre}
                                        </h3>
                                        <p className="text-sm text-zinc-400 truncate">
                                            {cliente.email}
                                        </p>
                                    </div>
                                    <ZenBadge
                                        variant="outline"
                                        className={`text-xs ${getStatusColor(cliente.status)}`}
                                    >
                                        {getStatusText(cliente.status)}
                                    </ZenBadge>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-2">
                                    {cliente.telefono && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <Phone className="h-4 w-4" />
                                            <span>{cliente.telefono}</span>
                                        </div>
                                    )}
                                    {cliente.direccion && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                                            <MapPin className="h-4 w-4" />
                                            <span className="truncate">{cliente.direccion}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                                    <div className="text-sm text-zinc-400">
                                        {cliente.total_sesiones} sesiones
                                    </div>
                                    {cliente.ultima_visita && (
                                        <div className="flex items-center gap-1 text-sm text-zinc-400">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {new Date(cliente.ultima_visita).toLocaleDateString('es-MX')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <ZenButton size="sm" variant="outline" className="flex-1">
                                        <Mail className="h-4 w-4 mr-1" />
                                        Contactar
                                    </ZenButton>
                                    <ZenButton size="sm" variant="outline" className="flex-1">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        Agendar
                                    </ZenButton>
                                </div>
                            </div>
                        </ZenCardContent>
                    </ZenCard>
                ))}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ZenCard>
                    <ZenCardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-400 mb-1">
                            {clientes.filter(c => c.status === 'activo').length}
                        </div>
                        <div className="text-sm text-zinc-400">Clientes Activos</div>
                    </ZenCardContent>
                </ZenCard>
                <ZenCard>
                    <ZenCardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400 mb-1">
                            {clientes.filter(c => c.status === 'prospecto').length}
                        </div>
                        <div className="text-sm text-zinc-400">Prospectos</div>
                    </ZenCardContent>
                </ZenCard>
                <ZenCard>
                    <ZenCardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-zinc-400 mb-1">
                            {clientes.reduce((sum, c) => sum + c.total_sesiones, 0)}
                        </div>
                        <div className="text-sm text-zinc-400">Total Sesiones</div>
                    </ZenCardContent>
                </ZenCard>
            </div>
        </div>
    );
}
