import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Users,
    UserCheck,
    Building2,
    TrendingUp,
    DollarSign,
    Activity
} from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="border-b border-zinc-800 pb-6">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-zinc-400 mt-2">
                    Resumen general de la plataforma ProSocial
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border border-border bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Agentes</CardTitle>
                        <Users className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">12</div>
                        <p className="text-sm text-green-500 mt-1">
                            +2 desde el mes pasado
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-zinc-400">Leads Activos</CardTitle>
                        <UserCheck className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">245</div>
                        <p className="text-sm text-green-500 mt-1">
                            +12% desde la semana pasada
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-zinc-400">Estudios Activos</CardTitle>
                        <Building2 className="h-5 w-5 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">89</div>
                        <p className="text-sm text-green-500 mt-1">
                            +5 nuevos este mes
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-medium text-zinc-400">Ingresos Mensuales</CardTitle>
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">$45,231</div>
                        <p className="text-sm text-green-500 mt-1">
                            +20.1% desde el mes pasado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-zinc-800">
                        <CardTitle className="text-lg font-semibold text-white">Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-white">
                                        Nuevo agente registrado
                                    </p>
                                    <p className="text-sm text-zinc-400">
                                        María González se unió al equipo
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">Hace 2 horas</Badge>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-white">
                                        Lead convertido
                                    </p>
                                    <p className="text-sm text-zinc-400">
                                        Estudio &quot;Fotografía Ana&quot; se suscribió al plan Premium
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">Hace 4 horas</Badge>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-white">
                                        Pago pendiente
                                    </p>
                                    <p className="text-sm text-zinc-400">
                                        Estudio &quot;Eventos Carlos&quot; tiene un pago vencido
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">Hace 6 horas</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 border border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-zinc-800">
                        <CardTitle className="text-lg font-semibold text-white">Rendimiento de Agentes</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-white">Carlos Rodríguez</span>
                                    </div>
                                    <div className="text-sm font-semibold text-white">85%</div>
                                </div>
                                <div className="w-full bg-zinc-700 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-white">Ana Martínez</span>
                                    </div>
                                    <div className="text-sm font-semibold text-white">92%</div>
                                </div>
                                <div className="w-full bg-zinc-700 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-white">María González</span>
                                    </div>
                                    <div className="text-sm font-semibold text-white">67%</div>
                                </div>
                                <div className="w-full bg-zinc-700 rounded-full h-2">
                                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}