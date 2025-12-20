"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import {
    Percent,
    Users,
    TrendingUp,
    Settings,
    Plus,
    BarChart3,
    Gift
} from "lucide-react";
import Link from "next/link";

export default function DescuentosDashboard() {
    // Datos de ejemplo - en producción vendrán de la API
    const stats = {
        codigosActivos: 2,
        codigosGenerados: 15,
        conversionesMes: 8,
        descuentoPromedio: 12.5
    };

    const recentCodes = [
        {
            id: "1",
            codigo: "BLACKFRIDAY2024",
            nombre: "Black Friday 2024",
            descuento: 15,
            tipo: "porcentaje",
            uso: 45,
            maximo: 1000,
            estado: "activo"
        },
        {
            id: "2",
            codigo: "ANUAL2024",
            nombre: "Descuento Plan Anual",
            descuento: 10,
            tipo: "porcentaje",
            uso: 12,
            maximo: null,
            estado: "activo"
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header con acciones */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">
                        Resumen de códigos de descuento y métricas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/admin/descuentos/general/nuevo">
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Código
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Códigos Activos</CardTitle>
                        <Gift className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.codigosActivos}</div>
                        <p className="text-xs text-muted-foreground">
                            +2 desde el mes pasado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Códigos Generados</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.codigosGenerados}</div>
                        <p className="text-xs text-muted-foreground">
                            Por agentes este mes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversiones</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.conversionesMes}</div>
                        <p className="text-xs text-muted-foreground">
                            Este mes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Descuento Promedio</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.descuentoPromedio}%</div>
                        <p className="text-xs text-muted-foreground">
                            En códigos activos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <Link href="/admin/descuentos/general">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Gift className="h-5 w-5" />
                                Códigos Generales
                            </CardTitle>
                            <CardDescription>
                                Gestiona códigos promocionales generales
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">2</div>
                            <p className="text-sm text-muted-foreground">Códigos activos</p>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <Link href="/admin/descuentos/agentes">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Códigos de Agentes
                            </CardTitle>
                            <CardDescription>
                                Monitorea códigos generados por agentes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">15</div>
                            <p className="text-sm text-muted-foreground">Códigos generados</p>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <Link href="/admin/descuentos/reportes">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                Reportes
                            </CardTitle>
                            <CardDescription>
                                Analiza métricas y rendimiento
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">8</div>
                            <p className="text-sm text-muted-foreground">Conversiones este mes</p>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <Link href="/admin/descuentos/configuracion">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Configuración
                            </CardTitle>
                            <CardDescription>
                                Configuración global del sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">✓</div>
                            <p className="text-sm text-muted-foreground">Sistema configurado</p>
                        </CardContent>
                    </Link>
                </Card>
            </div>

            {/* Recent Codes */}
            <Card>
                <CardHeader>
                    <CardTitle>Códigos Recientes</CardTitle>
                    <CardDescription>
                        Últimos códigos de descuento creados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentCodes.map((code) => (
                            <div key={code.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                            {code.codigo}
                                        </code>
                                        <Badge variant={code.estado === "activo" ? "default" : "secondary"}>
                                            {code.estado}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-medium">{code.nombre}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {code.descuento}% {code.tipo} • Uso: {code.uso}
                                        {code.maximo && `/${code.maximo}`}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm">
                                        Editar
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        Ver Reporte
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
