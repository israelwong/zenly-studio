'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Package, Sparkles, Loader2, CheckSquare, Square, Archive, ArchiveRestore, Trash2, Eye, EyeOff, X, MoreVertical, ChevronDown } from 'lucide-react';
import {
  ZenButton,
  ZenCard,
  ZenCardContent,
  ZenCardHeader,
  ZenCardTitle,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { obtenerPaquetes } from '@/lib/actions/studio/paquetes/paquetes.actions';
import {
  getCotizacionesByPromiseId,
  reorderCotizaciones,
  archiveCotizacion,
  unarchiveCotizacion,
  deleteCotizacion,
  toggleCotizacionVisibility,
} from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { PromiseQuotesPanelCard } from './PromiseQuotesPanelCard';
import { useCotizacionesRealtime } from '@/hooks/useCotizacionesRealtime';
import type { PaqueteFromDB } from '@/lib/actions/schemas/paquete-schemas';
import type { CotizacionListItem } from '@/lib/actions/studio/commercial/promises/cotizaciones.actions';
import { toast } from 'sonner';

interface PromiseQuotesPanelProps {
  studioSlug: string;
  promiseId: string | null;
  eventTypeId: string | null;
  isSaved: boolean;
  contactId?: string | null;
  promiseData?: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    event_date: Date | null;
    event_name: string | null;
    event_type_name: string | null;
  } | null;
  isLoadingPromiseData?: boolean;
  onAuthorizeClick?: () => void;
}

