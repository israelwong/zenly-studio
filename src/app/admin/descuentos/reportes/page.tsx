"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/shadcn/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/shadcn/table";
import {
    TrendingUp,
    TrendingDown,
    Users,
    Percent,
    DollarSign,
    Download,
    Calendar,
    BarChart3,
    PieChart,
    Activity
} from "lucide-react";
import { toast } from "sonner";

interface ReportData {
    codigo: string;
    nombre: string;
    descuento: number;
    tipo: "porcentaje" | "monto_fijo";
    uso: number;
    maximo: number | null;
    conversiones: number;
    ingresos: number;
    roi: number;
    estado: "activo" | "inactivo";
}

interface AgentData {
    agente: string;
    codigosGenerados: number;
    conversiones: number;
    tasaConversion: number;
    ingresos: number;
}

export default function ReportesPage() {
    const [periodo, setPeriodo] = useState("30_dias");
    const [tipoReporte, setTipoReporte] = useState("general");

    // Datos de ejemplo - en producción vendrán de la API
    const reportData: ReportData[] = [
        {
            codigo: "BLACKFRIDAY2024",
            nombre: "Black Friday 2024",
            descuento: 15,
            tipo: "porcentaje",
            uso: 45,
            maximo: 1000,
            conversiones: 12,
            ingresos: 18000,
            roi: 240,
            estado: "activo"
        },
        {
            codigo: "ANUAL2024",
            nombre: "Descuento Plan Anual",
            descuento: 10,
            tipo: "porcentaje",
            uso: 12,
            maximo: null,
            conversiones: 8,
            ingresos: 12000,
            roi: 180,
            estado: "activo"
        },
        {
            codigo: "NAVIDAD2023",
            nombre: "Promoción Navidad 2023",
            descuento: 20,
            tipo: "porcentaje",
            uso: 500,
            maximo: 500,
            conversiones: 150,
            ingresos: 45000,
            roi: 320,
            estado: "inactivo"
        }
    ];

    const agentData: AgentData[] = [
        {
            agente: "María González",
            codigosGenerados: 8,
            conversiones: 5,
            tasaConversion: 62.5,
            ingresos: 7500
        },
        {
            agente: "Carlos Rodríguez",
            codigosGenerados: 6,
            conversiones: 3,
            tasaConversion: 50.0,
            ingresos: 4500
        },
        {
            agente: "Ana Martínez",
            codigosGenerados: 4,
            conversiones: 2,
            tasaConversion: 50.0,
            ingresos: 3000
        }
    ];

    const totalStats = {
        codigosActivos: reportData.filter(r => r.estado === "activo").length,
        totalUso: reportData.reduce((sum, r) => sum + r.uso, 0),
        totalConversiones: reportData.reduce((sum, r) => sum + r.conversiones, 0),
        totalIngresos: reportData.reduce((sum, r) => sum + r.ingresos, 0),
        roiPromedio: reportData.reduce((sum, r) => sum + r.roi, 0) / reportData.length
    };

    const handleExport = (format: "csv" | "pdf") => {
        toast.success(`Exportando reporte en formato ${format.toUpperCase()}...`);
        // TODO: Implementar exportación
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Reportes de Descuentos</h2>
                    <p className="text-muted-foreground">
                        Analiza el rendimiento de códigos de descuento y agentes
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport("csv")}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                    </Button>
                    <Button variant="outline" onClick={() => handleExport("pdf")}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Período</label>
                            <Select value={periodo} onValueChange={setPeriodo}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7_dias">Últimos 7 días</SelectItem>
                                    <SelectItem value="30_dias">Últimos 30 días</SelectItem>
                                    <SelectItem value="90_dias">Últimos 90 días</SelectItem>
                                    <SelectItem value="1_ano">Último año</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de Reporte</label>
                            <Select value={tipoReporte} onValueChange={setTipoReporte}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="agentes">Por Agentes</SelectItem>
                                    <SelectItem value="codigos">Por Códigos</SelectItem>
                                    <SelectItem value="conversion">Conversiones</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Códigos Activos</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStats.codigosActivos}</div>
                        <p className="text-xs text-muted-foreground">
                            {reportData.length - totalStats.codigosActivos} inactivos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Uso</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStats.totalUso}</div>
                        <p className="text-xs text-muted-foreground">
                            Códigos utilizados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversiones</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStats.totalConversiones}</div>
                        <p className="text-xs text-muted-foreground">
                            +12% desde el mes pasado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${totalStats.totalIngresos.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Generados por descuentos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ROI Promedio</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalStats.roiPromedio.toFixed(0)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Retorno de inversión
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Placeholder */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Uso por Código
                        </CardTitle>
                        <CardDescription>
                            Códigos más utilizados en el período seleccionado
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                            <div className="text-center">
                                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground">Gráfico de barras</p>
                                <p className="text-sm text-muted-foreground">
                                    Implementar con Chart.js o Recharts
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Conversiones por Tipo
                        </CardTitle>
                        <CardDescription>
                            Distribución de conversiones por tipo de descuento
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                            <div className="text-center">
                                <PieChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-muted-foreground">Gráfico de pastel</p>
                                <p className="text-sm text-muted-foreground">
                                    Implementar con Chart.js o Recharts
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Códigos Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Rendimiento por Código</CardTitle>
                    <CardDescription>
                        Métricas detalladas de cada código de descuento
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Descuento</TableHead>
                                <TableHead>Uso</TableHead>
                                <TableHead>Conversiones</TableHead>
                                <TableHead>Ingresos</TableHead>
                                <TableHead>ROI</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((code) => (
                                <TableRow key={code.codigo}>
                                    <TableCell>
                                        <div>
                                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                                {code.codigo}
                                            </code>
                                            <div className="text-sm text-muted-foreground">
                                                {code.nombre}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            {code.tipo === "porcentaje"
                                                ? `${code.descuento}%`
                                                : `$${code.descuento}`
                                            }
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {code.tipo}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{code.uso}</div>
                                        {code.maximo && (
                                            <div className="text-sm text-muted-foreground">
                                                / {code.maximo}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{code.conversiones}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {code.maximo ?
                                                `${((code.conversiones / code.uso) * 100).toFixed(1)}% tasa`
                                                : "N/A"
                                            }
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            ${code.ingresos.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {code.roi > 200 ? (
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                            )}
                                            <span className="font-medium">{code.roi}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={code.estado === "activo" ? "default" : "secondary"}>
                                            {code.estado}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Agentes Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Rendimiento por Agente</CardTitle>
                    <CardDescription>
                        Métricas de conversión de códigos generados por agentes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agente</TableHead>
                                <TableHead>Códigos Generados</TableHead>
                                <TableHead>Conversiones</TableHead>
                                <TableHead>Tasa de Conversión</TableHead>
                                <TableHead>Ingresos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agentData.map((agent, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <div className="font-medium">{agent.agente}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{agent.codigosGenerados}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{agent.conversiones}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {agent.tasaConversion > 50 ? (
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                            )}
                                            <span className="font-medium">{agent.tasaConversion}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            ${agent.ingresos.toLocaleString()}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
