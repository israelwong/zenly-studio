import React from 'react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    ArrowLeft,
    Edit,
    User,
    Phone,
    Mail,
    Target,
    TrendingUp,
    Calendar,
    Users,
    DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface AgentDetail {
    id: string;
    nombre: string;
    email: string;
    telefono: string;
    activo: boolean;
    metaMensualLeads: number;
    comisionConversion: number;
    createdAt: Date;
    updatedAt: Date;
    prosocial_leads: {
        id: string;
        nombre: string;
        email: string;
        etapa: string;
        prioridad: string;
        createdAt: Date;
    }[];
    _count: {
        prosocial_leads: number;
    };
}

async function getAgent(id: string): Promise<AgentDetail | null> {
    try {
        const agent = await prisma.platform_agents.findUnique({
            where: { id },
            include: {
                platform_leads: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                        etapa: true,
                        prioridad: true,
                        createdAt: true
                    },
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: 10 // Últimos 10 leads
                },
                _count: {
                    select: {
                        platform_leads: true
                    }
                }
            }
        });

        return agent ? {
            ...agent,
            comisionConversion: Number(agent.comisionConversion)
        } : null;
    } catch (error) {
        console.error('Error fetching agent:', error);
        return null;
    }
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const agent = await getAgent(id);

    if (!agent) {
        notFound();
    }

    // Calcular estadísticas
    const leadsPorEtapa = agent.prosocial_leads.reduce((acc, lead) => {
        acc[lead.etapa] = (acc[lead.etapa] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const leadsPorPrioridad = agent.prosocial_leads.reduce((acc, lead) => {
        acc[lead.prioridad] = (acc[lead.prioridad] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const progresoMeta = Math.round((agent._count.prosocial_leads / agent.metaMensualLeads) * 100);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/admin/agents">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{agent.nombre}</h1>
                        <p className="text-muted-foreground">
                            Detalles del agente comercial
                        </p>
                    </div>
                </div>
                <Button asChild>
                    <Link href={`/admin/agents/${agent.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Link>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Leads Asignados</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{agent._count.prosocial_leads}</div>
                        <p className="text-xs text-muted-foreground">
                            Meta: {agent.metaMensualLeads}/mes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Progreso Meta</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{progresoMeta}%</div>
                        <p className="text-xs text-muted-foreground">
                            {agent._count.prosocial_leads} de {agent.metaMensualLeads} leads
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comisión</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(agent.comisionConversion * 100)}%</div>
                        <p className="text-xs text-muted-foreground">
                            Por conversión exitosa
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estado</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Badge variant={agent.activo ? "default" : "secondary"} className="text-lg">
                            {agent.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                            {agent.activo ? "Recibiendo leads" : "No disponible"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Información Personal */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Información Personal
                        </CardTitle>
                        <CardDescription>
                            Datos de contacto del agente
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Email</p>
                                <p className="text-sm text-muted-foreground">{agent.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Teléfono</p>
                                <p className="text-sm text-muted-foreground">{agent.telefono}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Miembro desde</p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(agent.createdAt).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Configuración Comercial */}
                <Card>
                    <CardHeader>
                        <CardTitle>Configuración Comercial</CardTitle>
                        <CardDescription>
                            Parámetros de rendimiento
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Meta Mensual</span>
                                <span className="text-sm">{agent.metaMensualLeads} leads</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(progresoMeta, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Comisión por Conversión</span>
                                <span className="text-sm">{Math.round(agent.comisionConversion * 100)}%</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Estado</span>
                                <Badge variant={agent.activo ? "default" : "secondary"}>
                                    {agent.activo ? "Activo" : "Inactivo"}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Leads Recientes */}
            <Card>
                <CardHeader>
                    <CardTitle>Leads Asignados</CardTitle>
                    <CardDescription>
                        Últimos leads asignados a este agente
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {agent.prosocial_leads.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-2 text-sm font-semibold">No hay leads asignados</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Este agente aún no tiene leads asignados.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {agent.prosocial_leads.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="space-y-1">
                                        <h3 className="font-semibold">{lead.nombre}</h3>
                                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{lead.etapa}</Badge>
                                        <Badge variant={lead.prioridad === 'alta' ? 'destructive' : lead.prioridad === 'media' ? 'default' : 'secondary'}>
                                            {lead.prioridad}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Estadísticas por Etapa */}
            {Object.keys(leadsPorEtapa).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Distribución por Etapa</CardTitle>
                        <CardDescription>
                            Leads agrupados por etapa del proceso
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(leadsPorEtapa).map(([etapa, count]) => (
                                <div key={etapa} className="flex items-center justify-between p-3 border rounded-lg">
                                    <span className="font-medium capitalize">{etapa}</span>
                                    <Badge variant="outline">{count}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
