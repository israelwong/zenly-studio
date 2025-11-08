'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenButton, ZenInput, ZenTextarea } from '@/components/ui/zen';
import {
  obtenerCondicionesComerciales,
  crearCondicionComercial,
  actualizarCondicionComercial,
  eliminarCondicionComercial,
} from '@/lib/actions/studio/config/condiciones-comerciales.actions';
import { toast } from 'sonner';

interface CondicionComercial {
  id: string;
  name: string;
  description: string | null;
  discount_percentage: number | null;
  advance_percentage: number | null;
  status: string;
  order: number | null;
}

interface CondicionesComercialesManagerProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function CondicionesComercialesManager({
  studioSlug,
  isOpen,
  onClose,
  onRefresh,
}: CondicionesComercialesManagerProps) {
  const [condiciones, setCondiciones] = useState<CondicionComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    advance_percentage: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadCondiciones();
    }
  }, [isOpen, studioSlug]);

  const loadCondiciones = async () => {
    try {
      setLoading(true);
      const result = await obtenerCondicionesComerciales(studioSlug);

      if (result.success && result.data) {
        setCondiciones(result.data);
      } else {
        toast.error(result.error || 'Error al cargar condiciones');
      }
    } catch (error) {
      console.error('Error loading condiciones:', error);
      toast.error('Error al cargar condiciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      discount_percentage: '',
      advance_percentage: '',
    });
    setShowForm(true);
  };

  const handleEdit = (condicion: CondicionComercial) => {
    setEditingId(condicion.id);
    setFormData({
      name: condicion.name,
      description: condicion.description || '',
      discount_percentage: condicion.discount_percentage?.toString() || '',
      advance_percentage: condicion.advance_percentage?.toString() || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta condición comercial?')) {
      return;
    }

    try {
      const result = await eliminarCondicionComercial(studioSlug, id);
      if (result.success) {
        toast.success('Condición eliminada exitosamente');
        loadCondiciones();
        onRefresh();
      } else {
        toast.error(result.error || 'Error al eliminar condición');
      }
    } catch (error) {
      console.error('Error deleting condicion:', error);
      toast.error('Error al eliminar condición');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        nombre: formData.name,
        descripcion: formData.description || null,
        porcentaje_descuento: formData.discount_percentage || null,
        porcentaje_anticipo: formData.advance_percentage || null,
        status: 'active',
        orden: condiciones.length,
      };

      let result;
      if (editingId) {
        result = await actualizarCondicionComercial(studioSlug, editingId, data);
      } else {
        result = await crearCondicionComercial(studioSlug, data);
      }

      if (result.success) {
        toast.success(
          editingId ? 'Condición actualizada exitosamente' : 'Condición creada exitosamente'
        );
        setShowForm(false);
        setEditingId(null);
        loadCondiciones();
        onRefresh();
      } else {
        toast.error(result.error || 'Error al guardar condición');
      }
    } catch (error) {
      console.error('Error saving condicion:', error);
      toast.error('Error al guardar condición');
    }
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Gestionar Condiciones Comerciales"
      description="Crea y gestiona condiciones comerciales reutilizables"
      maxWidth="lg"
    >
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <ZenInput
            label="Nombre de la condición"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ej: Pago de contado 10%"
          />

          <ZenTextarea
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descripción opcional de la condición"
            rows={3}
          />

          <ZenInput
            label="Porcentaje de descuento"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.discount_percentage}
            onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
            placeholder="10"
          />

          <ZenInput
            label="Porcentaje de anticipo"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.advance_percentage}
            onChange={(e) => setFormData({ ...formData, advance_percentage: e.target.value })}
            placeholder="10"
          />

          <div className="flex items-center justify-end gap-3 pt-4">
            <ZenButton type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </ZenButton>
            <ZenButton type="submit" variant="primary">
              {editingId ? 'Actualizar' : 'Crear'} Condición
            </ZenButton>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              {condiciones.length} condición(es) comercial(es)
            </p>
            <ZenButton variant="primary" size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Condición
            </ZenButton>
          </div>

          {loading ? (
            <div className="text-center py-8 text-zinc-400">Cargando condiciones...</div>
          ) : condiciones.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-400 mb-4">No hay condiciones comerciales</p>
              <ZenButton variant="outline" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera condición
              </ZenButton>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {condiciones.map((condicion) => (
                <div
                  key={condicion.id}
                  className="p-4 border border-zinc-700 rounded-lg bg-zinc-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{condicion.name}</h4>
                      {condicion.description && (
                        <p className="text-sm text-zinc-400 mt-1">{condicion.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-zinc-300">
                        {condicion.discount_percentage && (
                          <span>Descuento: {condicion.discount_percentage}%</span>
                        )}
                        {condicion.advance_percentage && (
                          <span>Anticipo: {condicion.advance_percentage}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(condicion)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </ZenButton>
                      <ZenButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(condicion.id)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </ZenButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ZenDialog>
  );
}

