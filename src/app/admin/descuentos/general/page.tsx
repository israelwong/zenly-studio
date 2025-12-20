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
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Copy,
    Eye,
    ToggleLeft,
    ToggleRight
} from "lucide-react";
import Link from "next/link";

interface DiscountCode {
    id: string;
    codigo: string;
    nombre: string;
    descripcion: string;
    tipo_descuento: "porcentaje" | "monto_fijo";
    valor_descuento: number;
    tipo_aplicacion: "plan_mensual" | "plan_anual" | "ambos";
    fecha_inicio: string;
    fecha_fin: string;
    uso_maximo: number | null;
    uso_actual: number;
    activo: boolean;
    stripe_coupon_id: string | null;
    createdAt: string;
}

export default function CódigosGeneralesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"todos" | "activos" | "inactivos">("todos");

    // Datos de ejemplo - en producción vendrán de la API
    const discountCodes: DiscountCode[] = [
        {
            id: "1",
            codigo: "BLACKFRIDAY2024",
            nombre: "Black Friday 2024",
            descripcion: "Descuento especial Black Friday",
            tipo_descuento: "porcentaje",
            valor_descuento: 15,
            tipo_aplicacion: "ambos",
            fecha_inicio: "2024-11-24",
            fecha_fin: "2024-11-30",
            uso_maximo: 1000,
            uso_actual: 45,
            activo: true,
            stripe_coupon_id: "BLACKFRIDAY2024",
            createdAt: "2024-09-18"
        },
        {
            id: "2",
            codigo: "ANUAL2024",
            nombre: "Descuento Plan Anual Diciembre",
            descripcion: "Descuento adicional para planes anuales en diciembre",
            tipo_descuento: "porcentaje",
            valor_descuento: 10,
            tipo_aplicacion: "plan_anual",
            fecha_inicio: "2024-12-01",
            fecha_fin: "2024-12-31",
            uso_maximo: null,
            uso_actual: 12,
            activo: true,
            stripe_coupon_id: "ANUAL2024",
            createdAt: "2024-09-18"
        },
        {
            id: "3",
            codigo: "NAVIDAD2023",
            nombre: "Promoción Navidad 2023",
            descripcion: "Descuento navideño (expirado)",
            tipo_descuento: "porcentaje",
            valor_descuento: 20,
            tipo_aplicacion: "ambos",
            fecha_inicio: "2023-12-01",
            fecha_fin: "2023-12-25",
            uso_maximo: 500,
            uso_actual: 500,
            activo: false,
            stripe_coupon_id: "NAVIDAD2023",
            createdAt: "2023-11-15"
        }
    ];

    const filteredCodes = discountCodes.filter(code => {
        const matchesSearch = code.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            code.nombre.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === "todos" ||
            (filterStatus === "activos" && code.activo) ||
            (filterStatus === "inactivos" && !code.activo);

        return matchesSearch && matchesStatus;
    });

    const handleToggleStatus = (id: string) => {
        // TODO: Implementar toggle de estado
        console.log("Toggle status for:", id);
    };

    const handleDelete = (id: string) => {
        // TODO: Implementar eliminación
        console.log("Delete:", id);
    };

    const handleCopy = (codigo: string) => {
        navigator.clipboard.writeText(codigo);
        // TODO: Mostrar toast de confirmación
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Códigos Generales</h2>
                    <p className="text-muted-foreground">
                        Gestiona códigos de descuento promocionales generales
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/descuentos/general/nuevo">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Código
                    </Link>
                </Button>
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
                                placeholder="Buscar por código o nombre..."
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
                                variant={filterStatus === "activos" ? "default" : "outline"}
                                onClick={() => setFilterStatus("activos")}
                            >
                                Activos
                            </Button>
                            <Button
                                variant={filterStatus === "inactivos" ? "default" : "outline"}
                                onClick={() => setFilterStatus("inactivos")}
                            >
                                Inactivos
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Códigos de Descuento</CardTitle>
                    <CardDescription>
                        {filteredCodes.length} código(s) encontrado(s)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Descuento</TableHead>
                                <TableHead>Aplicación</TableHead>
                                <TableHead>Período</TableHead>
                                <TableHead>Uso</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Stripe</TableHead>
                                <TableHead className="w-[50px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCodes.map((code) => (
                                <TableRow key={code.id}>
                                    <TableCell>
                                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                            {code.codigo}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{code.nombre}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {code.descripcion}
                                            </div>
                                        </div>
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
                                            {code.tipo_aplicacion === "ambos" ? "Todos los planes" :
                                                code.tipo_aplicacion === "plan_mensual" ? "Plan Mensual" :
                                                    "Plan Anual"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{new Date(code.fecha_inicio).toLocaleDateString()}</div>
                                            <div className="text-muted-foreground">
                                                hasta {new Date(code.fecha_fin).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{code.uso_actual}</div>
                                            {code.uso_maximo && (
                                                <div className="text-muted-foreground">
                                                    / {code.uso_maximo}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={code.activo ? "default" : "secondary"}>
                                            {code.activo ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {code.stripe_coupon_id ? (
                                            <Badge variant="outline" className="text-green-600">
                                                Sincronizado
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-orange-600">
                                                Pendiente
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleCopy(code.codigo)}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copiar código
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/descuentos/general/${code.id}`}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Editar
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/admin/descuentos/reportes?codigo=${code.id}`}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Ver reporte
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleStatus(code.id)}>
                                                    {code.activo ? (
                                                        <>
                                                            <ToggleLeft className="h-4 w-4 mr-2" />
                                                            Desactivar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ToggleRight className="h-4 w-4 mr-2" />
                                                            Activar
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(code.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Eliminar
                                                </DropdownMenuItem>
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
