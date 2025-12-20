"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Save, Eye } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface DiscountCodeForm {
    codigo: string;
    nombre: string;
    descripcion: string;
    tipo_descuento: "porcentaje" | "monto_fijo";
    valor_descuento: number;
    tipo_aplicacion: "plan_mensual" | "plan_anual" | "ambos";
    fecha_inicio: string;
    fecha_fin: string;
    uso_maximo: number | null;
    activo: boolean;
    crear_en_stripe: boolean;
}

export default function NuevoCódigoPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<DiscountCodeForm>({
        codigo: "",
        nombre: "",
        descripcion: "",
        tipo_descuento: "porcentaje",
        valor_descuento: 0,
        tipo_aplicacion: "ambos",
        fecha_inicio: "",
        fecha_fin: "",
        uso_maximo: null,
        activo: true,
        crear_en_stripe: true,
    });

    const handleInputChange = (field: keyof DiscountCodeForm, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const generateCode = () => {
        const prefixes = ["PROMO", "DESCUENTO", "ESPECIAL", "OFERTA"];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${prefix}${year}${random}`;

        setFormData(prev => ({
            ...prev,
            codigo: code
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
            console.log("Creating discount code:", formData);

            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.success("Código de descuento creado exitosamente");
            router.push("/admin/descuentos/general");
        } catch (error) {
            toast.error("Error al crear el código de descuento");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/descuentos/general">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nuevo Código de Descuento</h1>
                    <p className="text-muted-foreground">
                        Crea un nuevo código de descuento promocional
                    </p>
                </div>
            </div>

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
                            <div className="flex gap-2">
                                <ZenInput
                                    id="codigo"
                                    label="Código"
                                    required
                                    value={formData.codigo}
                                    onChange={(e) => handleInputChange("codigo", e.target.value.toUpperCase())}
                                    placeholder="BLACKFRIDAY2024"
                                    className="font-mono flex-1"
                                />
                                <Button type="button" variant="outline" onClick={generateCode} className="mt-7">
                                    Generar
                                </Button>
                            </div>

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
                                        Activar el código inmediatamente
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.activo}
                                    onCheckedChange={(checked) => handleInputChange("activo", checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Crear en Stripe</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Crear cupón automáticamente en Stripe
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.crear_en_stripe}
                                    onCheckedChange={(checked) => handleInputChange("crear_en_stripe", checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Vista Previa */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Vista Previa
                        </CardTitle>
                        <CardDescription>
                            Así se verá el código de descuento
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg p-4 bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                                <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                                    {formData.codigo || "CODIGO_EJEMPLO"}
                                </code>
                                <span className={`px-2 py-1 rounded text-xs ${formData.activo
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                    }`}>
                                    {formData.activo ? "Activo" : "Inactivo"}
                                </span>
                            </div>
                            <h3 className="font-medium">{formData.nombre || "Nombre del código"}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                                {formData.descripcion || "Descripción del código"}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="font-medium">
                                    {formData.tipo_descuento === "porcentaje"
                                        ? `${formData.valor_descuento}% de descuento`
                                        : `$${formData.valor_descuento} de descuento`
                                    }
                                </span>
                                <span className="text-muted-foreground">
                                    {formData.tipo_aplicacion === "ambos" ? "Todos los planes" :
                                        formData.tipo_aplicacion === "plan_mensual" ? "Plan Mensual" :
                                            "Plan Anual"}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" asChild>
                        <Link href="/admin/descuentos/general">
                            Cancelar
                        </Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? "Creando..." : "Crear Código"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
