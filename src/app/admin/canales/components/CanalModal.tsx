'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Switch } from '@/components/ui/shadcn/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
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

interface CanalModalProps {
    isOpen: boolean;
    onClose: () => void;
    canal: CanalAdquisicion | null;
    onSave: (canalData: Omit<CanalAdquisicion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export default function CanalModal({
    isOpen,
    onClose,
    canal,
    onSave
}: CanalModalProps) {
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        isActive: true,
        isVisible: true
    });

    const [isLoading, setIsLoading] = useState(false);

    // Actualizar formData cuando canal cambie
    useEffect(() => {
        if (canal) {
            setFormData({
                nombre: canal.nombre,
                descripcion: canal.descripcion || '',
                color: canal.color || '#3B82F6',
                isActive: canal.isActive,
                isVisible: canal.isVisible
            });
        } else {
            resetForm();
        }
    }, [canal]);

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

        setIsLoading(true);
        try {
            await onSave({
                ...formData,
                icono: null,
                orden: canal?.orden || 0
            });
            resetForm();
            onClose();
        } catch (error) {
            console.error('Error saving canal:', error);
            // El error ya se maneja en la función padre
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {canal ? 'Editar Canal' : 'Crear Nuevo Canal'}
                    </DialogTitle>
                    <DialogDescription>
                        {canal ? 'Modifica los datos del canal' : 'Agrega un nuevo canal de adquisición'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <ZenInput
                        id="nombre"
                        label="Nombre"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        disabled={isLoading}
                    />

                    <div>
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                            id="descripcion"
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>

                    <ZenInput
                        id="color"
                        label="Color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        disabled={isLoading}
                    />

                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                disabled={isLoading}
                            />
                            <Label htmlFor="isActive">Activo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isVisible"
                                checked={formData.isVisible}
                                onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                                disabled={isLoading}
                            />
                            <Label htmlFor="isVisible">Visible para clientes</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : (canal ? 'Actualizar' : 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