export function PromiseQuotesPanel({
  studioSlug,
  promiseId,
  eventTypeId,
  isSaved,
  contactId,
  promiseData,
  isLoadingPromiseData = false,
  onAuthorizeClick,
}: PromiseQuotesPanelProps) {
  const router = useRouter();
  const [packages, setPackages] = useState<Array<{ id: string; name: string; precio: number | null }>>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<CotizacionListItem[]>([]);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  // Ref para rastrear cambios locales y evitar recargas innecesarias desde realtime
  const localChangesRef = useRef<Set<string>>(new Set());
  // Estados para modo selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Limpiar selección cuando se sale del modo selección
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

  useEffect(() => {
    const loadPackages = async () => {
      if (!eventTypeId) {
        setPackages([]);
        setLoadingPackages(false);
        return;
      }
      setLoadingPackages(true);
      try {
        const result = await obtenerPaquetes(studioSlug);
        if (result.success && result.data) {
          // Filtrar paquetes por tipo de evento si está disponible
          const filteredPackages = result.data
            .filter((pkg: PaqueteFromDB) => {
              // Si el paquete tiene event_types, filtrar por eventTypeId
              if (pkg.event_types) {
                return pkg.event_types.id === eventTypeId;
              }
              return true; // Si no tiene tipo de evento, incluir todos
            })
            .map((pkg: PaqueteFromDB) => ({
              id: pkg.id,
              name: pkg.name,
              precio: pkg.precio || null,
            }));
          setPackages(filteredPackages);
        }
      } catch (error) {
        console.error('Error loading packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };

    loadPackages();
  }, [studioSlug, eventTypeId]);

  const loadCotizaciones = React.useCallback(async () => {
    if (!promiseId || !isSaved) {
      setCotizaciones([]);
      setLoadingCotizaciones(false);
      return;
    }

    // Solo mostrar skeleton si realmente vamos a cargar datos
    setLoadingCotizaciones(true);

    try {
      const result = await getCotizacionesByPromiseId(promiseId);
      // result.data siempre es un array (puede estar vacío)
      // Si success es true, usar el array (vacío o con datos)
      if (result.success) {
        const cotizacionesData = result.data || [];
        // Guardar TODAS las cotizaciones (incluyendo en_cierre) para validaciones
        // El filtrado para display se hace en cotizacionesParaListado
        setCotizaciones(cotizacionesData);
      } else {
        setCotizaciones([]);
      }
    } catch (error) {
      console.error('[PromiseQuotesPanel] Error loading cotizaciones:', error);
      setCotizaciones([]);
    } finally {
      // Ocultar skeleton inmediatamente después de recibir respuesta
      setLoadingCotizaciones(false);
    }
  }, [promiseId, isSaved]);

  useEffect(() => {
    loadCotizaciones();
  }, [loadCotizaciones]);

  // Suscribirse a cambios en tiempo real de cotizaciones
  // NOTA: Ignoramos eventos de studio_cotizaciones_cierre (contratos, pagos, etc.)
  // porque esos cambios solo afectan al componente PromiseClosingProcessCard
  useCotizacionesRealtime({
    studioSlug,
    promiseId: promiseId || null,
    ignoreCierreEvents: true, // Ignorar eventos de proceso de cierre (contratos, pagos, etc.)
    onCotizacionInserted: () => {
      loadCotizaciones();
    },
    onCotizacionUpdated: (cotizacionId: string, payload?: unknown) => {
      // Si este cambio fue iniciado localmente, ignorar para evitar recarga innecesaria
      if (localChangesRef.current.has(cotizacionId)) {
        // Limpiar después de un breve delay para permitir que el cambio se propague
        setTimeout(() => {
          localChangesRef.current.delete(cotizacionId);
        }, 1000);
        return;
      }

      // Verificar si hay cambios importantes (estado, nombre, etc.)
      const p = payload as any;
      const changeInfo = p?.changeInfo;

      // Recargar solo si cambió el estado Y no fue un cambio local
      // (importante para detectar cuando prospecto autoriza desde otra sesión)
      if (changeInfo?.statusChanged) {
        const oldStatus = changeInfo.oldStatus;
        const newStatus = p?.newRecord?.status || p?.new?.status;
        
        // Recargar si cambió a estados críticos
        const estadosCriticos = ['aprobada', 'autorizada', 'approved', 'en_cierre'];
        if (estadosCriticos.includes(newStatus)) {
          loadCotizaciones();
          return;
        }
        
        // También recargar si cambió DE 'en_cierre' a otro estado (cancelación de cierre)
        // Esto permite que la cotización vuelva a aparecer en el panel
        if (oldStatus === 'en_cierre' && newStatus !== 'en_cierre') {
          loadCotizaciones();
          return;
        }
      }

      // También recargar si hay otros campos importantes cambiados (solo si no es cambio local)
      if (changeInfo?.camposCambiados?.length) {
        // Verificar que NO sea solo updated_at
        const camposImportantes = changeInfo.camposCambiados.filter(
          (campo: string) => campo !== 'updated_at'
        );
        if (camposImportantes.length > 0) {
          // Solo recargar si no es un cambio de nombre (que ya se actualiza localmente)
          const esCambioNombre = camposImportantes.length === 1 && camposImportantes[0] === 'name';
          if (!esCambioNombre) {
            loadCotizaciones();
          }
        }
      }
    },
    onCotizacionDeleted: (cotizacionId) => {
      // Actualización optimista: remover del estado local
      setCotizaciones((prev) => prev.filter((c) => c.id !== cotizacionId));
    },
  });

  const handleCreateFromPackage = (packageId: string) => {
    if (!promiseId) {
      toast.error('Se requiere una promesa para crear una cotización');
      return;
    }
    // Navegar a la ruta de nueva cotización con el paqueteId como parámetro
    const basePath = `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/nueva`;
    const params = new URLSearchParams();
    if (packageId) {
      params.set('paqueteId', packageId);
    }
    if (contactId) {
      params.set('contactId', contactId);
    }
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ''}`);
  };

  const handleCreateCustom = () => {
    if (!promiseId) {
      return;
    }
    // Navegar a la ruta de nueva cotización sin paqueteId (personalizada)
    const basePath = `/${studioSlug}/studio/commercial/promises/${promiseId}/cotizacion/nueva`;
    const params = new URLSearchParams();
    if (contactId) {
      params.set('contactId', contactId);
    }
    const queryString = params.toString();
    router.push(`${basePath}${queryString ? `?${queryString}` : ''}`);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (isReordering || !over || active.id === over.id) {
      return;
    }

    // Solo permitir reordenar pendientes
    const activeCotizacion = cotizaciones.find((c) => c.id === active.id);
    const overCotizacion = cotizaciones.find((c) => c.id === over.id);

    if (!activeCotizacion || !overCotizacion || activeCotizacion.status !== 'pendiente' || overCotizacion.status !== 'pendiente') {
      return;
    }

    const oldIndex = cotizacionesPendientes.findIndex((c) => c.id === active.id);
    const newIndex = cotizacionesPendientes.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Mover solo las pendientes
    const newPendientes = arrayMove(cotizacionesPendientes, oldIndex, newIndex);

    // Actualizar el order de todas las cotizaciones según la nueva posición
    // Pendientes primero (con order actualizado)
    const reorderedPendientes = newPendientes.map((c, index) => ({
      ...c,
      order: index,
    }));

    // Luego archivadas y canceladas (con order continuando desde las pendientes)
    const reorderedArchivadas = cotizacionesArchivadas.map((c, index) => ({
      ...c,
      order: reorderedPendientes.length + index,
    }));

    const reorderedCanceladas = cotizacionesCanceladas.map((c, index) => ({
      ...c,
      order: reorderedPendientes.length + reorderedArchivadas.length + index,
    }));

    // Combinar todas las cotizaciones
    const reorderedCotizaciones = [
      ...reorderedPendientes,
      ...reorderedArchivadas,
      ...reorderedCanceladas,
    ];

    try {
      setIsReordering(true);

      // Actualización optimista
      setCotizaciones(reorderedCotizaciones);

      // Actualizar en el servidor
      const cotizacionIds = reorderedCotizaciones.map((c) => c.id);
      const result = await reorderCotizaciones(studioSlug, cotizacionIds);

      if (!result.success) {
        toast.error(result.error || 'Error al reordenar cotizaciones');
        // Revertir cambio local
        setCotizaciones(cotizaciones);
      }
    } catch (error) {
      console.error('Error reordering cotizaciones:', error);
      toast.error('Error al reordenar cotizaciones');
      // Revertir cambio local
      setCotizaciones(cotizaciones);
    } finally {
      setIsReordering(false);
    }
  };

  // Calcular si hay una cotización en cierre o autorizada activa
  // El botón se OCULTA si:
  // 1. Hay al menos una cotización en estado 'en_cierre' (sin importar si tiene evento_id)
  // 2. Hay una cotización autorizada/aprobada CON evento_id asociado
  const hasApprovedQuote = React.useMemo(() => {
    const result = cotizaciones.some(
      (c) => {
        // Excluir cotizaciones canceladas o archivadas
        if (c.status === 'cancelada' || c.status === 'archivada') {
          return false;
        }

        // Si está en 'en_cierre', ocultar botón SIEMPRE (sin importar evento_id)
        if (c.status === 'en_cierre') {
          return true;
        }

        // Si está autorizada/aprobada, solo ocultar si tiene evento_id
        const isAuthorizedStatus = c.status === 'aprobada' ||
          c.status === 'autorizada' ||
          c.status === 'approved';

        // Si tiene status autorizado pero NO tiene evento_id, es una cotización legacy/inactiva
        // No debe ocultar el botón porque el evento fue cancelado
        if (isAuthorizedStatus && !c.evento_id) {
          return false;
        }

        return isAuthorizedStatus;
      }
    );

    return result;
  }, [cotizaciones]);

  const isMenuDisabled = !eventTypeId || !isSaved || hasApprovedQuote;

  // Obtener la cotización en cierre o autorizada para el card de cierre (solo si tiene evento activo)
  const approvedQuote = cotizaciones.find(
    (c) => {
      // Excluir cotizaciones canceladas o archivadas
      if (c.status === 'cancelada' || c.status === 'archivada') {
        return false;
      }
      // Buscar cotización en cierre o autorizada/aprobada CON evento activo
      const isAuthorizedStatus = c.status === 'en_cierre' ||
        c.status === 'aprobada' ||
        c.status === 'autorizada' ||
        c.status === 'approved';

      // Debe tener evento_id para ser considerada activa
      return isAuthorizedStatus && !!c.evento_id;
    }
  );

  // Filtrar cotizaciones para el listado (pendiente, negociacion, archivada, cancelada)
  // Excluir cotizaciones en cierre (se muestran en PromiseClosingProcessCard)
  const cotizacionesParaListado = cotizaciones.filter(
    (c) => ['pendiente', 'negociacion', 'archivada', 'cancelada'].includes(c.status)
  );

  // Separar en grupos: pendientes/negociacion (ordenables) y archivadas/canceladas (no ordenables)
  const cotizacionesPendientes = cotizacionesParaListado
    .filter((c) => c.status === 'pendiente' || c.status === 'negociacion')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const cotizacionesArchivadas = cotizacionesParaListado
    .filter((c) => c.status === 'archivada')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const cotizacionesCanceladas = cotizacionesParaListado
    .filter((c) => c.status === 'cancelada')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const cotizacionesNoOrdenables = [...cotizacionesArchivadas, ...cotizacionesCanceladas];

  // Funciones para modo selección
  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(cotizacionesParaListado.map((c) => c.id));
    setSelectedIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkActionLoading(true);
    const idsArray = Array.from(selectedIds);
    
    try {
      // Marcar como cambios locales
      idsArray.forEach((id) => localChangesRef.current.add(id));

      // Actualización optimista
      setCotizaciones((prev) =>
        prev.map((c) =>
          selectedIds.has(c.id) ? { ...c, status: 'archivada' as const, archived: true } : c
        )
      );

      // Ejecutar acciones en paralelo
      const results = await Promise.allSettled(
        idsArray.map((id) => archiveCotizacion(id, studioSlug))
      );

      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
      
      if (failed.length > 0) {
        toast.error(`${failed.length} de ${idsArray.length} cotizaciones no se pudieron archivar`);
        // Revertir cambios optimistas de las que fallaron
        loadCotizaciones();
      } else {
        toast.success(`${idsArray.length} cotización${idsArray.length > 1 ? 'es' : ''} archivada${idsArray.length > 1 ? 's' : ''} exitosamente`);
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Error en bulk archive:', error);
      toast.error('Error al archivar cotizaciones');
      loadCotizaciones();
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkActionLoading(true);
    const idsArray = Array.from(selectedIds);
    
    try {
      // Marcar como cambios locales
      idsArray.forEach((id) => localChangesRef.current.add(id));

      // Actualización optimista
      setCotizaciones((prev) =>
        prev.map((c) =>
          selectedIds.has(c.id) ? { ...c, status: 'pendiente' as const, archived: false } : c
        )
      );

      // Ejecutar acciones en paralelo
      const results = await Promise.allSettled(
        idsArray.map((id) => unarchiveCotizacion(id, studioSlug))
      );

      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
      
      if (failed.length > 0) {
        toast.error(`${failed.length} de ${idsArray.length} cotizaciones no se pudieron desarchivar`);
        loadCotizaciones();
      } else {
        toast.success(`${idsArray.length} cotización${idsArray.length > 1 ? 'es' : ''} desarchivada${idsArray.length > 1 ? 's' : ''} exitosamente`);
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Error en bulk unarchive:', error);
      toast.error('Error al desarchivar cotizaciones');
      loadCotizaciones();
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    // Confirmación
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar ${selectedIds.size} cotización${selectedIds.size > 1 ? 'es' : ''}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setIsBulkActionLoading(true);
    const idsArray = Array.from(selectedIds);
    
    try {
      // Marcar como cambios locales
      idsArray.forEach((id) => localChangesRef.current.add(id));

      // Actualización optimista
      setCotizaciones((prev) => prev.filter((c) => !selectedIds.has(c.id)));

      // Ejecutar acciones en paralelo
      const results = await Promise.allSettled(
        idsArray.map((id) => deleteCotizacion(id, studioSlug))
      );

      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
      
      if (failed.length > 0) {
        toast.error(`${failed.length} de ${idsArray.length} cotizaciones no se pudieron eliminar`);
        loadCotizaciones();
      } else {
        toast.success(`${idsArray.length} cotización${idsArray.length > 1 ? 'es' : ''} eliminada${idsArray.length > 1 ? 's' : ''} exitosamente`);
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Error en bulk delete:', error);
      toast.error('Error al eliminar cotizaciones');
      loadCotizaciones();
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkToggleVisibility = async (visible: boolean) => {
    if (selectedIds.size === 0) return;

    setIsBulkActionLoading(true);
    const idsArray = Array.from(selectedIds);
    
    try {
      // Marcar como cambios locales
      idsArray.forEach((id) => localChangesRef.current.add(id));

      // Actualización optimista
      setCotizaciones((prev) =>
        prev.map((c) => (selectedIds.has(c.id) ? { ...c, visible_to_client: visible } : c))
      );

      // Ejecutar acciones en paralelo
      const results = await Promise.allSettled(
        idsArray.map((id) => toggleCotizacionVisibility(id, studioSlug))
      );

      const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
      
      if (failed.length > 0) {
        toast.error(`Error al cambiar visibilidad de ${failed.length} cotización${failed.length > 1 ? 'es' : ''}`);
        loadCotizaciones();
      } else {
        toast.success(
          `${idsArray.length} cotización${idsArray.length > 1 ? 'es' : ''} ${visible ? 'visible' : 'oculta'}${idsArray.length > 1 ? 's' : ''} exitosamente`
        );
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Error en bulk toggle visibility:', error);
      toast.error('Error al cambiar visibilidad');
      loadCotizaciones();
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  // Función helper para renderizar una tarjeta de cotización
  const renderCotizacionCard = (cotizacion: CotizacionListItem) => (
    <PromiseQuotesPanelCard
      key={cotizacion.id}
      cotizacion={cotizacion}
      studioSlug={studioSlug}
      promiseId={promiseId}
      contactId={contactId}
      isDuplicating={duplicatingId === cotizacion.id}
      hasApprovedQuote={hasApprovedQuote}
      selectionMode={selectionMode}
      isSelected={selectedIds.has(cotizacion.id)}
      onToggleSelect={() => handleToggleSelection(cotizacion.id)}
      onDuplicateStart={(id) => setDuplicatingId(id)}
      onDuplicateComplete={(newCotizacion) => {
        setDuplicatingId(null);
        setCotizaciones((prev) => [...prev, newCotizacion]);
      }}
      onDuplicateError={() => {
        setDuplicatingId(null);
      }}
      onDelete={(id) => {
        // Marcar como cambio local para evitar recarga desde realtime
        localChangesRef.current.add(id);
        setCotizaciones((prev) => prev.filter((c) => c.id !== id));
      }}
      onArchive={(id) => {
        // Marcar como cambio local para evitar recarga desde realtime
        localChangesRef.current.add(id);
        // Actualización local: cambiar status a archivada
        setCotizaciones((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'archivada' as const, archived: true } : c))
        );
      }}
      onUpdate={(cotizacionId) => {
        // Marcar como cambio local para evitar recarga desde realtime
        localChangesRef.current.add(cotizacionId);
        // Actualización optimista: marcar como cancelada
        setCotizaciones((prev) =>
          prev.map((c) => (c.id === cotizacionId ? { ...c, status: 'cancelada' as const } : c))
        );
        // NO refrescar - la actualización local es suficiente y realtime sincronizará si es necesario
      }}
      onVisibilityToggle={(cotizacionId, visible) => {
        // Marcar como cambio local para evitar recarga desde realtime
        localChangesRef.current.add(cotizacionId);
        // Actualización optimista: cambiar solo visible_to_client
        setCotizaciones((prev) =>
          prev.map((c) => (c.id === cotizacionId ? { ...c, visible_to_client: visible } : c))
        );
      }}
      onUnarchive={(id) => {
        // Marcar como cambio local para evitar recarga desde realtime
        localChangesRef.current.add(id);
        // Actualización local: cambiar status a pendiente
        setCotizaciones((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'pendiente' as const, archived: false } : c))
        );
      }}
      onNameUpdate={(id, newName) => {
        // Marcar como cambio local para evitar recarga desde realtime
        localChangesRef.current.add(id);
        setCotizaciones((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
        );
      }}
      onPasarACierre={async (cotizacionId) => {
        // Realtime sincronizará automáticamente ambos componentes
      }}
      onCierreCancelado={(cotizacionId) => {
        // Realtime sincronizará automáticamente ambos componentes
      }}
    />
  );

  return (
    <>
      {/* Card "Cotizaciones" */}
      <ZenCard className="min-h-[500px] flex flex-col">
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Cotizaciones
              {selectionMode && selectedIds.size > 0 && (
                <span className="ml-2 text-xs text-zinc-400 font-normal">
                  ({selectedIds.size} seleccionada{selectedIds.size > 1 ? 's' : ''})
                </span>
              )}
            </ZenCardTitle>
            <div className="flex items-center gap-1">
              {!selectionMode ? (
                <>
                  {cotizacionesParaListado.length > 1 && (
                    <ZenButton
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setSelectionMode(true)}
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1" />
                      Seleccionar
                    </ZenButton>
                  )}
                  {!hasApprovedQuote && (
                    <ZenDropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                      <ZenDropdownMenuTrigger asChild>
                        <ZenButton
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          disabled={isMenuDisabled}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </ZenButton>
                      </ZenDropdownMenuTrigger>
                      <ZenDropdownMenuContent align="end" className="min-w-[200px]">
                        {loadingPackages ? (
                          <div className="px-2 py-3 flex items-center gap-2 text-sm text-zinc-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Cargando paquetes...</span>
                          </div>
                        ) : packages.length > 0 ? (
                          <>
                            {packages.map((pkg) => (
                              <ZenDropdownMenuItem
                                key={pkg.id}
                                onClick={() => handleCreateFromPackage(pkg.id)}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                <span className="flex-1">{pkg.name}</span>
                                {pkg.precio !== null && (
                                  <span className="text-xs text-zinc-400 ml-2">
                                    ${pkg.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </ZenDropdownMenuItem>
                            ))}
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem onClick={handleCreateCustom}>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Personalizada
                            </ZenDropdownMenuItem>
                          </>
                        ) : (
                          <ZenDropdownMenuItem onClick={handleCreateCustom}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Personalizada
                          </ZenDropdownMenuItem>
                        )}
                      </ZenDropdownMenuContent>
                    </ZenDropdownMenu>
                  )}
                </>
              ) : (
                <>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs shrink-0"
                    onClick={selectedIds.size === cotizacionesParaListado.length ? handleDeselectAll : handleSelectAll}
                    title={selectedIds.size === cotizacionesParaListado.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  >
                    {selectedIds.size === cotizacionesParaListado.length ? (
                      <Square className="h-3.5 w-3.5" />
                    ) : (
                      <CheckSquare className="h-3.5 w-3.5" />
                    )}
                  </ZenButton>
                  <ZenButton
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs shrink-0"
                    onClick={handleCancelSelection}
                    title="Cancelar selección"
                  >
                    <X className="h-3.5 w-3.5" />
                  </ZenButton>
                </>
              )}
            </div>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4 flex flex-col">
          {/* Barra de acciones para selección múltiple - Sticky dentro del panel */}
          {selectionMode && selectedIds.size > 0 && (() => {
            // Calcular estados de las cotizaciones seleccionadas
            const selectedCotizaciones = cotizaciones.filter((c) => selectedIds.has(c.id));
            const allArchived = selectedCotizaciones.every((c) => c.status === 'archivada');
            const allVisible = selectedCotizaciones.every((c) => c.visible_to_client === true);
            const allHidden = selectedCotizaciones.every((c) => c.visible_to_client === false);

            return (
              <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 px-4 pt-3 pb-3 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-300 font-medium whitespace-nowrap">
                      {selectedIds.size} seleccionada{selectedIds.size > 1 ? 's' : ''}
                    </span>
                    {isBulkActionLoading && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                    )}
                  </div>
                  <ZenDropdownMenu>
                    <ZenDropdownMenuTrigger asChild>
                      <ZenButton
                        variant="default"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        disabled={isBulkActionLoading}
                      >
                        Acciones
                        <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                      </ZenButton>
                    </ZenDropdownMenuTrigger>
                    <ZenDropdownMenuContent align="end" className="min-w-[180px]">
                      {allArchived ? (
                        <ZenDropdownMenuItem
                          onClick={handleBulkUnarchive}
                          disabled={isBulkActionLoading}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Desarchivar
                        </ZenDropdownMenuItem>
                      ) : (
                        <ZenDropdownMenuItem
                          onClick={handleBulkArchive}
                          disabled={isBulkActionLoading}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archivar
                        </ZenDropdownMenuItem>
                      )}
                      <ZenDropdownMenuItem
                        onClick={handleBulkDelete}
                        disabled={isBulkActionLoading}
                        className="text-red-400 focus:text-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </ZenDropdownMenuItem>
                      <ZenDropdownMenuSeparator />
                      {allHidden ? (
                        <ZenDropdownMenuItem
                          onClick={() => handleBulkToggleVisibility(true)}
                          disabled={isBulkActionLoading}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Mostrar todas
                        </ZenDropdownMenuItem>
                      ) : allVisible ? (
                        <ZenDropdownMenuItem
                          onClick={() => handleBulkToggleVisibility(false)}
                          disabled={isBulkActionLoading}
                        >
                          <EyeOff className="h-4 w-4 mr-2" />
                          Ocultar todas
                        </ZenDropdownMenuItem>
                      ) : (
                        <>
                          <ZenDropdownMenuItem
                            onClick={() => handleBulkToggleVisibility(true)}
                            disabled={isBulkActionLoading}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Mostrar todas
                          </ZenDropdownMenuItem>
                          <ZenDropdownMenuItem
                            onClick={() => handleBulkToggleVisibility(false)}
                            disabled={isBulkActionLoading}
                          >
                            <EyeOff className="h-4 w-4 mr-2" />
                            Ocultar todas
                          </ZenDropdownMenuItem>
                        </>
                      )}
                    </ZenDropdownMenuContent>
                  </ZenDropdownMenu>
                </div>
              </div>
            );
          })()}
          <div
            className="relative overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-zinc-500"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#52525b transparent',
            }}
          >
            {!isSaved ? (
              <div className="flex flex-col items-center justify-center min-h-[200px]">
                <p className="text-xs text-zinc-500 text-center px-4">
                  Guarda la promesa para agregar cotizaciones
                </p>
              </div>
            ) : loadingCotizaciones ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-zinc-800/50 border-zinc-700 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-4 h-4 bg-zinc-700 rounded mt-1" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 bg-zinc-700 rounded w-3/4" />
                        <div className="h-3 bg-zinc-700 rounded w-1/2" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="h-4 bg-zinc-700 rounded w-20" />
                          <div className="h-5 bg-zinc-700 rounded-full w-16" />
                        </div>
                        <div className="h-3 bg-zinc-700 rounded w-32" />
                      </div>
                      <div className="w-6 h-6 bg-zinc-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : cotizacionesParaListado.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                {!eventTypeId ? (
                  <p className="text-xs text-zinc-500 text-center px-4">
                    Selecciona un tipo de evento para crear cotizaciones
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500 text-center px-4">
                      No hay cotizaciones asociadas a esta promesa
                    </p>
                    <p className="text-xs text-zinc-400 text-center px-4 mt-2">
                      Usa el botón + para crear una nueva cotización
                    </p>
                  </>
                )}
              </div>
            ) : !isHydrated ? (
              <div className="space-y-2">
                {/* Pendientes */}
                {cotizacionesPendientes.map((cotizacion) => renderCotizacionCard(cotizacion))}

                {/* Divisor sutil */}
                {cotizacionesPendientes.length > 0 && cotizacionesNoOrdenables.length > 0 && (
                  <div className="h-px bg-zinc-800 my-3" />
                )}

                {/* Archivadas y canceladas (no ordenables) */}
                {cotizacionesNoOrdenables.map((cotizacion) => renderCotizacionCard(cotizacion))}
              </div>
            ) : (
              <>
                {/* Pendientes (ordenables solo si no está en modo selección) */}
                {cotizacionesPendientes.length > 0 && (
                  selectionMode ? (
                    <div className="space-y-2">
                      {cotizacionesPendientes.map((cotizacion) => renderCotizacionCard(cotizacion))}
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={cotizacionesPendientes.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className={`space-y-2 ${isReordering ? 'pointer-events-none opacity-50' : ''}`}>
                          {cotizacionesPendientes.map((cotizacion) => renderCotizacionCard(cotizacion))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )
                )}

                {/* Divisor sutil */}
                {cotizacionesPendientes.length > 0 && cotizacionesNoOrdenables.length > 0 && (
                  <div className="h-px bg-zinc-800 my-3" />
                )}

                {/* Archivadas y canceladas (no ordenables) */}
                {cotizacionesNoOrdenables.length > 0 && (
                  <div className="space-y-2">
                    {cotizacionesNoOrdenables.map((cotizacion) => renderCotizacionCard(cotizacion))}
                  </div>
                )}
              </>
            )}
          </div>
        </ZenCardContent>
      </ZenCard>
    </>
  );
}

