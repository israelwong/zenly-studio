"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { ZenInput } from "@/components/ui/zen";
import { Label } from "@/components/ui/shadcn/label";
import { Textarea } from "@/components/ui/shadcn/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/shadcn/select";
import { Switch } from "@/components/ui/shadcn/switch";
import { Badge } from "@/components/ui/shadcn/badge";
import {
    ArrowLeft,
    Save,
    Eye,
    Trash2,
    Copy,
    RefreshCw
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface DiscountCodeForm {
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

export default function EditarCódigoPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [formData, setFormData] = useState<DiscountCodeForm>({
        id: "",
        codigo: "",
        nombre: "",
        descripcion: "",
        tipo_descuento: "porcentaje",
        valor_descuento: 0,
        tipo_aplicacion: "ambos",
        fecha_inicio: undefined,
        fecha_fin: undefined,
        uso_maximo: null,
        uso_actual: 0,
        activo: true,
        stripe_coupon_id: null,
        createdAt: "",
    });

    // Simular carga de datos - en producción vendrá de la API
    useEffect(() => {
        const loadData = async () => {
            setLoadingData(true);

            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Datos de ejemplo
            const mockData: DiscountCodeForm = {
                id: params.id as string,
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
                createdAt: "2024-09-18",
            };

            setFormData(mockData);
            setLoadingData(false);
        };

        loadData();
    }, [params.id]);

    const handleInputChange = (field: keyof DiscountCodeForm, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        if (!formData.codigo.trim()) {
            toast.error("El código es requerido");
            return false;
        }
        if (!formData.nombre.trim()) {
            toast.error("El nombre es requerido");
            return false;
        }
        if (formData.valor_descuento <= 0) {
            toast.error("El valor del descuento debe ser mayor a 0");
            return false;
        }
        if (formData.tipo_descuento === "porcentaje" && formData.valor_descuento > 100) {
            toast.error("El porcentaje no puede ser mayor a 100%");
            return false;
        }
        if (!formData.fecha_inicio) {
            toast.error("La fecha de inicio es requerida");
            return false;
        }
        if (!formData.fecha_fin) {
            toast.error("La fecha de fin es requerida");
            return false;
        }
        if (new Date(formData.fecha_inicio) >= new Date(formData.fecha_fin)) {
            toast.error("La fecha de fin debe ser posterior a la fecha de inicio");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            // TODO: Implementar llamada a la API
            console.log("Updating discount code:", formData);

            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.success("Código de descuento actualizado exitosamente");
            router.push("/admin/descuentos/general");
        } catch (error) {
            toast.error("Error al actualizar el código de descuento");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar este código de descuento?")) {
            return;
        }

        setLoading(true);

        try {
            // TODO: Implementar llamada a la API
            console.log("Deleting discount code:", formData.id);

            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success("Código de descuento eliminado exitosamente");
            router.push("/admin/descuentos/general");
        } catch (error) {
            toast.error("Error al eliminar el código de descuento");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncStripe = async () => {
        setLoading(true);

        try {
            // TODO: Implementar sincronización con Stripe
            console.log("Syncing with Stripe:", formData.id);

            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.success("Sincronizado con Stripe exitosamente");
        } catch (error) {
            toast.error("Error al sincronizar con Stripe");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(formData.codigo);
        toast.success("Código copiado al portapapeles");
    };

    if (loadingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Cargando código de descuento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/descuentos/general">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Volver
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Editar Código de Descuento</h1>
                        <p className="text-muted-foreground">
                            Modifica la configuración del código
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCopyCode}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Código
                    </Button>
                    <Button variant="outline" onClick={handleSyncStripe}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sincronizar Stripe
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                    </Button>
                </div>
            </div>

            {/* Status Info */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <code className="bg-muted px-3 py-1 rounded text-lg font-mono">
                                {formData.codigo}
                            </code>
                            <Badge variant={formData.activo ? "default" : "secondary"}>
                                {formData.activo ? "Activo" : "Inactivo"}
                            </Badge>
                            {formData.stripe_coupon_id && (
                                <Badge variant="outline" className="text-green-600">
                                    Sincronizado con Stripe
                                </Badge>
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Uso: {formData.uso_actual}
                            {formData.uso_maximo && ` / ${formData.uso_maximo}`}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Información Básica */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Básica</CardTitle>
                            <CardDescription>
                                Configura los datos principales del código
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ZenInput
                                id="codigo"
                                label="Código"
                                required
                                value={formData.codigo}
                                onChange={(e) => handleInputChange("codigo", e.target.value.toUpperCase())}
                                placeholder="BLACKFRIDAY2024"
                                className="font-mono"
                            />

                            <ZenInput
                                id="nombre"
                                label="Nombre"
                                required
                                value={formData.nombre}
                                onChange={(e) => handleInputChange("nombre", e.target.value)}
                                placeholder="Black Friday 2024"
                            />

                            <div className="space-y-2">
                                <Label htmlFor="descripcion">Descripción</Label>
                                <Textarea
                                    id="descripcion"
                                    value={formData.descripcion}
                                    onChange={(e) => handleInputChange("descripcion", e.target.value)}
                                    placeholder="Descuento especial Black Friday"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configuración del Descuento */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración del Descuento</CardTitle>
                            <CardDescription>
                                Define el tipo y valor del descuento
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tipo de Descuento *</Label>
                                <Select
                                    value={formData.tipo_descuento}
                                    onValueChange={(value: "porcentaje" | "monto_fijo") =>
                                        handleInputChange("tipo_descuento", value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                                        <SelectItem value="monto_fijo">Monto Fijo ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="relative">
                                <ZenInput
                                    id="valor_descuento"
                                    label="Valor del Descuento"
                                    required
                                    type="number"
                                    value={formData.valor_descuento}
                                    onChange={(e) => handleInputChange("valor_descuento", parseFloat(e.target.value) || 0)}
                                    placeholder="15"
                                    min="0"
                                    max={formData.tipo_descuento === "porcentaje" ? 100 : undefined}
                                />
                                <span className="absolute right-3 top-[38px] text-muted-foreground">
                                    {formData.tipo_descuento === "porcentaje" ? "%" : "$"}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <Label>Aplicación *</Label>
                                <Select
                                    value={formData.tipo_aplicacion}
                                    onValueChange={(value: "plan_mensual" | "plan_anual" | "ambos") =>
                                        handleInputChange("tipo_aplicacion", value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ambos">Todos los planes</SelectItem>
                                        <SelectItem value="plan_mensual">Solo Plan Mensual</SelectItem>
                                        <SelectItem value="plan_anual">Solo Plan Anual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <ZenInput
                                id="uso_maximo"
                                label="Uso Máximo"
                                type="number"
                                value={formData.uso_maximo || ""}
                                onChange={(e) => handleInputChange("uso_maximo", e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="1000 (dejar vacío para ilimitado)"
                                min="1"
                                hint="Deja vacío para uso ilimitado"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Fechas y Configuración */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Período de Validez</CardTitle>
                            <CardDescription>
                                Define cuándo estará activo el código
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ZenInput
                                id="fecha_inicio"
                                label="Fecha de Inicio"
                                required
                                type="date"
                                value={formData.fecha_inicio}
                                onChange={(e) => handleInputChange("fecha_inicio", e.target.value)}
                            />

                            <ZenInput
                                id="fecha_fin"
                                label="Fecha de Fin"
                                required
                                type="date"
                                value={formData.fecha_fin}
                                onChange={(e) => handleInputChange("fecha_fin", e.target.value)}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración Adicional</CardTitle>
                            <CardDescription>
                                Opciones adicionales del código
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Estado</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Activar/desactivar el código
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.activo}
                                    onCheckedChange={(checked) => handleInputChange("activo", checked)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Información del Sistema</Label>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>ID: {formData.id}</p>
                                    <p>Creado: {new Date(formData.createdAt).toLocaleDateString()}</p>
                                    {formData.stripe_coupon_id && (
                                        <p>Stripe ID: {formData.stripe_coupon_id}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" asChild>
                        <Link href="/admin/descuentos/general">
                            Cancelar
                        </Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
