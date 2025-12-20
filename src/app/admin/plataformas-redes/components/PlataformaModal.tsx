'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { Button } from '@/components/ui/shadcn/button';
import { ZenInput } from '@/components/ui/zen';
import { Label } from '@/components/ui/shadcn/label';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Switch } from '@/components/ui/shadcn/switch';
import { Loader2 } from 'lucide-react';

interface PlataformaRedSocial {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  color: string | null;
  icono: string | null;
  urlBase: string | null;
  isActive: boolean;
  orden: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PlataformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  plataforma: PlataformaRedSocial | null;
  onSave: (plataformaData: Omit<PlataformaRedSocial, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const ICONOS_DISPONIBLES = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'music', label: 'TikTok' },
  { value: 'globe', label: 'Website' },
];

const COLORES_PREDEFINIDOS = [
  { value: '#1877F2', label: 'Facebook Blue' },
  { value: '#E4405F', label: 'Instagram Pink' },
  { value: '#000000', label: 'X Black' },
  { value: '#FF0000', label: 'YouTube Red' },
  { value: '#0077B5', label: 'LinkedIn Blue' },
  { value: '#25F4EE', label: 'TikTok Cyan' },
  { value: '#6B7280', label: 'Gray' },
];

export function PlataformaModal({ isOpen, onClose, plataforma, onSave }: PlataformaModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    descripcion: '',
    color: '#6B7280',
    icono: 'globe',
    urlBase: '',
    isActive: true,
    orden: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plataforma) {
      setFormData({
        nombre: plataforma.nombre,
        slug: plataforma.slug,
        descripcion: plataforma.descripcion || '',
        color: plataforma.color || '#6B7280',
        icono: plataforma.icono || 'globe',
        urlBase: plataforma.urlBase || '',
        isActive: plataforma.isActive,
        orden: plataforma.orden,
      });
    } else {
      setFormData({
        nombre: '',
        slug: '',
        descripcion: '',
        color: '#6B7280',
        icono: 'globe',
        urlBase: '',
        isActive: true,
        orden: 0,
      });
    }
  }, [plataforma, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }

    if (!formData.slug.trim()) {
      alert('El slug es requerido');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        ...formData,
        descripcion: formData.descripcion || null,
        color: formData.color || null,
        icono: formData.icono || null,
        urlBase: formData.urlBase || null,
      });
      onClose();
    } catch (error) {
      console.error('Error saving plataforma:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (nombre: string) => {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nombre = e.target.value;
    setFormData(prev => ({
      ...prev,
      nombre,
      slug: !plataforma ? generateSlug(nombre) : prev.slug, // Only auto-generate slug for new plataformas
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-white">
            {plataforma ? 'Editar Plataforma' : 'Nueva Plataforma'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ZenInput
              id="nombre"
              label="Nombre"
              required
              value={formData.nombre}
              onChange={handleNombreChange}
              placeholder="Facebook, Instagram, etc."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <ZenInput
              id="slug"
              label="Slug"
              required
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="facebook, instagram, etc."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="descripcion" className="text-white">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción de la plataforma..."
              className="bg-zinc-800 border-zinc-700 text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="icono" className="text-white">Ícono</Label>
              <select
                id="icono"
                value={formData.icono}
                onChange={(e) => setFormData(prev => ({ ...prev, icono: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2"
              >
                {ICONOS_DISPONIBLES.map((icono) => (
                  <option key={icono.value} value={icono.value}>
                    {icono.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="color" className="text-white">Color</Label>
              <div className="flex space-x-2">
                <ZenInput
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-10 bg-zinc-800 border-zinc-700"
                />
                <select
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-2"
                >
                  {COLORES_PREDEFINIDOS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <ZenInput
            id="urlBase"
            label="URL Base"
            value={formData.urlBase}
            onChange={(e) => setFormData(prev => ({ ...prev, urlBase: e.target.value }))}
            placeholder="https://facebook.com/"
            className="bg-zinc-800 border-zinc-700 text-white"
            hint="URL base para validación de enlaces (opcional)"
          />

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="isActive" className="text-white">Plataforma activa</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
