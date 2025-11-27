'use client';

import React, { useState, useEffect } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { ZenSelect } from '@/components/ui/zen';
import { crearCrewMember, actualizarCrewMember, obtenerCrewSkills } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';
import { SkillsInput } from './SkillsInput';
import { PersonalType } from '@prisma/client';

interface CrewMemberFormProps {
  studioSlug: string;
  initialMember?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tipo: string;
    fixed_salary: number | null;
    variable_salary: number | null;
    skills: Array<{ id: string; name: string; is_primary: boolean }>;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CrewMemberForm({
  studioSlug,
  initialMember,
  onSuccess,
  onCancel,
}: CrewMemberFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: initialMember?.name || '',
    email: initialMember?.email || '',
    phone: initialMember?.phone || '',
    tipo: (initialMember?.tipo as PersonalType) || 'OPERATIVO',
    fixed_salary: initialMember?.fixed_salary?.toString() || '',
    variable_salary: initialMember?.variable_salary?.toString() || '',
    skill_ids: initialMember?.skills.map((s) => s.id) || [],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSkillsChange = (skillIds: string[]) => {
    setFormData((prev) => ({
      ...prev,
      skill_ids: skillIds,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        tipo: formData.tipo,
        fixed_salary: formData.fixed_salary ? parseFloat(formData.fixed_salary) : undefined,
        variable_salary: formData.variable_salary ? parseFloat(formData.variable_salary) : undefined,
        skill_ids: formData.skill_ids,
      };

      let result;
      if (initialMember) {
        result = await actualizarCrewMember(studioSlug, initialMember.id, payload);
      } else {
        result = await crearCrewMember(studioSlug, payload);
      }

      if (result.success) {
        onSuccess();
      } else {
        toast.error(result.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Error al guardar personal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Nombre *
        </label>
        <ZenInput
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej: Israel Wong"
          required
          error={errors.name}
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Correo (opcional)
        </label>
        <ZenInput
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="israel@studio.com"
          error={errors.email}
        />
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Teléfono (opcional)
        </label>
        <ZenInput
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+52 123 456 7890"
          error={errors.phone}
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Tipo de Personal *
        </label>
        <ZenSelect
          name="tipo"
          value={formData.tipo}
          onChange={handleChange}
          options={[
            { value: 'OPERATIVO', label: 'Operativo (fotografía, edición, etc.)' },
            { value: 'ADMINISTRATIVO', label: 'Administrativo' },
            { value: 'PROVEEDOR', label: 'Proveedor' },
          ]}
        />
      </div>

      {/* Salario Fijo */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Salario Fijo (opcional)
        </label>
        <ZenInput
          name="fixed_salary"
          type="number"
          value={formData.fixed_salary}
          onChange={handleChange}
          placeholder="15000"
          min="0"
          step="0.01"
          error={errors.fixed_salary}
        />
      </div>

      {/* Salario Variable */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Salario Variable (opcional)
        </label>
        <ZenInput
          name="variable_salary"
          type="number"
          value={formData.variable_salary}
          onChange={handleChange}
          placeholder="5000"
          min="0"
          step="0.01"
          error={errors.variable_salary}
        />
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Habilidades/Roles *
        </label>
        <SkillsInput
          studioSlug={studioSlug}
          selectedSkillIds={formData.skill_ids}
          onSkillsChange={handleSkillsChange}
          error={errors.skill_ids}
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4 border-t border-zinc-700">
        <ZenButton
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </ZenButton>
        <ZenButton
          type="submit"
          loading={loading}
          disabled={loading}
        >
          {initialMember ? 'Actualizar' : 'Crear'}
        </ZenButton>
      </div>
    </form>
  );
}

