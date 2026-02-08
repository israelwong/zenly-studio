'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { ChevronDown, Copy, Loader2, Mail, Pencil, Phone, PhoneCall, Smartphone } from 'lucide-react';
import { ZenCard, ZenButton, ZenDialog } from '@/components/ui/zen';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';
import { GoogleContactsConnectionModal } from '@/components/shared/integrations/GoogleContactsConnectionModal';
import { formatearMoneda } from '@/lib/actions/studio/catalogo/calcular-precio';
import { cn } from '@/lib/utils';
import { getCotizacionById } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { obtenerResumenEventoCreado } from '@/lib/actions/studio/commercial/promises/evento-resumen.actions';
import { ContractPreviewForPromiseModal } from '@/app/[slug]/studio/commercial/promises/[promiseId]/cierre/components/contratos/ContractPreviewForPromiseModal';
import { ResumenCotizacionAutorizada } from './ResumenCotizacionAutorizada';
import { getCondicionesComerciales, getContrato } from '@/lib/actions/studio/commercial/promises/cotizaciones-helpers';
import { getContractTemplate } from '@/lib/actions/studio/business/contracts/templates.actions';
import { createPromiseLog } from '@/lib/actions/studio/commercial/promises/promise-logs.actions';
import { logCallMade, logWhatsAppSent } from '@/lib/actions/studio/commercial/promises';
import type { EventoDetalle } from '@/lib/actions/studio/business/events';
import { toast } from 'sonner';

interface ResumenEventoProps {
  studioSlug: string;
  eventId: string;
  eventData: EventoDetalle;
}

type ContactField = 'name' | 'phone' | 'email';

