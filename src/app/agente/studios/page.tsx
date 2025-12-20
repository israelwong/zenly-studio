'use client'

import { useState, useEffect } from 'react'

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Button } from '@/components/ui/shadcn/button'
import { Badge } from '@/components/ui/shadcn/badge'
import { Input } from '@/components/ui/shadcn/input'
import {
    Building2,
    Search,
    Filter,
    Plus,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    Users,
    DollarSign,
    Calendar,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react'

interface Studio {
    id: string
    name: string
    email: string
    plan: 'basic' | 'business' | 'agency'
    status: 'active' | 'inactive' | 'suspended'
    projects: number
    revenue: number
    createdAt: Date
    lastActivity: Date
}

export default function StudiosPage() {
    const [studios, setStudios] = useState<Studio[]>([])
    const [filteredStudios, setFilteredStudios] = useState<Studio[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [planFilter, setPlanFilter] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStudios()
    }, [])

    useEffect(() => {
        filterStudios()
    }, [studios, searchTerm, statusFilter, planFilter])

    const fetchStudios = async () => {
        // Simular carga de datos
        setTimeout(() => {
            const mockStudios: Studio[] = [
                {
                    id: '1',
                    name: 'Fotografía María',
                    email: 'maria@fotografia.com',
                    plan: 'business',
                    status: 'active',
                    projects: 12,
                    revenue: 8500,
                    createdAt: new Date('2024-01-15'),
                    lastActivity: new Date(Date.now() - 1000 * 60 * 30)
                },
                {
                    id: '2',
                    name: 'Eventos Carlos',
                    email: 'carlos@eventos.com',
                    plan: 'basic',
                    status: 'active',
                    projects: 5,
                    revenue: 3200,
                    createdAt: new Date('2024-02-20'),
                    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2)
                },
                {
                    id: '3',
                    name: 'Diseño Ana',
                    email: 'ana@diseno.com',
                    plan: 'agency',
                    status: 'inactive',
                    projects: 0,
                    revenue: 0,
                    createdAt: new Date('2024-03-10'),
                    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
                },
                {
                    id: '4',
                    name: 'Video Studio Pro',
                    email: 'info@videostudio.com',
                    plan: 'business',
                    status: 'active',
                    projects: 8,
                    revenue: 6200,
                    createdAt: new Date('2024-01-05'),
                    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 4)
                },
                {
                    id: '5',
                    name: 'Creative Minds',
                    email: 'hello@creativeminds.com',
                    plan: 'agency',
                    status: 'suspended',
                    projects: 3,
                    revenue: 1500,
                    createdAt: new Date('2024-02-28'),
                    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
                }
            ]
            setStudios(mockStudios)
            setLoading(false)
        }, 1000)
    }

    const filterStudios = () => {
        let filtered = studios

        if (searchTerm) {
            filtered = filtered.filter(studio =>
                studio.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                studio.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (statusFilter) {
            filtered = filtered.filter(studio => studio.status === statusFilter)
        }

        if (planFilter) {
            filtered = filtered.filter(studio => studio.plan === planFilter)
        }

        setFilteredStudios(filtered)
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'inactive': return <Clock className="h-4 w-4 text-yellow-500" />
            case 'suspended': return <XCircle className="h-4 w-4 text-red-500" />
            default: return <Clock className="h-4 w-4 text-gray-500" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-green-500">Activo</Badge>
            case 'inactive': return <Badge className="bg-yellow-500">Inactivo</Badge>
            case 'suspended': return <Badge className="bg-red-500">Suspendido</Badge>
            default: return <Badge variant="secondary">Desconocido</Badge>
        }
    }

    const getPlanBadge = (plan: string) => {
        switch (plan) {
            case 'basic': return <Badge variant="outline">Básico</Badge>
            case 'business': return <Badge className="bg-blue-500">Negocio</Badge>
            case 'agency': return <Badge className="bg-purple-500">Agencia</Badge>
            default: return <Badge variant="secondary">Desconocido</Badge>
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Gestión de Estudios</h1>
                    <p className="text-muted-foreground mt-1">
                        Administra todos los estudios registrados en la plataforma
                    </p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Estudio
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Estudios</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{studios.length}</div>
                        <p className="text-xs text-muted-foreground">
                            +2 desde el mes pasado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estudios Activos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {studios.filter(s => s.status === 'active').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {((studios.filter(s => s.status === 'active').length / studios.length) * 100).toFixed(1)}% del total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(studios.reduce((sum, s) => sum + s.revenue, 0))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Este mes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proyectos Activos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {studios.reduce((sum, s) => sum + s.projects, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            En todos los estudios
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar estudios..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Todos los estados</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                            <option value="suspended">Suspendidos</option>
                        </select>
                        <select
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Todos los planes</option>
                            <option value="basic">Básico</option>
                            <option value="business">Negocio</option>
                            <option value="agency">Agencia</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Studios List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudios.map((studio) => (
                    <Card key={studio.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg">{studio.name}</CardTitle>
                                    <CardDescription>{studio.email}</CardDescription>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {getStatusIcon(studio.status)}
                                    {getStatusBadge(studio.status)}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Plan:</span>
                                    {getPlanBadge(studio.plan)}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Proyectos:</span>
                                    <span className="font-medium">{studio.projects}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Revenue:</span>
                                    <span className="font-medium">{formatCurrency(studio.revenue)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Registrado:</span>
                                    <span className="text-sm">{formatDate(studio.createdAt)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Última actividad:</span>
                                    <span className="text-sm">{formatDate(studio.lastActivity)}</span>
                                </div>
                            </div>
                            <div className="flex space-x-2 mt-4">
                                <Button variant="outline" size="sm" className="flex-1">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                                <Button variant="outline" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredStudios.length === 0 && (
                <Card>
                    <CardContent className="text-center py-8">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No se encontraron estudios</h3>
                        <p className="text-muted-foreground">
                            No hay estudios que coincidan con los filtros seleccionados.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}