'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, ExternalLink, Link2, MoreVertical, Edit, Trash2, Loader2 } from 'lucide-react';
import {
  ZenCard,
  ZenCardHeader,
  ZenCardTitle,
  ZenCardContent,
  ZenButton,
  ZenInput,
  ZenConfirmModal,
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuSeparator,
} from '@/components/ui/zen';
import {
  obtenerEntregables,
  crearEntregable,
  actualizarEntregable,
  eliminarEntregable,
  vincularCarpetaDrive,
  type Deliverable,
} from '@/lib/actions/studio/business/events/deliverables.actions';
import {
  obtenerEstadoConexion,
  obtenerDetallesCarpeta,
} from '@/lib/actions/studio/integrations/google-drive.actions';
import { GoogleDriveFolderPicker } from '@/components/shared/integrations/GoogleDriveFolderPicker';
import { GoogleDriveConnectionModal } from '@/components/shared/integrations/GoogleDriveConnectionModal';
import { iniciarVinculacionDriveClient } from '@/lib/actions/auth/oauth-client.actions';
import { toast } from 'sonner';

interface EventDeliverablesCardProps {
  studioSlug: string;
  eventId: string;
  onUpdated?: () => void;
}

export function EventDeliverablesCard({
  studioSlug,
  eventId,
  onUpdated,
}: EventDeliverablesCardProps) {
  const [entregables, setEntregables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isCheckingGoogle, setIsCheckingGoogle] = useState(true);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string; url: string } | null>(null);
  const [folderNotFound, setFolderNotFound] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    file_url: '',
    google_folder_id: '',
  });

  const checkGoogleConnection = async () => {
    try {
      setIsCheckingGoogle(true);
      const status = await obtenerEstadoConexion(studioSlug);

      // Usar el estado isConnected del servidor que ya valida scopes de Drive y refresh token
      // Además verificar explícitamente scopes de Drive para mostrar estado correcto
      const hasDriveScope = status.scopes?.some(
        (scope) => scope.includes('drive.readonly') || scope.includes('drive')
      ) ?? false;

      // Drive está conectado si el servidor dice que está conectado Y tiene scopes de Drive
      const hasActiveConnection = status.isConnected && hasDriveScope;

      setIsGoogleConnected(hasActiveConnection);
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setIsGoogleConnected(false);
    } finally {
      setIsCheckingGoogle(false);
    }
  };

  useEffect(() => {
    loadEntregables();
    checkGoogleConnection();

    // Verificar si viene del callback de Google OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const fromGoogle = urlParams.get('google_connected');
    const returnToModal = urlParams.get('return_to_modal');

    if (fromGoogle === 'true' && returnToModal === 'true') {
      // Limpiar parámetros de URL
      window.history.replaceState({}, '', window.location.pathname);
      // Reabrir modal y recargar estado de Google
      setTimeout(async () => {
        setIsFormOpen(true);
        await checkGoogleConnection();
      }, 1000);
    }
  }, [eventId, studioSlug]);

  const loadEntregables = async () => {
    try {
      setLoading(true);
      const result = await obtenerEntregables(studioSlug, eventId);
      if (result.success && result.data) {
        setEntregables(result.data);
      } else {
        toast.error(result.error || 'Error al cargar entregables');
      }
    } catch (error) {
      console.error('Error loading entregables:', error);
      toast.error('Error al cargar entregables');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = async (entregable?: Deliverable) => {
    if (entregable) {
      setEditingId(entregable.id);
      setFormData({
        name: entregable.name,
        description: entregable.description || '',
        file_url: entregable.file_url || '',
        google_folder_id: entregable.google_folder_id || '',
      });
      // Si hay carpeta vinculada, obtener el nombre real de la carpeta
      if (entregable.google_folder_id) {
        // Solo intentar obtener detalles si Google Drive está conectado
        if (isGoogleConnected) {
          try {
            const folderResult = await obtenerDetallesCarpeta(studioSlug, entregable.google_folder_id);
            if (folderResult.success && folderResult.data) {
              setSelectedFolder({
                id: folderResult.data.id,
                name: folderResult.data.name,
                url: `https://drive.google.com/drive/folders/${folderResult.data.id}`,
              });
              setFolderNotFound(false);
            } else {
              // Si la carpeta no existe, mostrar error y permitir seleccionar nueva
              if (!folderResult.success && folderResult.folderNotFound) {
                setFolderNotFound(true);
                setSelectedFolder({
                  id: entregable.google_folder_id,
                  name: 'Carpeta no encontrada',
                  url: `https://drive.google.com/drive/folders/${entregable.google_folder_id}`,
                });
              } else {
                setFolderNotFound(false);
                setSelectedFolder({
                  id: entregable.google_folder_id,
                  name: 'Carpeta vinculada',
                  url: `https://drive.google.com/drive/folders/${entregable.google_folder_id}`,
                });
              }
            }
          } catch (error) {
            // Error silencioso - solo mostrar carpeta vinculada
            setFolderNotFound(false);
            setSelectedFolder({
              id: entregable.google_folder_id,
              name: 'Carpeta vinculada',
              url: `https://drive.google.com/drive/folders/${entregable.google_folder_id}`,
            });
          }
        } else {
          // Si no está conectado, solo mostrar la carpeta vinculada sin intentar obtener detalles
          setFolderNotFound(false);
          setSelectedFolder({
            id: entregable.google_folder_id,
            name: 'Carpeta vinculada',
            url: `https://drive.google.com/drive/folders/${entregable.google_folder_id}`,
          });
        }
      } else {
        setSelectedFolder(null);
        setFolderNotFound(false);
      }
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        file_url: '',
        google_folder_id: '',
      });
      setSelectedFolder(null);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      file_url: '',
      google_folder_id: '',
    });
    setSelectedFolder(null);
    setShowFolderPicker(false);
    setFolderNotFound(false);
  };

  const handleGoogleConnected = async () => {
    // Verificar conexión con las validaciones actuales (scopes de Drive)
    await checkGoogleConnection();
  };

  const handleConnectClick = () => {
    setShowConnectionModal(true);
  };

  const handleConfirmConnect = async () => {
    try {
      setIsConnecting(true);
      setShowConnectionModal(false);
      const returnUrl = `${window.location.pathname}?google_connected=true&return_to_modal=true`;
      const result = await iniciarVinculacionDriveClient(studioSlug, returnUrl);
      if (!result.success) {
        toast.error(result.error || 'Error al conectar con Google');
        setIsConnecting(false);
      }
      // La redirección ocurre automáticamente con Supabase OAuth
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Error al conectar con Google');
      setIsConnecting(false);
    }
  };

  const handleGoogleDisconnected = async () => {
    await checkGoogleConnection();
    // Si estaba seleccionada una carpeta, limpiarla
    if (selectedFolder) {
      setSelectedFolder(null);
      setFormData({ ...formData, google_folder_id: '', name: formData.name || '' });
    }
  };

  const handleFolderSelect = (folder: { id: string; name: string; url: string }) => {
    setSelectedFolder(folder);
    setShowFolderPicker(false);
    setFolderNotFound(false);
    // Cuando está conectado a Google Drive, el nombre siempre será el de la carpeta
    setFormData({
      ...formData,
      google_folder_id: folder.id,
      name: folder.name,
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        // Optimistic update para edición
        const originalEntregables = [...entregables];
        setEntregables(prev => prev.map(item =>
          item.id === editingId
            ? { ...item, name: formData.name, description: formData.description || null, file_url: formData.file_url || null }
            : item
        ));

        const result = await actualizarEntregable(studioSlug, {
          id: editingId,
          name: formData.name,
          description: formData.description || undefined,
          file_url: formData.file_url || undefined,
        });

        if (result.success && result.data) {
          // Actualizar con los datos del servidor
          setEntregables(prev => prev.map(item =>
            item.id === editingId ? result.data! : item
          ));
          // Recargar entregables y verificar conexión después de actualizar
          await loadEntregables();
          await checkGoogleConnection();
          toast.success('Entregable actualizado');
          handleCloseForm();
          onUpdated?.();
        } else {
          // Rollback en caso de error
          setEntregables(originalEntregables);
          toast.error(result.error || 'Error al actualizar entregable');
        }
      } else {
        const result = await crearEntregable(studioSlug, {
          event_id: eventId,
          type: 'OTHER',
          name: formData.name,
          description: formData.description || undefined,
          file_url: formData.file_url || undefined,
        });

        if (result.success && result.data) {
          const entregableCreado = result.data;
          
          // Si hay carpeta de Google seleccionada, vincularla inmediatamente
          if (selectedFolder?.id) {
            const vincularResult = await vincularCarpetaDrive(studioSlug, entregableCreado.id, selectedFolder.id);
            if (vincularResult.success && vincularResult.data) {
              // Usar el entregable actualizado con la carpeta vinculada
              setEntregables(prev => [...prev, vincularResult.data!]);
              toast.success('Entregable creado y carpeta vinculada');
              // Si se vinculó una carpeta, Google Drive está conectado
              setIsGoogleConnected(true);
              setIsCheckingGoogle(false);
            } else {
              // Si falla la vinculación, agregar el entregable sin carpeta
              setEntregables(prev => [...prev, entregableCreado]);
              toast.warning('Entregable creado, pero error al vincular carpeta: ' + (vincularResult.error || 'Error desconocido'));
            }
          } else {
            // Agregar el entregable al estado local
            setEntregables(prev => [...prev, entregableCreado]);
            toast.success('Entregable creado');
          }
          
          // Cerrar el formulario y resetear estado
          handleCloseForm();
          setIsSaving(false);
          
          // Recargar entregables y verificar conexión
          await loadEntregables();
          await checkGoogleConnection();
          onUpdated?.();
        } else {
          toast.error(result.error || 'Error al crear entregable');
        }
      }
    } catch (error) {
      console.error('Error saving entregable:', error);
      toast.error('Error al guardar entregable');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    // Optimistic update para eliminación
    const originalEntregables = [...entregables];
    setEntregables(prev => prev.filter(item => item.id !== deletingId));
    setIsDeleteModalOpen(false);
    const idToDelete = deletingId;
    setDeletingId(null);

    setIsDeleting(true);
    try {
      const result = await eliminarEntregable(studioSlug, idToDelete);
      if (result.success) {
        toast.success('Entregable eliminado');
        onUpdated?.();
      } else {
        // Rollback en caso de error
        setEntregables(originalEntregables);
        toast.error(result.error || 'Error al eliminar entregable');
      }
    } catch (error) {
      console.error('Error deleting entregable:', error);
      // Rollback en caso de error
      setEntregables(originalEntregables);
      toast.error('Error al eliminar entregable');
    } finally {
      setIsDeleting(false);
    }
  };


  if (loading) {
    return (
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between animate-pulse">
            <div className="h-4 w-20 bg-zinc-800 rounded" />
            <div className="h-6 w-20 bg-zinc-800 rounded" />
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800">
                <div className="h-4 w-32 bg-zinc-800 rounded mb-2" />
                <div className="h-3 w-full bg-zinc-800 rounded mb-1.5" />
                <div className="h-3 w-24 bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        </ZenCardContent>
      </ZenCard>
    );
  }

  const totalEntregables = entregables.length;
  const hasGoogleDriveDeliverable = entregables.some(e => e.delivery_mode === 'google_drive' && e.google_folder_id);

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <div className="flex items-center justify-between">
            <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
              Entregables
            </ZenCardTitle>
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => handleOpenForm()}
              className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
            >
              <Plus className="h-3 w-3 mr-1" />
              Agregar
            </ZenButton>
          </div>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          {totalEntregables === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-zinc-500 mb-2">
                No hay entregables registrados
              </p>
              <p className="text-xs text-zinc-600">
                Agrega un enlace a tus entregables
              </p>
            </div>
          ) : (
            <div className={`space-y-2 ${totalEntregables > 5 ? 'max-h-[400px] overflow-y-auto' : ''}`}>
              {entregables.map((entregable) => {
                return (
                  <div
                    key={entregable.id}
                    className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-zinc-200 text-xs truncate mb-1">
                          {entregable.name}
                        </h4>
                        {entregable.description && (
                          <p className="text-xs text-zinc-400 mb-1.5 line-clamp-2">
                            {entregable.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {entregable.delivery_mode === 'google_drive' && entregable.google_folder_id && (
                            <>
                              {isCheckingGoogle ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-zinc-800/50 border border-zinc-800">
                                  <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                                  <span className="text-zinc-400">Validando...</span>
                                </span>
                              ) : isGoogleConnected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-950/30 text-blue-400 border border-blue-800/50">
                                  <img
                                    src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
                                    alt="Google Drive"
                                    className="h-3 w-3 object-contain brightness-0 invert"
                                  />
                                  Google Drive
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-950/30 text-red-400 border border-red-800/50">
                                  <img
                                    src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
                                    alt="Google Drive"
                                    className="h-3 w-3 object-contain brightness-0 invert opacity-50"
                                  />
                                  Desconectado
                                </span>
                              )}
                            </>
                          )}
                          {entregable.file_url && (
                            <a
                              href={entregable.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <Link2 className="h-3 w-3" />
                              <span>Ver enlace</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <ZenDropdownMenu
                          open={openMenuId === entregable.id}
                          onOpenChange={(open) => setOpenMenuId(open ? entregable.id : null)}
                        >
                          <ZenDropdownMenuTrigger asChild>
                            <ZenButton
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </ZenButton>
                          </ZenDropdownMenuTrigger>
                          <ZenDropdownMenuContent align="end">
                            <ZenDropdownMenuItem
                              onClick={() => {
                                handleOpenForm(entregable);
                                setOpenMenuId(null);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </ZenDropdownMenuItem>
                            <ZenDropdownMenuSeparator />
                            <ZenDropdownMenuItem
                              onClick={() => {
                                setDeletingId(entregable.id);
                                setIsDeleteModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="text-red-400 focus:text-red-300 focus:bg-red-950/20"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </ZenDropdownMenuItem>
                          </ZenDropdownMenuContent>
                        </ZenDropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ZenCardContent>
      </ZenCard>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="border-b border-zinc-800 px-6 py-4 shrink-0">
              <h3 className="text-lg font-semibold text-zinc-200">
                {editingId ? 'Editar Entregable' : 'Nuevo Entregable'}
              </h3>
            </div>
            
            {/* Content with scroll */}
            <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                    Nombre *
                  </label>
                  <ZenInput
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Galería de fotos - Ceremonia"
                    required
                  />
                </div>
                {isGoogleConnected ? (
                  <div>
                    <label className="text-sm font-medium text-zinc-300 mb-1.5 flex items-center gap-2">
                      <img
                        src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
                        alt="Google Drive"
                        className="h-4 w-4 object-contain brightness-0 invert"
                      />
                      Carpeta de Google Drive
                    </label>
                    <p className="text-xs text-zinc-500 mb-2">
                      Selecciona la carpeta que tu cliente verá en su portal de entregas (fotos y videos)
                    </p>
                    {hasGoogleDriveDeliverable && (
                      <div className="mb-2 p-2 bg-blue-950/20 border border-blue-800/50 rounded text-xs text-blue-300">
                        💡 Ya tienes una carpeta vinculada. Puedes agregar carpetas adicionales si necesitas organizar por categorías. En el portal del cliente se mostrará el contenido consolidado de todas las carpetas.
                      </div>
                    )}
                    {showFolderPicker || !selectedFolder ? (
                      <GoogleDriveFolderPicker
                        studioSlug={studioSlug}
                        isOpen={true}
                        onClose={() => {
                          if (selectedFolder) {
                            // Solo cerrar si ya hay una carpeta seleccionada
                            setShowFolderPicker(false);
                          }
                        }}
                        onSelect={handleFolderSelect}
                        initialFolderId={selectedFolder?.id}
                        initialFolderName={selectedFolder?.name}
                        inline={true}
                        hideCancelButton={true}
                      />
                    ) : (
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 p-2 rounded border ${folderNotFound ? 'bg-red-950/20 border-red-800/50' : 'bg-zinc-800/50 border-zinc-800'}`}>
                          <img
                            src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
                            alt="Google Drive"
                            className={`h-4 w-4 object-contain brightness-0 invert ${folderNotFound ? 'opacity-50' : ''}`}
                          />
                          <span className={`text-xs flex-1 truncate ${folderNotFound ? 'text-red-300' : 'text-zinc-300'}`}>
                            {selectedFolder.name}
                          </span>
                          <ZenButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFolderPicker(true)}
                            className="h-6 px-2 text-xs"
                          >
                            {folderNotFound ? 'Seleccionar nueva' : 'Cambiar'}
                          </ZenButton>
                        </div>
                        {folderNotFound && (
                          <div className="p-2 bg-red-950/20 border border-red-800/50 rounded text-xs text-red-300">
                            ⚠️ Esta carpeta fue eliminada o movida. Por favor, selecciona una nueva carpeta.
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 mt-2">
                      El cliente verá subcarpetas y contenido en su portal como galería y links de descarga
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-800">
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
                          alt="Google Drive"
                          className="h-5 w-5 object-contain brightness-0 invert opacity-50"
                        />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-zinc-300">
                            Conecta Google Drive
                          </h4>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Vincula tu cuenta para seleccionar carpetas de entregables
                          </p>
                        </div>
                      </div>
                      <ZenButton
                        type="button"
                        variant="primary"
                        onClick={handleConnectClick}
                        className="w-full"
                      >
                        Conectar Google Drive
                      </ZenButton>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
                    Enlace manual (URL)
                  </label>
                  <ZenInput
                    type="url"
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                  />
                  <p className="text-xs text-zinc-500 mt-1.5">
                    Con enlace manual, el cliente solo verá un botón para abrir el enlace en Google Drive.
                  </p>
                </div>
              </div>
            </form>
            
            {/* Footer */}
            <div className="border-t border-zinc-800 px-6 py-4 shrink-0">
              <div className="flex gap-2">
                <ZenButton
                  type="button"
                  variant="ghost"
                  onClick={handleCloseForm}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancelar
                </ZenButton>
                <ZenButton 
                  type="button" 
                  className="flex-1" 
                  loading={isSaving}
                  onClick={() => {
                    if (formRef.current) {
                      formRef.current.requestSubmit();
                    }
                  }}
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </ZenButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <ZenConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeletingId(null);
          }
        }}
        onConfirm={handleDelete}
        title="Eliminar Entregable"
        description="¿Estás seguro de eliminar este entregable? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        loading={isDeleting}
      />

      <GoogleDriveConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConfirmConnect}
        connecting={isConnecting}
      />

    </>
  );
}
