"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { ZenDialog } from "@/components/ui/zen/modals/ZenDialog";
import { ZenInput, ZenButton, ZenCheckbox } from "@/components/ui/zen";
import { getStudioContractData, updateStudioContractData, type StudioContractData, type StudioContractDataSources } from "@/lib/actions/studio/business/contracts/templates.actions";
import { toast } from "sonner";

interface StudioContractDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onSave: () => void | Promise<void>;
}

export function StudioContractDataModal({
  isOpen,
  onClose,
  studioSlug,
  onSave,
}: StudioContractDataModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    studio_name: "",
    representative_name: "",
    phone: "",
    address: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Fuentes de datos disponibles (solo para sugerir)
  const [sources, setSources] = useState<StudioContractDataSources | null>(null);
  
  // Estados de checkboxes/radio buttons
  const [useStudioAddress, setUseStudioAddress] = useState(false);
  const [emailSource, setEmailSource] = useState<'studio' | 'profile' | 'google' | 'custom'>('studio');
  const [phoneSource, setPhoneSource] = useState<'studio' | 'profile' | 'custom'>('custom');

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, studioSlug]);

  async function loadData() {
    setLoadingData(true);
    try {
      const result = await getStudioContractData(studioSlug);
      if (result.success && result.data && 'sources' in result.data) {
        const data = result.data as StudioContractData & { sources: StudioContractDataSources };
        
        // Guardar fuentes disponibles
        setSources(data.sources);
        
        // Inicializar valores del formulario con datos legales actuales
        setFormData({
          studio_name: data.nombre_studio || "",
          representative_name: data.nombre_representante || "",
          phone: data.telefono_studio || "",
          address: data.direccion_studio || "",
          email: data.correo_studio || "",
        });
        
        // Inicializar estados de checkboxes según valores existentes
        if (data.direccion_studio && data.sources.studio.address && data.direccion_studio === data.sources.studio.address) {
          setUseStudioAddress(true);
        }
        
        // Determinar fuente inicial de email
        if (data.correo_studio === data.sources.studio.email) {
          setEmailSource('studio');
        } else if (data.sources.profile && data.correo_studio === data.sources.profile.email) {
          setEmailSource('profile');
        } else if (data.sources.studio.google_oauth_email && data.correo_studio === data.sources.studio.google_oauth_email) {
          setEmailSource('google');
        } else {
          setEmailSource('custom');
        }
        
        // Determinar fuente inicial de teléfono
        if (data.telefono_studio && data.sources.studio.phone && data.telefono_studio === data.sources.studio.phone) {
          setPhoneSource('studio');
        } else if (data.sources.profile && data.telefono_studio && data.telefono_studio === data.sources.profile.phone) {
          setPhoneSource('profile');
        } else {
          setPhoneSource('custom');
        }
      } else {
        toast.error(result.error || "Error al cargar datos del estudio");
      }
    } catch (error) {
      console.error("Error loading studio data:", error);
      toast.error("Error al cargar datos del estudio");
    } finally {
      setLoadingData(false);
    }
  }
  
  // Efectos para sincronizar valores cuando cambian los checkboxes
  useEffect(() => {
    if (!sources) return;
    
    if (useStudioAddress && sources.studio.address) {
      setFormData(prev => ({ ...prev, address: sources.studio.address || "" }));
    } else if (!useStudioAddress) {
      // No limpiar automáticamente, dejar que el usuario edite
    }
  }, [useStudioAddress, sources]);
  
  useEffect(() => {
    if (!sources) return;
    
    if (emailSource === 'studio' && sources.studio.email) {
      setFormData(prev => ({ ...prev, email: sources.studio.email }));
    } else if (emailSource === 'profile' && sources.profile?.email) {
      setFormData(prev => ({ ...prev, email: sources.profile!.email }));
    } else if (emailSource === 'google' && sources.studio.google_oauth_email) {
      setFormData(prev => ({ ...prev, email: sources.studio.google_oauth_email || "" }));
    } else if (emailSource === 'custom') {
      // No limpiar, dejar que el usuario edite
    }
  }, [emailSource, sources]);
  
  useEffect(() => {
    if (!sources) return;
    
    if (phoneSource === 'studio' && sources.studio.phone) {
      setFormData(prev => ({ ...prev, phone: sources.studio.phone || "" }));
    } else if (phoneSource === 'profile' && sources.profile?.phone) {
      setFormData(prev => ({ ...prev, phone: sources.profile!.phone || "" }));
    } else if (phoneSource === 'custom') {
      // No limpiar, dejar que el usuario edite
    }
  }, [phoneSource, sources]);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.studio_name.trim()) {
      newErrors.studio_name = "El nombre del estudio es obligatorio";
    }
    if (!formData.representative_name.trim()) {
      newErrors.representative_name = "El nombre del representante es obligatorio";
    }
    if (!formData.email.trim()) {
      newErrors.email = "El correo es obligatorio";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es obligatorio";
    }
    if (!formData.address.trim()) {
      newErrors.address = "La dirección es obligatoria";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await updateStudioContractData(studioSlug, {
        studio_name: formData.studio_name,
        representative_name: formData.representative_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      });

      if (result.success) {
        toast.success("Datos del estudio guardados correctamente");
        // Primero llamar onSave para que el componente padre pueda hacer acciones adicionales
        // onSave manejará el cierre del modal secundario, no llamamos onClose aquí
        await onSave();
      } else {
        toast.error(result.error || "Error al guardar datos");
      }
    } catch (error) {
      console.error("Error saving studio data:", error);
      toast.error("Error al guardar datos del estudio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ZenDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Datos de estudio para contratos"
      description="Para generar contratos legalmente válidos, necesitamos completar la siguiente información:"
      maxWidth="lg"
      onSave={handleSave}
      onCancel={onClose}
      saveLabel="Guardar"
      cancelLabel="Cancelar"
      isLoading={loading}
      closeOnClickOutside={false}
      zIndex={10070}
    >
      <div className="space-y-6">
        {/* Alerta informativa */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-blue-300 font-medium">
              Información requerida
            </p>
            <p className="text-xs text-blue-400/80">
              Estos datos se utilizarán en todos los contratos generados. Asegúrate de que sean correctos y estén actualizados.
            </p>
          </div>
        </div>

        {/* Formulario */}
        {loadingData ? (
          <div className="space-y-4">
            {/* Skeleton Nombre del Estudio */}
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-64 bg-zinc-800/50 rounded animate-pulse" />
            </div>

            {/* Skeleton Nombre del Representante Legal */}
            <div className="space-y-2">
              <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-72 bg-zinc-800/50 rounded animate-pulse" />
            </div>

            {/* Skeleton Dirección */}
            <div className="space-y-2">
              <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              <div className="h-5 w-48 bg-zinc-800/50 rounded animate-pulse" />
            </div>

            {/* Skeleton Correo */}
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2 pl-1">
                <div className="h-5 w-56 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-5 w-52 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-5 w-40 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>

            {/* Skeleton Teléfono */}
            <div className="space-y-2">
              <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2 pl-1">
                <div className="h-5 w-56 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-5 w-52 bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-5 w-40 bg-zinc-800/50 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ZenInput
              label="Nombre del Estudio"
              name="studio_name"
              value={formData.studio_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, studio_name: e.target.value }))
              }
              placeholder="Ej: Estudio Fotográfico XYZ"
              error={errors.studio_name}
              required
              hint="Este nombre aparecerá en los contratos. Puede ser diferente del nombre de tu cuenta."
            />

            <div>
              <ZenInput
                label="Nombre del Representante Legal"
                name="representative_name"
                value={formData.representative_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, representative_name: e.target.value }))
                }
                placeholder="Ej: Juan Pérez"
                error={errors.representative_name}
                required
              />
              <p className="text-xs text-amber-400/80 mt-1">
                Nombre del representante legal del estudio. Es independiente del nombre de tu perfil.
              </p>
            </div>

            {/* Dirección con checkbox */}
            <div className="space-y-2">
              <ZenInput
                label="Dirección del Studio"
                name="address"
                value={formData.address}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, address: e.target.value }));
                  setUseStudioAddress(false); // Desmarcar si el usuario edita manualmente
                }}
                placeholder="Ej: Av. Reforma 123, CDMX"
                error={errors.address}
                required
                disabled={useStudioAddress}
                className={useStudioAddress ? "bg-zinc-800/50" : ""}
              />
              {sources?.studio.address && (
                <ZenCheckbox
                  checked={useStudioAddress}
                  onCheckedChange={(checked) => {
                    setUseStudioAddress(checked);
                    if (checked) {
                      setFormData((prev) => ({ ...prev, address: sources!.studio.address || "" }));
                    } else {
                      setFormData((prev) => ({ ...prev, address: "" }));
                    }
                  }}
                  label="Usar la dirección del estudio"
                />
              )}
            </div>

            {/* Correo con radio buttons */}
            <div className="space-y-2">
              <ZenInput
                label="Correo del Studio"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, email: e.target.value }));
                  setEmailSource('custom'); // Cambiar a custom si el usuario edita manualmente
                }}
                placeholder="Ej: contacto@studio.com"
                error={errors.email}
                required
                disabled={emailSource !== 'custom'}
                className={emailSource !== 'custom' ? "bg-zinc-800/50" : ""}
              />
              <div className="space-y-1.5 pl-1">
                {sources?.studio.email && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="email-source"
                      checked={emailSource === 'studio'}
                      onChange={() => {
                        setEmailSource('studio');
                        setFormData((prev) => ({ ...prev, email: sources!.studio.email }));
                      }}
                      className="w-4 h-4 text-emerald-600 bg-zinc-800 border-zinc-600 focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                      Usar el correo del estudio ({sources.studio.email})
                    </span>
                  </label>
                )}
                {sources?.profile?.email && sources.profile.email !== sources?.studio.email && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="email-source"
                      checked={emailSource === 'profile'}
                      onChange={() => {
                        setEmailSource('profile');
                        setFormData((prev) => ({ ...prev, email: sources!.profile!.email }));
                      }}
                      className="w-4 h-4 text-emerald-600 bg-zinc-800 border-zinc-600 focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                      Usar el correo de mi perfil ({sources.profile.email})
                    </span>
                  </label>
                )}
                {sources?.studio.google_oauth_email && 
                 sources.studio.google_oauth_email !== sources?.studio.email &&
                 sources.studio.google_oauth_email !== sources?.profile?.email && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="email-source"
                      checked={emailSource === 'google'}
                      onChange={() => {
                        setEmailSource('google');
                        setFormData((prev) => ({ ...prev, email: sources!.studio.google_oauth_email || "" }));
                      }}
                      className="w-4 h-4 text-emerald-600 bg-zinc-800 border-zinc-600 focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                      Usar el correo de Google ({sources.studio.google_oauth_email})
                    </span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="email-source"
                    checked={emailSource === 'custom'}
                    onChange={() => {
                      setEmailSource('custom');
                      setFormData((prev) => ({ ...prev, email: "" }));
                    }}
                    className="w-4 h-4 text-emerald-600 bg-zinc-800 border-zinc-600 focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                    Usar otro correo
                  </span>
                </label>
              </div>
            </div>

            {/* Teléfono con radio buttons */}
            <div className="space-y-2">
              <ZenInput
                label="Teléfono del Studio"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, phone: e.target.value }));
                  setPhoneSource('custom'); // Cambiar a custom si el usuario edita manualmente
                }}
                placeholder="Ej: +52 55 1234 5678"
                error={errors.phone}
                required
                disabled={phoneSource !== 'custom'}
                className={phoneSource !== 'custom' ? "bg-zinc-800/50" : ""}
              />
              <div className="space-y-1.5 pl-1">
                {sources?.studio.phone && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="phone-source"
                      checked={phoneSource === 'studio'}
                      onChange={() => {
                        setPhoneSource('studio');
                        setFormData((prev) => ({ ...prev, phone: sources!.studio.phone || "" }));
                      }}
                      className="w-4 h-4 text-emerald-600 bg-zinc-800 border-zinc-600 focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                      Usar el teléfono del estudio ({sources.studio.phone})
                    </span>
                  </label>
                )}
                {sources?.profile?.phone && sources.profile.phone !== sources?.studio.phone && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="phone-source"
                      checked={phoneSource === 'profile'}
                      onChange={() => {
                        setPhoneSource('profile');
                        setFormData((prev) => ({ ...prev, phone: sources!.profile!.phone || "" }));
                      }}
                      className="w-4 h-4 text-emerald-600 bg-zinc-800 border-zinc-600 focus:ring-emerald-500 focus:ring-2"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                      Usar el teléfono de mi perfil ({sources.profile.phone})
                    </span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="phone-source"
                    checked={phoneSource === 'custom'}
                    onChange={() => {
                      setPhoneSource('custom');
                      setFormData((prev) => ({ ...prev, phone: "" }));
                    }}
                    className="w-4 h-4 text-emerald-600 bg-zinc-800 border-zinc-600 focus:ring-emerald-500 focus:ring-2"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-200">
                    Usar otro teléfono
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </ZenDialog>
  );
}

