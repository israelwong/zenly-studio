'use client';

import { useState, useCallback, useEffect, useRef, startTransition, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, Building2, Copy, Check, FileText, Clock, FileSearch, Package, ChevronRight } from 'lucide-react';
import { ZenButton, ZenDialog, ZenCard } from '@/components/ui/zen';
import { PublicPromiseDataForm } from './PublicPromiseDataForm';
import { PublicContractView } from './PublicContractView';
import { PublicContractCard } from './PublicContractCard';
import { ContractStepCardSkeleton } from '@/app/[slug]/promise/[promiseId]/cierre/CierrePageSkeleton';
import { PublicPromisePageHeader } from './PublicPromisePageHeader';
import { BankInfoModal } from '@/components/shared/BankInfoModal';
import { ResumenPago } from '@/components/shared/precio';
import { CotizacionDetailSheet } from './CotizacionDetailSheet';
import { AutorizarCotizacionModal } from './AutorizarCotizacionModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/shadcn/alert-dialog';
import {
  getPrecioListaStudio,
  getMontoCortesiasFromServicios,
  getBonoEspecialMonto,
  getCortesiasCount,
  getPrecioFinalCierre,
  getAjusteCierre,
} from '@/lib/utils/promise-public-financials';
import { updatePublicPromiseData, getPublicPromiseData, getPublicCotizacionContract } from '@/lib/actions/public/promesas.actions';
import { regeneratePublicContract } from '@/lib/actions/public/cotizaciones.actions';
import { obtenerInfoBancariaStudio } from '@/lib/actions/cliente/pagos.actions';
import type { CotizacionChangeInfo } from '@/hooks/useCotizacionesRealtime';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import { usePromiseNavigation } from '@/hooks/usePromiseNavigation';
import { usePromisePageContext, type AuthorizationData } from '@/components/promise/PromisePageContext';
import { toast } from 'sonner';
import type { PublicCotizacion } from '@/types/public-promise';
import { RealtimeUpdateNotification } from './RealtimeUpdateNotification';

interface PublicQuoteAuthorizedViewProps {
  cotizacion: PublicCotizacion;
  promiseId: string;
  studioSlug: string;
  promise: {
    contact_name: string;
    contact_phone: string;
    contact_email: string | null;
    contact_address: string | null;
    event_type_name: string | null;
    event_type_cover_image_url?: string | null;
    event_type_cover_video_url?: string | null;
    event_type_cover_media_type?: 'image' | 'video' | null;
    event_type_cover_design_variant?: 'solid' | 'gradient' | null;
    event_date: Date | null;
    event_location: string | null;
    event_name: string | null;
  };
  studio: {
    studio_name: string;
    representative_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    id?: string;
  };
  cotizacionPrice: number;
  eventTypeId?: string | null;
  /** Espejo comercial: si viene del cierre, controla paso de firma y visibilidad de precios/desglose */
  shareSettings?: {
    auto_generate_contract: boolean;
    show_items_prices: boolean;
    show_categories_subtotals: boolean;
  };
}

