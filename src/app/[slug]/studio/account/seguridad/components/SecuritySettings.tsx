'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { ZenButton } from '@/components/ui/zen';
import { SecuritySettingsSchema, type SecuritySettingsForm as SecuritySettingsFormType } from '@/lib/actions/schemas/seguridad/seguridad-schemas';
import { obtenerConfiguracionesSeguridad, actualizarConfiguracionesSeguridad } from '@/lib/actions/studio/account/seguridad/seguridad.actions';
import { toast } from 'sonner';
import { Settings, Bell, Shield, Clock, Save } from 'lucide-react';
import type { SecuritySettings } from '../types';

interface SecuritySettingsProps {
    studioSlug: string;
}

export function SecuritySettingsComponent({ studioSlug }: SecuritySettingsProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [sessionTimeout, setSessionTimeout] = useState(30);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue
    } = useForm<SecuritySettingsFormType>({
        resolver: zodResolver(SecuritySettingsSchema),
        defaultValues: {
            email_notifications: true,
            device_alerts: true,
            session_timeout: 30 // 30 minutos por defecto
        }
    });

    // Cargar configuraciones iniciales
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await obtenerConfiguracionesSeguridad(studioSlug);
                if (data) {
                    setSettings(data);
                    setValue('email_notifications', data.email_notifications);
                    setValue('device_alerts', data.device_alerts);
                    setValue('session_timeout', data.session_timeout);
                    setSessionTimeout(data.session_timeout);
                }
            } catch (error) {
                console.error('Error al cargar configuraciones:', error);
                toast.error('Error al cargar configuraciones de seguridad');
            } finally {
                setInitialLoading(false);
            }
        };

        loadSettings();
    }, [studioSlug, setValue]);

    const onSubmit = async (data: SecuritySettingsFormType) => {
        setLoading(true);
        const loadingToast = toast.loading('Actualizando configuraciones...');

        try {
            const result = await actualizarConfiguracionesSeguridad(studioSlug, data);

            if (result.success) {
                toast.dismiss(loadingToast);
                toast.success(result.message || 'Configuraciones actualizadas exitosamente');
                if (result.data) {
                    setSettings(result.data);
                }
            } else {
                toast.dismiss(loadingToast);
                toast.error(result.error || 'Error al actualizar configuraciones');
            }
        } catch (error) {
            console.error('Error al actualizar configuraciones:', error);
            toast.dismiss(loadingToast);
            toast.error('Error interno del servidor');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configuraciones de Seguridad
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                        <span className="ml-2 text-zinc-300">Cargando configuraciones...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuraciones de Seguridad
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
                    {/* Notificaciones por email */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-blue-400" />
                            <div>
                                <h4 className="text-white font-medium">Notificaciones por Email</h4>
                                <p className="text-zinc-400 text-sm">Recibe alertas de seguridad por email</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                {...register('email_notifications')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Alertas de dispositivos */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-green-400" />
                            <div>
                                <h4 className="text-white font-medium">Alertas de Dispositivos</h4>
                                <p className="text-zinc-400 text-sm">Notificaciones de nuevos dispositivos</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                {...register('device_alerts')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Timeout de sesión */}
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="h-5 w-5 text-orange-400" />
                            <div>
                                <h4 className="text-white font-medium">Timeout por Inactividad</h4>
                                <p className="text-zinc-400 text-sm">Minutos de inactividad antes de cerrar sesión</p>
                            </div>
                        </div>
                        <div className="mb-4 pl-8">
                            <p className="text-zinc-500 text-xs">
                                • Tu sesión se cerrará automáticamente después de {sessionTimeout} minutos sin actividad<br/>
                                • Recibirás una advertencia 5 minutos antes<br/>
                                • Cualquier interacción reinicia el contador
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="15"
                                max="120"
                                step="15"
                                value={sessionTimeout}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    setSessionTimeout(value);
                                    setValue('session_timeout', value);
                                }}
                                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${((sessionTimeout - 15) / (120 - 15)) * 100}%, #374151 ${((sessionTimeout - 15) / (120 - 15)) * 100}%, #374151 100%)`
                                }}
                            />
                            <div className="text-white font-medium min-w-[4rem] text-center">
                                {sessionTimeout} min
                            </div>
                        </div>
                        {errors.session_timeout && (
                            <p className="text-red-400 text-sm mt-2">{errors.session_timeout.message}</p>
                        )}
                    </div>

                    {/* Botón de guardar */}
                    <div className="flex justify-end pt-4">
                        <ZenButton
                            type="submit"
                            loading={loading}
                            loadingText="Guardando..."
                            icon={Save}
                            iconPosition="left"
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Guardar Configuraciones
                        </ZenButton>
                    </div>
        </form>
      </CardContent>
      
      {/* Estilos personalizados para el slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
        }
        
        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
    </Card>
  );
}
