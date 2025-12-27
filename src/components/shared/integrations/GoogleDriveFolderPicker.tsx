'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Loader2, X } from 'lucide-react';
import {
  ZenButton,
  ZenInput,
} from '@/components/ui/zen';
import { listarCarpetasDrive, listarSubcarpetas } from '@/lib/actions/studio/integrations';
import { toast } from 'sonner';

interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: string;
}

interface GoogleDriveFolderPickerProps {
  studioSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folder: { id: string; name: string; url: string }) => void;
  initialFolderId?: string;
  initialFolderName?: string;
  inline?: boolean;
  hideCancelButton?: boolean;
}

export function GoogleDriveFolderPicker({
  studioSlug,
  isOpen,
  onClose,
  onSelect,
  initialFolderId,
  initialFolderName,
  inline = false,
  hideCancelButton = false,
}: GoogleDriveFolderPickerProps) {
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ id: string; name: string }>>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Si hay una carpeta inicial, abrir directamente en esa carpeta
      if (initialFolderId && initialFolderName) {
        setCurrentFolderId(initialFolderId);
        setCurrentPath([{ id: initialFolderId, name: initialFolderName }]);
        loadFolders(initialFolderId);
      } else {
        loadFolders(null);
      }
    } else {
      // Reset al cerrar
      setFolders([]);
      setCurrentPath([]);
      setCurrentFolderId(null);
      setSearchQuery('');
      setRootFolderId(null);
    }
  }, [isOpen, studioSlug, initialFolderId, initialFolderName]);

  const loadFolders = async (folderId: string | null) => {
    try {
      setLoading(true);
      
      let result;

      if (folderId) {
        // Cargar subcarpetas de la carpeta actual
        result = await listarSubcarpetas(studioSlug, folderId);
      } else {
        // Cargar carpetas en la raíz
        result = await listarCarpetasDrive(studioSlug);

        // Si hay una sola carpeta en la raíz y estamos en modo inline, 
        // cargar automáticamente sus subcarpetas en lugar de mostrarla
        if (result.success && result.data && result.data.length === 1 && inline) {
          const rootFolder = result.data[0];
          setRootFolderId(rootFolder.id);
          // Cargar subcarpetas de la carpeta raíz única
          const subfoldersResult = await listarSubcarpetas(studioSlug, rootFolder.id);
          if (subfoldersResult.success && subfoldersResult.data) {
            setFolders(subfoldersResult.data);
            // No agregar al path para que no se muestre en el breadcrumb
            return;
          }
        } else if (result.success && result.data && result.data.length > 1) {
          // Si hay múltiples carpetas en la raíz, limpiar rootFolderId
          setRootFolderId(null);
        }
      }

      if (result.success && result.data) {
        setFolders(result.data);
      } else {
        const errorMessage = result.error || 'Error al cargar carpetas';
        toast.error(errorMessage);
        // Si es error de permisos, mostrar mensaje más específico
        if (errorMessage.includes('Permisos insuficientes')) {
          console.error('[GoogleDriveFolderPicker] Error de permisos:', errorMessage);
        }
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error('Error al cargar carpetas de Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (folder: GoogleDriveFolder) => {
    // Navegar dentro de la carpeta
    setCurrentFolderId(folder.id);
    setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
    await loadFolders(folder.id);
  };

  const handleBack = async () => {
    if (currentPath.length === 0) {
      // Si estamos en la raíz y hay una carpeta raíz única, no hacer nada
      // (ya estamos mostrando las subcarpetas de la raíz)
      if (rootFolderId && inline) {
        return;
      }
      return;
    }

    const newPath = currentPath.slice(0, -1);
    setCurrentPath(newPath);

    if (newPath.length === 0) {
      // Volver a la raíz
      setCurrentFolderId(null);
      // Si hay una carpeta raíz única en modo inline, cargar sus subcarpetas
      if (rootFolderId && inline) {
        const subfoldersResult = await listarSubcarpetas(studioSlug, rootFolderId);
        if (subfoldersResult.success && subfoldersResult.data) {
          setFolders(subfoldersResult.data);
          return;
        }
      }
      await loadFolders(null);
    } else {
      const parentFolder = newPath[newPath.length - 1];
      setCurrentFolderId(parentFolder.id);
      await loadFolders(parentFolder.id);
    }
  };

  const handleSelect = (folder: GoogleDriveFolder) => {
    onSelect({
      id: folder.id,
      name: folder.name,
      url: `https://drive.google.com/drive/folders/${folder.id}`,
    });
    if (!inline) {
      onClose();
    }
  };

  const filteredFolders = searchQuery
    ? folders.filter((folder) =>
      folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : folders;

  if (!isOpen) return null;

  const content = (
    <div className={`${inline ? 'bg-zinc-800/30 rounded-lg border border-zinc-800' : 'bg-zinc-900 rounded-lg border border-zinc-800'} w-full ${inline ? '' : 'max-w-2xl'} ${inline ? 'max-h-[300px]' : 'max-h-[80vh]'} flex flex-col`}>
      {/* Header - Solo en modo modal */}
      {!inline && (
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
            <img
              src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
              alt="Google Drive"
              className="h-5 w-5 object-contain brightness-0 invert"
            />
            Seleccionar carpeta de Google Drive
          </h3>
          <ZenButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </ZenButton>
        </div>
      )}

      {/* Breadcrumb - Solo mostrar si hay navegación (no en raíz) */}
      {currentPath.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-800/50">
          <ZenButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-7 px-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Atrás
          </ZenButton>
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            {currentPath.map((pathItem, idx) => (
              <React.Fragment key={pathItem.id}>
                <ChevronRight className="h-3 w-3" />
                <span>{pathItem.name}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4 border-b border-zinc-800">
        <ZenInput
          placeholder="Buscar carpeta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-800 animate-pulse"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-5 w-5 bg-zinc-700 rounded" />
                  <div className="h-4 w-32 bg-zinc-700 rounded" />
                </div>
                <div className="h-7 w-20 bg-zinc-700 rounded" />
              </div>
            ))}
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-sm">
            {searchQuery ? 'No se encontraron carpetas' : 'No hay carpetas en esta ubicación'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors group"
              >
                <button
                  onClick={() => handleFolderClick(folder)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <img
                    src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/Studio/icons/google-drive-black.svg"
                    alt="Google Drive"
                    className="h-5 w-5 object-contain brightness-0 invert"
                  />
                  <span className="text-sm text-zinc-200">{folder.name}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <ZenButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelect(folder)}
                  className="ml-2"
                >
                  Seleccionar
                </ZenButton>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!hideCancelButton && (
        <div className={`flex items-center ${inline ? 'justify-between' : 'justify-end'} gap-2 p-3 border-t border-zinc-800`}>
          {inline && (
            <span className="text-xs text-zinc-400">Selecciona una carpeta o navega para explorar</span>
          )}
          <ZenButton variant="ghost" onClick={onClose} size={inline ? "sm" : "md"}>
            Cancelar
          </ZenButton>
        </div>
      )}
    </div>
  );

  // En modo inline, retornar directamente sin overlay
  if (inline) {
    return content;
  }

  // En modo modal, envolver con overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {content}
    </div>
  );
}

