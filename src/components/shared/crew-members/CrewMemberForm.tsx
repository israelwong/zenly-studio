'use client';

import React, { useState } from 'react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { ZenSelect } from '@/components/ui/zen';
import { crearCrewMember, actualizarCrewMember } from '@/lib/actions/studio/crew';
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
  const [salaryType, setSalaryType] = useState<'fixed' | 'variable'>(
    initialMember?.fixed_salary ? 'fixed' : 'variable'
  );

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

  const handleTipoChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      tipo: value as PersonalType,
    }));
    if (errors.tipo) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.tipo;
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData((prev) => ({
      ...prev,
      phone: value,
    }));
    if (errors.phone) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phone;
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

    // Validación básica
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }
    if (!formData.tipo || formData.tipo === '') {
      newErrors.tipo = 'Selecciona un tipo de personal';
    }
    if (salaryType === 'fixed' && !formData.fixed_salary.trim()) {
      newErrors.fixed_salary = 'Ingresa el salario fijo';
    }
    if (salaryType === 'variable' && !formData.variable_salary.trim()) {
      newErrors.variable_salary = 'Ingresa el monto variable base';
    }
    if (formData.skill_ids.length === 0) {
      newErrors.skill_ids = 'Selecciona al menos una habilidad';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

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
          placeholder="Ej: Juan Pérez"
          required
          error={errors.name}
        />
      </div>

      {/* Email & Teléfono - 2 Columnas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-zinc-200 mb-2">
            Teléfono *
          </label>
          <ZenInput
            name="phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="1234567890"
            error={errors.phone}
            inputMode="numeric"
            required
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
            placeholder="juan@mi-studio.com"
            error={errors.email}
          />
        </div>


      </div>

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Tipo de Personal *
        </label>
        <ZenSelect
          value={formData.tipo}
          onValueChange={handleTipoChange}
          options={[
            { value: 'OPERATIVO', label: 'Operativo (fotografía, edición, etc.)' },
            { value: 'ADMINISTRATIVO', label: 'Administrativo' },
            { value: 'PROVEEDOR', label: 'Proveedor' },
          ]}
          error={errors.tipo}
          disableSearch
        />
      </div>

      {/* Tipo de Honorarios - Radio Buttons */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-3">
          Tipo de Honorarios *
        </label>
        <div className="space-y-3">
          {/* Radio: Salario Fijo */}
          <div className="flex items-start gap-3">
            <input
              type="radio"
              id="salary-fixed"
              name="salaryType"
              value="fixed"
              checked={salaryType === 'fixed'}
              onChange={(e) => setSalaryType(e.target.value as 'fixed')}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="salary-fixed" className="block text-sm font-medium text-zinc-200 cursor-pointer">
                Salario Fijo
              </label>
              <p className="text-xs text-zinc-400">
                Ingresa un monto fijo que recibirá por mes
              </p>
            </div>
          </div>

          {/* Radio: Honorarios Variables */}
          <div className="flex items-start gap-3">
            <input
              type="radio"
              id="salary-variable"
              name="salaryType"
              value="variable"
              checked={salaryType === 'variable'}
              onChange={(e) => setSalaryType(e.target.value as 'variable')}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="salary-variable" className="block text-sm font-medium text-zinc-200 cursor-pointer">
                Honorarios Variables
              </label>
              <p className="text-xs text-zinc-400">
                Se ganará según el presupuesto definido en la tarea asignada
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Salario Fijo - Solo si selecciona fijo */}
      {salaryType === 'fixed' && (
        <div>
          <label className="block text-sm font-medium text-zinc-200 mb-2">
            Monto Mensual
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
      )}

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

