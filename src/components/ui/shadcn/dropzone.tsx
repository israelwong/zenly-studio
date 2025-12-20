'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Image, Video, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes: {
    [key: string]: string[];
  };
  maxSize?: number; // en MB
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Dropzone({
  onFileSelect,
  acceptedFileTypes,
  maxSize = 5,
  maxFiles = 1,
  disabled = false,
  className,
  children
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxSize * 1024 * 1024,
    maxFiles,
    disabled,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    // Deshabilitar File System Access API para evitar NotAllowedError
    useFsAccessApi: false,
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-8 w-8" />;
    if (fileType.startsWith('video/')) return <Video className="h-8 w-8" />;
    if (fileType === 'application/pdf') return <FileText className="h-8 w-8" />;
    return <File className="h-8 w-8" />;
  };

  const getFileTypeText = (fileType: string) => {
    if (fileType.startsWith('image/')) return 'Imagen';
    if (fileType.startsWith('video/')) return 'Video';
    if (fileType === 'application/pdf') return 'PDF';
    return 'Archivo';
  };

  const hasNoBorder = className?.includes('border-0');
  const hasChildren = !!children;

  return (
    <div className={cn("w-full", !hasChildren && className)}>
      <div
        {...getRootProps()}
        className={cn(
          !hasNoBorder && "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200",
          !hasNoBorder && "bg-zinc-800 border-zinc-700 hover:border-zinc-600",
          !hasNoBorder && isDragActive && "border-blue-500 bg-blue-500/10",
          !hasNoBorder && dragActive && "border-blue-500 bg-blue-500/10",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input {...getInputProps()} />

        {children ? (
          children
        ) : (
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center">
              <Upload className="h-6 w-6 text-zinc-400" />
            </div>

            <div className="space-y-1">
              <p className="text-zinc-300 font-medium">
                {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra y suelta un archivo'}
              </p>
              <p className="text-zinc-500 text-sm">
                o haz clic para seleccionar
              </p>
            </div>

            <div className="text-xs text-zinc-600">
              <p>Tipos permitidos: {Object.keys(acceptedFileTypes).join(', ')}</p>
              <p>Tamaño máximo: {maxSize}MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Mostrar errores de validación */}
      {fileRejections.length > 0 && (
        <div className="mt-2 space-y-1">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="text-red-400 text-sm">
              <p className="font-medium">{file.name}</p>
              {errors.map((error) => (
                <p key={error.code} className="text-xs">
                  {error.code === 'file-too-large' && `Archivo demasiado grande (máx. ${maxSize}MB)`}
                  {error.code === 'file-invalid-type' && 'Tipo de archivo no permitido'}
                  {error.code === 'too-many-files' && `Máximo ${maxFiles} archivo(s) permitido(s)`}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
