'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { toast } from 'sonner';

interface Plataforma {
    id: string;
    nombre: string;
    tipo: string;
    color: string | null;
    icono: string | null;
}

interface CampañaPlataforma {
    id: string;
    presupuesto: number;
    gastoReal: number;
    leads: number;
    conversiones: number;
    plataforma?: Plataforma;
    platform_plataformas_publicidad?: Plataforma;
}

interface Campaña {
    id: string;
    nombre: string;
    descripcion: string | null;
    presupuestoTotal: number | string;
    fechaInicio: string | Date;
    fechaFin: string | Date;
    status: string;
    isActive: boolean;
    leadsGenerados: number;
    leadsSuscritos: number;
    gastoReal: number;
    createdAt: string | Date;
    updatedAt: string | Date;
    plataformas?: CampañaPlataforma[];
    platform_campana_plataformas?: CampañaPlataforma[];
    _count: {
        leads: number;
    };
}

interface CampanaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (campañaData: {
        nombre: string;
        descripcion: string;
        presupuestoTotal: number;
        fechaInicio: Date;
        fechaFin: Date;
        isActive: boolean;
        status: string;
        leadsGenerados: number;
        leadsSuscritos: number;
        gastoReal: number;
        plataformas: Array<{
            plataformaId: string;
            presupuesto: number;
            gastoReal: number;
            leads: number;
            conversiones: number;
        }>;
    }) => Promise<void>;
    editingCampaña: Campaña | null;
}


