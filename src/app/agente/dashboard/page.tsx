'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { ZenButton } from '@/components/ui/zen';
import {
    Users,
    Target,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertTriangle,
    Calendar,
    DollarSign,
    BarChart3,
    Activity,
    Star,
    MessageSquare,
    Phone,
    Mail,
    MapPin,
    Plus
} from 'lucide-react';
import Link from 'next/link';

interface AgentDashboardData {
    stats: {
        totalLeads: number;
        activeLeads: number;
        convertedLeads: number;
        pendingLeads: number;
        totalStudios: number;
        activeStudios: number;
        monthlyRevenue: number;
        conversionRate: number;
    };
    recentLeads: {
        id: string;
        name: string;
        email: string;
        phone: string;
        studio: string;
        stage: string;
        value: number;
        lastActivity: string;
        priority: 'high' | 'medium' | 'low';
    }[];
    upcomingActivities: {
        id: string;
        type: 'call' | 'meeting' | 'follow-up' | 'demo';
        title: string;
        leadName: string;
        studio: string;
        scheduledAt: string;
        status: 'pending' | 'completed' | 'cancelled';
    }[];
    topStudios: {
        id: string;
        name: string;
        leads: number;
        revenue: number;
        status: 'active' | 'inactive' | 'pending';
    }[];
}

