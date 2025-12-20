'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { ZenButton } from '@/components/ui/zen';
import { ZenInput } from '@/components/ui/zen';
import { PasswordChangeSchema, type PasswordChangeForm as PasswordChangeFormType } from '@/lib/actions/schemas/seguridad/seguridad-schemas';
import { cambiarPassword } from '@/lib/actions/studio/account/seguridad/seguridad.actions';
import { toast } from 'sonner';
import { Key, Eye, EyeOff, Shield } from 'lucide-react';

interface PasswordChangeFormProps {
    studioSlug: string;
}

export function PasswordChangeForm({ studioSlug }: PasswordChangeFormProps) {
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<PasswordChangeFormType>({
        resolver: zodResolver(PasswordChangeSchema)
    });

    const onSubmit = async (data: PasswordChangeFormType) => {
        setLoading(true);
        const loadingToast = toast.loading('Cambiando contraseña...');

        try {
            const result = await cambiarPassword(studioSlug, data);

            if (result.success) {
                toast.dismiss(loadingToast);
                toast.success(result.message || 'Contraseña actualizada exitosamente');
                reset();
            } else {
                toast.dismiss(loadingToast);
                toast.error(result.error || 'Error al cambiar la contraseña');
            }
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            toast.dismiss(loadingToast);
            toast.error('Error interno del servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Cambiar Contraseña
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
                    {/* Contraseña actual */}
                    <div className="relative">
                        <ZenInput
                            id="currentPassword"
                            label="Contraseña Actual"
                            type={showCurrentPassword ? 'text' : 'password'}
                            required
                            {...register('currentPassword')}
                            placeholder="Ingresa tu contraseña actual"
                            error={errors.currentPassword?.message}
                            icon={Shield}
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-8 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* Nueva contraseña */}
                    <div className="relative">
                        <ZenInput
                            id="newPassword"
                            label="Nueva Contraseña"
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            {...register('newPassword')}
                            placeholder="Ingresa tu nueva contraseña"
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

                    {/* Confirmar contraseña */}
                    <div className="relative">
                        <ZenInput
                            id="confirmPassword"
                            label="Confirmar Nueva Contraseña"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            {...register('confirmPassword')}
                            placeholder="Confirma tu nueva contraseña"
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

                    {/* Información de seguridad */}
                    <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                        <h4 className="text-blue-300 text-sm font-medium mb-2">Requisitos de seguridad:</h4>
                        <ul className="text-blue-200 text-xs space-y-1">
                            <li>• Mínimo 8 caracteres</li>
                            <li>• Al menos una letra mayúscula</li>
                            <li>• Al menos una letra minúscula</li>
                            <li>• Al menos un número</li>
                        </ul>
                    </div>

                    {/* Botón de guardar */}
                    <div className="flex justify-end pt-4">
                        <ZenButton
                            type="submit"
                            loading={loading}
                            loadingText="Cambiando..."
                            icon={Key}
                            iconPosition="left"
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Cambiar Contraseña
                        </ZenButton>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
