'use client';

import { useState } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { ZenDialog } from '@/components/ui/zen/modals/ZenDialog';
import { ZenInput, ZenButton, ZenSelect } from '@/components/ui/zen';
import { crearCrewMemberRapido } from '@/lib/actions/studio/crew/crew.actions';
import { toast } from 'sonner';
import type { PersonalType } from '@prisma/client';
import { cn } from '@/lib/utils';

interface QuickAddCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrewCreated: (crewMemberId: string) => void;
  studioSlug: string;
}

const TIPOS_PERSONAL: Array<{ value: PersonalType; label: string }> = [
  { value: 'OPERATIVO', label: 'Operativo' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
  { value: 'PROVEEDOR', label: 'Proveedor' },
];

export function QuickAddCrewModal({
  isOpen,
  onClose,
  onCrewCreated,
  studioSlug,
}: QuickAddCrewModalProps) {
  const [name, setName] = useState('');
  const [tipo, setTipo] = useState<PersonalType>('OPERATIVO');
  const [salaryType, setSalaryType] = useState<'fixed' | 'variable'>('variable');
  const [fixedSalary, setFixedSalary] = useState('');
  const [salaryFrequency, setSalaryFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [variableSalary, setVariableSalary] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleSalaryTypeChange = (newType: 'fixed' | 'variable') => {
    setSalaryType(newType);
    // Limpiar valores del tipo no seleccionado
    if (newType === 'fixed') {
      setVariableSalary('');
      if (errors.variable_salary) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.variable_salary;
          return newErrors;
        });
      }
    } else {
      setFixedSalary('');
      setSalaryFrequency('monthly');
      if (errors.fixed_salary || errors.salary_frequency) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.fixed_salary;
          delete newErrors.salary_frequency;
          return newErrors;
        });
      }
    }
  };

  const handleCreate = async () => {
    const newErrors: Record<string, string> = {};

    // Validar nombre
    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar tipo de honorarios
    if (salaryType === 'fixed') {
      if (!fixedSalary.trim()) {
        newErrors.fixed_salary = 'El monto es obligatorio';
      } else {
        const fixedValue = parseFloat(fixedSalary);
        if (isNaN(fixedValue) || fixedValue <= 0) {
          newErrors.fixed_salary = 'El monto debe ser mayor a 0';
        }
      }
      if (!salaryFrequency) {
        newErrors.salary_frequency = 'La frecuencia de pago es obligatoria';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsCreating(true);
    try {
      const payload: {
        name: string;
        tipo: PersonalType;
        fixed_salary?: number | null;
        variable_salary?: number | null;
        salary_frequency?: string | null;
      } = {
        name: name.trim(),
        tipo,
      };

      // Construir payload según tipo de salario
      if (salaryType === 'fixed') {
        payload.fixed_salary = parseFloat(fixedSalary);
        payload.salary_frequency = salaryFrequency;
        payload.variable_salary = null;
      } else {
        payload.variable_salary = variableSalary ? parseFloat(variableSalary) : null;
        payload.fixed_salary = null;
        payload.salary_frequency = null;
      }

      const result = await crearCrewMemberRapido(studioSlug, payload);

      if (result.success && result.data) {
        toast.success(`Personal "${result.data.name}" agregado correctamente`);
        onCrewCreated(result.data.id);
        // Reset form
        setName('');
        setTipo('OPERATIVO');
        setSalaryType('variable');
        setFixedSalary('');
        setSalaryFrequency('monthly');
        setVariableSalary('');
        setErrors({});
        onClose();
      } else {
        toast.error(result.error || 'Error al crear personal');
      }
    } catch (error) {
      toast.error('Error al crear personal');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setTipo('OPERATIVO');
    setSalaryType('variable');
    setFixedSalary('');
    setSalaryFrequency('monthly');
    setVariableSalary('');
    setErrors({});
    onClose();
  };

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="Agregar personal rápidamente"
      description="Completa los datos mínimos para agregar personal y asignarlo a la tarea."
      maxWidth="sm"
      closeOnClickOutside={false}
      onCancel={handleCancel}
      cancelLabel="Cancelar"
      onSave={handleCreate}
      saveLabel="Agregar personal"
      isLoading={isCreating}
      zIndex={10070}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-400 mb-1.5 block">
            Nombre <span className="text-red-400">*</span>
          </label>
          <ZenInput
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.name;
                  return newErrors;
                });
              }
            }}
            placeholder="Ej: Juan Pérez"
            disabled={isCreating}
            autoFocus
            error={errors.name}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim().length >= 2 && !isCreating) {
                handleCreate();
              }
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-400 mb-1.5 block">
            Tipo <span className="text-red-400">*</span>
          </label>
          <ZenSelect
            value={tipo}
            onValueChange={(value) => setTipo(value as PersonalType)}
            disabled={isCreating}
            options={TIPOS_PERSONAL.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
          />
        </div>

        {/* Tipo de Honorarios */}
        <div>
          <label className="text-sm font-medium text-zinc-400 mb-3 block">
            Tipo de Honorarios <span className="text-red-400">*</span>
          </label>
          <div className="space-y-3">
            {/* Radio: Honorarios Variables */}
            <div className="flex items-start gap-3">
              <input
                type="radio"
                id="salary-variable-quick"
                name="salaryType"
                value="variable"
                checked={salaryType === 'variable'}
                onChange={() => handleSalaryTypeChange('variable')}
                className="mt-1"
                disabled={isCreating}
              />
              <div className="flex-1">
                <label htmlFor="salary-variable-quick" className="block text-sm font-medium text-zinc-200 cursor-pointer">
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
                id="salary-fixed-quick"
                name="salaryType"
                value="fixed"
                checked={salaryType === 'fixed'}
                onChange={() => handleSalaryTypeChange('fixed')}
                className="mt-1"
                disabled={isCreating}
              />
              <div className="flex-1">
                <label htmlFor="salary-fixed-quick" className="block text-sm font-medium text-zinc-200 cursor-pointer">
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
              <label className="text-sm font-medium text-zinc-400 mb-1.5 block">
                Monto <span className="text-red-400">*</span>
              </label>
              <ZenInput
                type="number"
                value={fixedSalary}
                onChange={(e) => {
                  setFixedSalary(e.target.value);
                  if (errors.fixed_salary) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.fixed_salary;
                      return newErrors;
                    });
                  }
                }}
                placeholder="15000"
                min="0"
                step="0.01"
                disabled={isCreating}
                error={errors.fixed_salary}
              />
            </div>

            {/* Selector de Frecuencia */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 pb-2 block">
                Frecuencia de Pago <span className="text-red-400">*</span>
              </label>
              {errors.salary_frequency && (
                <p className="text-xs text-red-400 -mt-1 mb-1">{errors.salary_frequency}</p>
              )}
              <div className="space-y-2">
                <label
                  htmlFor="frequency-weekly-quick"
                  className={cn(
                    'relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    salaryFrequency === 'weekly'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600',
                    isCreating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <input
                    type="radio"
                    id="frequency-weekly-quick"
                    name="salary_frequency"
                    value="weekly"
                    checked={salaryFrequency === 'weekly'}
                    onChange={(e) => setSalaryFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                    className="sr-only"
                    disabled={isCreating}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className={cn(
                        'h-4 w-4 flex-shrink-0',
                        salaryFrequency === 'weekly' ? 'text-emerald-400' : 'text-zinc-400'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        salaryFrequency === 'weekly' ? 'text-emerald-200' : 'text-zinc-300'
                      )}>
                        Semanal
                      </span>
                      {salaryFrequency === 'weekly' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </label>
                <label
                  htmlFor="frequency-biweekly-quick"
                  className={cn(
                    'relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    salaryFrequency === 'biweekly'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600',
                    isCreating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <input
                    type="radio"
                    id="frequency-biweekly-quick"
                    name="salary_frequency"
                    value="biweekly"
                    checked={salaryFrequency === 'biweekly'}
                    onChange={(e) => setSalaryFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                    className="sr-only"
                    disabled={isCreating}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className={cn(
                        'h-4 w-4 flex-shrink-0',
                        salaryFrequency === 'biweekly' ? 'text-emerald-400' : 'text-zinc-400'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        salaryFrequency === 'biweekly' ? 'text-emerald-200' : 'text-zinc-300'
                      )}>
                        Quincenal
                      </span>
                      {salaryFrequency === 'biweekly' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </label>
                <label
                  htmlFor="frequency-monthly-quick"
                  className={cn(
                    'relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    salaryFrequency === 'monthly'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600',
                    isCreating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <input
                    type="radio"
                    id="frequency-monthly-quick"
                    name="salary_frequency"
                    value="monthly"
                    checked={salaryFrequency === 'monthly'}
                    onChange={(e) => setSalaryFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                    className="sr-only"
                    disabled={isCreating}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className={cn(
                        'h-4 w-4 flex-shrink-0',
                        salaryFrequency === 'monthly' ? 'text-emerald-400' : 'text-zinc-400'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        salaryFrequency === 'monthly' ? 'text-emerald-200' : 'text-zinc-300'
                      )}>
                        Mensual
                      </span>
                      {salaryFrequency === 'monthly' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </ZenDialog>
  );
}
