'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Button } from '@/components/ui/shadcn/button'
import { Badge } from '@/components/ui/shadcn/badge'
import { Input } from '@/components/ui/shadcn/input'
import {
    Users,
    TrendingUp,
    Phone,
    Mail,
    Calendar,
    Search,
    Plus,
    LogOut,
    User
} from 'lucide-react'

interface Lead {
    id: string
    nombre: string
    email: string
    telefono: string
    etapa: string
    puntaje: number
    prioridad: string
    planInteres: string
    presupuestoMensual: number
    fechaUltimoContacto: string | null
    notasConversacion: string | null
}

interface UserProfile {
    id: string
    email: string
    fullName: string | null
    role: string
    studioId: string | null
    isActive: boolean
}


export default function AgenteDashboard() {
    const router = useRouter()
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterEtapa, setFilterEtapa] = useState('all')
    const [user, setUser] = useState<{ id: string; email: string } | null>(null)
    const [agentProfile, setAgentProfile] = useState<UserProfile | null>(null)

    const fetchLeads = useCallback(async (agentId?: string) => {
        const supabase = createClient()

        if (!agentId && !user?.id) {
            console.log('No hay agentId para obtener leads')
            setLoading(false)
            return
        }

        const targetAgentId = agentId || user?.id

        try {
            // Consultar leads reales desde la base de datos
            const { data, error } = await supabase
                .from('platform_leads')
                .select(`
                    id,
                    nombre,
                    email,
                    telefono,
                    nombreEstudio,
                    slugEstudio,
                    fechaUltimoContacto,
                    planInteres,
                    presupuestoMensual,
                    fechaProbableInicio,
                    puntaje,
                    prioridad,
                    fechaConversion,
                    createdAt,
                    updatedAt,
                    etapaId,
                    canalAdquisicionId,
                    campa_aId,
                    platform_agents!platform_leads_agentId_fkey (
                        id,
                        nombre,
                        email
                    ),
                    platform_canales_adquisicion (
                        id,
                        nombre,
                        categoria,
                        color
                    )
                `)
                .eq('agentId', targetAgentId)
                .order('createdAt', { ascending: false })

            if (error) {
                console.error('Error fetching leads:', error)
                setLeads([])
            } else {
                // Mapear datos reales al formato esperado
                const mappedLeads: Lead[] = (data || []).map(lead => ({
                    id: lead.id,
                    nombre: lead.nombre,
                    email: lead.email,
                    telefono: lead.telefono,
                    etapa: lead.etapaId || 'nuevo',
                    puntaje: lead.puntaje || 0,
                    prioridad: lead.prioridad || 'media',
                    planInteres: lead.planInteres || 'Sin especificar',
                    presupuestoMensual: lead.presupuestoMensual ? Number(lead.presupuestoMensual) : 0,
                    fechaUltimoContacto: lead.fechaUltimoContacto,
                    notasConversacion: `Lead asignado a agente`
                }))

                console.log('Leads reales obtenidos:', mappedLeads.length)
                setLeads(mappedLeads)
            }
        } catch (error) {
            console.error('Error inesperado:', error)
        } finally {
            setLoading(false)
        }
    }, [user])

    const checkAuthAndFetchData = useCallback(async () => {
        const supabase = createClient()

        // Verificar si el usuario está autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.log('Usuario no autenticado, redirigiendo a login')
            router.push('/login')
            return
        }

        setUser({ id: user.id, email: user.email || '' })

        // Obtener el rol del usuario desde user_metadata
        const userRole = user.user_metadata?.role

        if (!userRole) {
            console.error('No se encontró rol en metadata')
            router.push('/login')
            return
        }

        // Verificar que el usuario tenga rol de agente
        if (userRole !== 'agente') {
            console.error('Usuario no tiene rol de agente:', userRole)
            router.push('/login')
            return
        }

        // Crear un perfil simulado basado en user_metadata
        const simulatedProfile = {
            id: user.id,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || '',
            role: userRole,
            studioId: null,
            isActive: true
        }

        setAgentProfile(simulatedProfile)

        // Ahora obtener los leads asignados a este agente
        fetchLeads(user.id)
    }, [router, fetchLeads])

    useEffect(() => {
        checkAuthAndFetchData()
    }, [checkAuthAndFetchData])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filterEtapa === 'all' || lead.etapa === filterEtapa
        return matchesSearch && matchesFilter
    })

    const getEtapaColor = (etapa: string) => {
        switch (etapa) {
            case 'nuevo': return 'bg-blue-100 text-blue-800'
            case 'seguimiento': return 'bg-yellow-100 text-yellow-800'
            case 'promesa': return 'bg-green-100 text-green-800'
            case 'suscrito': return 'bg-green-100 text-green-800'
            case 'cancelado': return 'bg-red-100 text-red-800'
            case 'perdido': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getEtapaText = (etapa: string) => {
        switch (etapa) {
            case 'nuevo': return 'Nuevo'
            case 'seguimiento': return 'Seguimiento'
            case 'promesa': return 'Promesa'
            case 'suscrito': return 'Suscrito'
            case 'cancelado': return 'Cancelado'
            case 'perdido': return 'Perdido'
            default: return etapa
        }
    }

    const getPrioridadColor = (prioridad: string) => {
        switch (prioridad) {
            case 'alta': return 'bg-red-100 text-red-800'
            case 'media': return 'bg-yellow-100 text-yellow-800'
            case 'baja': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    // Calcular métricas
    const totalLeads = leads.length
    const leadsNuevos = leads.filter(l => l.etapa === 'nuevo').length
    const leadsSeguimiento = leads.filter(l => l.etapa === 'seguimiento').length
    const leadsPromesa = leads.filter(l => l.etapa === 'promesa').length
    const conversionRate = totalLeads > 0 ? Math.round((leads.filter(l => l.etapa === 'suscrito').length / totalLeads) * 100) : 0

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard Agente</h1>
                        <p className="text-gray-600 mt-1">
                            {agentProfile ? `Bienvenido, ${agentProfile.fullName || agentProfile.email}` : 'Gestión de leads y conversiones'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <User className="h-4 w-4 mr-2" />
                            Perfil
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Salir
                        </Button>
                    </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalLeads}</div>
                            <p className="text-xs text-muted-foreground">
                                {leadsNuevos} nuevos
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">En Seguimiento</CardTitle>
                            <Phone className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{leadsSeguimiento}</div>
                            <p className="text-xs text-muted-foreground">
                                {leadsPromesa} en promesa
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Conversión</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{conversionRate}%</div>
                            <p className="text-xs text-muted-foreground">
                                Tasa de conversión
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Meta Mensual</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">25</div>
                            <p className="text-xs text-muted-foreground">
                                Leads objetivo
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Lista de Leads */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Leads Asignados</h2>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Lead
                    </Button>
                </div>

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Buscar leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <select
                        value={filterEtapa}
                        onChange={(e) => setFilterEtapa(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todas las etapas</option>
                        <option value="nuevo">Nuevo</option>
                        <option value="seguimiento">Seguimiento</option>
                        <option value="promesa">Promesa</option>
                        <option value="suscrito">Suscrito</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="perdido">Perdido</option>
                    </select>
                </div>

                {/* Lista de leads */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredLeads.map((lead) => (
                        <Card key={lead.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg font-semibold line-clamp-1">
                                            {lead.nombre}
                                        </CardTitle>
                                        <CardDescription className="flex items-center mt-1">
                                            <Mail className="mr-1 h-3 w-3" />
                                            {lead.email}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Badge className={getEtapaColor(lead.etapa)}>
                                            {getEtapaText(lead.etapa)}
                                        </Badge>
                                        <Badge className={getPrioridadColor(lead.prioridad)}>
                                            {lead.prioridad}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Teléfono:</span>
                                        <span className="font-medium">{lead.telefono}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Plan:</span>
                                        <span className="font-medium">{lead.planInteres}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Presupuesto:</span>
                                        <span className="font-medium">${lead.presupuestoMensual}</span>
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Puntaje:</span>
                                        <span className="font-medium">{lead.puntaje}/10</span>
                                    </div>

                                    {lead.notasConversacion && (
                                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                            <strong>Notas:</strong> {lead.notasConversacion}
                                        </div>
                                    )}

                                    <div className="flex justify-between pt-2">
                                        <Button size="sm" variant="outline">
                                            <Phone className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Mail className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="outline">
                                            <Calendar className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredLeads.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay leads</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm || filterEtapa !== 'all'
                                ? 'No hay leads que coincidan con los filtros aplicados.'
                                : 'Comienza agregando nuevos leads para gestionar.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