export function PublicQuoteAuthorizedView({
  cotizacion: initialCotizacion,
  promiseId,
  studioSlug,
  promise: initialPromise,
  studio,
  cotizacionPrice,
  eventTypeId,
  shareSettings,
}: PublicQuoteAuthorizedViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showContractView, setShowContractView] = useState(false);
  const [showEditDataModal, setShowEditDataModal] = useState(false);
  const [showSuccessDataModal, setShowSuccessDataModal] = useState(false);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const [isRegeneratingContract, setIsRegeneratingContract] = useState(false);
  const [cotizacion, setCotizacion] = useState<PublicCotizacion>(initialCotizacion);
  const [promise, setPromise] = useState(initialPromise);
  const [showBankInfoModal, setShowBankInfoModal] = useState(false);
  const [bankInfo, setBankInfo] = useState<{ banco?: string | null; titular?: string | null; clabe?: string | null } | null>(null);
  const [loadingBankInfo, setLoadingBankInfo] = useState(false);
  const [copiedClabe, setCopiedClabe] = useState(false);
  
  // Fase 28.1: Inspección de servicios contratados
  const [showServicesSheet, setShowServicesSheet] = useState(false);
  // Fase 29.1 / 29.3: Modal de autorización; en cierre visibilidad y paso desde URL (?checkin=true&step=1|2|3)
  const isCierrePath = pathname?.includes('/cierre') ?? false;
  const checkinFromUrl = isCierrePath && searchParams?.get('checkin') === 'true';
  const stepParam = searchParams?.get('step');
  const checkinStep = stepParam ? Math.min(3, Math.max(1, parseInt(stepParam, 10) || 1)) : 1;
  // Fase 29.4: Cierre optimista — ocultar modal al instante antes de limpiar URL
  const [exitConfirmed, setExitConfirmed] = useState(false);
  const showAutorizarModal = checkinFromUrl && !exitConfirmed;
  // Fase 29.4: Feedback de clic inmediato en botón Continuar
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Fase 29.3: Safe exit — AlertDialog antes de salir del check-in
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const { setAuthorizationData, setIsAuthorizationInProgress } = usePromisePageContext();

  // Fase 29.8: Sincronización agresiva — URL sin checkin implica resetear salida
  useEffect(() => {
    if (!checkinFromUrl) {
      setExitConfirmed(false);
      setShowExitConfirm(false);
    }
  }, [checkinFromUrl]);

  const openCheckinModal = useCallback(() => {
    // Fase 29.8: Si la URL ya tiene checkin=true (limbo), forzar apertura del modal
    if (checkinFromUrl) {
      setIsTransitioning(false);
      return;
    }
    setIsTransitioning(true);
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('checkin', 'true');
      params.set('step', '1');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [pathname, searchParams, router, checkinFromUrl]);

  useEffect(() => {
    if (checkinFromUrl) setIsTransitioning(false);
  }, [checkinFromUrl]);

  const handleSafeClose = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const handleConfirmExitCheckin = useCallback((_formData?: unknown, authData?: AuthorizationData | null) => {
    // Fase 29.9.1: Persistir estado de cierre en el padre (overlay no depende del modal)
    if (authData != null && setAuthorizationData && setIsAuthorizationInProgress) {
      setAuthorizationData(authData);
      setIsAuthorizationInProgress(true);
    }
    const cleanPath = pathname ?? '';
    router.push(cleanPath, { scroll: false });
    setExitConfirmed(true);
    setShowExitConfirm(false);
  }, [pathname, router, setAuthorizationData, setIsAuthorizationInProgress]);

  const handleCheckinStepChange = useCallback((step: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('checkin', 'true');
      params.set('step', String(step));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [pathname, searchParams, router]);
  
  // Estado de actualización para notificaciones (solo insert/delete, no cambios de estatus)
  const [pendingUpdate, setPendingUpdate] = useState<{ 
    count: number; 
    type: 'quote' | 'promise' | 'both';
    changeType?: 'price' | 'description' | 'name' | 'inserted' | 'deleted' | 'general';
    requiresManualUpdate?: boolean;
  } | null>(null);
  
  // ⚠️ EMERGENCY: Fallback de force refresh si el contrato no aparece
  const [showForceRefresh, setShowForceRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ⚠️ SAFETY CHECK: Spinner inicial si auto-generate y no hay contrato
  const [showInitialSpinner, setShowInitialSpinner] = useState(false);
  const [hasCompletedSafetyCheck, setHasCompletedSafetyCheck] = useState(false);

  // Estado separado para el contrato (se actualiza independientemente)
  // ⚠️ FIX: Inicializar con contrato de initialCotizacion si existe (incluso si solo tiene template_id)
  const [contractData, setContractData] = useState<{
    template_id: string | null;
    content: string | null;
    version?: number;
    signed_at?: Date | null;
    condiciones_comerciales: {
      id: string;
      name: string;
      description: string | null;
      advance_percentage: number | null;
      advance_type: string | null;
      advance_amount: number | null;
      discount_percentage: number | null;
    } | null;
  } | null>(() => {
    // Inicializar con contrato si existe (incluso si solo tiene template_id sin content)
    if (initialCotizacion.contract) {
      return {
        template_id: initialCotizacion.contract.template_id,
        content: initialCotizacion.contract.content,
        version: initialCotizacion.contract.version,
        signed_at: initialCotizacion.contract.signed_at,
        condiciones_comerciales: initialCotizacion.contract.condiciones_comerciales,
      };
    }
    return null;
  });

  // ⚠️ FIX: Sincronizar contractData cuando cotizacion.contract cambia (desde Realtime o actualizaciones)
  useEffect(() => {
    const cotizacionContract = (cotizacion as any).contract;
    if (cotizacionContract) {
      // Actualizar si no hay contractData o si el contenido cambió
      const contentChanged = contractData?.content !== cotizacionContract.content;
      const templateChanged = contractData?.template_id !== cotizacionContract.template_id;
      
      if (!contractData || contentChanged || templateChanged) {
        setContractData({
          template_id: cotizacionContract.template_id,
          content: cotizacionContract.content,
          version: cotizacionContract.version,
          signed_at: cotizacionContract.signed_at,
          condiciones_comerciales: cotizacionContract.condiciones_comerciales,
        });
      }
    }
  }, [cotizacion, contractData]);

  // Usar contractData si existe, sino usar el de cotizacion (para compatibilidad inicial)
  const currentContract = contractData || (cotizacion as any).contract;

  // Verificar si hay contrato disponible
  // El contrato está disponible si hay contract_content (generado)
  // Si solo hay template_id pero no content, el contrato aún no se ha generado
  const hasContract = !!currentContract?.content;
  const hasContractTemplate = !!currentContract?.template_id;
  const isContractGenerated = cotizacion.status === 'contract_generated' || cotizacion.status === 'contract_signed';
  // IMPORTANTE: Verificar firma desde la tabla temporal (contract.signed_at)
  // ⚠️ Usar useMemo para asegurar estabilidad de valores entre renders
  const isContractSigned = useMemo(() => !!currentContract?.signed_at, [currentContract?.signed_at]);
  const isEnCierre = useMemo(() => cotizacion.status === 'en_cierre', [cotizacion.status]);

  // Obtener condiciones comerciales (priorizar desde contract, sino desde cotizacion directamente)
  // Esto cubre el caso cuando el contrato fue generado manualmente por el estudio
  // También considerar condiciones comerciales directamente de la cotización si tiene campos completos (ej: negociación)
  const condicionesComerciales = currentContract?.condiciones_comerciales ||
    (cotizacion.condiciones_comerciales &&
      'id' in cotizacion.condiciones_comerciales &&
      'advance_type' in cotizacion.condiciones_comerciales
      ? {
        id: cotizacion.condiciones_comerciales.id!,
        name: cotizacion.condiciones_comerciales.name!,
        description: cotizacion.condiciones_comerciales.description ?? null,
        advance_percentage: cotizacion.condiciones_comerciales.advance_percentage ?? null,
        advance_type: cotizacion.condiciones_comerciales.advance_type!,
        advance_amount: cotizacion.condiciones_comerciales.advance_amount ?? null,
        discount_percentage: cotizacion.condiciones_comerciales.discount_percentage ?? null,
      }
      : null);

  // Fase 29.1: Datos pendientes de validar (placeholder, "asd", vacíos) — usado en títulos y CTA único
  const isDataPending = useMemo(() => {
    const name = (promise.contact_name || '').trim().toLowerCase();
    const address = (promise.contact_address || '').trim().toLowerCase();
    const email = (promise.contact_email || '').trim().toLowerCase();

    const invalidValues = ['asd', 'placeholder', 'test', 'prueba', 'proporcionada', 'cliente)'];
    const isInvalidName = !name || invalidValues.some((v) => name === v || name.includes(v));
    const isInvalidAddress =
      !address ||
      invalidValues.some((v) => address === v || address.includes(v)) ||
      address.includes('proporcionada') ||
      address.includes('(cliente)');
    const isInvalidEmail = !email || email.includes('@placeholder');

    return isInvalidName || isInvalidAddress || isInvalidEmail;
  }, [promise.contact_name, promise.contact_address, promise.contact_email]);

  const hasPlaceholderData = isDataPending;

  // Desglose para AutorizarCotizacionModal (condición comercial ya pactada en cierre)
  const precioListaModal = useMemo(() => getPrecioListaStudio(cotizacion), [cotizacion]);
  const montoCortesiasModal = useMemo(() => getMontoCortesiasFromServicios(cotizacion), [cotizacion]);
  const cortesiasCountModal = useMemo(() => getCortesiasCount(cotizacion), [cotizacion]);
  const montoBonoModal = useMemo(() => getBonoEspecialMonto(cotizacion), [cotizacion]);
  const precioFinalCierreModal = useMemo(
    () => getPrecioFinalCierre(cotizacion, Math.max(0, precioListaModal - montoCortesiasModal - montoBonoModal)),
    [cotizacion, precioListaModal, montoCortesiasModal, montoBonoModal]
  );
  const ajusteCierreModal = useMemo(
    () => getAjusteCierre(precioFinalCierreModal, precioListaModal, montoCortesiasModal, montoBonoModal),
    [precioFinalCierreModal, precioListaModal, montoCortesiasModal, montoBonoModal]
  );
  const condicionesComercialesIdCierre =
    (cotizacion as { contract?: { condiciones_comerciales?: { id?: string } } }).contract?.condiciones_comerciales?.id ??
    (cotizacion.condiciones_comerciales && 'id' in cotizacion.condiciones_comerciales ? cotizacion.condiciones_comerciales.id : null);

  // Actualizar solo el contrato localmente (sin recargar toda la cotización)
  const updateContractLocally = useCallback(async () => {
    try {
      const result = await getPublicCotizacionContract(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        // Actualizar solo el estado del contrato, sin tocar cotizacion
        const contractUpdate = {
          template_id: result.data.template_id,
          content: result.data.content,
          version: result.data.version || 1,
          signed_at: result.data.signed_at,
          condiciones_comerciales: result.data.condiciones_comerciales,
        };
        // Solo actualizar si hay contenido o template_id (evitar sobrescribir con null)
        if (contractUpdate.content || contractUpdate.template_id) {
          setContractData(contractUpdate);
        }
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error updating contract locally:', error);
    }
  }, [studioSlug, cotizacion.id]);

  // Cargar contrato inicialmente si no está disponible
  useEffect(() => {
    // Si no hay contractData pero hay template_id o el estado indica que debería haber contrato
    const shouldLoadContract = !contractData && (
      initialCotizacion.contract?.template_id ||
      initialCotizacion.status === 'contract_generated' ||
      initialCotizacion.status === 'contract_signed' ||
      initialCotizacion.status === 'en_cierre'
    );

    if (shouldLoadContract) {
      updateContractLocally();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  // ⚠️ FIX: Recargar contrato cuando está en cierre pero no hay contrato disponible
  // Esto asegura que cuando el contrato se genere, se actualice automáticamente
  useEffect(() => {
    if (isEnCierre && !hasContract && !isContractSigned) {
      // Intentar cargar el contrato cada 3 segundos si está en cierre sin contrato
      // Limitar a máximo 20 intentos (1 minuto) para evitar polling infinito
      let attempts = 0;
      const maxAttempts = 20;
      
      const intervalId = setInterval(() => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(intervalId);
          return;
        }
        updateContractLocally();
      }, 3000);

      return () => clearInterval(intervalId);
    }
  }, [isEnCierre, hasContract, isContractSigned, updateContractLocally]);

  // Cargar información bancaria automáticamente cuando el contrato esté firmado
  useEffect(() => {
    if (isContractSigned && !bankInfo && !loadingBankInfo && studio.id) {
      setLoadingBankInfo(true);
      obtenerInfoBancariaStudio(studio.id)
        .then((result) => {
          if (result.success && result.data) {
            setBankInfo({
              banco: result.data.banco,
              titular: result.data.titular,
              clabe: result.data.clabe,
            });
          }
        })
        .catch((error) => {
          console.error('[PublicQuoteAuthorizedView] Error loading bank info:', error);
        })
        .finally(() => {
          setLoadingBankInfo(false);
        });
    }
  }, [isContractSigned, bankInfo, loadingBankInfo, studio.id]);

  // ⚠️ EMERGENCY FALLBACK: Mostrar botón de force refresh si el contrato no aparece después de 5s
  // Solo en flujo automático (selected_by_prospect = true)
  useEffect(() => {
    const isAutomaticFlow = cotizacion.selected_by_prospect === true;
    const shouldAutoGenerate = shareSettings?.auto_generate_contract === true;
    
    if (isAutomaticFlow && shouldAutoGenerate && isEnCierre && !hasContract && !isContractSigned) {
      const timer = setTimeout(() => {
        setShowForceRefresh(true);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setShowForceRefresh(false);
    }
  }, [cotizacion.selected_by_prospect, shareSettings?.auto_generate_contract, isEnCierre, hasContract, isContractSigned]);

  // Handler para force refresh
  const handleForceRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    // Esperar un momento para mostrar el spinner
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Forzar refresh completo de la página
    window.location.reload();
  }, []);

  // ⚠️ SAFETY CHECK: Si es flujo automático (selected_by_prospect) y no hay contrato,
  // mostrar spinner por 2 segundos y luego hacer router.refresh()
  // ⚠️ FIX: Solo ejecutar UNA VEZ al montar el componente si las condiciones se cumplen
  useEffect(() => {
    const isAutomaticFlow = cotizacion.selected_by_prospect === true;
    const shouldAutoGenerate = shareSettings?.auto_generate_contract === true;
    
    // ⚠️ CRÍTICO: Solo ejecutar si nunca se ha completado el safety check Y es flujo automático
    if (isAutomaticFlow && shouldAutoGenerate && isEnCierre && !hasContract && !isContractSigned && !hasCompletedSafetyCheck) {
      // Marcar inmediatamente como completado para evitar re-ejecuciones
      setHasCompletedSafetyCheck(true);
      setShowInitialSpinner(true);
      
      const timer = setTimeout(() => {
        setShowInitialSpinner(false);
        router.refresh();
      }, 2000);

      return () => clearTimeout(timer);
    }
    // ⚠️ SOLO depender de hasCompletedSafetyCheck para prevenir loops infinitos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCompletedSafetyCheck]);

  const handleShowBankInfo = useCallback(async () => {
    if (!studio.id) {
      toast.error('No se pudo obtener información del estudio');
      return;
    }

    if (bankInfo) {
      setShowBankInfoModal(true);
      return;
    }

    setLoadingBankInfo(true);
    try {
      const result = await obtenerInfoBancariaStudio(studio.id);
      if (result.success && result.data) {
        setBankInfo({
          banco: result.data.banco,
          titular: result.data.titular,
          clabe: result.data.clabe,
        });
        setShowBankInfoModal(true);
      } else {
        toast.error('No se pudo cargar la información bancaria');
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error loading bank info:', error);
      toast.error('Error al cargar información bancaria');
    } finally {
      setLoadingBankInfo(false);
    }
  }, [studio.id, bankInfo]);

  const reloadCotizacionData = useCallback(async () => {
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data) {
        const updatedCotizacion = result.data.cotizaciones.find(c => c.id === cotizacion.id);
        if (updatedCotizacion) {
          setCotizacion(updatedCotizacion);
          // Sincronizar contractData con la cotización actualizada
          const contract = (updatedCotizacion as any).contract;
          if (contract) {
            setContractData({
              template_id: contract.template_id,
              content: contract.content,
              version: contract.version,
              signed_at: contract.signed_at,
              condiciones_comerciales: contract.condiciones_comerciales,
            });
          } else {
            setContractData(null);
          }
        }
        if (result.data.promise) {
          setPromise(result.data.promise);
        }
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error reloading data:', error);
    }
  }, [studioSlug, promiseId, cotizacion.id]);

  // ⚠️ TAREA 1: Hook de navegación para prevenir race conditions (debe ir antes de los callbacks que lo usan)
  const { isNavigating, setNavigating, getIsNavigating, clearNavigating } = usePromiseNavigation();

  // ⚠️ TAREA 3: Optimistic update - Guardar estado anterior para rollback
  const previousContractDataRef = useRef<typeof contractData>(null);

  // Callback optimista ANTES de la Server Action
  const handleContractSignedOptimistic = useCallback(() => {
    // Guardar estado anterior para rollback
    previousContractDataRef.current = contractData;
    
    // ⚠️ OPTIMISTIC UPDATE: Actualizar estado inmediatamente
    if (contractData) {
      setContractData({
        ...contractData,
        signed_at: new Date(), // Actualizar inmediatamente
      });
    }
  }, [contractData]);

  // ⚠️ TAREA 4: Callback cuando se firma el contrato (después de Server Action exitosa)
  // El optimistic update (onContractSignedOptimistic) ya puso signed_at antes de la action,
  // así que al cerrar el modal el card de Pago ya se muestra; este refetch sincroniza con el servidor.
  const handleContractSigned = useCallback(async () => {
    try {
      setNavigating('post-sign');

      const result = await getPublicCotizacionContract(studioSlug, cotizacion.id);
      if (result.success && result.data) {
        const contractUpdate = {
          template_id: result.data.template_id,
          content: result.data.content,
          version: result.data.version || 1,
          signed_at: result.data.signed_at,
          condiciones_comerciales: result.data.condiciones_comerciales,
        };

        startTransition(() => {
          setContractData(contractUpdate);
          clearNavigating(500);
        });
      } else {
        clearNavigating(0);
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error updating contract after signing:', error);
      clearNavigating(0);
    }
  }, [studioSlug, cotizacion.id, setNavigating, clearNavigating]);

  // ⚠️ TAREA 3: Rollback si la Server Action falla
  const handleContractSignedRollback = useCallback(() => {
    if (previousContractDataRef.current) {
      setContractData(previousContractDataRef.current);
      previousContractDataRef.current = null;
    }
  }, []);

  // ⚠️ SIN LÓGICA DE REDIRECCIÓN: El Gatekeeper en el layout maneja toda la redirección
  // Solo mantener lógica de actualización local del contrato si es necesario
  const handleContractUpdated = useCallback(async (updatedCotizacionId: string, changeInfo?: CotizacionChangeInfo) => {
    // Solo procesar si es la cotización actual y hay cambios en el contrato
    if (updatedCotizacionId === cotizacion.id) {
      // ⚠️ Toast si el contrato fue actualizado por el estudio
      if (changeInfo?.camposCambiados?.includes('contract_content') || changeInfo?.camposCambiados?.includes('contract_template_id')) {
        toast.info('El estudio ha actualizado tu contrato', {
          description: 'Los cambios se han aplicado automáticamente',
        });
      }
      // Actualizar contrato localmente si hay cambios
      if (changeInfo?.camposCambiados && changeInfo.camposCambiados.length > 0) {
        updateContractLocally();
      }
    }
  }, [cotizacion.id, updateContractLocally]);

  // Handler para cuando se inserta una nueva cotización (mostrar notificación)
  const handleCotizacionInserted = useCallback((changeInfo?: CotizacionChangeInfo) => {
    setPendingUpdate((prev) => {
      if (!prev) {
        return { count: 1, type: 'quote', changeType: 'inserted', requiresManualUpdate: true };
      }
      return { 
        count: prev.count + 1, 
        type: prev.type === 'quote' ? 'quote' : 'both',
        changeType: 'inserted',
        requiresManualUpdate: true 
      };
    });
  }, []);

  // Handler para cuando se elimina una cotización (mostrar notificación)
  const handleCotizacionDeleted = useCallback((cotizacionId: string) => {
    setPendingUpdate((prev) => {
      if (!prev) {
        return { count: 1, type: 'quote', changeType: 'deleted', requiresManualUpdate: true };
      }
      return { 
        count: prev.count + 1, 
        type: prev.type === 'quote' ? 'quote' : 'both',
        changeType: 'deleted',
        requiresManualUpdate: true 
      };
    });
  }, []);

  // Función para recargar datos cuando el usuario hace clic en el botón
  const handleManualReload = useCallback(async () => {
    try {
      const result = await getPublicPromiseData(studioSlug, promiseId);
      if (result.success && result.data) {
        const updatedCotizacion = result.data.cotizaciones.find(c => c.id === cotizacion.id);
        if (updatedCotizacion) {
          setCotizacion(updatedCotizacion);
          const contract = (updatedCotizacion as any).contract;
          if (contract) {
            setContractData({
              template_id: contract.template_id,
              content: contract.content,
              version: contract.version,
              signed_at: contract.signed_at,
              condiciones_comerciales: contract.condiciones_comerciales,
            });
          } else {
            setContractData(null);
          }
        }
        if (result.data.promise) {
          setPromise(result.data.promise);
        }
        setPendingUpdate(null);
      }
    } catch (error) {
      console.error('[PublicQuoteAuthorizedView] Error en recarga manual:', error);
    }
  }, [studioSlug, promiseId, cotizacion.id]);

  // ✅ REALTIME: Escuchar cambios en cotizaciones para actualizar el contrato cuando se genere
  // Usar ref para mantener callbacks estables
  const updateContractLocallyRef = useRef(updateContractLocally);
  updateContractLocallyRef.current = updateContractLocally;
  
  useCotizacionesRealtime({
    studioSlug,
    promiseId,
    ignoreCierreEvents: false, // Escuchar studio_cotizaciones_cierre (generar, actualizar, cancelar contrato)
    onCotizacionUpdated: (cotizacionId, changeInfo) => {
      if (cotizacionId !== cotizacion.id || getIsNavigating()) return;

      const info = changeInfo as { contractSignedAt?: Date | null; camposCambiados?: string[] } | undefined;
      // Evento de cierre: siempre refrescar contrato (cubre generar, actualizar y cancelar contrato)
      const isCierreEvent = info && 'contractSignedAt' in info;
      if (isCierreEvent) {
        setTimeout(() => updateContractLocallyRef.current(), 500);
        return;
      }

      // Evento en studio_cotizaciones: actualizar si hay cambios de contrato
      if (!contractData?.content && hasContractTemplate) {
        setTimeout(() => updateContractLocallyRef.current(), 500);
        return;
      }
      const camposCambiados = info?.camposCambiados || [];
      const hasContractChanges = camposCambiados.some((campo: string) =>
        campo.includes('contrato') || campo.includes('contract') ||
        campo.includes('contrato_definido') || campo.includes('contract_content') ||
        campo.includes('status') // También escuchar cambios de status (contract_generated)
      );
      if (hasContractChanges) {
        setTimeout(() => updateContractLocallyRef.current(), 500);
      }
      
      // ⚠️ FIX: Si está en cierre sin contrato, intentar cargar siempre que haya cualquier cambio
      if (cotizacion.status === 'en_cierre' && !contractData?.content) {
        setTimeout(() => updateContractLocallyRef.current(), 1000);
      }
    },
  });

  const handleUpdateData = async (data: {
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    contact_address: string;
    event_name: string;
    event_location: string;
  }) => {
    // ⚠️ TAREA 3: Cerrar overlays antes de actualizar
    window.dispatchEvent(new CustomEvent('close-overlays'));
    
    setIsUpdatingData(true);
    try {
      // 1. Actualizar datos de la promesa
      const updateResult = await updatePublicPromiseData(studioSlug, promiseId, {
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        contact_address: data.contact_address,
        event_name: data.event_name,
        event_location: data.event_location,
      });

      if (!updateResult.success) {
        toast.error('Error al actualizar datos', {
          description: updateResult.error || 'Por favor, intenta de nuevo.',
        });
        setIsUpdatingData(false);
        return;
      }

      // Actualizar estado local de promise
      setPromise({
        ...promise,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        contact_address: data.contact_address,
        event_name: data.event_name,
        event_location: data.event_location,
      });

      // 2. Si hay contrato generado (pero no firmado), regenerarlo
      if ((hasContract || hasContractTemplate) && !isContractSigned) {
        setIsRegeneratingContract(true);
        setIsUpdatingData(false); // Ya terminó la actualización de datos

        const regenerateResult = await regeneratePublicContract(
          studioSlug,
          promiseId,
          cotizacion.id
        );

        if (!regenerateResult.success) {
          toast.warning('Datos actualizados, pero hubo un error al regenerar el contrato', {
            description: regenerateResult.error || 'El estudio puede regenerarlo manualmente.',
          });
          setIsRegeneratingContract(false);
        } else {
          // Actualizar solo el contrato localmente después de regenerar
          await updateContractLocally();
          setIsRegeneratingContract(false);
          setShowSuccessDataModal(true);
        }
      } else {
        setShowSuccessDataModal(true);
      }

      // 3. Cerrar modal de edición
      setShowEditDataModal(false);
    } catch (error) {
      console.error('Error en handleUpdateData:', error);
      toast.error('Error al actualizar datos', {
        description: 'Por favor, intenta de nuevo o contacta al estudio.',
      });
      setIsRegeneratingContract(false);
    } finally {
      setIsUpdatingData(false);
    }
  };

  return (
    <>
      {/* Notificación de cambios - Solo para insert/delete, no para cambios de estatus */}
      <RealtimeUpdateNotification
        pendingUpdate={pendingUpdate}
        onUpdate={handleManualReload}
        onDismiss={() => setPendingUpdate(null)}
      />

      {/* Header evolutivo con asesoría profesional */}
      <PublicPromisePageHeader
        prospectName={promise.contact_name}
        eventName={promise.event_name}
        eventTypeName={promise.event_type_name}
        eventDate={promise.event_date}
        variant="cierre"
        isContractSigned={isContractSigned}
        coverImageUrl={promise.event_type_cover_image_url}
        coverVideoUrl={promise.event_type_cover_video_url}
        coverMediaType={promise.event_type_cover_media_type}
        coverDesignVariant={promise.event_type_cover_design_variant}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Flujo reorganizado: Paso principal destacado */}
        <div className="relative space-y-6">
          {/* PASO PRINCIPAL: Firma de Contrato - solo si el estudio tiene habilitado auto_generate_contract */}
          {(isContractGenerated || isEnCierre) && (shareSettings == null || shareSettings.auto_generate_contract === true) && (
            <div className="relative">
              <div className="flex items-start gap-4">
                {/* Número del paso - más grande y destacado */}
                <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 ${isContractSigned
                  ? 'bg-emerald-500/20 border-2 border-emerald-500 scale-110'
                  : 'bg-blue-500/20 border-2 border-blue-500 ring-2 ring-blue-500/30'
                  }`}>
                  {isContractSigned ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <span className="text-base font-bold text-blue-400">1</span>
                  )}
                </div>

                {/* Título y subtítulo */}
                <div className="flex-1 min-w-0">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-zinc-100 mb-1">
                      {isContractSigned
                        ? 'Contrato Firmado'
                        : isDataPending
                          ? 'Validación de Información'
                          : hasContract
                            ? 'Firma tu Contrato Digital'
                            : 'Preparando tu Contrato'}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {isContractSigned
                        ? '¡Excelente! Tu contrato ha sido firmado exitosamente.'
                        : isDataPending
                          ? 'Completa tus datos requeridos para generar tu contrato.'
                          : hasContract
                            ? 'Revisa y firma tu contrato para oficializar tu reserva.'
                            : 'Estamos generando el documento final con tu información verificada.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cards a ancho completo (sin indentación respecto al contenedor) */}
              <div className="w-full mt-0">
                {hasContract ? (
                    // Sub-condition A: Contrato disponible - mostrar preview para firma
                    <div data-contract-card>
                      <PublicContractCard
                        contract={currentContract || null}
                        isContractSigned={isContractSigned}
                        isRegeneratingContract={isRegeneratingContract}
                        isUpdatingData={isUpdatingData}
                        onEditData={() => {
                          window.dispatchEvent(new CustomEvent('close-overlays'));
                          setShowEditDataModal(true);
                        }}
                        onViewContract={() => {
                          window.dispatchEvent(new CustomEvent('close-overlays'));
                          setShowContractView(true);
                        }}
                      />
                    </div>
                  ) : isEnCierre ? (
                    // Sub-condition B: En cierre pero sin contrato
                    (() => {
                      // ⚠️ FIX: Usar selected_by_prospect como indicador real de flujo
                      const isAutomaticFlow = cotizacion.selected_by_prospect === true;
                      const shouldAutoGenerate = shareSettings?.auto_generate_contract ?? true;
                      // Fase 28.0: Verificar si el estudio confirmó recepción de pago
                      const pagoConfirmado = cotizacion.contract?.pago_confirmado_estudio ?? false;
                      
                      // ⚠️ SAFETY CHECK: Solo mostrar spinner si es flujo AUTOMÁTICO
                      if (showInitialSpinner && isAutomaticFlow && shouldAutoGenerate) {
                        return (
                          <ZenCard className="animate-pulse">
                            <div className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="shrink-0 w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-emerald-400" />
                                    Finalizando detalles...
                                  </h4>
                                  <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                                    Tu contrato está listo, estamos sincronizando los últimos detalles. Solo un momento.
                                  </p>
                                  <div className="space-y-2">
                                    <div className="h-2 bg-zinc-800 rounded-full w-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full animate-pulse w-3/4" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </ZenCard>
                        );
                      }
                      
                      // Fase 28.1: Check-in de contratación con ResumenPago y inspección de ítems
                      if (pagoConfirmado) {
                        // Calcular valores para ResumenPago desde contract o cotización
                        const totalAPagar = cotizacion.totalAPagar ?? cotizacion.price;
                        const pagoMonto = cotizacion.contract?.pago_monto ?? cotizacion.anticipo ?? 0;
                        const diferido = totalAPagar - pagoMonto;
                        const condComerciales = cotizacion.contract?.condiciones_comerciales || cotizacion.condiciones_comerciales;
                        const advanceType = condComerciales?.advance_type === 'fixed_amount' || condComerciales?.advance_type === 'amount'
                          ? 'fixed_amount' as const
                          : 'percentage' as const;
                        // Fase 28.8: Calcular porcentaje real basado en monto confirmado vs total
                        const anticipoPorcentaje = advanceType === 'percentage' && totalAPagar > 0
                          ? Math.round((pagoMonto / totalAPagar) * 100)
                          : null;

                        return (
                          <div className="space-y-4">
                            {/* Mensaje de bienvenida */}
                            <ZenCard className="border-emerald-500/50 bg-emerald-500/5">
                              <div className="p-6">
                                <div className="flex items-start gap-4">
                                  <div className="shrink-0 w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-semibold text-zinc-200 mb-2">
                                      Pago Confirmado
                                    </h4>
                                    <p className="text-sm text-zinc-400 leading-relaxed">
                                      ¡Excelente! Se confirmó la recepción de tu anticipo. Revisa el resumen financiero y los servicios contratados antes de continuar con el proceso de contratación.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </ZenCard>

                            {/* Resumen de Pago con badge PAGADO */}
                            <ZenCard>
                              <div className="p-6">
                                <h4 className="text-sm font-medium text-zinc-400 mb-4">Resumen Financiero</h4>
                                <ResumenPago
                                  precioBase={totalAPagar}
                                  descuentoCondicion={0}
                                  precioConDescuento={totalAPagar}
                                  advanceType={advanceType}
                                  anticipoPorcentaje={anticipoPorcentaje}
                                  anticipo={pagoMonto}
                                  diferido={diferido}
                                  precioFinalCierre={totalAPagar}
                                  compact
                                  pagoConfirmado
                                />
                              </div>
                            </ZenCard>

                            {/* Inspección de servicios contratados */}
                            <ZenCard 
                              className="cursor-pointer hover:border-zinc-600 transition-colors"
                              onClick={() => setShowServicesSheet(true)}
                            >
                              <div className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                                      <Package className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-zinc-200">
                                        Revisar detalle de servicios contratados
                                      </h4>
                                      <p className="text-xs text-zinc-500 mt-1">
                                        Valida alcance y especificaciones
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-zinc-400" />
                                </div>
                              </div>
                            </ZenCard>
                          </div>
                        );
                      }
                      
                      // Mensaje diferente según flujo (automático vs manual)
                      return (
                        <ZenCard>
                          <div className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="shrink-0 w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center">
                                <FileSearch className="h-6 w-6 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-blue-400" />
                                  {isAutomaticFlow ? 'Generando tu contrato' : 'El estudio está preparando tu contrato'}
                                </h4>
                                {isAutomaticFlow ? (
                                  // Scenario A: Flujo automático (cliente autorizó)
                                  <p className="text-sm text-zinc-400 leading-relaxed">
                                    Estamos generando tu contrato con los servicios que seleccionaste. Te notificaremos en cuanto esté listo para tu revisión y firma.
                                  </p>
                                ) : (
                                  // Scenario B: Flujo manual (estudio movió a cierre)
                                  <p className="text-sm text-zinc-400 leading-relaxed">
                                    El estudio está preparando tu contrato para revisión. Te notificaremos vía email o WhatsApp en cuanto esté listo para tu revisión y firma.
                                  </p>
                                )}
                                
                                {/* ⚠️ EMERGENCY: Force refresh button - solo en flujo automático */}
                                {isAutomaticFlow && shouldAutoGenerate && showForceRefresh && (
                                  <div className="mt-4 pt-4 border-t border-zinc-800">
                                    <p className="text-xs text-zinc-500 mb-3">
                                      ¿No ves tu contrato? Intenta actualizar la página:
                                    </p>
                                    <ZenButton
                                      size="sm"
                                      variant="outline"
                                      onClick={handleForceRefresh}
                                      disabled={isRefreshing}
                                      className="w-full"
                                    >
                                      {isRefreshing ? (
                                        <>
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          Actualizando...
                                        </>
                                      ) : (
                                        'Actualizar página'
                                      )}
                                    </ZenButton>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </ZenCard>
                      );
                    })()
                  ) : (
                    // Fallback: Skeleton solo si no está en cierre
                    <ContractStepCardSkeleton />
                  )}
              </div>
            </div>
          )}

          {/* PASO 2: Realiza tu Pago - SOLO visible si el contrato está firmado */}
          {isContractSigned && (
            <div className="relative">
              <div className="flex items-start gap-4">
                {/* Número del paso */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center relative z-10">
                  <span className="text-sm font-bold text-blue-400">2</span>
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-1">
                      Realiza tu Anticipo
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Transfiere el monto mínimo para formalizar tu reserva
                    </p>
                  </div>

                  {/* Tarjeta de Monto Destacado */}
                  <ZenCard className="mb-4">
                    <div className="p-6 space-y-4">
                      {/* Monto Mínimo Requerido */}
                      {(() => {
                        // Calcular si es pago completo (100%)
                        const advancePercentage = condicionesComerciales?.advance_percentage || 0;
                        const isFullPayment = advancePercentage === 100;

                        return (
                          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-lg p-5">
                            <div className="text-center">
                              <p className="text-sm font-medium text-emerald-400 mb-2">
                                {isFullPayment 
                                  ? 'Monto para reservar tu fecha'
                                  : 'Monto mínimo para reservar tu fecha'
                                }
                              </p>
                              <p className="text-4xl font-bold text-emerald-400 mb-1">
                                {new Intl.NumberFormat('es-MX', {
                                  style: 'currency',
                                  currency: 'MXN',
                                  minimumFractionDigits: 2,
                                }).format(cotizacion.anticipo || 0)}
                              </p>
                              {condicionesComerciales && (
                                <p className="text-xs text-emerald-400/70">
                                  {isFullPayment
                                    ? 'Liquidación total del contrato'
                                    : condicionesComerciales.advance_type === 'percentage'
                                      ? `${condicionesComerciales.advance_percentage}% del total como anticipo`
                                      : 'Anticipo fijo'}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Total del Contrato como Referencia */}
                      <div className="flex items-center justify-between py-3 px-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                        <span className="text-sm text-zinc-400">Total del contrato:</span>
                        <span className="text-sm font-semibold text-zinc-100">
                          {new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: 'MXN',
                            minimumFractionDigits: 2,
                          }).format(cotizacion.totalAPagar || cotizacionPrice)}
                        </span>
                      </div>

                      {/* Saldo Pendiente - omitido en vista pública */}
                      {false && (() => {
                        const advancePercentage = condicionesComerciales?.advance_percentage || 0;
                        const isFullPayment = advancePercentage === 100;
                        if (isFullPayment || cotizacion.diferido <= 0) return null;
                        return (
                          <div className="flex items-center justify-between py-3 px-4 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                            <span className="text-sm text-zinc-400">Saldo pendiente:</span>
                            <span className="text-sm font-medium text-zinc-300">
                              {new Intl.NumberFormat('es-MX', {
                                style: 'currency',
                                currency: 'MXN',
                                minimumFractionDigits: 2,
                              }).format(cotizacion.diferido)}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Mensaje de Flexibilidad - Solo si NO es pago completo */}
                      {(() => {
                        const advancePercentage = condicionesComerciales?.advance_percentage || 0;
                        const isFullPayment = advancePercentage === 100;
                        
                        if (isFullPayment) return null;
                        
                        return (
                          <div className="pt-3 border-t border-zinc-800">
                            <p className="text-xs text-zinc-400 leading-relaxed">
                              💡 <span className="font-medium">Flexibilidad de pago:</span> Este es el monto mínimo para formalizar tu fecha. 
                              Si prefieres abonar una cantidad mayor, puedes hacerlo y se acreditará a tu saldo pendiente.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </ZenCard>

                  {/* Información Bancaria */}
                  <ZenCard>
                    <div className="p-6">
                      {loadingBankInfo ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                          <p className="text-sm text-zinc-400">Cargando información bancaria...</p>
                        </div>
                      ) : bankInfo ? (
                        <div className="space-y-4">
                          {/* Título de la sección */}
                          <div className="pb-3 border-b border-zinc-800">
                            <h4 className="text-sm font-semibold text-zinc-100 mb-1">
                              Datos bancarios para tu transferencia
                            </h4>
                            <p className="text-xs text-zinc-400">
                              Usa estos datos para realizar tu pago por SPEI
                            </p>
                          </div>

                          <div className="space-y-3 text-sm">
                            {bankInfo.banco && (
                              <div>
                                <span className="text-zinc-400">Banco:</span>
                                <p className="text-zinc-100 font-medium mt-1">{bankInfo.banco}</p>
                              </div>
                            )}

                            {bankInfo.titular && (
                              <div>
                                <span className="text-zinc-400">Titular:</span>
                                <p className="text-zinc-100 font-medium mt-1">{bankInfo.titular}</p>
                              </div>
                            )}

                            {bankInfo.clabe ? (
                              <div>
                                <span className="text-zinc-400">CLABE Interbancaria:</span>
                                <div className="flex items-center gap-2 mt-1 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                  <p className="text-zinc-100 font-mono text-base font-bold flex-1">
                                    {bankInfo.clabe}
                                  </p>
                                  <ZenButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(bankInfo.clabe!);
                                      setCopiedClabe(true);
                                      toast.success('CLABE copiada al portapapeles');
                                      setTimeout(() => setCopiedClabe(false), 2000);
                                    }}
                                    className="shrink-0"
                                  >
                                    {copiedClabe ? (
                                      <Check className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </ZenButton>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <p className="text-sm text-yellow-400">
                                  Información bancaria no disponible. Contacta al estudio.
                                </p>
                              </div>
                            )}
                          </div>

                          {bankInfo.clabe && (
                            <div className="pt-4 border-t border-zinc-800 space-y-2">
                              <div className="flex items-start gap-2">
                                <Building2 className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                  Usa esta CLABE para realizar transferencias SPEI desde cualquier banco.
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                  Recuerda guardar tu comprobante de pago para enviarlo al estudio.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-sm text-yellow-400">
                            No se pudo cargar la información bancaria. Contacta al estudio.
                          </p>
                        </div>
                      )}
                    </div>
                  </ZenCard>
                  
                  {/* Mensaje de Confirmación */}
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-300 mb-1">
                            Próximos pasos
                          </p>
                          <p className="text-xs text-blue-400/80 leading-relaxed">
                            Una vez que realices tu transferencia, el estudio confirmará tu pago y tendrás acceso 
                            completo a tu portal de cliente donde podrás dar seguimiento a tu evento.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fase 29.1: Mismo ancho que las cards; desktop botón a la derecha, mobile ancho completo */}
        {!isContractSigned && (isContractGenerated || isEnCierre) && (shareSettings == null || shareSettings.auto_generate_contract === true) && (
          <div className="mt-8 flex justify-end">
            <ZenButton
              size="lg"
              className="w-full sm:w-auto gap-2"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('close-overlays'));
                openCheckinModal();
              }}
              disabled={isTransitioning}
              loading={isTransitioning}
              loadingText=""
            >
              Continuar
              <ChevronRight className="h-5 w-5 shrink-0" />
            </ZenButton>
          </div>
        )}
      </div>

      {/* Vista de Contrato - solo si firma habilitada (Espejo comercial) */}
      {((hasContract && currentContract?.content) || (hasContractTemplate && currentContract?.template_id)) && (isContractGenerated || isEnCierre) && (shareSettings == null || shareSettings.auto_generate_contract === true) && (
        <PublicContractView
          isOpen={showContractView}
          onClose={() => setShowContractView(false)}
          onContractSigned={handleContractSigned}
          onContractSignedOptimistic={handleContractSignedOptimistic}
          onContractSignedRollback={handleContractSignedRollback}
          cotizacionId={cotizacion.id}
          promiseId={promiseId}
          studioSlug={studioSlug}
          contractContent={currentContract?.content || null}
          contractTemplateId={currentContract?.template_id || null}
          contractVersion={currentContract?.version}
          condicionesComerciales={condicionesComerciales}
          promise={promise}
          studio={studio}
          totalAPagar={cotizacion.totalAPagar}
          anticipo={cotizacion.anticipo}
          diferido={cotizacion.diferido}
          descuentoAplicado={cotizacion.descuentoAplicado}
          cotizacionPrice={cotizacionPrice}
          isSigned={isContractSigned}
          eventTypeId={eventTypeId}
        />
      )}

      {/* Modal para editar datos */}
      <ZenDialog
        isOpen={showEditDataModal}
        onClose={() => {
          if (!isUpdatingData) {
            setShowEditDataModal(false);
            setHasFormChanges(false);
          }
        }}
        title="Actualizar mis datos"
        description="Actualiza tu información de contacto y del evento. El contrato se regenerará automáticamente con los nuevos datos."
        maxWidth="2xl"
        onSave={() => {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }}
        onCancel={() => {
          if (!isUpdatingData) {
            setShowEditDataModal(false);
            setHasFormChanges(false);
          }
        }}
        saveLabel={isUpdatingData ? 'Guardando...' : 'Actualizar datos'}
        cancelLabel="Cancelar"
        isLoading={isUpdatingData}
        saveDisabled={!hasFormChanges}
        zIndex={10060}
      >
        <PublicPromiseDataForm
          promiseId={promiseId}
          studioSlug={studioSlug}
          initialData={promise}
          onSubmit={handleUpdateData}
          isSubmitting={isUpdatingData}
          showEventTypeAndDate={true}
          onHasChangesChange={setHasFormChanges}
        />
      </ZenDialog>

      {/* Modal de éxito tras actualizar datos */}
      <ZenDialog
        isOpen={showSuccessDataModal}
        onClose={() => setShowSuccessDataModal(false)}
        title="Datos actualizados correctamente"
        description="Ya están disponibles en el contrato para revisión y firma."
        maxWidth="sm"
        onCancel={() => setShowSuccessDataModal(false)}
        cancelLabel="Entendido"
        showCloseButton={true}
        zIndex={10061}
      >
        <div className="py-2" />
      </ZenDialog>

      {/* Modal de información bancaria */}
      {bankInfo && (
        <BankInfoModal
          isOpen={showBankInfoModal}
          onClose={() => setShowBankInfoModal(false)}
          bankInfo={bankInfo}
          studioName={studio.studio_name}
        />
      )}

      {/* Fase 29.1 / 29.3: Flujo de 3 pasos; URL ?checkin=true&step=1|2|3; safe exit vía AlertDialog */}
      {showAutorizarModal && (
        <AutorizarCotizacionModal
          cotizacion={cotizacion}
          isOpen={showAutorizarModal}
          onClose={handleSafeClose}
          initialStep={checkinStep as 1 | 2 | 3}
          onStepChange={handleCheckinStepChange}
          useSafeExitConfirm
          promiseId={promiseId}
          studioSlug={studioSlug}
          promiseData={{
            contact_name: promise.contact_name,
            contact_phone: promise.contact_phone,
            contact_email: promise.contact_email ?? '',
            contact_address: promise.contact_address ?? '',
            event_name: promise.event_name ?? '',
            event_location: promise.event_location ?? '',
            event_date: promise.event_date ?? null,
            event_type_name: promise.event_type_name ?? null,
          }}
          condicionesComercialesId={condicionesComercialesIdCierre}
          condicionesComercialesMetodoPagoId={null}
          precioLista={precioListaModal}
          montoCortesias={montoCortesiasModal}
          cortesiasCount={cortesiasCountModal}
          montoBono={montoBonoModal}
          precioFinalCierre={precioFinalCierreModal}
          ajusteCierre={ajusteCierreModal}
          autoGenerateContract={shareSettings?.auto_generate_contract ?? false}
          onSuccess={handleConfirmExitCheckin}
        />
      )}

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent
          className="z-[10050] bg-zinc-900 border-zinc-800"
          overlayClassName="z-[10050]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">¿Salir del check-in?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Si cierras ahora, perderás el progreso de los datos que no hayas confirmado. ¿Deseas salir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-600 text-zinc-300 hover:bg-zinc-800">Seguir completando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExitCheckin} className="bg-red-600 hover:bg-red-700">Sí, salir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fase 28.7/28.8: Sheet de inspección de servicios - solo lectura, sin secciones financieras */}
      <CotizacionDetailSheet
        cotizacion={cotizacion}
        isOpen={showServicesSheet}
        onClose={() => setShowServicesSheet(false)}
        promiseId={promiseId}
        studioSlug={studioSlug}
        showCategoriesSubtotals={shareSettings?.show_categories_subtotals ?? false}
        showItemsPrices={false}
        mostrarBotonAutorizar={false}
        promiseData={promise}
        isPreviewMode
        hideFinancialSections
      />
    </>
  );
}