export function CampanaModal({ isOpen, onClose, onSave, editingCampaña }: CampanaModalProps) {
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        presupuestoTotal: '',
        fechaInicio: '',
        fechaFin: '',
        isActive: true
    });

    const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
    const [selectedPlataformas, setSelectedPlataformas] = useState<Array<{
        plataformaId: string;
        presupuesto: number;
        gastoReal: number;
        leads: number;
        conversiones: number;
    }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cargar plataformas disponibles
    useEffect(() => {
        const fetchPlataformas = async () => {
            try {
                const response = await fetch('/api/plataformas');
                if (response.ok) {
                    const data = await response.json();
                    setPlataformas(data || []);
                }
            } catch (error) {
                console.error('Error fetching plataformas:', error);
            }
        };

        if (isOpen) {
            fetchPlataformas();
        }
    }, [isOpen]);

    // Actualizar formulario cuando cambie la campaña a editar
    useEffect(() => {
        if (editingCampaña) {
            setFormData({
                nombre: editingCampaña.nombre,
                descripcion: editingCampaña.descripcion || '',
                presupuestoTotal: editingCampaña.presupuestoTotal.toString(),
                fechaInicio: editingCampaña.fechaInicio instanceof Date
                    ? editingCampaña.fechaInicio.toISOString().split('T')[0]
                    : new Date(editingCampaña.fechaInicio).toISOString().split('T')[0],
                fechaFin: editingCampaña.fechaFin instanceof Date
                    ? editingCampaña.fechaFin.toISOString().split('T')[0]
                    : new Date(editingCampaña.fechaFin).toISOString().split('T')[0],
                isActive: editingCampaña.isActive
            });

            // Cargar plataformas seleccionadas
            const plataformas = editingCampaña.plataformas || editingCampaña.platform_campana_plataformas || [];
            if (plataformas.length > 0) {
                setSelectedPlataformas(plataformas.map(p => ({
                    plataformaId: p.plataforma?.id || p.platform_plataformas_publicidad?.id || '',
                    presupuesto: p.presupuesto,
                    gastoReal: p.gastoReal,
                    leads: p.leads,
                    conversiones: p.conversiones
                })));
            }
        } else {
            // Reset form for new campaign
            setFormData({
                nombre: '',
                descripcion: '',
                presupuestoTotal: '',
                fechaInicio: '',
                fechaFin: '',
                isActive: true
            });
            setSelectedPlataformas([]);
        }
    }, [editingCampaña, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setIsSubmitting(true);

            const campañaData = {
                ...formData,
                fechaInicio: new Date(formData.fechaInicio),
                fechaFin: new Date(formData.fechaFin),
                presupuestoTotal: parseFloat(formData.presupuestoTotal) || 0,
                // Valores por defecto para campos no incluidos en el formulario
                status: editingCampaña?.status || 'planificada',
                leadsGenerados: editingCampaña?.leadsGenerados || 0,
                leadsSuscritos: editingCampaña?.leadsSuscritos || 0,
                gastoReal: editingCampaña?.gastoReal || 0,
                plataformas: selectedPlataformas
            };

            await onSave(campañaData);
            onClose();
        } catch (error) {
            console.error('Error saving campaña:', error);
            toast.error('Error al guardar la campaña');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    const addPlataforma = (plataformaId: string) => {
        const plataforma = plataformas.find(p => p.id === plataformaId);
        if (plataforma && !selectedPlataformas.find(sp => sp.plataformaId === plataformaId)) {
            setSelectedPlataformas([...selectedPlataformas, {
                plataformaId,
                presupuesto: 0,
                gastoReal: 0,
                leads: 0,
                conversiones: 0
            }]);
        }
    };

    const removePlataforma = (plataformaId: string) => {
        setSelectedPlataformas(selectedPlataformas.filter(sp => sp.plataformaId !== plataformaId));
    };

    const updatePlataforma = (plataformaId: string, field: string, value: number) => {
        setSelectedPlataformas(selectedPlataformas.map(sp =>
            sp.plataformaId === plataformaId
                ? { ...sp, [field]: value }
                : sp
        ));
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingCampaña ? 'Editar Campaña' : 'Crear Nueva Campaña'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingCampaña ? 'Modifica los datos de la campaña' : 'Crea una nueva campaña de marketing'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <ZenInput
                        id="nombre"
                        label="Nombre de la Campaña"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Campaña de Verano 2024"
                        disabled={isSubmitting}
                        className="bg-zinc-900 border-zinc-700 text-white"
                    />

                    <ZenInput
                        id="descripcion"
                        label="Descripción"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        placeholder="Descripción de la campaña..."
                        disabled={isSubmitting}
                        className="bg-zinc-900 border-zinc-700 text-white"
                    />

                    <ZenInput
                        id="presupuestoTotal"
                        label="Presupuesto Total"
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.presupuestoTotal}
                        onChange={(e) => setFormData({ ...formData, presupuestoTotal: e.target.value })}
                        placeholder="0.00"
                        disabled={isSubmitting}
                        className="bg-zinc-900 border-zinc-700 text-white"
                    />

                    {/* Selección de Plataformas */}
                    <div>
                        <Label className="mb-2 block">Plataformas de Publicidad</Label>

                        {/* Selector de plataformas */}
                        <div className="mb-4">
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        addPlataforma(e.target.value);
                                        e.target.value = '';
                                    }
                                }}
                                className="w-full p-2 bg-zinc-900 border border-zinc-700 text-white rounded-md"
                                disabled={isSubmitting}
                            >
                                <option value="">Seleccionar plataforma...</option>
                                {plataformas
                                    .filter(p => !selectedPlataformas.find(sp => sp.plataformaId === p.id))
                                    .map(plataforma => (
                                        <option key={plataforma.id} value={plataforma.id}>
                                            {plataforma.nombre} ({plataforma.tipo})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Plataformas seleccionadas */}
                        {selectedPlataformas.length > 0 && (
                            <div className="space-y-3">
                                {selectedPlataformas.map(selectedPlataforma => {
                                    const plataforma = plataformas.find(p => p.id === selectedPlataforma.plataformaId);
                                    return (
                                        <div key={selectedPlataforma.plataformaId} className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium text-white">{plataforma?.nombre}</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => removePlataforma(selectedPlataforma.plataformaId)}
                                                    className="text-red-400 hover:text-red-300"
                                                    disabled={isSubmitting}
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <ZenInput
                                                    label="Presupuesto"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={selectedPlataforma.presupuesto}
                                                    onChange={(e) => updatePlataforma(selectedPlataforma.plataformaId, 'presupuesto', parseFloat(e.target.value) || 0)}
                                                    className="bg-zinc-900 border-zinc-700 text-white text-sm"
                                                    disabled={isSubmitting}
                                                />

                                                <ZenInput
                                                    label="Gasto Real"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={selectedPlataforma.gastoReal}
                                                    onChange={(e) => updatePlataforma(selectedPlataforma.plataformaId, 'gastoReal', parseFloat(e.target.value) || 0)}
                                                    className="bg-zinc-900 border-zinc-700 text-white text-sm"
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <ZenInput
                            id="fechaInicio"
                            label="Período Inicial"
                            required
                            type="date"
                            value={formData.fechaInicio}
                            onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                            disabled={isSubmitting}
                            className="bg-zinc-900 border-zinc-700 text-white"
                        />

                        <ZenInput
                            id="fechaFin"
                            label="Período Final"
                            required
                            type="date"
                            value={formData.fechaFin}
                            onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                            disabled={isSubmitting}
                            className="bg-zinc-900 border-zinc-700 text-white"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-700 rounded-lg">
                        <div>
                            <Label htmlFor="isActive" className="text-sm font-medium">Estado de la Campaña</Label>
                            <p className="text-xs text-zinc-500">La campaña estará activa y disponible para uso</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className={`text-sm ${formData.isActive ? 'text-green-400' : 'text-red-400'}`}>
                                {formData.isActive ? 'Activa' : 'Inactiva'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                disabled={isSubmitting}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.isActive ? 'bg-blue-600' : 'bg-zinc-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? 'Guardando...' : (editingCampaña ? 'Actualizar' : 'Crear')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
