'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { ZenButton } from '@/components/ui/zen';
import { ZenInput } from '@/components/ui/zen';
import {
  SetPasswordSchema,
  type SetPasswordForm as SetPasswordFormType,
} from '@/lib/actions/schemas/seguridad/seguridad-schemas';
import { establecerPassword } from '@/lib/actions/studio/account/seguridad/seguridad.actions';
import { toast } from 'sonner';
import { Key, Eye, EyeOff } from 'lucide-react';

interface SetPasswordFormProps {
  studioSlug: string;
  onSuccess?: () => void;
  /** Si true, no envuelve en Card (para usar dentro de modal) */
  variant?: 'card' | 'inline';
}

export function SetPasswordForm({ studioSlug, onSuccess, variant = 'card' }: SetPasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SetPasswordFormType>({
    resolver: zodResolver(SetPasswordSchema),
  });

  const onSubmit = async (data: SetPasswordFormType) => {
    setLoading(true);
    const loadingToast = toast.loading('Estableciendo contraseña...');

    try {
      const result = await establecerPassword(studioSlug, data);

      if (result.success) {
        toast.dismiss(loadingToast);
        toast.success(result.message ?? 'Contraseña establecida');
        reset();
        onSuccess?.();
      } else {
        toast.dismiss(loadingToast);
        toast.error(result.error ?? 'Error al establecer la contraseña');
      }
    } catch (error) {
      console.error('Error al establecer contraseña:', error);
      toast.dismiss(loadingToast);
      toast.error('Error interno del servidor');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
          <div className="relative">
            <ZenInput
              id="newPassword"
              label="Nueva contraseña"
              type={showNewPassword ? 'text' : 'password'}
              required
              {...register('newPassword')}
              placeholder="Elige una contraseña segura"
              error={errors.newPassword?.message}
              icon={Key}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-8 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <ZenInput
              id="confirmPassword"
              label="Confirmar contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              {...register('confirmPassword')}
              placeholder="Repite la contraseña"
              error={errors.confirmPassword?.message}
              icon={Key}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-8 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
            <h4 className="text-blue-300 text-sm font-medium mb-2">Requisitos:</h4>
            <ul className="text-blue-200 text-xs space-y-1">
              <li>• Mínimo 8 caracteres</li>
              <li>• Al menos una mayúscula, una minúscula y un número</li>
            </ul>
          </div>

          <div className="flex justify-end pt-4">
            <ZenButton
              type="submit"
              loading={loading}
              loadingText="Estableciendo..."
              icon={Key}
              iconPosition="left"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Establecer contraseña
            </ZenButton>
          </div>
        </form>
  );

  if (variant === 'inline') {
    return <div className="min-w-0">{formContent}</div>;
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Key className="h-5 w-5" />
          Establecer contraseña
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">{formContent}</CardContent>
    </Card>
  );
}