export default function AgentDashboardPage() {
    const [data, setData] = useState<AgentDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simular carga de datos
        const loadDashboardData = async () => {
            setLoading(true);

            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 1000));

            const mockData: AgentDashboardData = {
                stats: {
                    totalLeads: 156,
                    activeLeads: 89,
                    convertedLeads: 23,
                    pendingLeads: 44,
                    totalStudios: 12,
                    activeStudios: 8,
                    monthlyRevenue: 125000,
                    conversionRate: 14.7
                },
                recentLeads: [
                    {
                        id: 'lead-1',
                        name: 'María González',
                        email: 'maria@estudiofoto.com',
                        phone: '+52 55 1234 5678',
                        studio: 'Estudio Fotográfico Luna',
                        stage: 'Propuesta',
                        value: 15000,
                        lastActivity: 'Hace 2 horas',
                        priority: 'high'
                    },
                    {
                        id: 'lead-2',
                        name: 'Carlos Rodríguez',
                        email: 'carlos@fotografiapro.com',
                        phone: '+52 55 9876 5432',
                        studio: 'Fotografía Profesional',
                        stage: 'Negociación',
                        value: 25000,
                        lastActivity: 'Hace 4 horas',
                        priority: 'medium'
                    },
                    {
                        id: 'lead-3',
                        name: 'Ana Martínez',
                        email: 'ana@retratos.com',
                        phone: '+52 55 5555 1234',
                        studio: 'Retratos & Más',
                        stage: 'Calificado',
                        value: 8000,
                        lastActivity: 'Ayer',
                        priority: 'low'
                    },
                    {
                        id: 'lead-4',
                        name: 'Luis Fernández',
                        email: 'luis@eventos.com',
                        phone: '+52 55 7777 8888',
                        studio: 'Eventos Fotográficos',
                        stage: 'Nuevo',
                        value: 12000,
                        lastActivity: 'Hace 1 día',
                        priority: 'medium'
                    }
                ],
                upcomingActivities: [
                    {
                        id: 'activity-1',
                        type: 'call',
                        title: 'Llamada de seguimiento',
                        leadName: 'María González',
                        studio: 'Estudio Fotográfico Luna',
                        scheduledAt: '2024-01-15T10:00:00Z',
                        status: 'pending'
                    },
                    {
                        id: 'activity-2',
                        type: 'demo',
                        title: 'Demo de plataforma',
                        leadName: 'Carlos Rodríguez',
                        studio: 'Fotografía Profesional',
                        scheduledAt: '2024-01-15T14:30:00Z',
                        status: 'pending'
                    },
                    {
                        id: 'activity-3',
                        type: 'meeting',
                        title: 'Reunión presencial',
                        leadName: 'Ana Martínez',
                        studio: 'Retratos & Más',
                        scheduledAt: '2024-01-16T09:00:00Z',
                        status: 'pending'
                    }
                ],
                topStudios: [
                    {
                        id: 'studio-1',
                        name: 'Estudio Fotográfico Luna',
                        leads: 15,
                        revenue: 45000,
                        status: 'active'
                    },
                    {
                        id: 'studio-2',
                        name: 'Fotografía Profesional',
                        leads: 12,
                        revenue: 38000,
                        status: 'active'
                    },
                    {
                        id: 'studio-3',
                        name: 'Retratos & Más',
                        leads: 8,
                        revenue: 25000,
                        status: 'active'
                    }
                ]
            };

            setData(mockData);
            setLoading(false);
        };

        loadDashboardData();
    }, []);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'Nuevo': return 'bg-blue-100 text-blue-800';
            case 'Calificado': return 'bg-green-100 text-green-800';
            case 'Propuesta': return 'bg-yellow-100 text-yellow-800';
            case 'Negociación': return 'bg-orange-100 text-orange-800';
            case 'Convertido': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'call': return Phone;
            case 'meeting': return Calendar;
            case 'follow-up': return MessageSquare;
            case 'demo': return BarChart3;
            default: return Activity;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard Agente</h1>
                        <p className="text-muted-foreground">Resumen de tu actividad y leads</p>
                    </div>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-muted-foreground">Cargando dashboard...</div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard Agente</h1>
                        <p className="text-muted-foreground">Resumen de tu actividad y leads</p>
                    </div>
                </div>
                <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Error al cargar los datos del dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard Agente</h1>
                    <p className="text-muted-foreground">Resumen de tu actividad y leads</p>
                </div>
                <div className="flex gap-2">
                    <ZenButton variant="outline" size="sm" icon={Calendar} iconPosition="left">
                        Ver Calendario
                    </ZenButton>
                    <ZenButton size="sm" icon={Plus} iconPosition="left">
                        Nuevo Lead
                    </ZenButton>
                </div>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.totalLeads}</div>
                        <p className="text-xs text-muted-foreground">
                            +12% desde el mes pasado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Leads Activos</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.activeLeads}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.stats.pendingLeads} pendientes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversiones</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.convertedLeads}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.stats.conversionRate}% tasa de conversión
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Mensual</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.stats.monthlyRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            +8% desde el mes pasado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Contenido principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leads Recientes */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Leads Recientes
                        </CardTitle>
                        <CardDescription>
                            Últimos leads asignados y actualizaciones
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.recentLeads.map((lead) => (
                                <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-zinc-800">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-medium text-blue-600">
                                                {lead.name.split(' ').map(n => n[0]).join('')}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="font-medium">{lead.name}</div>
                                            <div className="text-sm text-muted-foreground">{lead.studio}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className={getStageColor(lead.stage)}>
                                                    {lead.stage}
                                                </Badge>
                                                <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                                                    {lead.priority === 'high' ? 'Alta' : lead.priority === 'medium' ? 'Media' : 'Baja'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-600">
                                            ${lead.value.toLocaleString()}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {lead.lastActivity}
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            <ZenButton variant="outline" size="sm" icon={Phone} />
                                            <ZenButton variant="outline" size="sm" icon={Mail} />
                                            <ZenButton variant="outline" size="sm" icon={MessageSquare} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <Link href="/agente/leads">
                                <ZenButton variant="outline" fullWidth>
                                    Ver Todos los Leads
                                </ZenButton>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Actividades Próximas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Actividades Próximas
                        </CardTitle>
                        <CardDescription>
                            Próximas tareas y reuniones
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.upcomingActivities.map((activity) => {
                                const IconComponent = getActivityIcon(activity.type);
                                const scheduledDate = new Date(activity.scheduledAt);
                                const isToday = scheduledDate.toDateString() === new Date().toDateString();

                                return (
                                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <IconComponent className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{activity.title}</div>
                                            <div className="text-xs text-muted-foreground">{activity.leadName}</div>
                                            <div className="text-xs text-muted-foreground">{activity.studio}</div>
                                            <div className={`text-xs mt-1 ${isToday ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                                                {isToday ? 'Hoy' : scheduledDate.toLocaleDateString()} a las {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {activity.status === 'pending' ? 'Pendiente' : 'Completada'}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <Link href="/agente/actividades">
                                <ZenButton variant="outline" fullWidth>
                                    Ver Todas las Actividades
                                </ZenButton>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Studios */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5" />
                        Top Studios
                    </CardTitle>
                    <CardDescription>
                        Estudios con mejor performance
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {data.topStudios.map((studio, index) => (
                            <div key={studio.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium">{studio.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {studio.leads} leads
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-600">
                                        ${studio.revenue.toLocaleString()}
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={studio.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                    >
                                        {studio.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <Link href="/agente/studios">
                            <ZenButton variant="outline" fullWidth>
                                Ver Todos los Studios
                            </ZenButton>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
