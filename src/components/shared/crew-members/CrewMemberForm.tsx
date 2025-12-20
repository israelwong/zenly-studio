'use client';

import React, { useState, useEffect } from 'react';
import { Settings2, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { ZenButton, ZenInput, ZenSelect, ZenSwitch, ZenConfirmModal } from '@/components/ui/zen';
import { crearCrewMember, actualizarCrewMember, eliminarCrewMember, checkCrewMemberAssociations } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';
import { SkillsInput } from './SkillsInput';
import { CrewSkillsManageModal } from './CrewSkillsManageModal';
import { PersonalType } from '@prisma/client';
import { cn } from '@/lib/utils';

interface CrewMemberFormProps {
  studioSlug: string;
  initialMember?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tipo: string;
    status?: string;
    fixed_salary: number | null;
    salary_frequency?: string | null;
    variable_salary: number | null;
    skills: Array<{ id: string; name: string; is_primary: boolean }>;
  } | null;
  onSuccess: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function CrewMemberForm({
  studioSlug,
  initialMember,
  onSuccess,
  onCancel,
  onDelete,
}: CrewMemberFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [salaryType, setSalaryType] = useState<'fixed' | 'variable'>(
    initialMember?.fixed_salary ? 'fixed' : 'variable'
  );

  const handleSalaryTypeChange = (newType: 'fixed' | 'variable') => {
    setSalaryType(newType);
    // Limpiar valores del tipo no seleccionado
    if (newType === 'fixed') {
      setFormData((prev) => ({
        ...prev,
        variable_salary: '',
        salary_frequency: prev.salary_frequency || 'monthly', // Mantener o establecer default
      }));
      if (errors.variable_salary) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.variable_salary;
          return newErrors;
        });
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        fixed_salary: '',
        salary_frequency: '', // Limpiar frecuencia si no es fijo
      }));
      if (errors.fixed_salary) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.fixed_salary;
          return newErrors;
        });
      }
    }
  };
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  // Función helper para inicializar formData
  const getInitialFormData = () => {
    if (!initialMember) {
      return {
        name: '',
        email: '',
        phone: '',
        tipo: 'OPERATIVO' as PersonalType,
        status: 'activo',
        fixed_salary: '',
        salary_frequency: 'monthly',
        variable_salary: '',
        skill_ids: [] as string[],
      };
    }
    return {
      name: initialMember.name || '',
      email: initialMember.email ?? '',
      phone: initialMember.phone ?? '', // null/undefined -> ''
      tipo: (initialMember.tipo as PersonalType) || 'OPERATIVO',
      status: initialMember.status || 'activo',
      fixed_salary: initialMember.fixed_salary?.toString() || '',
      salary_frequency: initialMember.salary_frequency || 'monthly',
      variable_salary: initialMember.variable_salary?.toString() || '',
      skill_ids: initialMember.skills?.map((s) => s.id) || [],
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());

  // Actualizar formData cuando initialMember cambia (para edición)
  useEffect(() => {
    if (initialMember) {
      setFormData({
        name: initialMember.name || '',
        email: initialMember.email ?? '',
        phone: initialMember.phone ?? '', // null/undefined -> ''
        tipo: (initialMember.tipo as PersonalType) || 'OPERATIVO',
        status: initialMember.status || 'activo',
        fixed_salary: initialMember.fixed_salary?.toString() || '',
        salary_frequency: initialMember.salary_frequency || 'monthly',
        variable_salary: initialMember.variable_salary?.toString() || '',
        skill_ids: initialMember.skills?.map((s) => s.id) || [],
      });
      setSalaryType(initialMember.fixed_salary ? 'fixed' : 'variable');
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        tipo: 'OPERATIVO',
        status: 'activo',
        fixed_salary: '',
        salary_frequency: 'monthly',
        variable_salary: '',
        skill_ids: [],
      });
      setSalaryType('variable');
    }
    // Limpiar errores al cambiar de miembro
    setErrors({});
  }, [initialMember?.id]); // Solo cuando cambia el ID del miembro

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
    let value = e.target.value;

    // Remover todo lo que no sea número (+, espacios, guiones, paréntesis, etc.)
    value = value.replace(/\D/g, '');

    // Si viene con código de país de México (52) y tiene más de 10 dígitos, remover el código
    if (value.length > 10 && value.startsWith('52')) {
      value = value.slice(2);
    }

    // Limitar a 10 dígitos
    value = value.slice(0, 10);

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

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');

    // Remover todo lo que no sea número
    let value = pastedText.replace(/\D/g, '');

    // Si viene con código de país de México (52) y tiene más de 10 dígitos, remover el código
    if (value.length > 10 && value.startsWith('52')) {
      value = value.slice(2);
    }

    // Limitar a 10 dígitos
    value = value.slice(0, 10);

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
    if (!formData.tipo) {
      newErrors.tipo = 'Selecciona un tipo de personal';
    }
    if (salaryType === 'fixed') {
      if (!formData.fixed_salary.trim()) {
        newErrors.fixed_salary = 'El monto es obligatorio';
      } else {
        const fixedValue = parseFloat(formData.fixed_salary);
        if (isNaN(fixedValue) || fixedValue <= 0) {
          newErrors.fixed_salary = 'El monto debe ser mayor a 0';
        }
      }
      if (!formData.salary_frequency) {
        newErrors.salary_frequency = 'La frecuencia de pago es obligatoria';
      }
    }
    // Para honorarios variables, el monto es opcional (se calcula según presupuesto)
    // No validamos variable_salary aquí ya que no hay campo visible
    if (formData.skill_ids.length === 0) {
      newErrors.skill_ids = 'Selecciona al menos una habilidad';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // Construir payload según tipo de salario
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email?.trim() || '',
        phone: formData.phone?.trim() || '',
        tipo: formData.tipo,
        status: formData.status,
        skill_ids: formData.skill_ids,
      };

      // Si es salario fijo, establecer fixed_salary, salary_frequency y limpiar variable_salary
      if (salaryType === 'fixed') {
        const fixedValue = parseFloat(formData.fixed_salary);
        payload.fixed_salary = fixedValue;
        payload.salary_frequency = formData.salary_frequency || 'monthly';
        payload.variable_salary = null;
      } else {
        // Si es variable, establecer variable_salary y limpiar fixed_salary y salary_frequency
        const variableValue = formData.variable_salary
          ? parseFloat(formData.variable_salary)
          : null;
        payload.variable_salary = variableValue;
        payload.fixed_salary = null;
        payload.salary_frequency = null;
      }

      let result;
      if (initialMember) {
        result = await actualizarCrewMember(studioSlug, initialMember.id, payload);
      } else {
        result = await crearCrewMember(studioSlug, payload);
      }

      if (result?.success) {
        // onSuccess ya muestra el toast, no duplicar
        onSuccess(payload);
      } else {
        const errorMessage = result?.error || 'Error al guardar';
        toast.error(errorMessage);

        // Si hay errores de validación específicos, mostrarlos en los campos
        if (errorMessage.includes('nombre')) {
          setErrors((prev) => ({ ...prev, name: errorMessage }));
        } else if (errorMessage.includes('teléfono') || errorMessage.includes('phone')) {
          setErrors((prev) => ({ ...prev, phone: errorMessage }));
        } else if (errorMessage.includes('salario fijo') || errorMessage.includes('fixed_salary')) {
          setErrors((prev) => ({ ...prev, fixed_salary: errorMessage }));
        } else if (errorMessage.includes('salario variable') || errorMessage.includes('variable_salary')) {
          setErrors((prev) => ({ ...prev, variable_salary: errorMessage }));
        }
      }
    } catch (error) {
      console.error('[CREW FORM] Exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar personal';
      toast.error(errorMessage);
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
            onPaste={handlePhonePaste}
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


          {/* Radio: Honorarios Variables */}
          <div className="flex items-start gap-3">
            <input
              type="radio"
              id="salary-variable"
              name="salaryType"
              value="variable"
              checked={salaryType === 'variable'}
              onChange={() => handleSalaryTypeChange('variable')}
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

          {/* Radio: Salario Fijo */}
          <div className="flex items-start gap-3">
            <input
              type="radio"
              id="salary-fixed"
              name="salaryType"
              value="fixed"
              checked={salaryType === 'fixed'}
              onChange={() => handleSalaryTypeChange('fixed')}
              className="mt-1"
            />
            <div className="flex-1">
              <label htmlFor="salary-fixed" className="block text-sm font-medium text-zinc-200 cursor-pointer">
                Salario Fijo
              </label>
              <p className="text-xs text-zinc-400">
                Ingresa un monto fijo con frecuencia configurable (semanal, quincenal o mensual)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Salario Fijo - Solo si selecciona fijo */}
      {salaryType === 'fixed' && (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-2">
              Monto *
            </label>
            <ZenInput
              name="fixed_salary"
              type="number"
              value={formData.fixed_salary}
              onChange={handleChange}
              placeholder="15000"
              min="0"
              step="0.01"
              required
              error={errors.fixed_salary}
            />
          </div>

          {/* Selector de Frecuencia */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 pb-2">
              Frecuencia de Pago *
            </label>
            {errors.salary_frequency && (
              <p className="text-xs text-red-400 -mt-1 mb-1">{errors.salary_frequency}</p>
            )}
            <div className="space-y-2">
              <label
                htmlFor="frequency-weekly"
                className={cn(
                  'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                  formData.salary_frequency === 'weekly'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                )}
              >
                <input
                  type="radio"
                  id="frequency-weekly"
                  name="salary_frequency"
                  value="weekly"
                  checked={formData.salary_frequency === 'weekly'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salary_frequency: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className={cn(
                      'h-4 w-4 flex-shrink-0',
                      formData.salary_frequency === 'weekly' ? 'text-emerald-400' : 'text-zinc-400'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      formData.salary_frequency === 'weekly' ? 'text-emerald-200' : 'text-zinc-300'
                    )}>
                      Semanal
                    </span>
                    {formData.salary_frequency === 'weekly' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                    )}
                  </div>
                </div>
              </label>
              <label
                htmlFor="frequency-biweekly"
                className={cn(
                  'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                  formData.salary_frequency === 'biweekly'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                )}
              >
                <input
                  type="radio"
                  id="frequency-biweekly"
                  name="salary_frequency"
                  value="biweekly"
                  checked={formData.salary_frequency === 'biweekly'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salary_frequency: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className={cn(
                      'h-4 w-4 flex-shrink-0',
                      formData.salary_frequency === 'biweekly' ? 'text-emerald-400' : 'text-zinc-400'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      formData.salary_frequency === 'biweekly' ? 'text-emerald-200' : 'text-zinc-300'
                    )}>
                      Quincenal
                    </span>
                    {formData.salary_frequency === 'biweekly' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                    )}
                  </div>
                </div>
              </label>
              <label
                htmlFor="frequency-monthly"
                className={cn(
                  'relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                  formData.salary_frequency === 'monthly'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                )}
              >
                <input
                  type="radio"
                  id="frequency-monthly"
                  name="salary_frequency"
                  value="monthly"
                  checked={formData.salary_frequency === 'monthly'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, salary_frequency: e.target.value }))}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Calendar className={cn(
                      'h-4 w-4 flex-shrink-0',
                      formData.salary_frequency === 'monthly' ? 'text-emerald-400' : 'text-zinc-400'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      formData.salary_frequency === 'monthly' ? 'text-emerald-200' : 'text-zinc-300'
                    )}>
                      Mensual
                    </span>
                    {formData.salary_frequency === 'monthly' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                    )}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </>
      )}

      {/* Skills */}
      <div className="border-t border-zinc-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-zinc-200">
            Habilidades/Roles *
          </label>
          <button
            type="button"
            onClick={() => setIsSkillsModalOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            title="Gestionar habilidades"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
        <SkillsInput
          studioSlug={studioSlug}
          selectedSkillIds={formData.skill_ids}
          onSkillsChange={handleSkillsChange}
          error={errors.skill_ids}
        />
      </div>

      {/* Estatus - Solo si está editando */}
      {initialMember && (
        <div className="border-t border-zinc-700 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-1">
                Estado
              </label>
              <p className="text-xs text-zinc-400">
                {formData.status === 'activo' ? 'El personal está activo y disponible' : 'El personal está inactivo'}
              </p>
            </div>
            <ZenSwitch
              checked={formData.status === 'activo'}
              onCheckedChange={(checked) => {
                setFormData((prev) => ({
                  ...prev,
                  status: checked ? 'activo' : 'inactivo',
                }));
              }}
              label={formData.status === 'activo' ? 'Activo' : 'Inactivo'}
            />
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 pt-6 border-t border-zinc-700">
        {initialMember && onDelete && (
          <ZenButton
            type="button"
            variant="ghost"
            onClick={async () => {
              try {
                // Verificar asociaciones antes de mostrar el modal
                const checkResult = await checkCrewMemberAssociations(studioSlug, initialMember.id);

                if (!checkResult.success) {
                  toast.error(checkResult.error || 'Error al verificar asociaciones');
                  return;
                }

                if (checkResult.hasAssociations) {
                  // Mensaje de error específico según el tipo de asociación
                  if (checkResult.hasEvents && checkResult.hasTasks) {
                    toast.error('No se puede eliminar porque tiene eventos y tareas asociadas.');
                  } else if (checkResult.hasEvents) {
                    toast.error('No se puede eliminar porque tiene eventos asociados.');
                  } else if (checkResult.hasTasks) {
                    toast.error('No se puede eliminar porque tiene tareas asociadas.');
                  }
                  return;
                }

                // Si no tiene asociaciones, abrir modal de confirmación
                setIsDeleteModalOpen(true);
              } catch (error) {
                console.error('Error checking crew member associations:', error);
                toast.error('Error al verificar asociaciones del personal');
              }
            }}
            disabled={loading || isDeleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            size="sm"
          >
            <Trash2 className="h-4 w-4" />
          </ZenButton>
        )}
        <ZenButton
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading || isDeleting}
          className="flex-1"
        >
          Cancelar
        </ZenButton>
        <ZenButton
          type="submit"
          loading={loading}
          disabled={loading || isDeleting}
          className="flex-1"
        >
          {initialMember ? 'Actualizar' : 'Crear'}
        </ZenButton>
      </div>

      {/* Modal de gestión de habilidades */}
      <CrewSkillsManageModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        studioSlug={studioSlug}
      />

      {/* Modal de confirmación de eliminación */}
      {initialMember && (
        <ZenConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={async () => {
            if (!initialMember) return;

            try {
              setIsDeleting(true);

              // Llamar onDelete primero para actualización optimista
              onDelete?.();

              // Eliminar en servidor
              const result = await eliminarCrewMember(studioSlug, initialMember.id);

              if (result.success) {
                toast.success('Personal eliminado exitosamente');
                setIsDeleteModalOpen(false);
                onCancel();
              } else {
                toast.error(result.error || 'Error al eliminar');
              }
            } catch (error) {
              console.error('Error deleting crew member:', error);
              toast.error('Error al eliminar personal');
            } finally {
              setIsDeleting(false);
            }
          }}
          title="Eliminar personal"
          description={`¿Estás seguro de que deseas eliminar a ${initialMember.name}? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
          loading={isDeleting}
          loadingText="Eliminando..."
        />
      )}
    </form>
  );
}

