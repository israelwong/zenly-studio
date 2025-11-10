'use client';

import React, { useState, useRef } from 'react';
import { Upload, User, Crop, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Dropzone } from '@/components/ui/shadcn/dropzone';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { ImageCropModal, type ImageCropData } from './ImageCropModal';

interface AvatarManagerProps {
    url?: string | null | undefined;
    onUpdate: (url: string) => Promise<void> | void;
    onLocalUpdate?: (url: string | null) => void; // Opcional para actualización optimista
    studioSlug: string;
    category?: 'identidad' | 'servicios' | 'eventos' | 'galeria' | 'clientes' | 'documentos' | 'temp';
    subcategory?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'compact'; // Variante normal o compacta
    loading?: boolean;
    disabled?: boolean;
    // Textos personalizables
    cropTitle?: string;
    cropDescription?: string;
    cropInstructions?: string[];
    successMessage?: string;
    deleteMessage?: string;
    showAdjustButton?: boolean;
}

export function AvatarManager({
    url,
    onUpdate,
    onLocalUpdate,
    studioSlug,
    category = 'clientes',
    subcategory = 'avatars',
    size = 'md',
    variant = 'default',
    loading = false,
    disabled = false,
    cropTitle = "Ajustar imagen",
    cropDescription = "Arrastra y redimensiona el área circular para ajustar la imagen.",
    cropInstructions = [
        "• Arrastra para mover el área de recorte",
        "• Usa las esquinas para redimensionar",
        "• El área circular será tu imagen"
    ],
    successMessage = "Avatar actualizado exitosamente",
    deleteMessage = "Avatar eliminado",
    showAdjustButton = true
}: AvatarManagerProps) {
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImageUrl, setCropImageUrl] = useState<string>('');
    const [isDeleting, setIsDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-32 h-32',
        lg: 'w-64 h-64'
    };

    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-16 w-16'
    };

    const currentSize = sizeClasses[size];
    const currentIconSize = iconSizes[size];

    // Hook para upload de archivos
    const { uploading, error, uploadFile, deleteFile } = useFileUpload({
        studioSlug,
        category,
        subcategory,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
        maxSize: 2,
        onError: (error) => {
            toast.error(error);
        }
    });

    const handleFileSelect = async (file: File) => {
        if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
            toast.error('Solo se permiten archivos JPG, PNG y SVG.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('La imagen es demasiado grande. Por favor selecciona una imagen más pequeña.');
            return;
        }

        // SVG no necesita crop, subir directamente
        if (file.type === 'image/svg+xml') {
            try {
                const result = await uploadFile(file);
                if (result.success && result.publicUrl) {
                    if (onLocalUpdate) {
                        onLocalUpdate(result.publicUrl);
                    }
                    await onUpdate(result.publicUrl);
                    toast.success(successMessage);
                } else {
                    toast.error(result.error || 'No pudimos subir la imagen. Inténtalo de nuevo.');
                }
            } catch (error) {
                console.error('Error al subir SVG:', error);
                toast.error('Error al procesar la imagen');
            }
            return;
        }

        // JPG y PNG pasan por el modal de crop
        setCropImageUrl(URL.createObjectURL(file));
        setShowCropModal(true);
    };

    const handleCropApply = async (cropData: ImageCropData, croppedImageUrl: string) => {
        try {
            const response = await fetch(croppedImageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'avatar-cropped.jpg', { type: 'image/jpeg' });

            const result = await uploadFile(file);
            if (result.success && result.publicUrl) {
                // Actualización optimista si está disponible
                if (onLocalUpdate) {
                    onLocalUpdate(result.publicUrl);
                }
                await onUpdate(result.publicUrl);
                toast.success(successMessage);
            } else {
                // Revertir si hay error y tenemos onLocalUpdate
                if (onLocalUpdate) {
                    onLocalUpdate(url || null);
                }
                toast.error(result.error || 'No pudimos subir la imagen. Inténtalo de nuevo.');
            }

            setShowCropModal(false);
        } catch (error) {
            console.error('Error al aplicar crop:', error);
            // Revertir en caso de error
            if (onLocalUpdate) {
                onLocalUpdate(url || null);
            }
            toast.error('Error al procesar la imagen');
        }
    };

    const handleRemoveUrl = async () => {
        const originalUrl = url ?? null;
        setIsDeleting(true);

        try {
            if (originalUrl) {
                await deleteFile(originalUrl);
            }
            // Actualización optimista si está disponible
            if (onLocalUpdate) {
                onLocalUpdate(null);
            }
            await onUpdate('');
            toast.success(deleteMessage);
        } catch (error) {
            // Revertir si hay error
            if (onLocalUpdate && originalUrl) {
                onLocalUpdate(originalUrl);
            }
            toast.error('No pudimos eliminar el avatar. Inténtalo de nuevo');
            console.error('Error al eliminar archivo:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const isDisabled = uploading || loading || isDeleting || disabled;

    return (
        <div className="flex flex-col items-center justify-center">
            {url ? (
                <div className="relative group flex items-center justify-center">
                    {/* Dropzone invisible sobre el avatar para permitir drag and drop */}
                    <Dropzone
                        onFileSelect={handleFileSelect}
                        acceptedFileTypes={{
                            'image/jpeg': ['.jpg', '.jpeg'],
                            'image/png': ['.png'],
                            'image/svg+xml': ['.svg']
                        }}
                        maxSize={10}
                        maxFiles={1}
                        disabled={isDisabled}
                        className={`absolute inset-0 ${currentSize} rounded-full z-0 cursor-pointer`}
                    >
                        <div className="w-full h-full" />
                    </Dropzone>

                    <div className="relative flex items-center justify-center z-10">
                        <Avatar className={`${currentSize} border-2 border-zinc-400 pointer-events-none`}>
                            <AvatarImage
                                src={url}
                                alt="Avatar"
                                className="object-cover object-center"
                            />
                            <AvatarFallback className="flex items-center justify-center">
                                <User className={currentIconSize} />
                            </AvatarFallback>
                        </Avatar>

                        {/* Overlay de eliminando */}
                        {isDeleting && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center z-20">
                                <div className="text-center">
                                    <div className="animate-spin h-6 w-6 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2" />
                                    <p className="text-white text-xs font-medium">Eliminando...</p>
                                </div>
                            </div>
                        )}

                        {/* Overlay con opciones al hacer hover */}
                        {!isDeleting && (
                            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 pointer-events-none ${variant === 'compact' ? 'gap-1.5' : 'gap-2'}`}>
                                {/* Botón Ajustar - Solo si showAdjustButton es true */}
                                {showAdjustButton && url && !url.toLowerCase().endsWith('.svg') && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setCropImageUrl(url);
                                            setShowCropModal(true);
                                        }}
                                        disabled={isDisabled}
                                        className={`${variant === 'compact'
                                            ? 'w-8 h-8 flex items-center justify-center bg-zinc-800/90 hover:bg-zinc-700 rounded-full transition-colors'
                                            : 'flex flex-col items-center gap-1 px-2 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 rounded-lg transition-colors'} disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto`}
                                        title="Ajustar avatar"
                                    >
                                        <Crop className={variant === 'compact' ? 'h-3.5 w-3.5 text-blue-400' : 'h-3 w-3 text-blue-400'} />
                                        {variant === 'default' && <span className="text-white text-xs font-medium">Ajustar</span>}
                                    </button>
                                )}

                                {/* Botón Eliminar */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleRemoveUrl();
                                    }}
                                    disabled={isDisabled}
                                    className={`${variant === 'compact'
                                        ? 'w-8 h-8 flex items-center justify-center bg-red-600/90 hover:bg-red-700 rounded-full transition-colors'
                                        : 'flex flex-col items-center gap-1 px-2 py-1.5 bg-red-600/90 hover:bg-red-700 rounded-lg transition-colors'} disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto`}
                                    title="Eliminar avatar"
                                >
                                    <Trash2 className={variant === 'compact' ? 'h-3.5 w-3.5 text-white' : 'h-3 w-3 text-white'} />
                                    {variant === 'default' && <span className="text-white text-xs font-medium">Eliminar</span>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="relative">
                    <Dropzone
                        onFileSelect={handleFileSelect}
                        acceptedFileTypes={{
                            'image/jpeg': ['.jpg', '.jpeg'],
                            'image/png': ['.png'],
                            'image/svg+xml': ['.svg']
                        }}
                        maxSize={10}
                        maxFiles={1}
                        disabled={isDisabled}
                        className={`${currentSize} border-2 border-dashed border-zinc-400 hover:border-zinc-300 hover:bg-zinc-900/30 transition-all duration-300 rounded-full group cursor-pointer relative overflow-hidden flex items-center justify-center`}
                    >
                        <div className={`flex flex-col items-center justify-center text-center ${variant === 'compact' ? 'p-1' : 'p-2'}`}>
                            <div className={`${size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'} ${variant === 'compact' ? 'mb-1' : 'mb-2'} rounded-full bg-zinc-800/80 flex items-center justify-center group-hover:bg-zinc-700 group-hover:scale-110 transition-all duration-200`}>
                                <Upload className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8'} text-zinc-400 group-hover:text-zinc-300 transition-colors duration-200`} />
                            </div>
                            {size !== 'sm' && (
                                <>
                                    {variant === 'compact' ? (
                                        <p className="text-zinc-300 text-[10px] font-medium mt-1">
                                            Subir imagen
                                        </p>
                                    ) : (
                                        <>
                                            <h3 className="text-zinc-200 text-[10px] font-medium mb-0.5">
                                                Subir Avatar
                                            </h3>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </Dropzone>

                    {uploading && (
                        <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm rounded-full flex items-center justify-center z-20">
                            <div className="text-center">
                                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                                <p className="text-zinc-200 text-xs font-medium">Subiendo...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.svg,image/jpeg,image/png,image/svg+xml"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                }}
                className="hidden"
            />

            {error && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-800/30 rounded-md">
                    <span className="text-red-400 text-xs">{error}</span>
                </div>
            )}

            {/* Modal de crop */}
            <ImageCropModal
                isOpen={showCropModal}
                onClose={() => setShowCropModal(false)}
                imageUrl={cropImageUrl}
                onCrop={handleCropApply}
                title={cropTitle}
                description={cropDescription}
                initialCropSize={75}
                outputSize={192}
                aspectRatio={1}
                circularCrop={true}
                instructions={cropInstructions}
            />
        </div>
    );
}

