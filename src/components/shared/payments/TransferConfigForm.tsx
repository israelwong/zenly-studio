'use client';

import React, { useState } from 'react';
import { Building2, User, CreditCard } from 'lucide-react';
import { ZenButton, ZenInput } from '@/components/ui/zen';
import { TransferConfigForm as TransferConfigFormType } from '@/lib/actions/schemas/metodos-pago-schemas';

interface TransferConfigFormProps {
  studioSlug: string;
  metodoId: string;
  initialData?: {
    banco?: string | null;
    beneficiario?: string | null;
    cuenta_clabe?: string | null;
  };
  onSubmit: (data: TransferConfigFormType) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function TransferConfigForm({
  studioSlug,
  metodoId,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: TransferConfigFormProps) {
  const [banco, setBanco] = useState<string>(initialData?.banco || '');
  const [beneficiario, setBeneficiario] = useState<string>(initialData?.beneficiario || '');
  const [cuentaClabe, setCuentaClabe] = useState<string>(initialData?.cuenta_clabe || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!banco.trim()) {
      newErrors.banco = 'El nombre del banco es requerido';
    } else if (banco.trim().length < 2) {
      newErrors.banco = 'El nombre del banco debe tener al menos 2 caracteres';
    }
    
    if (!beneficiario.trim()) {
      newErrors.beneficiario = 'El beneficiario es requerido';
    } else if (beneficiario.trim().length < 2) {
      newErrors.beneficiario = 'El beneficiario debe tener al menos 2 caracteres';
    }
    
    if (!cuentaClabe.trim()) {
      newErrors.cuentaClabe = 'La cuenta CLABE es requerida';
    } else if (!/^[0-9]{18}$/.test(cuentaClabe)) {
      newErrors.cuentaClabe = 'La CLABE debe tener exactamente 18 dígitos numéricos';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    await onSubmit({
      banco: banco.trim(),
      beneficiario: beneficiario.trim(),
      cuenta_clabe: cuentaClabe.trim(),
    });
  };

  const handleClabeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 18);
    setCuentaClabe(value);
    if (errors.cuentaClabe) {
      setErrors(prev => ({ ...prev, cuentaClabe: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Banco */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Banco *
        </label>
        <ZenInput
          type="text"
          value={banco}
          onChange={(e) => {
            setBanco(e.target.value);
            if (errors.banco) setErrors(prev => ({ ...prev, banco: '' }));
          }}
          placeholder="Ej: Banco Santander, BBVA, etc."
          error={errors.banco}
          disabled={loading}
        />
      </div>

      {/* Beneficiario */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <User className="h-4 w-4" />
          Beneficiario *
        </label>
        <ZenInput
          type="text"
          value={beneficiario}
          onChange={(e) => {
            setBeneficiario(e.target.value);
            if (errors.beneficiario) setErrors(prev => ({ ...prev, beneficiario: '' }));
          }}
          placeholder="Nombre del titular de la cuenta"
          error={errors.beneficiario}
          disabled={loading}
        />
      </div>

      {/* Cuenta CLABE */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Cuenta CLABE (18 dígitos) *
        </label>
        <ZenInput
          type="text"
          value={cuentaClabe}
          onChange={handleClabeChange}
          placeholder="123456789012345678"
          maxLength={18}
          error={errors.cuentaClabe}
          disabled={loading}
        />
        <p className="text-xs text-zinc-400">
          Ingresa la CLABE de 18 dígitos (solo números)
        </p>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-2 pt-4">
        <ZenButton
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </ZenButton>
        <ZenButton
          type="submit"
          variant="primary"
          disabled={loading}
          loading={loading}
          className="flex-1"
        >
          Guardar configuración
        </ZenButton>
      </div>
    </form>
  );
}

