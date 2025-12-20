'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Settings, AlertCircle, Building2, User, Lock, Globe } from 'lucide-react';
import { ZenDialog, ZenButton, ZenBadge, ZenSwitch } from '@/components/ui/zen';
import { toast } from 'sonner';
import {
  obtenerMetodosPago,
  actualizarMetodoPago,
  eliminarMetodoPago,
  configurarTransferencia,
} from '@/lib/actions/studio/config/metodos-pago.actions';
import { TransferConfigForm } from './TransferConfigForm';
import { TransferConfigForm as TransferConfigFormType } from '@/lib/actions/schemas/metodos-pago-schemas';
import { ZenConfirmModal } from '@/components/ui/zen';

interface PaymentMethod {
  id: string;
  payment_method_name: string;
  payment_method: string | null;
  status: string;
  is_manual: boolean;
  available_for_quotes: boolean;
  banco: string | null;
  beneficiario: string | null;
  cuenta_clabe: string | null;
  order: number | null;
}

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioSlug: string;
  onSuccess?: () => void;
}

export function PaymentMethodsModal({
  isOpen,
  onClose,
  studioSlug,
  onSuccess,
}: PaymentMethodsModalProps) {
  const [metodos, setMetodos] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransferConfig, setShowTransferConfig] = useState(false);
  const [selectedMetodoId, setSelectedMetodoId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [metodoToDelete, setMetodoToDelete] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  const loadMetodos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await obtenerMetodosPago(studioSlug);
      if (result.success && result.data) {
        const metodosMapeados = result.data.map(m => ({
          id: m.id,
          payment_method_name: m.payment_method_name,
          payment_method: m.payment_method,
          status: m.status,
          is_manual: m.is_manual ?? true,
          available_for_quotes: m.available_for_quotes ?? false,
          banco: m.banco,
          beneficiario: m.beneficiario,
          cuenta_clabe: m.cuenta_clabe,
          order: m.order,
        }));
        setMetodos(metodosMapeados);
      } else {
        const errorMsg = typeof result.error === 'string' ? result.error : 'Error al cargar métodos de pago';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast.error('Error al cargar métodos de pago');
    } finally {
      setLoading(false);
    }
  }, [studioSlug]);

  useEffect(() => {
    if (isOpen) {
      loadMetodos();
    }
  }, [isOpen, loadMetodos]);

  // Helper para convertir error a string
  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      const firstError = Object.values(errorObj)[0];
      if (Array.isArray(firstError) && firstError.length > 0 && typeof firstError[0] === 'string') {
        return firstError[0];
      }
    }
    return 'Error desconocido';
  };

  const handleToggleStatus = async (metodoId: string, currentStatus: string) => {
    const metodo = metodos.find(m => m.id === metodoId);

    // Validar que transferencia tenga configuración antes de activar
    const isTransferenciaMetodo = metodo?.payment_method === 'transferencia' ||
      metodo?.payment_method === 'spei_directo' ||
      metodo?.payment_method_name?.toLowerCase().includes('transferencia') ||
      metodo?.payment_method_name?.toLowerCase().includes('spei');

    if (isTransferenciaMetodo && currentStatus === 'inactive' && metodo) {
      const tieneConfig = metodo.banco && metodo.beneficiario && metodo.cuenta_clabe;
      if (!tieneConfig) {
        toast.error('Debes configurar la transferencia antes de activarla');
        setSelectedMetodoId(metodoId);
        setShowTransferConfig(true);
        return;
      }
    }

    try {
      const metodoActual = metodos.find(m => m.id === metodoId);
      if (!metodoActual) {
        toast.error('Método no encontrado');
        return;
      }

      const updateData = {
        status: (currentStatus === 'active' ? 'inactive' : 'active') as 'active' | 'inactive',
        metodo_pago: metodoActual.payment_method_name,
        orden: metodoActual.order ?? 0,
        payment_method: metodoActual.payment_method || undefined,
        is_manual: metodoActual.is_manual,
        available_for_quotes: metodoActual.available_for_quotes,
        // Incluir datos bancarios si es transferencia (requeridos para validación cuando está activo)
        banco: metodoActual.banco || undefined,
        beneficiario: metodoActual.beneficiario || undefined,
        cuenta_clabe: metodoActual.cuenta_clabe || undefined,
      };

      const result = await actualizarMetodoPago(studioSlug, metodoId, updateData);

      if (result.success) {
        toast.success(`Método ${currentStatus === 'active' ? 'desactivado' : 'activado'}`);
        // Actualización local
        setMetodos(prev => prev.map(m =>
          m.id === metodoId
            ? { ...m, status: (currentStatus === 'active' ? 'inactive' : 'active') as 'active' | 'inactive' }
            : m
        ));
        onSuccess?.();
      } else {
        const errorMessage: string = result.error ? getErrorMessage(result.error) : 'Error al actualizar método';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating method:', error);
      toast.error('Error al actualizar método');
    }
  };

  const handleConfigTransfer = async (data: TransferConfigFormType) => {
    if (!selectedMetodoId) return;

    setConfigLoading(true);
    try {
      const result = await configurarTransferencia(studioSlug, selectedMetodoId, data);

      if (result.success) {
        toast.success('Transferencia configurada correctamente');
        setShowTransferConfig(false);
        // Actualización local con los datos del formulario
        setMetodos(prev => prev.map(m =>
          m.id === selectedMetodoId
            ? {
              ...m,
              banco: data.banco,
              beneficiario: data.beneficiario,
              cuenta_clabe: data.cuenta_clabe,
              status: 'active' as const, // Se activa automáticamente cuando se configura
            }
            : m
        ));
        setSelectedMetodoId(null);
        onSuccess?.();
      } else {
        const errorMsg = typeof result.error === 'string' ? result.error : 'Error al configurar transferencia';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error configuring transfer:', error);
      toast.error('Error al configurar transferencia');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleDeleteClick = (metodoId: string) => {
    const metodo = metodos.find(m => m.id === metodoId);
    // No permitir eliminar métodos sembrados (efectivo y transferencia)
    const isEfectivo = metodo?.payment_method === 'cash' || metodo?.payment_method_name?.toLowerCase() === 'efectivo';
    const isTransferencia = metodo?.payment_method === 'transferencia' ||
      metodo?.payment_method === 'spei_directo' ||
      metodo?.payment_method_name?.toLowerCase().includes('transferencia') ||
      metodo?.payment_method_name?.toLowerCase().includes('spei');

    if (isEfectivo || isTransferencia) {
      toast.error('No se pueden eliminar métodos de pago sembrados por el sistema');
      return;
    }
    setMetodoToDelete(metodoId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!metodoToDelete) return;

    try {
      const result = await eliminarMetodoPago(studioSlug, metodoToDelete);

      if (result.success) {
        toast.success('Método de pago eliminado');
        setShowDeleteConfirm(false);
        // Actualización local
        setMetodos(prev => prev.filter(m => m.id !== metodoToDelete));
        setMetodoToDelete(null);
        onSuccess?.();
      } else {
        const errorMsg = typeof result.error === 'string' ? result.error : 'Error al eliminar método';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error deleting method:', error);
      toast.error('Error al eliminar método');
    }
  };

  const metodoTransferencia = metodos.find(m =>
    m.payment_method === 'transferencia' ||
    m.payment_method === 'spei_directo' ||
    m.payment_method_name?.toLowerCase().includes('transferencia') ||
    m.payment_method_name?.toLowerCase().includes('spei')
  );

  return (
    <>
      <ZenDialog
        isOpen={isOpen && !showTransferConfig}
        onClose={onClose}
        title="Métodos de pago"
        description="Gestiona los métodos de pago disponibles para tu estudio"
        maxWidth="2xl"
      >
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        ) : metodos.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-400">No hay métodos de pago configurados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {metodos.map((metodo) => {
              // Detectar transferencia de forma flexible (puede ser 'transferencia', 'spei_directo', o contener "transferencia" en el nombre)
              const metodoName = metodo.payment_method_name?.toLowerCase() || '';
              const isTransferencia = metodo.payment_method === 'transferencia' ||
                metodo.payment_method === 'spei_directo' ||
                metodoName.includes('transferencia') ||
                metodoName.includes('spei');
              const necesitaConfig = isTransferencia && (!metodo.banco || !metodo.beneficiario || !metodo.cuenta_clabe);
              const estaActivo = metodo.status === 'active';

              return (
                <div
                  key={metodo.id}
                  className={`p-5 rounded-xl border transition-all ${necesitaConfig
                    ? 'bg-yellow-900/10 border-yellow-500/30'
                    : estaActivo
                      ? 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600'
                      : 'bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-700'
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-zinc-700/50 rounded-lg">
                          <CreditCard className="h-4 w-4 text-zinc-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-100">
                            {metodo.payment_method_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <ZenBadge
                              variant={estaActivo ? 'success' : 'secondary'}
                              size="sm"
                            >
                              {estaActivo ? 'Activo' : 'Inactivo'}
                            </ZenBadge>
                            {metodo.is_manual && (
                              <ZenBadge variant="outline" size="sm" className="text-xs flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Uso interno
                              </ZenBadge>
                            )}
                            {metodo.available_for_quotes && (
                              <ZenBadge variant="outline" size="sm" className="text-xs flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Público (cotizaciones)
                              </ZenBadge>
                            )}
                          </div>
                        </div>
                      </div>

                      {isTransferencia && (
                        <div className="mt-3 pt-3 border-t border-zinc-700/50">
                          {necesitaConfig ? (
                            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded-md">
                              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>Requiere configuración de datos bancarios</span>
                            </div>
                          ) : (
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 text-zinc-300">
                                <Building2 className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                                <span className="font-medium">{metodo.banco}</span>
                              </div>
                              <div className="flex items-center gap-2 text-zinc-300">
                                <User className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                                <span>{metodo.beneficiario}</span>
                              </div>
                              <div className="flex items-center gap-2 text-zinc-400">
                                <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="font-mono">CLABE: ****{metodo.cuenta_clabe?.slice(-4)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isTransferencia && (
                        <ZenButton
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMetodoId(metodo.id);
                            setShowTransferConfig(true);
                          }}
                          className={necesitaConfig ? 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-900/20' : ''}
                        >
                          <Settings className="h-4 w-4 mr-1.5" />
                          {necesitaConfig ? 'Configurar' : 'Editar'}
                        </ZenButton>
                      )}
                      <ZenSwitch
                        checked={estaActivo}
                        onCheckedChange={() => handleToggleStatus(metodo.id, metodo.status)}
                        disabled={necesitaConfig && !estaActivo}
                      />
                      {(() => {
                        const isEfectivo = metodo.payment_method === 'cash' || metodo.payment_method_name.toLowerCase() === 'efectivo';
                        const isTransferenciaMetodo = metodo.payment_method === 'transferencia' ||
                          metodo.payment_method === 'spei_directo' ||
                          metodo.payment_method_name.toLowerCase().includes('transferencia') ||
                          metodo.payment_method_name.toLowerCase().includes('spei');
                        return !isEfectivo && !isTransferenciaMetodo;
                      })() && (
                          <ZenButton
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(metodo.id)}
                          >
                            Eliminar
                          </ZenButton>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ZenDialog>

      {/* Modal de configuración de transferencia */}
      <ZenDialog
        isOpen={showTransferConfig}
        onClose={() => {
          setShowTransferConfig(false);
          setSelectedMetodoId(null);
        }}
        title="Configurar Transferencia Bancaria"
        description="Ingresa los datos de la cuenta bancaria para recibir transferencias"
        maxWidth="md"
      >
        {selectedMetodoId && (
          <TransferConfigForm
            studioSlug={studioSlug}
            metodoId={selectedMetodoId}
            initialData={
              metodoTransferencia
                ? {
                  banco: metodoTransferencia.banco,
                  beneficiario: metodoTransferencia.beneficiario,
                  cuenta_clabe: metodoTransferencia.cuenta_clabe,
                }
                : undefined
            }
            onSubmit={handleConfigTransfer}
            onCancel={() => {
              setShowTransferConfig(false);
              setSelectedMetodoId(null);
            }}
            loading={configLoading}
          />
        )}
      </ZenDialog>

      {/* Modal de confirmación de eliminación */}
      <ZenConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setMetodoToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Eliminar método de pago"
        description="¿Estás seguro de que deseas eliminar este método de pago? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}

