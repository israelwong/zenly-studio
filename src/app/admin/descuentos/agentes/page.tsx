"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { ZenInput } from "@/components/ui/zen";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/shadcn/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";
import {
    Search,
    MoreHorizontal,
    Eye,
    Copy,
    User,
    TrendingUp,
    Calendar,
    Filter
} from "lucide-react";
import Link from "next/link";

interface AgentCode {
    id: string;
    codigo_completo: string;
    codigo_base: string;
    lead_nombre: string;
    lead_email: string;
    agente_nombre: string;
    agente_id: string;
    tipo_descuento: "porcentaje" | "monto_fijo";
    valor_descuento: number;
    duracion_descuento: "1_mes" | "3_meses" | "permanente";
    fecha_creacion: string;
    fecha_expiracion: string;
    usado: boolean;
    fecha_uso: string | null;
    subscription_id: string | null;
    activo: boolean;
}

export default function CódigosAgentesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"todos" | "usados" | "no_usados" | "expirados">("todos");
    const [filterAgent, setFilterAgent] = useState<string>("todos");

    // Datos de ejemplo - en producción vendrán de la API
    const agentCodes: AgentCode[] = [
        {
            id: "1",
            codigo_completo: "DEMO10_LEAD001",
            codigo_base: "DEMO10",
            lead_nombre: "Juan Pérez",
            lead_email: "juan@ejemplo.com",
            agente_nombre: "María González",
            agente_id: "agent_001",
            tipo_descuento: "porcentaje",
            valor_descuento: 10,
            duracion_descuento: "permanente",
            fecha_creacion: "2024-09-15",
            fecha_expiracion: "2025-09-15",
            usado: true,
            fecha_uso: "2024-09-16",
            subscription_id: "sub_123",
            activo: true
        },
        {
            id: "2",
            codigo_completo: "DEMO15_LEAD002",
            codigo_base: "DEMO15",
            lead_nombre: "Ana García",
            lead_email: "ana@ejemplo.com",
            agente_nombre: "Carlos Rodríguez",
            agente_id: "agent_002",
            tipo_descuento: "porcentaje",
            valor_descuento: 15,
            duracion_descuento: "3_meses",
            fecha_creacion: "2024-09-10",
            fecha_expiracion: "2024-12-10",
            usado: false,
            fecha_uso: null,
            subscription_id: null,
            activo: true
        },
        {
            id: "3",
            codigo_completo: "DEMO20_LEAD003",
            codigo_base: "DEMO20",
            lead_nombre: "Luis Martínez",
            lead_email: "luis@ejemplo.com",
            agente_nombre: "María González",
            agente_id: "agent_001",
            tipo_descuento: "porcentaje",
            valor_descuento: 20,
            duracion_descuento: "1_mes",
            fecha_creacion: "2024-08-20",
            fecha_expiracion: "2024-09-20",
            usado: false,
            fecha_uso: null,
            subscription_id: null,
            activo: false
        }
    ];

    const agents = [
        { id: "todos", nombre: "Todos los agentes" },
        { id: "agent_001", nombre: "María González" },
        { id: "agent_002", nombre: "Carlos Rodríguez" },
    ];

    const filteredCodes = agentCodes.filter(code => {
        const matchesSearch = code.codigo_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            code.lead_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            code.lead_email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === "todos" ||
            (filterStatus === "usados" && code.usado) ||
            (filterStatus === "no_usados" && !code.usado) ||
            (filterStatus === "expirados" && new Date(code.fecha_expiracion) < new Date());

        const matchesAgent = filterAgent === "todos" || code.agente_id === filterAgent;

        return matchesSearch && matchesStatus && matchesAgent;
    });

    const stats = {
        total: agentCodes.length,
        usados: agentCodes.filter(c => c.usado).length,
        noUsados: agentCodes.filter(c => !c.usado).length,
        expirados: agentCodes.filter(c => new Date(c.fecha_expiracion) < new Date()).length,
        tasaConversion: agentCodes.length > 0 ?
            (agentCodes.filter(c => c.usado).length / agentCodes.length) * 100 : 0
    };

    const handleCopy = (codigo: string) => {
        navigator.clipboard.writeText(codigo);
        // TODO: Mostrar toast de confirmación
    };

    const getStatusBadge = (code: AgentCode) => {
        if (!code.activo) {
            return <Badge variant="secondary">Inactivo</Badge>;
        }
        if (new Date(code.fecha_expiracion) < new Date()) {
            return <Badge variant="destructive">Expirado</Badge>;
        }
        if (code.usado) {
            return <Badge variant="default">Usado</Badge>;
        }
        return <Badge variant="outline">Disponible</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Códigos de Agentes</h2>
                    <p className="text-muted-foreground">
                        Monitorea códigos de descuento generados por agentes
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Códigos</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            Generados por agentes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usados</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.usados}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.tasaConversion.toFixed(1)}% tasa de conversión
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.noUsados}</div>
                        <p className="text-xs text-muted-foreground">
                            Sin usar
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expirados</CardTitle>
                        <Calendar className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.expirados}</div>
                        <p className="text-xs text-muted-foreground">
                            Vencidos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tasa Conversión</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {stats.tasaConversion.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Promedio general
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
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <ZenInput
                                placeholder="Buscar por código, lead o email..."
                                icon={Search}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={filterStatus === "todos" ? "default" : "outline"}
                                onClick={() => setFilterStatus("todos")}
                            >
                                Todos
                            </Button>
                            <Button
                                variant={filterStatus === "usados" ? "default" : "outline"}
                                onClick={() => setFilterStatus("usados")}
                            >
                                Usados
                            </Button>
                            <Button
                                variant={filterStatus === "no_usados" ? "default" : "outline"}
                                onClick={() => setFilterStatus("no_usados")}
                            >
                                Disponibles
                            </Button>
                            <Button
                                variant={filterStatus === "expirados" ? "default" : "outline"}
                                onClick={() => setFilterStatus("expirados")}
                            >
                                Expirados
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Códigos Generados por Agentes</CardTitle>
                    <CardDescription>
                        {filteredCodes.length} código(s) encontrado(s)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Lead</TableHead>
                                <TableHead>Agente</TableHead>
                                <TableHead>Descuento</TableHead>
                                <TableHead>Duración</TableHead>
                                <TableHead>Fechas</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-[50px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCodes.map((code) => (
                                <TableRow key={code.id}>
                                    <TableCell>
                                        <div>
                                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                                {code.codigo_completo}
                                            </code>
                                            <div className="text-sm text-muted-foreground">
                                                Base: {code.codigo_base}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{code.lead_nombre}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {code.lead_email}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{code.agente_nombre}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">
                                            {code.tipo_descuento === "porcentaje"
                                                ? `${code.valor_descuento}%`
                                                : `$${code.valor_descuento}`
                                            }
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {code.tipo_descuento}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {code.duracion_descuento === "permanente" ? "Permanente" :
                                                code.duracion_descuento === "3_meses" ? "3 meses" :
                                                    "1 mes"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>Creado: {new Date(code.fecha_creacion).toLocaleDateString()}</div>
                                            <div className="text-muted-foreground">
                                                Expira: {new Date(code.fecha_expiracion).toLocaleDateString()}
                                            </div>
                                            {code.fecha_uso && (
                                                <div className="text-green-600">
                                                    Usado: {new Date(code.fecha_uso).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(code)}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleCopy(code.codigo_completo)}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copiar código
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/descuentos/reportes?codigo=${code.id}`}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Ver detalles
                                                    </Link>
                                                </DropdownMenuItem>
                                                {code.subscription_id && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/suscripciones/${code.subscription_id}`}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Ver suscripción
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