/** Logo oficial de Google (G) - multicolor, 18px recomendado */
function GoogleLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function ResumenEvento({ studioSlug, eventId, eventData }: ResumenEventoProps) {
  const router = useRouter();
  const [showCotizacionPreview, setShowCotizacionPreview] = useState(false);
  const [showContratoPreview, setShowContratoPreview] = useState(false);
  const [loadingCotizacion, setLoadingCotizacion] = useState(false);
  const [loadingContratoTemplate, setLoadingContratoTemplate] = useState(false);
  const [templateContentWithPlaceholders, setTemplateContentWithPlaceholders] = useState<string | null>(null);
  const [cotizacionCompleta, setCotizacionCompleta] = useState<any>(null);
  const [resumen, setResumen] = useState<any>(null);
  const [loadingResumen, setLoadingResumen] = useState(true);

  const contact = eventData.contact ?? eventData.promise?.contact ?? null;
  const contactId = contact?.id ?? null;

  /** Overrides locales tras guardar para mostrar el dato al instante sin esperar router.refresh() */
  const [localContactOverrides, setLocalContactOverrides] = useState<Partial<Record<ContactField, string>>>({});
  /** Campo guardado pendiente de confirmación del servidor (opacidad 70% hasta que llegue el dato) */
  const [pendingConfirmField, setPendingConfirmField] = useState<ContactField | null>(null);

  const [editingField, setEditingField] = useState<ContactField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingField, setSavingField] = useState<ContactField | null>(null);
  const [googleContactsStatus, setGoogleContactsStatus] = useState<'ACTIVE' | 'EXPIRED' | 'DISCONNECTED'>('DISCONNECTED');
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [showGoogleContactsModal, setShowGoogleContactsModal] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const contactSynced = !!(contact?.google_contact_id ?? eventData.promise?.contact?.google_contact_id);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  /** Solo limpiar override si contact[field] === localContactOverrides[field]; si el servidor manda dato viejo, mantener override */
  useEffect(() => {
    setLocalContactOverrides((prev) => {
      const next = { ...prev };
      const fields: ContactField[] = ['name', 'phone', 'email'];
      for (const f of fields) {
        if (next[f] === undefined) continue;
        const serverVal = f === 'name' ? contact?.name : f === 'phone' ? contact?.phone : contact?.email;
        if (serverVal === next[f]) delete next[f];
      }
      return next;
    });
  }, [contact?.id, contact?.name, contact?.phone, contact?.email]);

  /** Quitar estado "pendiente de confirmación" cuando el servidor ya devolvió el valor guardado */
  useEffect(() => {
    if (!pendingConfirmField) return;
    const serverVal =
      pendingConfirmField === 'name'
        ? contact?.name
        : pendingConfirmField === 'phone'
          ? contact?.phone
          : contact?.email;
    const overrideVal = localContactOverrides[pendingConfirmField];
    if (overrideVal !== undefined && serverVal === overrideVal) setPendingConfirmField(null);
  }, [pendingConfirmField, contact?.name, contact?.phone, contact?.email, localContactOverrides]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { getGoogleContactsIntegrationStatus } = await import(
        '@/lib/integrations/google/studio/status.actions'
      );
      const res = await getGoogleContactsIntegrationStatus(studioSlug);
      if (!cancelled && res.success) setGoogleContactsStatus(res.status);
    })();
    return () => {
      cancelled = true;
    };
  }, [studioSlug]);

  const getDisplayValue = useCallback(
    (field: ContactField) => {
      if (localContactOverrides[field] !== undefined) return localContactOverrides[field] ?? '—';
      if (field === 'name') return contact?.name ?? 'Sin nombre';
      if (field === 'phone') return contact?.phone ?? '—';
      return contact?.email ?? '—';
    },
    [contact, localContactOverrides]
  );

  const syncContactWithGoogle = useCallback(async () => {
    if (!contactId) return;
    const currentPromiseId = eventData.promise_id ?? eventData.promise?.id ?? null;
    setSyncingGoogle(true);
    try {
      const { sincronizarContactoConGoogle } = await import(
        '@/lib/integrations/google/sync/contacts.actions'
      );
      const syncRes = await sincronizarContactoConGoogle(contactId, studioSlug);
      const { getGoogleContactsIntegrationStatus } = await import(
        '@/lib/integrations/google/studio/status.actions'
      );
      const statusRes = await getGoogleContactsIntegrationStatus(studioSlug);
      if (statusRes.success && statusRes.status)
        setGoogleContactsStatus(statusRes.status);
      if (syncRes.success) {
        toast.success('Sincronizado con Google');
      } else {
        if (statusRes.status === 'EXPIRED') {
          toast.error('Reconexión necesaria');
        }
      }

      if (currentPromiseId) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('promise-logs-optimistic-add', {
              detail: { promiseId: currentPromiseId, content: 'Sincronizando con Google Contacts…' },
            })
          );
        }
        try {
          const logResult = await createPromiseLog(studioSlug, {
            promise_id: currentPromiseId,
            content: syncRes.success
              ? 'Sincronización con Google Contacts realizada con éxito'
              : 'Fallo en la sincronización con Google Contacts',
            log_type: 'user_note',
            origin_context: 'EVENT',
          });
          if (logResult?.success && logResult.data && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('promise-logs-append', { detail: { log: logResult.data } }));
          }
        } catch {
          // no bloquear flujo
        }
      }
    } catch {
      toast.error('Error al sincronizar');
      if (currentPromiseId) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('promise-logs-optimistic-add', {
              detail: { promiseId: currentPromiseId, content: 'Error al sincronizar con Google…' },
            })
          );
        }
        try {
          const logResult = await createPromiseLog(studioSlug, {
            promise_id: currentPromiseId,
            content: 'Fallo en la sincronización con Google Contacts',
            log_type: 'user_note',
            origin_context: 'EVENT',
          });
          if (logResult?.success && logResult.data && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('promise-logs-append', { detail: { log: logResult.data } }));
          }
        } catch {
          // no bloquear flujo
        }
      }
    } finally {
      setSyncingGoogle(false);
    }
  }, [contactId, studioSlug, eventData.promise_id, eventData.promise?.id]);

  const saveField = async (field: ContactField, value: string) => {
    if (!contactId) return;
    const newVal = String(value ?? '').trim();
    const currentVal = (contact?.[field] ?? '').toString().trim();
    if (newVal === currentVal) {
      setEditingField(null);
      return;
    }
    if (field === 'name' && !newVal) {
      setEditingField(null);
      setEditValue(currentVal || '');
      return;
    }
    if (field === 'phone' && newVal.length < 10) {
      toast.error('El teléfono debe tener al menos 10 dígitos');
      return;
    }
    setSavingField(field);
    try {
      const { updateContact } = await import('@/lib/actions/studio/commercial/contacts/contacts.actions');
      const payload = {
        id: contactId,
        [field]: field === 'email' ? (newVal || '') : newVal,
        event_id: eventId,
      };
      const result = await updateContact(studioSlug, payload);
      if (result.success) {
        setLocalContactOverrides((prev) => ({ ...prev, [field]: newVal }));
        setPendingConfirmField(field);
        setEditingField(null);
        setSavingField(null);
        toast.success('Guardado');

        const currentPromiseId = eventData.promise_id ?? eventData.promise?.id ?? null;
        if (currentPromiseId) {
          const fieldLabel =
            field === 'name' ? 'Nombre del contacto' : field === 'phone' ? 'Teléfono del contacto' : 'Correo del contacto';
          const content = `${fieldLabel} actualizado: '${currentVal || ''}' ➔ '${newVal}'`;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('promise-logs-optimistic-add', {
                detail: { promiseId: currentPromiseId, content: `Actualizando ${fieldLabel.toLowerCase()}…` },
              })
            );
          }
          try {
            const logResult = await createPromiseLog(studioSlug, {
              promise_id: currentPromiseId,
              content,
              log_type: 'user_note',
              origin_context: 'EVENT',
            });
            if (logResult?.success && logResult.data && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('promise-logs-append', { detail: { log: logResult.data } }));
            }
          } catch {
            // no bloquear flujo si falla el log
          }
        }
        if (contactId && googleContactsStatus === 'ACTIVE') {
          syncContactWithGoogle();
        }
      } else {
        toast.error(result.error ?? 'Error al guardar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar');
    } finally {
      setSavingField(null);
    }
  };

  const handleBlur = (field: ContactField) => {
    saveField(field, editValue);
  };

  const handleKeyDown = (field: ContactField, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditValue(getDisplayValue(field));
      setEditingField(null);
    }
  };

  const startEdit = (field: ContactField) => {
    if (!contactId) return;
    setEditValue(getDisplayValue(field));
    setEditingField(field);
  };

  const handleGoogleIconClick = () => {
    if (googleContactsStatus === 'EXPIRED' || googleContactsStatus === 'DISCONNECTED') {
      setShowGoogleContactsModal(true);
      return;
    }
    if (googleContactsStatus === 'ACTIVE' && contactId) {
      syncContactWithGoogle();
    }
  };

  const contactPhone = getDisplayValue('phone') || (contact?.phone ?? null);
  const contactName = getDisplayValue('name') || (contact?.name ?? null);
  const promiseId = eventData.promise_id ?? eventData.promise?.id ?? null;

  const handleWhatsApp = () => {
    if (!contactPhone || !contactName || contactPhone === '—') return;
    const cleanPhone = String(contactPhone).replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${contactName}`);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    if (promiseId) {
      logWhatsAppSent(studioSlug, promiseId, contactName, String(contactPhone)).catch((e) => console.error(e));
    }
    window.open(whatsappUrl, '_blank');
  };

  const handleCall = () => {
    if (!contactPhone || contactPhone === '—') return;
    if (promiseId && contactName) {
      logCallMade(studioSlug, promiseId, contactName, String(contactPhone)).catch((e) => console.error(e));
    }
    window.open(`tel:${contactPhone}`, '_self');
  };

  const handleConfirmConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const { iniciarConexionGoogleContacts } = await import(
        '@/lib/integrations/google/auth/contacts.actions'
      );
      const res = await iniciarConexionGoogleContacts(
        studioSlug,
        typeof window !== 'undefined' ? window.location.href : undefined
      );
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(res.error ?? 'No se pudo iniciar reconexión');
        setConnectingGoogle(false);
        setShowGoogleContactsModal(false);
      }
    } catch {
      toast.error('Error al conectar');
      setConnectingGoogle(false);
      setShowGoogleContactsModal(false);
    }
  };

  // Cargar resumen del evento con snapshots inmutables
  useEffect(() => {
    const loadResumen = async () => {
      setLoadingResumen(true);
      try {
        const result = await obtenerResumenEventoCreado(studioSlug, eventId);
        if (result.success && result.data) {
          setResumen(result.data);
        }
      } catch (error) {
        console.error('Error loading resumen:', error);
      } finally {
        setLoadingResumen(false);
      }
    };
    loadResumen();
  }, [studioSlug, eventId]);

  // Obtener datos procesados desde snapshots inmutables (igual que CotizacionAutorizadaCard)
  const cotizacionData = resumen?.cotizacion || eventData.cotizacion;
  const condiciones = resumen?.cotizacion
    ? getCondicionesComerciales(resumen.cotizacion)
    : cotizacionData
      ? getCondicionesComerciales(cotizacionData)
      : null;
  const contrato = resumen?.cotizacion
    ? getContrato(resumen.cotizacion)
    : cotizacionData
      ? getContrato(cotizacionData)
      : null;

  // Calcular totales
  const subtotal = cotizacionData?.price || 0;
  const descuento = condiciones?.discount_percentage
    ? subtotal * (condiciones.discount_percentage / 100)
    : (cotizacionData?.discount || 0);
  const total = subtotal - descuento;

  // Calcular anticipo
  const anticipo = condiciones?.advance_type === 'percentage' && condiciones?.advance_percentage
    ? total * (condiciones.advance_percentage / 100)
    : condiciones?.advance_type === 'amount' && condiciones?.advance_amount
      ? condiciones.advance_amount
      : 0;

  const isContratoFirmado = contrato?.signed_at !== null && contrato?.signed_at !== undefined;

  const handlePreviewCotizacion = async () => {
    if (!cotizacionData) return;

    setLoadingCotizacion(true);
    setShowCotizacionPreview(true);
    try {
      const result = await getCotizacionById(cotizacionData.id, studioSlug);
      if (result.success && result.data) {
        // Convertir al formato esperado por ResumenCotizacionAutorizada
        const cotizacionFormateada = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          price: result.data.price,
          discount: descuento,
          status: result.data.status,
          cotizacion_items: result.data.items.map((item: any) => ({
            id: item.id,
            item_id: item.item_id,
            quantity: item.quantity,
            name: item.name_snapshot || item.name,
            description: item.description_snapshot || item.description,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
            cost: item.cost,
            cost_snapshot: item.cost,
            profit_type: null,
            profit_type_snapshot: null,
            task_type: null,
            assigned_to_crew_member_id: null,
            scheduler_task_id: null,
            assignment_date: null,
            delivery_date: null,
            internal_delivery_days: null,
            client_delivery_days: null,
            status: 'active',
            seccion_name: item.seccion_name_snapshot || item.seccion_name,
            category_name: item.category_name_snapshot || item.category_name,
            seccion_name_snapshot: item.seccion_name_snapshot,
            category_name_snapshot: item.category_name_snapshot,
          })),
        };
        setCotizacionCompleta(cotizacionFormateada);
      } else {
        toast.error(result.error || 'Error al cargar cotización');
        setShowCotizacionPreview(false);
      }
    } catch (error) {
      console.error('Error cargando cotización:', error);
      toast.error('Error al cargar cotización');
      setShowCotizacionPreview(false);
    } finally {
      setLoadingCotizacion(false);
    }
  };

  const handlePreviewContrato = async () => {
    if (!contrato?.content) return;
    const templateId = contrato.template_id || null;
    setLoadingContratoTemplate(true);
    try {
      if (templateId) {
        const result = await getContractTemplate(studioSlug, templateId);
        if (result.success && result.data?.content) {
          setTemplateContentWithPlaceholders(result.data.content);
        } else {
          setTemplateContentWithPlaceholders(null);
        }
      } else {
        setTemplateContentWithPlaceholders(null);
      }
    } catch {
      setTemplateContentWithPlaceholders(null);
    } finally {
      setLoadingContratoTemplate(false);
    }
    setShowContratoPreview(true);
  };

  useEffect(() => {
    const handler = () => {
      if (!contrato?.content) {
        toast.error('No hay contrato disponible');
        return;
      }
      handlePreviewContrato();
    };
    window.addEventListener('open-contrato-preview', handler);
    return () => window.removeEventListener('open-contrato-preview', handler);
  }, [contrato?.content]);

  return (
    <>
      <ZenCard>
        <div className="p-2">
          <div
            className={cn(
              'flex items-center gap-2 w-full py-2.5 px-2 rounded-lg cursor-pointer select-none transition-colors duration-200 hover:bg-zinc-800/30',
              isExpanded && 'bg-zinc-800/20'
            )}
            onClick={() => setIsExpanded((v) => !v)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setIsExpanded((v) => !v))}
            role="button"
            tabIndex={0}
          >
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300', isExpanded && 'rotate-180')}
            />
            <span className="text-base font-bold text-zinc-200 truncate min-w-0 flex-1">
              {getDisplayValue('name')}
            </span>
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleGoogleIconClick}
                disabled={syncingGoogle}
                title={
                  googleContactsStatus === 'EXPIRED' || googleContactsStatus === 'DISCONNECTED'
                    ? 'Conectar o reconectar Google Contacts'
                    : contactSynced
                      ? 'Sincronizado con Google'
                      : 'Sincronizar con Google'
                }
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity shrink-0',
                  'hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 disabled:cursor-not-allowed',
                  googleContactsStatus === 'ACTIVE' && [
                    'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
                  ],
                  googleContactsStatus === 'EXPIRED' && [
                    'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20',
                  ],
                  googleContactsStatus === 'DISCONNECTED' && [
                    'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20',
                  ]
                )}
              >
                {syncingGoogle ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                ) : (
                  <>
                    <GoogleLogoIcon
                      className={cn(
                        'h-3 w-3 shrink-0',
                        googleContactsStatus === 'DISCONNECTED' && 'grayscale opacity-90'
                      )}
                    />
                    {googleContactsStatus === 'ACTIVE'
                      ? contactSynced
                        ? 'Sincronizado'
                        : 'Google'
                      : googleContactsStatus === 'EXPIRED'
                        ? 'Reconectar'
                        : 'Conectar'}
                  </>
                )}
              </button>
              <span className="text-zinc-500 text-xs font-light shrink-0 opacity-20 flex items-center" aria-hidden>|</span>
              {contactPhone && contactPhone !== '—' && (
                <>
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    title="WhatsApp"
                    className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-[#25D366]/20 hover:text-[#25D366] transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 shrink-0"
                  >
                    <WhatsAppIcon className="h-4 w-4" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCall}
                    title="Llamar"
                    className="h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500 shrink-0"
                  >
                    <PhoneCall className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            className={cn(
              'grid transition-all duration-300 ease-in-out overflow-hidden',
              isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className={cn('min-h-0 overflow-hidden space-y-2', isExpanded && 'pt-2')}>
              {/* Fila Teléfono */}
              <div
                className={cn(
                  'flex items-center gap-2 w-full min-w-0 rounded-lg px-2 py-1.5 bg-zinc-900/40 border border-zinc-800/50 transition-colors',
                  contactId && 'hover:bg-zinc-800/50'
                )}
              >
                <Smartphone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                {editingField === 'phone' ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2">
                    <input
                      ref={inputRef}
                      type="tel"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      onKeyDown={(e) => handleKeyDown('phone', e)}
                      disabled={savingField === 'phone'}
                      className={cn(
                        'flex-1 min-w-0 rounded px-2 py-0.5 text-xs text-zinc-200',
                        'bg-zinc-800/80 border border-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30',
                        'disabled:opacity-60'
                      )}
                    />
                    {savingField === 'phone' && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-zinc-400" />}
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => contactId && startEdit('phone')}
                    onKeyDown={(e) => contactId && (e.key === 'Enter' || e.key === ' ') && startEdit('phone')}
                    className={cn(
                      'group flex-1 min-w-0 flex items-center gap-1 text-xs text-zinc-200 min-h-[20px] transition-opacity overflow-hidden px-2 cursor-pointer',
                      (savingField === 'phone' || pendingConfirmField === 'phone') && 'opacity-70'
                    )}
                  >
                    <span className="truncate">{getDisplayValue('phone')}</span>
                    {contactId && (
                      <Pencil className="h-3 w-3 shrink-0 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                )}
                <button
                  type="button"
                  title="Copiar"
                  onClick={(e) => {
                    e.stopPropagation();
                    const val = getDisplayValue('phone');
                    if (val && val !== '—') {
                      navigator.clipboard.writeText(val).then(
                        () => toast.success('Teléfono copiado'),
                        () => {}
                      );
                    }
                  }}
                  className="shrink-0 p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Fila Correo */}
              <div
                className={cn(
                  'flex items-center gap-2 w-full min-w-0 rounded-lg px-2 py-1.5 bg-zinc-900/40 border border-zinc-800/50 transition-colors',
                  contactId && 'hover:bg-zinc-800/50'
                )}
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                {editingField === 'email' ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 px-2">
                    <input
                      ref={inputRef}
                      type="email"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      onKeyDown={(e) => handleKeyDown('email', e)}
                      disabled={savingField === 'email'}
                      className={cn(
                        'flex-1 min-w-0 rounded px-2 py-0.5 text-xs text-zinc-200',
                        'bg-zinc-800/80 border border-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30',
                        'disabled:opacity-60'
                      )}
                    />
                    {savingField === 'email' && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-zinc-400" />}
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => contactId && startEdit('email')}
                    onKeyDown={(e) => contactId && (e.key === 'Enter' || e.key === ' ') && startEdit('email')}
                    className={cn(
                      'group flex-1 min-w-0 flex items-center gap-1 text-xs text-zinc-200 min-h-[20px] transition-opacity overflow-hidden px-2 cursor-pointer',
                      (savingField === 'email' || pendingConfirmField === 'email') && 'opacity-70'
                    )}
                  >
                    <span className="truncate">{getDisplayValue('email')}</span>
                    {contactId && (
                      <Pencil className="h-3 w-3 shrink-0 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                )}
                <button
                  type="button"
                  title="Copiar"
                  onClick={(e) => {
                    e.stopPropagation();
                    const val = getDisplayValue('email');
                    if (val && val !== '—') {
                      navigator.clipboard.writeText(val).then(
                        () => toast.success('Correo copiado'),
                        () => {}
                      );
                    }
                  }}
                  className="shrink-0 p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </ZenCard>

      {/* Modal Preview Cotización */}
      <ZenDialog
        isOpen={showCotizacionPreview}
        onClose={() => {
          setShowCotizacionPreview(false);
          setCotizacionCompleta(null);
        }}
        title={`Cotización: ${cotizacionData?.name || ''}`}
        description="Vista previa completa de la cotización con desglose y condiciones comerciales"
        maxWidth="4xl"
        onCancel={() => {
          setShowCotizacionPreview(false);
          setCotizacionCompleta(null);
        }}
        cancelLabel="Cerrar"
        zIndex={10070}
      >
        {loadingCotizacion ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : cotizacionCompleta ? (
          <ResumenCotizacionAutorizada
            cotizacion={cotizacionCompleta}
            studioSlug={studioSlug}
            promiseId={eventData.promise_id || undefined}
          />
        ) : null}
      </ZenDialog>

      {/* Modal Preview Contrato */}
      {showContratoPreview && contrato?.content && (
        <ContractPreviewForPromiseModal
          isOpen={showContratoPreview}
          onClose={() => {
            setShowContratoPreview(false);
            setTemplateContentWithPlaceholders(null);
          }}
          onConfirm={() => setShowContratoPreview(false)}
          onEdit={() => { }}
          studioSlug={studioSlug}
          promiseId={eventData.promise_id || ''}
          cotizacionId={cotizacionData?.id || ''}
          eventId={eventId}
          template={{
            id: contrato.template_id || '',
            name: contrato.template_name || 'Contrato',
            slug: contrato.template_id || '',
            content: templateContentWithPlaceholders ?? contrato.content,
            studio_id: '',
            is_active: true,
            is_default: false,
            version: contrato.version || 1,
            created_at: new Date(),
            updated_at: new Date(),
          }}
          customContent={contrato.content}
          condicionesComerciales={condiciones ? {
            id: '',
            name: condiciones.name || '',
            description: condiciones.description || null,
            discount_percentage: condiciones.discount_percentage || null,
            advance_percentage: condiciones.advance_percentage || null,
            advance_type: condiciones.advance_type || null,
            advance_amount: condiciones.advance_amount || null,
          } : undefined}
          isContractSigned={isContratoFirmado}
        />
      )}

      <GoogleContactsConnectionModal
        isOpen={showGoogleContactsModal}
        onClose={() => setShowGoogleContactsModal(false)}
        onConnect={handleConfirmConnectGoogle}
        connecting={connectingGoogle}
      />
    </>
  );
}

