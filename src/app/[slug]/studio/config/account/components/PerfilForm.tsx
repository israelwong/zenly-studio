'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZenButton } from '@/components/ui/zen';
import { ZenInput } from '@/components/ui/zen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Save, User, Mail, Phone, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { actualizarPerfil } from '@/lib/actions/studio/account/perfil.actions';
import { PerfilSchema, type PerfilForm as PerfilFormType } from '@/lib/actions/schemas/perfil-schemas';
import type { PerfilData } from '../types';
import { AvatarManager } from '@/components/shared/avatar';
import { useAvatarRefresh } from '@/hooks/useAvatarRefresh';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Badge } from '@/components/ui/shadcn/badge';

interface PerfilFormProps {
  studioSlug: string;
  perfil: PerfilData;
  onPerfilUpdate: (perfil: PerfilData) => void;
  /** Si true, el avatar es solo lectura (sincronizado con Google). */
  isGoogleLinked?: boolean;
}

export function PerfilForm({ studioSlug, perfil, onPerfilUpdate, isGoogleLinked = false }: PerfilFormProps) {
  const [loading, setLoading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(perfil.avatarUrl || null);
  const { triggerRefresh } = useAvatarRefresh();

  useEffect(() => {
    if (perfil.avatarUrl !== localAvatarUrl) {
      setLocalAvatarUrl(perfil.avatarUrl || null);
    }
  }, [perfil.avatarUrl, localAvatarUrl]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PerfilFormType>({
    resolver: zodResolver(PerfilSchema),
    defaultValues: {
      name: perfil.name,
      email: perfil.email,
      phone: perfil.phone,
    },
  });

  useEffect(() => {
    reset({ name: perfil.name, email: perfil.email, phone: perfil.phone });
  }, [perfil.name, perfil.email, perfil.phone, reset]);

  const onSubmit = async (data: PerfilFormType) => {
    setLoading(true);
    const loadingToast = toast.loading('Actualizando perfil...');

    try {
      const dataWithAvatar = { ...data, avatarUrl: localAvatarUrl || '' };
      const result = await actualizarPerfil(studioSlug, dataWithAvatar);

      if (result.success && result.data) {
        toast.dismiss(loadingToast);
        toast.success(result.message || 'Perfil actualizado exitosamente');
        triggerRefresh();
        onPerfilUpdate?.(result.data);
      } else {
        let errorMessage = 'Hubo un error al actualizar el perfil. Inténtalo de nuevo.';
        if (typeof result.error === 'string') {
          errorMessage = result.error;
        } else if (result.error && typeof result.error === 'object') {
          const fieldErrors = Object.values(result.error).flat();
          errorMessage = fieldErrors[0] || errorMessage;
        }
        toast.dismiss(loadingToast);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      toast.dismiss(loadingToast);
      toast.error('Error interno del servidor. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    try {
      const dataWithAvatar = {
        name: perfil.name,
        email: perfil.email,
        phone: perfil.phone,
        avatarUrl: newAvatarUrl,
      };
      const result = await actualizarPerfil(studioSlug, dataWithAvatar);
      if (result.success && result.data) {
        triggerRefresh();
        onPerfilUpdate(result.data);
        toast.success('Avatar actualizado exitosamente');
      } else {
        toast.error('Error al actualizar avatar');
      }
    } catch (error) {
      console.error('Error al actualizar avatar:', error);
      toast.error('Error al actualizar avatar');
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2 border-b border-zinc-800 pb-4">
          <User className="h-5 w-5" />
          <span>Información del perfil</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex justify-center lg:justify-start flex-shrink-0 w-full lg:w-auto">
              <div className="flex flex-col items-center gap-4">
                {isGoogleLinked ? (
                  <>
                    <div className="relative w-64 h-64 rounded-full border-2 border-zinc-400 overflow-hidden flex items-center justify-center bg-zinc-800/50">
                      <Avatar className="w-64 h-64 rounded-full border-0">
                        <AvatarImage
                          src={localAvatarUrl ?? perfil.avatarUrl ?? undefined}
                          alt="Avatar"
                          className="object-cover object-center"
                        />
                        <AvatarFallback className="flex items-center justify-center bg-zinc-700">
                          <User className="h-16 w-16 text-zinc-400" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <Badge variant="secondary" className="gap-1.5 bg-zinc-800 text-zinc-300 border-zinc-600">
                      <Lock className="h-3 w-3" />
                      Sincronizado con Google
                    </Badge>
                    <p className="text-xs text-zinc-400 text-center max-w-[240px]">
                      Tu foto de perfil está sincronizada con tu cuenta de Google.
                    </p>
                  </>
                ) : (
                  <>
                    <AvatarManager
                      url={localAvatarUrl}
                      onUpdate={handleAvatarUpdate}
                      onLocalUpdate={setLocalAvatarUrl}
                      studioSlug={studioSlug}
                      category="identidad"
                      subcategory="avatars"
                      size="lg"
                      variant="default"
                      loading={loading}
                      cropTitle="Ajustar foto de perfil"
                      cropDescription="Arrastra y redimensiona el área circular para ajustar tu foto de perfil."
                      cropInstructions={[
                        '• Arrastra para mover el área de recorte',
                        '• Usa las esquinas para redimensionar',
                        '• El área circular será tu foto de perfil',
                      ]}
                      successMessage="¡Perfecto! Tu foto de perfil se ha actualizado correctamente"
                      deleteMessage="Tu foto de perfil se ha eliminado"
                      showAdjustButton={true}
                    />
                    <p className="text-xs text-zinc-400 text-center">Foto de perfil (máximo 2MB)</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="space-y-4">
                <ZenInput
                  id="name"
                  label="Nombre Completo"
                  icon={User}
                  required
                  {...register('name')}
                  placeholder="Tu nombre completo"
                  error={errors.name?.message}
                />
                <ZenInput
                  id="email"
                  label="Correo Electrónico"
                  icon={Mail}
                  required
                  type="email"
                  {...register('email')}
                  placeholder="tu@email.com"
                  error={errors.email?.message}
                />
                <ZenInput
                  id="phone"
                  label="Teléfono"
                  icon={Phone}
                  required
                  {...register('phone')}
                  placeholder="+52 55 1234 5678"
                  error={errors.phone?.message}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-zinc-800">
            <ZenButton
              type="submit"
              loading={loading}
              loadingText="Actualizando..."
              icon={Save}
              iconPosition="left"
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
            >
              Actualizar Perfil
            </ZenButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
