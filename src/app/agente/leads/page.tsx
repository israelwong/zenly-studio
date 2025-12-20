'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import {
    Plus,
    Search,
    Users,
    Phone,
    Mail,
    MessageSquare,
    Calendar,
    DollarSign,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    Target,
    CheckCircle
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/shadcn/dropdown-menu';

interface Lead {
    id: string;
    name: string;
    email: string;
    phone: string;
    studio: string;
    stage: string;
    value: number;
    priority: 'high' | 'medium' | 'low';
    lastActivity: string;
    assignedAgent: string;
    source: string;
    notes: string;
    nextFollowUp?: string;
    createdAt: string;
}



export default function LeadsPage() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStage, setFilterStage] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeads = useCallback(async () => {
        const supabase = createClient();

        try {
            setError(null); // Limpiar errores previos
            console.log('🔍 Consultando todos los leads...');

            // Verificar estado de autenticación
            const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
            console.log('🔍 Usuario autenticado:', currentUser?.id);
            console.log('🔍 Error de autenticación:', authError);

            if (authError || !currentUser) {
                console.error('❌ Usuario no autenticado');
                setError('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
                setLoading(false);
                return;
            }

            console.log('✅ Acceso confirmado. Obteniendo datos...');

            // Consulta básica primero - obtener todos los leads
            const { data, error } = await supabase
                .from('platform_leads')
                .select(`
                    id,
                    nombre,
                    email,
                    telefono,
                    nombreEstudio,
                    fechaUltimoContacto,
                    planInteres,
                    presupuestoMensual,
                    puntaje,
                    prioridad,
                    createdAt,
                    etapaId,
                    canalAdquisicionId,
                    agentId
                `)
                .order('createdAt', { ascending: false });

            if (error) {
                console.error('❌ Error en consulta completa:', error);
                console.error('❌ Error details:', JSON.stringify(error, null, 2));
                setError('Error al cargar los leads completos. Usando datos básicos.');
                setLeads([]);
            } else {
                // Mapear datos básicos
                const mappedLeads: Lead[] = (data || []).map(lead => ({
                    id: lead.id,
                    name: lead.nombre,
                    email: lead.email,
                    phone: lead.telefono,
                    studio: lead.nombreEstudio || 'Sin estudio',
                    stage: lead.etapaId || 'Nuevo',
                    value: lead.presupuestoMensual ? Number(lead.presupuestoMensual) : 0,
                    priority: lead.prioridad === 'alta' ? 'high' : lead.prioridad === 'media' ? 'medium' : 'low',
                    lastActivity: lead.fechaUltimoContacto ? new Date(lead.fechaUltimoContacto).toLocaleDateString() : 'Sin actividad',
                    assignedAgent: lead.agentId ? 'Agente asignado' : 'Sin asignar',
                    source: lead.canalAdquisicionId ? 'Canal asignado' : 'Sin canal',
                    notes: lead.agentId ? `Lead asignado a agente` : 'Lead disponible para asignar',
                    createdAt: new Date(lead.createdAt).toLocaleDateString()
                }));

                console.log('✅ Leads obtenidos exitosamente:', mappedLeads.length);
                setLeads(mappedLeads);
            }
        } catch (error) {
            console.error('❌ Error inesperado:', error);
            setError('Error inesperado al cargar los leads');
            setLeads([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const checkAuthAndFetchData = useCallback(async () => {
        const supabase = createClient();

        // Verificar si el usuario está autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.log('Usuario no autenticado, redirigiendo a login');
            router.push('/login');
            return;
        }

        // Usuario autenticado y con rol de agente

        // Obtener el rol del usuario desde user_metadata
        const userRole = user.user_metadata?.role;

        if (!userRole) {
            console.error('No se encontró rol en metadata');
            router.push('/login');
            return;
        }

        // Verificar que el usuario tenga rol de agente
        if (userRole !== 'agente') {
            console.error('Usuario no tiene rol de agente:', userRole);
            router.push('/login');
            return;
        }

        // Usuario autenticado y con rol de agente

        // Ahora obtener todos los leads
        fetchLeads();
    }, [router, fetchLeads]);

    useEffect(() => {
        checkAuthAndFetchData();
    }, [checkAuthAndFetchData]);

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

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'high': return 'Alta';
            case 'medium': return 'Media';
            case 'low': return 'Baja';
            default: return 'Sin prioridad';
        }
    };

    // Filtrar leads
    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.studio.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStage = filterStage === 'all' || lead.stage === filterStage;
        const matchesPriority = filterPriority === 'all' || lead.priority === filterPriority;

        return matchesSearch && matchesStage && matchesPriority;
    });

    // Calcular estadísticas
    const totalLeads = leads.length;
    const activeLeads = leads.filter(l => l.stage !== 'Convertido').length;
    const convertedLeads = leads.filter(l => l.stage === 'Convertido').length;
    const totalValue = leads.reduce((sum, lead) => sum + lead.value, 0);
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const stages = Array.from(new Set(leads.map(lead => lead.stage)));

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Gestión de Leads</h1>
                        <p className="text-muted-foreground">Administra y sigue el progreso de tus leads</p>
                    </div>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div className="text-muted-foreground">Cargando leads...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Gestión de Leads</h1>
                        <p className="text-muted-foreground">Administra y sigue el progreso de tus leads</p>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 text-xl">⚠️</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-red-600">Error al cargar leads</h3>
                                <p className="text-muted-foreground mt-2">{error}</p>
                            </div>
                            <ZenButton
                                onClick={() => {
                                    setError(null);
                                    setLoading(true);
                                    checkAuthAndFetchData();
                                }}
                                variant="outline"
                            >
                                Reintentar
                            </ZenButton>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Gestión de Leads</h1>
                    <p className="text-muted-foreground">Administra y sigue el progreso de tus leads</p>
                </div>
                <ZenButton icon={Plus} iconPosition="left">
                    Nuevo Lead
                </ZenButton>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalLeads}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeLeads} activos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Leads Activos</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeLeads}</div>
                        <p className="text-xs text-muted-foreground">
                            En proceso
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversiones</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{convertedLeads}</div>
                        <p className="text-xs text-muted-foreground">
                            {conversionRate.toFixed(1)}% tasa de conversión
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Pipeline total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar leads por nombre, estudio o email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={filterStage} onValueChange={setFilterStage}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Filtrar por etapa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las etapas</SelectItem>
                                {stages.map(stage => (
                                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Filtrar por prioridad" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las prioridades</SelectItem>
                                <SelectItem value="high">Alta prioridad</SelectItem>
                                <SelectItem value="medium">Media prioridad</SelectItem>
                                <SelectItem value="low">Baja prioridad</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de leads */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Lista de Leads ({filteredLeads.length})
                    </CardTitle>
                    <CardDescription>
                        Gestiona todos tus leads asignados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredLeads.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No se encontraron leads</p>
                                <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                            </div>
                        ) : (
                            filteredLeads.map((lead) => (
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
                                                    {getPriorityLabel(lead.priority)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-bold text-green-600">
                                                ${lead.value.toLocaleString()}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {lead.lastActivity}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {lead.source}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <ZenButton variant="outline" size="sm" icon={Phone} />
                                            <ZenButton variant="outline" size="sm" icon={Mail} />
                                            <ZenButton variant="outline" size="sm" icon={MessageSquare} />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <ZenButton variant="ghost" size="sm" className="h-8 w-8 p-0" icon={MoreVertical} />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Ver detalles
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Calendar className="h-4 w-4 mr-2" />
                                                    Programar seguimiento
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}