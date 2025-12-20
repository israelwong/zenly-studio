'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    ArrowLeft,
    Save,
    User,
    Building,
    Target,
    Calendar,
    MessageSquare,
    Plus
} from 'lucide-react';
import { toast } from 'sonner';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

interface CanalAdquisicion {
    id: string;
    nombre: string;
    categoria: string;
    color: string;
    icono: string;
    isActive: boolean;
}

interface Agente {
    id: string;
    nombre: string;
    email: string;
}

interface PipelineStage {
    id: string;
    nombre: string;
    descripcion: string;
    orden: number;
}

interface LeadFormData {
    // Información básica
    nombre: string;
    email: string;
    telefono: string;
    nombreEstudio: string;
    slugEstudio: string;

    // Plan de interés
    planInteres: string;
    presupuestoMensual: string;
    fechaProbableInicio: string;

    // Asignación
    agentId: string;
    etapaId: string;
    canalAdquisicionId: string;

    // Seguimiento
    puntaje: string;
    prioridad: string;
}

interface CitaData {
    concepto: string;
    descripcion: string;
    fecha: string;
    hora: string;
    tipo: string;
}

interface BitacoraEntry {
    id?: string;
    tipo: string;
    titulo: string;
    descripcion: string;
    fecha: string;
}

export default function LeadDetailPage() {
    const router = useRouter();
    const params = useParams();
    const leadId = params.id as string;
    const isNew = leadId === 'new';

    const [loading, setLoading] = useState(false);
    const [canales, setCanales] = useState<CanalAdquisicion[]>([]);
    const [agentes, setAgentes] = useState<Agente[]>([]);
    const [etapas, setEtapas] = useState<PipelineStage[]>([]);
    // const [bitacora, setBitacora] = useState<BitacoraEntry[]>([]); // TODO: Implementar cuando se agregue la API de bitácora

    const [formData, setFormData] = useState<LeadFormData>({
        nombre: '',
        email: '',
        telefono: '',
        nombreEstudio: '',
        slugEstudio: '',
        planInteres: '',
        presupuestoMensual: '',
        fechaProbableInicio: '',
        agentId: '',
        etapaId: '',
        canalAdquisicionId: '',
        puntaje: '5',
        prioridad: 'media'
    });

    const [citaData, setCitaData] = useState<CitaData>({
        concepto: '',
        descripcion: '',
        fecha: '',
        hora: '',
        tipo: 'demostracion'
    });

    const [newBitacoraEntry, setNewBitacoraEntry] = useState<BitacoraEntry>({
        tipo: 'llamada',
        titulo: '',
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0]
    });

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            // Fetch canales de adquisición
            const canalesResponse = await fetch('/api/canales');
            if (canalesResponse.ok) {
                const canalesData = await canalesResponse.json();
                setCanales(canalesData.filter((c: CanalAdquisicion) => c.isActive));
            }

            // Fetch agentes
            const agentesResponse = await fetch('/api/agents');
            if (agentesResponse.ok) {
                const agentesData = await agentesResponse.json();
                setAgentes(agentesData);
            }

            // Fetch etapas del pipeline
            const etapasResponse = await fetch('/api/pipeline');
            if (etapasResponse.ok) {
                const etapasData = await etapasResponse.json();
                setEtapas(etapasData.sort((a: PipelineStage, b: PipelineStage) => a.orden - b.orden));
            }

        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error('Error al cargar los datos iniciales');
        } finally {
            setLoading(false);
        }
    };

    const fetchLeadData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/leads/${leadId}`);
            if (response.ok) {
                const leadData = await response.json();
                setFormData({
                    nombre: leadData.nombre || '',
                    email: leadData.email || '',
                    telefono: leadData.telefono || '',
                    nombreEstudio: leadData.nombreEstudio || '',
                    slugEstudio: leadData.slugEstudio || '',
                    planInteres: leadData.planInteres || '',
                    presupuestoMensual: leadData.presupuestoMensual?.toString() || '',
                    fechaProbableInicio: leadData.fechaProbableInicio ?
                        new Date(leadData.fechaProbableInicio).toISOString().split('T')[0] : '',
                    agentId: leadData.agentId || '',
                    etapaId: leadData.etapaId || '',
                    canalAdquisicionId: leadData.canalAdquisicionId || '',
                    puntaje: leadData.puntaje?.toString() || '5',
                    prioridad: leadData.prioridad || 'media'
                });

                // TODO: Fetch bitácora del lead
                // const bitacoraResponse = await fetch(`/api/leads/${leadId}/bitacora`);
                // if (bitacoraResponse.ok) {
                //     const bitacoraData = await bitacoraResponse.json();
                //     setBitacora(bitacoraData);
                // }
            }
        } catch (error) {
            console.error('Error fetching lead data:', error);
            toast.error('Error al cargar los datos del lead');
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchInitialData();
        if (!isNew) {
            fetchLeadData();
        }
    }, [leadId, isNew, fetchLeadData]);

    const handleInputChange = (field: keyof LeadFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);

            const leadData = {
                ...formData,
                presupuestoMensual: formData.presupuestoMensual ? parseFloat(formData.presupuestoMensual) : null,
                fechaProbableInicio: formData.fechaProbableInicio ? new Date(formData.fechaProbableInicio) : null,
                puntaje: parseInt(formData.puntaje),
                agentId: formData.agentId || null,
                etapaId: formData.etapaId || null,
                canalAdquisicionId: formData.canalAdquisicionId || null
            };

            const url = isNew ? '/api/leads' : `/api/leads/${leadId}`;
            const method = isNew ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(leadData),
            });

            if (!response.ok) {
                throw new Error(`Error al ${isNew ? 'crear' : 'actualizar'} el lead`);
            }

            const result = await response.json();
            toast.success(`Lead ${isNew ? 'creado' : 'actualizado'} exitosamente`);

            if (isNew) {
                router.push(`/admin/leads/${result.id}`);
            } else {
                router.refresh();
            }

        } catch (error) {
            console.error('Error saving lead:', error);
            toast.error(`Error al ${isNew ? 'crear' : 'actualizar'} el lead`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCita = async () => {
        if (!citaData.concepto || !citaData.fecha || !citaData.hora) {
            toast.error('Por favor completa todos los campos de la cita');
            return;
        }

        try {
            setLoading(true);

            // TODO: Implementar API para crear citas
            // const response = await fetch('/api/citas', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         ...citaData,
            //         leadId: leadId,
            //         fecha: new Date(`${citaData.fecha}T${citaData.hora}`)
            //     })
            // });

            toast.success('Cita creada exitosamente');
            setCitaData({
                concepto: '',
                descripcion: '',
                fecha: '',
                hora: '',
                tipo: 'demostracion'
            });
        } catch (error) {
            console.error('Error creating cita:', error);
            toast.error('Error al crear la cita');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBitacora = async () => {
        if (!newBitacoraEntry.titulo || !newBitacoraEntry.descripcion) {
            toast.error('Por favor completa título y descripción');
            return;
        }

        try {
            setLoading(true);

            // TODO: Implementar API para agregar bitácora
            // const response = await fetch(`/api/leads/${leadId}/bitacora`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(newBitacoraEntry)
            // });

            toast.success('Entrada de bitácora agregada');
            setNewBitacoraEntry({
                tipo: 'llamada',
                titulo: '',
                descripcion: '',
                fecha: new Date().toISOString().split('T')[0]
            });

            // TODO: Refrescar bitácora
            // fetchLeadData();
        } catch (error) {
            console.error('Error adding bitacora:', error);
            toast.error('Error al agregar entrada de bitácora');
        } finally {
            setLoading(false);
        }
    };

    const planOptions = [
        { value: 'basico', label: 'Básico' },
        { value: 'negocio', label: 'Negocio' },
        { value: 'agencia', label: 'Agencia' }
    ];

    const prioridadOptions = [
        { value: 'alta', label: 'Alta' },
        { value: 'media', label: 'Media' },
        { value: 'baja', label: 'Baja' }
    ];

    const tipoCitaOptions = [
        { value: 'demostracion', label: 'Demostración' },
        { value: 'consulta', label: 'Consulta' },
        { value: 'soporte', label: 'Soporte' },
        { value: 'seguimiento', label: 'Seguimiento' }
    ];

    const tipoBitacoraOptions = [
        { value: 'llamada', label: 'Llamada' },
        { value: 'email', label: 'Email' },
        { value: 'reunion', label: 'Reunión' },
        { value: 'nota', label: 'Nota' },
        { value: 'cambio_etapa', label: 'Cambio de Etapa' }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                        className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            {isNew ? 'Nuevo Lead' : 'Editar Lead'}
                        </h1>
                        <p className="text-zinc-400 mt-2">
                            {isNew ? 'Crea un nuevo lead en el sistema' : 'Gestiona la información del lead'}
                        </p>
                    </div>
                </div>
                {!isNew && (
                    <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                        ID: {leadId}
                    </Badge>
                )}
            </div>

            <Tabs defaultValue="informacion" className="space-y-6">
                <TabsList className="bg-zinc-800 border-zinc-700">
                    <TabsTrigger value="informacion" className="data-[state=active]:bg-zinc-700">
                        <User className="h-4 w-4 mr-2" />
                        Información
                    </TabsTrigger>
                    {!isNew && (
                        <>
                            <TabsTrigger value="citas" className="data-[state=active]:bg-zinc-700">
                                <Calendar className="h-4 w-4 mr-2" />
                                Citas
                            </TabsTrigger>
                            <TabsTrigger value="bitacora" className="data-[state=active]:bg-zinc-700">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Bitácora
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                <TabsContent value="informacion" className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Información Básica */}
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center">
                                    <User className="h-5 w-5 mr-2" />
                                    Información Básica
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre" className="text-zinc-300">Nombre Completo *</Label>
                                        <Input
                                            id="nombre"
                                            value={formData.nombre}
                                            onChange={(e) => handleInputChange('nombre', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="Nombre completo del lead"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-zinc-300">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="email@ejemplo.com"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="telefono" className="text-zinc-300">Teléfono *</Label>
                                        <Input
                                            id="telefono"
                                            value={formData.telefono}
                                            onChange={(e) => handleInputChange('telefono', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="+52 55 1234 5678"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="nombreEstudio" className="text-zinc-300">Nombre del Estudio</Label>
                                        <Input
                                            id="nombreEstudio"
                                            value={formData.nombreEstudio}
                                            onChange={(e) => handleInputChange('nombreEstudio', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="Nombre del estudio propuesto"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="slugEstudio" className="text-zinc-300">Slug del Estudio</Label>
                                        <Input
                                            id="slugEstudio"
                                            value={formData.slugEstudio}
                                            onChange={(e) => handleInputChange('slugEstudio', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="mi-estudio-fotografia"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Plan de Interés */}
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center">
                                    <Target className="h-5 w-5 mr-2" />
                                    Plan de Interés
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="planInteres" className="text-zinc-300">Plan de Interés</Label>
                                        <Select value={formData.planInteres} onValueChange={(value) => handleInputChange('planInteres', value)}>
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectValue placeholder="Seleccionar plan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {planOptions.map((plan) => (
                                                    <SelectItem key={plan.value} value={plan.value}>
                                                        {plan.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="presupuestoMensual" className="text-zinc-300">Presupuesto Mensual</Label>
                                        <Input
                                            id="presupuestoMensual"
                                            type="number"
                                            value={formData.presupuestoMensual}
                                            onChange={(e) => handleInputChange('presupuestoMensual', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="5000"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fechaProbableInicio" className="text-zinc-300">Fecha Probable de Inicio</Label>
                                        <Input
                                            id="fechaProbableInicio"
                                            type="date"
                                            value={formData.fechaProbableInicio}
                                            onChange={(e) => handleInputChange('fechaProbableInicio', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Asignación y Seguimiento */}
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center">
                                    <Building className="h-5 w-5 mr-2" />
                                    Asignación y Seguimiento
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="agentId" className="text-zinc-300">Agente Asignado</Label>
                                        <Select value={formData.agentId} onValueChange={(value) => handleInputChange('agentId', value)}>
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectValue placeholder="Seleccionar agente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {agentes.map((agente) => (
                                                    <SelectItem key={agente.id} value={agente.id}>
                                                        {agente.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="etapaId" className="text-zinc-300">Etapa del Pipeline</Label>
                                        <Select value={formData.etapaId} onValueChange={(value) => handleInputChange('etapaId', value)}>
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectValue placeholder="Seleccionar etapa" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {etapas.map((etapa) => (
                                                    <SelectItem key={etapa.id} value={etapa.id}>
                                                        {etapa.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="canalAdquisicionId" className="text-zinc-300">Canal de Adquisición</Label>
                                        <Select value={formData.canalAdquisicionId} onValueChange={(value) => handleInputChange('canalAdquisicionId', value)}>
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectValue placeholder="Seleccionar canal" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {canales.map((canal) => (
                                                    <SelectItem key={canal.id} value={canal.id}>
                                                        {canal.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="prioridad" className="text-zinc-300">Prioridad</Label>
                                        <Select value={formData.prioridad} onValueChange={(value) => handleInputChange('prioridad', value)}>
                                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectValue placeholder="Seleccionar prioridad" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {prioridadOptions.map((prioridad) => (
                                                    <SelectItem key={prioridad.value} value={prioridad.value}>
                                                        {prioridad.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="puntaje" className="text-zinc-300">Puntaje (1-10)</Label>
                                        <Input
                                            id="puntaje"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={formData.puntaje}
                                            onChange={(e) => handleInputChange('puntaje', e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Botones de Acción */}
                        <div className="flex justify-end space-x-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {loading ? 'Guardando...' : (isNew ? 'Crear Lead' : 'Actualizar Lead')}
                            </Button>
                        </div>
                    </form>
                </TabsContent>

                {!isNew && (
                    <>
                        <TabsContent value="citas" className="space-y-6">
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center">
                                        <Calendar className="h-5 w-5 mr-2" />
                                        Crear Nueva Cita
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="concepto" className="text-zinc-300">Concepto *</Label>
                                            <Input
                                                id="concepto"
                                                value={citaData.concepto}
                                                onChange={(e) => setCitaData(prev => ({ ...prev, concepto: e.target.value }))}
                                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                                placeholder="Demostración de plataforma"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="tipo" className="text-zinc-300">Tipo de Cita</Label>
                                            <Select value={citaData.tipo} onValueChange={(value) => setCitaData(prev => ({ ...prev, tipo: value }))}>
                                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                    <SelectValue placeholder="Seleccionar tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tipoCitaOptions.map((tipo) => (
                                                        <SelectItem key={tipo.value} value={tipo.value}>
                                                            {tipo.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="fecha" className="text-zinc-300">Fecha *</Label>
                                            <Input
                                                id="fecha"
                                                type="date"
                                                value={citaData.fecha}
                                                onChange={(e) => setCitaData(prev => ({ ...prev, fecha: e.target.value }))}
                                                className="bg-zinc-800 border-zinc-700 text-white"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="hora" className="text-zinc-300">Hora *</Label>
                                            <Input
                                                id="hora"
                                                type="time"
                                                value={citaData.hora}
                                                onChange={(e) => setCitaData(prev => ({ ...prev, hora: e.target.value }))}
                                                className="bg-zinc-800 border-zinc-700 text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="descripcion" className="text-zinc-300">Descripción</Label>
                                        <Textarea
                                            id="descripcion"
                                            value={citaData.descripcion}
                                            onChange={(e) => setCitaData(prev => ({ ...prev, descripcion: e.target.value }))}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="Detalles adicionales de la cita..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            onClick={handleCreateCita}
                                            disabled={loading}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            {loading ? 'Creando...' : 'Crear Cita'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="bitacora" className="space-y-6">
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center">
                                        <MessageSquare className="h-5 w-5 mr-2" />
                                        Agregar Entrada de Bitácora
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="tipoBitacora" className="text-zinc-300">Tipo de Actividad</Label>
                                            <Select value={newBitacoraEntry.tipo} onValueChange={(value) => setNewBitacoraEntry(prev => ({ ...prev, tipo: value }))}>
                                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                                    <SelectValue placeholder="Seleccionar tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tipoBitacoraOptions.map((tipo) => (
                                                        <SelectItem key={tipo.value} value={tipo.value}>
                                                            {tipo.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="fechaBitacora" className="text-zinc-300">Fecha</Label>
                                            <Input
                                                id="fechaBitacora"
                                                type="date"
                                                value={newBitacoraEntry.fecha}
                                                onChange={(e) => setNewBitacoraEntry(prev => ({ ...prev, fecha: e.target.value }))}
                                                className="bg-zinc-800 border-zinc-700 text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tituloBitacora" className="text-zinc-300">Título *</Label>
                                        <Input
                                            id="tituloBitacora"
                                            value={newBitacoraEntry.titulo}
                                            onChange={(e) => setNewBitacoraEntry(prev => ({ ...prev, titulo: e.target.value }))}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="Resumen de la actividad"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="descripcionBitacora" className="text-zinc-300">Descripción *</Label>
                                        <Textarea
                                            id="descripcionBitacora"
                                            value={newBitacoraEntry.descripcion}
                                            onChange={(e) => setNewBitacoraEntry(prev => ({ ...prev, descripcion: e.target.value }))}
                                            className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                                            placeholder="Detalles de la actividad realizada..."
                                            rows={4}
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            onClick={handleAddBitacora}
                                            disabled={loading}
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            {loading ? 'Agregando...' : 'Agregar Entrada'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}
