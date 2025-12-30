'use client';

import React, { useState } from 'react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenInput,
  ZenDialog,
} from '@/components/ui/zen';
import { CheckCircle2, Loader2, AlertCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { confirmClientDataAndGenerateContract } from '@/lib/actions/cliente/contract.actions';

interface ConfirmClientDataCardProps {
  studioSlug: string;
  promiseId: string;
  contactId: string;
  initialData: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
  onSuccess?: () => void;
}

export function ConfirmClientDataCard({
  studioSlug,
  promiseId,
  contactId,
  initialData,
  onSuccess,
}: ConfirmClientDataCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData.name,
    phone: initialData.phone,
    email: initialData.email || '',
    address: initialData.address || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('El teléfono es requerido');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('El correo electrónico es requerido');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('La dirección es requerida');
      return;
    }

    setIsSubmitting(true);
    try {
      // Obtener IP del cliente
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const clientIp = ipData.ip || '0.0.0.0';

      const result = await confirmClientDataAndGenerateContract(
        studioSlug,
        promiseId,
        {
          contact_id: contactId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          ip_address: clientIp,
        }
      );

      if (result.success) {
        if (result.data?.auto_generated) {
          toast.success('Datos confirmados y contrato generado automáticamente');
        } else {
          toast.success('Datos confirmados. El studio generará tu contrato pronto.');
        }
        setShowModal(false);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Error al confirmar datos');
      }
    } catch (error) {
      console.error('Error confirming data:', error);
      toast.error('Error al confirmar datos');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800">
          <ZenCardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Confirma tus Datos
          </ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent className="p-6">
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-400 mb-2">
                <strong>Acción requerida:</strong>
              </p>
              <p className="text-sm text-zinc-300">
                Para continuar con el proceso, necesitamos que revises y confirmes que tus datos 
                personales estén correctos. Estos datos se utilizarán para generar tu contrato.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <User className="w-4 h-4" />
                <span>Revisa tu información:</span>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Nombre:</span>
                  <span className="text-zinc-100">{initialData.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Teléfono:</span>
                  <span className="text-zinc-100">{initialData.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Email:</span>
                  <span className="text-zinc-100">{initialData.email || 'No proporcionado'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Dirección:</span>
                  <span className="text-zinc-100">{initialData.address || 'No proporcionada'}</span>
                </div>
              </div>
            </div>

            <ZenButton
              onClick={() => setShowModal(true)}
              className="w-full"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Revisar y Confirmar Datos
            </ZenButton>
          </div>
        </ZenCardContent>
      </ZenCard>

      {/* Modal de confirmación */}
      <ZenDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Confirma tus Datos"
        description="Revisa y actualiza tu información si es necesario. Estos datos se utilizarán en tu contrato."
        maxWidth="md"
      >
        <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">
                Nombre completo <span className="text-red-400">*</span>
              </label>
              <ZenInput
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">
                Teléfono <span className="text-red-400">*</span>
              </label>
              <ZenInput
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Tu número de teléfono"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">
                Correo electrónico <span className="text-red-400">*</span>
              </label>
              <ZenInput
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-1 block">
                Dirección completa <span className="text-red-400">*</span>
              </label>
              <ZenInput
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Calle, número, colonia, ciudad, estado"
              />
            </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <p className="text-xs text-blue-400">
              <strong>Importante:</strong> Al confirmar, aceptas que estos datos son correctos 
              y se utilizarán para generar tu contrato. Se registrará tu dirección IP para 
              validez legal.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <ZenButton
            variant="ghost"
            onClick={() => setShowModal(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </ZenButton>
          <ZenButton
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Datos
              </>
            )}
          </ZenButton>
        </div>
      </ZenDialog>
    </>
  );
}

