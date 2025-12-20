'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shadcn/dialog';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { Search, Plus, Edit, Trash2, Target, Palette, Type } from 'lucide-react';
import { toast } from 'sonner';

interface Plataforma {
    id: string;
    nombre: string;
    tipo: string;
    color: string | null;
    icono: string | null;
    descripcion?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

const tipoOptions = [
    { value: 'social', label: 'Redes Sociales' },
    { value: 'search', label: 'Búsqueda' },
    { value: 'display', label: 'Display' },
    { value: 'video', label: 'Video' },
    { value: 'email', label: 'Email' },
    { value: 'affiliate', label: 'Afiliados' },
    { value: 'other', label: 'Otros' },
];

const colorOptions = [
    { value: '#3B82F6', label: 'Azul' },
    { value: '#10B981', label: 'Verde' },
    { value: '#F59E0B', label: 'Amarillo' },
    { value: '#EF4444', label: 'Rojo' },
    { value: '#8B5CF6', label: 'Púrpura' },
    { value: '#F97316', label: 'Naranja' },
    { value: '#06B6D4', label: 'Cian' },
    { value: '#84CC16', label: 'Lima' },
];

export default function PlataformasPage() {
    const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlataforma, setEditingPlataforma] = useState<Plataforma | null>(null);
    const [formData, setFormData] = useState({
        nombre: '',
        tipo: '',
        color: '#3B82F6',
        icono: '',
        descripcion: ''
    });

    useEffect(() => {
        fetchPlataformas();
    }, []);

    const fetchPlataformas = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/plataformas');
            if (!response.ok) {
                throw new Error('Error al cargar las plataformas');
            }
            const data = await response.json();
            setPlataformas(data || []);
        } catch (error) {
            console.error('Error fetching plataformas:', error);
            toast.error('Error al cargar las plataformas');
            setPlataformas([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setEditingPlataforma(null);
        setFormData({
            nombre: '',
            tipo: '',
            color: '#3B82F6',
            icono: '',
            descripcion: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (plataforma: Plataforma) => {
        setEditingPlataforma(plataforma);
        setFormData({
            nombre: plataforma.nombre,
            tipo: plataforma.tipo,
            color: plataforma.color || '#3B82F6',
            icono: plataforma.icono || '',
            descripcion: plataforma.descripcion || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            if (!formData.nombre || !formData.tipo) {
                toast.error('Nombre y tipo son requeridos');
                return;
            }

            const response = editingPlataforma
                ? await fetch(`/api/plataformas/${editingPlataforma.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                })
                : await fetch('/api/plataformas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });

            if (!response.ok) {
                throw new Error(editingPlataforma ? 'Error al actualizar la plataforma' : 'Error al crear la plataforma');
            }

            const savedPlataforma = await response.json();
            
            if (editingPlataforma) {
                setPlataformas(prev => 
                    prev.map(p => p.id === editingPlataforma.id ? savedPlataforma : p)
                );
                toast.success('Plataforma actualizada exitosamente');
            } else {
                setPlataformas(prev => [...prev, savedPlataforma]);
                toast.success('Plataforma creada exitosamente');
            }

            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving plataforma:', error);
            toast.error(editingPlataforma ? 'Error al actualizar la plataforma' : 'Error al crear la plataforma');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta plataforma?')) return;

        try {
            const response = await fetch(`/api/plataformas/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Error al eliminar la plataforma');
            }

            setPlataformas(prev => prev.filter(p => p.id !== id));
            toast.success('Plataforma eliminada exitosamente');
        } catch (error) {
            console.error('Error deleting plataforma:', error);
            toast.error('Error al eliminar la plataforma');
        }
    };

    const getTipoLabel = (tipo: string) => {
        return tipoOptions.find(t => t.value === tipo)?.label || tipo;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-zinc-400">Cargando plataformas...</div>
            </div>
        );
    }

    const filteredPlataformas = plataformas.filter(plataforma =>
        plataforma.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plataforma.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Filtros y Acciones */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex-1 max-w-sm">
                        <ZenInput
                            placeholder="Buscar plataformas..."
                            icon={Search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Plataforma
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800">
                        <DialogHeader>
                            <DialogTitle className="text-white">
                                {editingPlataforma ? 'Editar Plataforma' : 'Nueva Plataforma'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <ZenInput
                                id="nombre"
                                label="Nombre"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Ej: Facebook Ads"
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                            <div>
                                <Label htmlFor="tipo" className="text-zinc-300">Tipo</Label>
                                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700">
                                        {tipoOptions.map((tipo) => (
                                            <SelectItem key={tipo.value} value={tipo.value} className="text-white">
                                                {tipo.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="color" className="text-zinc-300">Color</Label>
                                <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectValue placeholder="Seleccionar color" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700">
                                        {colorOptions.map((color) => (
                                            <SelectItem key={color.value} value={color.value} className="text-white">
                                                <div className="flex items-center space-x-2">
                                                    <div 
                                                        className="w-4 h-4 rounded-full" 
                                                        style={{ backgroundColor: color.value }}
                                                    />
                                                    <span>{color.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <ZenInput
                                id="icono"
                                label="Icono (opcional)"
                                value={formData.icono}
                                onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                                placeholder="Ej: facebook, instagram, google"
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                            <div>
                                <Label htmlFor="descripcion" className="text-zinc-300">Descripción (opcional)</Label>
                                <Textarea
                                    id="descripcion"
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Descripción de la plataforma..."
                                    className="bg-zinc-800 border-zinc-700 text-white"
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end space-x-2 pt-4">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    Cancelar
                                </Button>
                                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                                    {editingPlataforma ? 'Actualizar' : 'Crear'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Lista de plataformas */}
            {filteredPlataformas.length === 0 ? (
                <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-8 text-center">
                        <Target className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-white mb-2">No hay plataformas</h3>
                        <p className="text-zinc-400 mb-4">Crea tu primera plataforma de publicidad</p>
                        <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Plataforma
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlataformas.map(plataforma => (
                        <Card key={plataforma.id} className="bg-zinc-800 border-zinc-700">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div 
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: plataforma.color || '#3B82F6' }}
                                        >
                                            <Target className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white text-lg">
                                                {plataforma.nombre}
                                            </CardTitle>
                                            <Badge variant="secondary" className="text-xs mt-1">
                                                {getTipoLabel(plataforma.tipo)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(plataforma)}
                                            className="text-zinc-400 hover:text-white"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(plataforma.id)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                {plataforma.descripcion && (
                                    <p className="text-zinc-400 text-sm mb-4">
                                        {plataforma.descripcion}
                                    </p>
                                )}
                                
                                <div className="flex items-center justify-between text-xs text-zinc-500">
                                    <div className="flex items-center space-x-1">
                                        <Palette className="h-3 w-3" />
                                        <span>Color: {plataforma.color}</span>
                                    </div>
                                    {plataforma.icono && (
                                        <div className="flex items-center space-x-1">
                                            <Type className="h-3 w-3" />
                                            <span>{plataforma.icono}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
