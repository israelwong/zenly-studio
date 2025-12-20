"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Monitor,
    Smartphone,
    Tablet,
    MapPin,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    AlertTriangle
} from 'lucide-react';
import { obtenerHistorialAccesos } from '@/lib/actions/studio/account/seguridad/seguridad.actions';
import { AccessLog } from '../types';
import { toast } from 'sonner';

interface SessionsHistoryProps {
    studioSlug: string;
}

export function SessionsHistory({ studioSlug }: SessionsHistoryProps) {
    const [sessions, setSessions] = useState<AccessLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadSessions = useCallback(async () => {
        try {
            const result = await obtenerHistorialAccesos(studioSlug);
            if (result.success && result.data) {
                setSessions(result.data);
            } else {
                toast.error('Error al cargar historial de sesiones');
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            toast.error('Error al cargar historial de sesiones');
        } finally {
            setLoading(false);
        }
    }, [studioSlug]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadSessions();
        setRefreshing(false);
        toast.success('Historial actualizado');
    };

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const getDeviceIcon = (userAgent: string) => {
        if (!userAgent) return <Monitor className="h-4 w-4" />;

        const ua = userAgent.toLowerCase();

        // Detectar móviles
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return <Smartphone className="h-4 w-4" />;
        }

        // Detectar tablets
        if (ua.includes('tablet') || ua.includes('ipad')) {
            return <Tablet className="h-4 w-4" />;
        }

        // Por defecto, desktop
        return <Monitor className="h-4 w-4" />;
    };

    const getDeviceName = (userAgent: string) => {
        if (!userAgent || userAgent.trim() === '') return 'Dispositivo desconocido';

        const ua = userAgent.toLowerCase();

        // Detectar sistema operativo
        let os = 'Sistema desconocido';
        if (ua.includes('windows')) os = 'Windows';
        else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
        else if (ua.includes('linux')) os = 'Linux';
        else if (ua.includes('android')) os = 'Android';
        else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

        // Detectar navegador
        let browser = 'Navegador desconocido';
        if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
        else if (ua.includes('firefox')) browser = 'Firefox';
        else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
        else if (ua.includes('edg')) browser = 'Edge';
        else if (ua.includes('opera')) browser = 'Opera';

        // Si no se puede detectar nada, mostrar información básica
        if (os === 'Sistema desconocido' && browser === 'Navegador desconocido') {
            return 'Dispositivo desconocido';
        }

        return `${browser} en ${os}`;
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'login': return 'Inicio de sesión';
            case 'logout': return 'Cierre de sesión';
            case 'password_change': return 'Cambio de contraseña';
            case 'session_created': return 'Sesión creada';
            case 'security_settings_updated': return 'Configuraciones de seguridad modificadas';
            case 'profile_updated': return 'Perfil actualizado';
            case 'avatar_updated': return 'Foto de perfil actualizada';
            default: return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    if (loading) {
        return (
            <Card className="bg-zinc-900/50 border-zinc-800 h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-400" />
                        Historial de Sesiones
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Cargando historial...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-400" />
                        Historial de Sesiones
                        {sessions.length > 0 && (
                            <span className="text-sm text-zinc-400 font-normal">
                                ({sessions.length} registros)
                            </span>
                        )}
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {sessions.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-center">
                        <div className="space-y-2">
                            <AlertTriangle className="h-8 w-8 text-zinc-500 mx-auto" />
                            <p className="text-zinc-400">No hay historial de sesiones</p>
                            <p className="text-zinc-500 text-sm">Las sesiones aparecerán aquí</p>
                        </div>
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800/70 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                        {getDeviceIcon(session.user_agent || '')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-medium text-sm truncate">
                                                {getActionLabel(session.action)}
                                            </span>
                                            <Badge
                                                variant={session.success ? "default" : "destructive"}
                                                className="text-xs px-2 py-0.5"
                                            >
                                                {session.success ? (
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                )}
                                                {session.success ? 'OK' : 'Error'}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-zinc-400 space-y-1">
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="truncate">{getDeviceName(session.user_agent || '')}</span>
                                                {session.ip_address && (
                                                    <span className="flex items-center gap-1 text-zinc-500 flex-shrink-0">
                                                        <MapPin className="h-3 w-3" />
                                                        {session.ip_address}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(session.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
