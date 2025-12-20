'use client';

import React from 'react';
import { Image, Video, FileText, File, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/shadcn/button';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  file: File | string; // File object o URL string
  onRemove?: () => void;
  onView?: () => void;
  className?: string;
  showActions?: boolean;
}

export function FilePreview({
  file,
  onRemove,
  onView,
  className,
  showActions = true
}: FilePreviewProps) {
  const isUrl = typeof file === 'string';
  const fileUrl = isUrl ? file : URL.createObjectURL(file);
  const fileName = isUrl ? file.split('/').pop() || 'Archivo' : file.name;
  const fileSize = isUrl ? null : (file.size / 1024 / 1024).toFixed(2) + ' MB';

  // Determinar tipo de archivo
  const getFileType = () => {
    if (isUrl) {
      if (file.includes('.png') || file.includes('.jpg') || file.includes('.jpeg') || file.includes('.svg')) {
        return 'image';
      }
      if (file.includes('.mp4') || file.includes('.webm')) {
        return 'video';
      }
      if (file.includes('.pdf')) {
        return 'pdf';
      }
      return 'file';
    }

    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type === 'application/pdf') return 'pdf';
    return 'file';
  };

  const fileType = getFileType();

  const getFileIcon = () => {
    switch (fileType) {
      case 'image':
        return <Image className="h-8 w-8 text-blue-400" />;
      case 'video':
        return <Video className="h-8 w-8 text-purple-400" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-400" />;
      default:
        return <File className="h-8 w-8 text-zinc-400" />;
    }
  };

  const getFileTypeText = () => {
    switch (fileType) {
      case 'image':
        return 'Imagen';
      case 'video':
        return 'Video';
      case 'pdf':
        return 'PDF';
      default:
        return 'Archivo';
    }
  };

  return (
    <div className={cn(
      "bg-zinc-800 border border-zinc-700 rounded-lg p-4",
      className
    )}>
      <div className="flex items-center space-x-3">
        {/* Icono del archivo */}
        <div className="flex-shrink-0">
          {getFileIcon()}
        </div>

        {/* Información del archivo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-zinc-300 font-medium truncate">
              {fileName}
            </p>
            <span className="text-zinc-500 text-xs bg-zinc-700 px-2 py-1 rounded">
              {getFileTypeText()}
            </span>
          </div>

          {fileSize && (
            <p className="text-zinc-500 text-sm">
              {fileSize}
            </p>
          )}
        </div>

        {/* Acciones */}
        {showActions && (
          <div className="flex items-center space-x-2">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}

            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Previsualización para imágenes */}
      {fileType === 'image' && (
        <div className="mt-3">
          <div className="w-full h-32 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700">
            <img
              src={fileUrl}
              alt={fileName}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Si falla la carga, mostrar placeholder
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Previsualización para videos */}
      {fileType === 'video' && (
        <div className="mt-3">
          <div className="w-full h-32 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700">
            <video
              src={fileUrl}
              className="w-full h-full object-contain"
              controls
              preload="metadata"
            />
          </div>
        </div>
      )}
    </div>
  );
}
