'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Switch } from '@/components/ui/shadcn/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/shadcn/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CanalAdquisicion {
    id: string;
    nombre: string;
    descripcion: string | null;
    color: string | null;
    icono: string | null;
    isActive: boolean;
    isVisible: boolean;
    orden: number;
    createdAt: Date;
    updatedAt: Date;
}

interface CanalFormModalProps {
    onCanalSubmit: (canal: Omit<CanalAdquisicion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    editingCanal?: CanalAdquisicion | null;
    onEdit?: (canal: CanalAdquisicion) => void;
    onCancel?: () => void;
}


export default function CanalFormModal({ 
    onCanalSubmit, 
    editingCanal, 
    onEdit, 
    onCancel 
}: CanalFormModalProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        isActive: true,
        isVisible: true
    });

    // Actualizar formData cuando editingCanal cambie
    useEffect(() => {
        if (editingCanal) {
            setFormData({
                nombre: editingCanal.nombre,
                descripcion: editingCanal.descripcion || '',
                color: editingCanal.color || '#3B82F6',
                isActive: editingCanal.isActive,
                isVisible: editingCanal.isVisible
            });
            setIsModalOpen(true);
        } else {
            resetForm();
        }
    }, [editingCanal]);

    const resetForm = () => {
        setFormData({
            nombre: '',
            descripcion: '',
            color: '#3B82F6',
            isActive: true,
            isVisible: true
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validación del lado del cliente
        if (!formData.nombre.trim()) {
            toast.error('El nombre del canal es requerido');
            return;
        }

        try {
            await onCanalSubmit({
                ...formData,
                icono: null, // Eliminado el campo icono
                orden: 0     // El orden se manejará con drag and drop
            });
            resetForm();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error submitting canal:', error);
            // El error ya se maneja en la función padre
        }
    };


    const handleCancel = () => {
        resetForm();
        setIsModalOpen(false);
        onCancel?.();
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Canal
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {editingCanal ? 'Editar Canal' : 'Crear Nuevo Canal'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingCanal ? 'Modifica los datos del canal' : 'Agrega un nuevo canal de adquisición'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <ZenInput
                        id="nombre"
                        label="Nombre"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />

                    <div>
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                            id="descripcion"
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <ZenInput
                        id="color"
                        label="Color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />

                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                            <Label htmlFor="isActive">Activo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isVisible"
                                checked={formData.isVisible}
                                onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                            />
                            <Label htmlFor="isVisible">Visible para clientes</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {editingCanal ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
