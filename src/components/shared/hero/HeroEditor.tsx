'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, X, AlignStartVertical, AlignVerticalDistributeCenter, AlignEndVertical, AlignEndHorizontal, AlignStartHorizontal, Square, RectangleVertical, Maximize2, Shrink, AlignVerticalJustifyCenter, Copy, ChevronUp, ChevronDown, Layers, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { ZenInput, ZenTextarea, ZenSelect, ZenButton, ZenCard, ZenCardContent, ZenSwitch } from '@/components/ui/zen';
import { HeroConfig, ButtonConfig, MediaItem } from '@/types/content-blocks';
import { cn } from '@/lib/utils';
import HeroDropzone from './HeroDropzone';

interface HeroEditorProps {
    config: HeroConfig;
    media: MediaItem[];
    onConfigChange: (config: HeroConfig) => void;
    onMediaChange: (media: MediaItem[]) => void;
    onDropFiles?: (files: File[]) => Promise<void>;
    isUploading?: boolean;
    studioSlug: string;
}

export default function HeroEditor({
    config,
    media,
    onConfigChange,
    onMediaChange,
    onDropFiles,
    isUploading = false,
    studioSlug
}: HeroEditorProps) {
    const [localConfig, setLocalConfig] = useState<HeroConfig>(config);
    const [localButtons, setLocalButtons] = useState<ButtonConfig[]>(config.buttons || []);
    const [activeTab, setActiveTab] = useState<'informacion' | 'apariencia' | 'botones' | 'fondo'>('informacion');

    // Sincronizar estado cuando cambia el config externo
    useEffect(() => {
        setLocalConfig(config);
        setLocalButtons(config.buttons || []);
    }, [config]);

    const updateConfig = useCallback((updates: Partial<HeroConfig>) => {
        const cleanedUpdates = { ...updates };
        // Limpiar aspectRatio si es 'horizontal' (ya no soportado)
        if ('aspectRatio' in cleanedUpdates) {
            const aspectRatioValue = cleanedUpdates.aspectRatio;
            if (aspectRatioValue && aspectRatioValue !== 'square' && aspectRatioValue !== 'vertical') {
                cleanedUpdates.aspectRatio = undefined;
            }
        }
        const newConfig = { ...localConfig, ...cleanedUpdates };
        setLocalConfig(newConfig);
        onConfigChange(newConfig);
    }, [localConfig, onConfigChange]);

    const handleInputChange = (field: keyof HeroConfig, value: unknown) => {
        updateConfig({ [field]: value });
    };

    const handleDescriptionChange = (value: string) => {
        const limitedValue = value.slice(0, 100);
        updateConfig({ description: limitedValue });
    };

    const addButton = () => {
        if (localButtons.length >= 2) return;
        const newButton: ButtonConfig = {
            text: '',
            href: '',
            variant: 'primary',
            linkType: 'internal',
            pulse: false
        };
        const updatedButtons = [...localButtons, newButton];
        setLocalButtons(updatedButtons);
        updateConfig({ buttons: updatedButtons });
    };

    const removeButton = (index: number) => {
        const updatedButtons = localButtons.filter((_, i) => i !== index);
        setLocalButtons(updatedButtons);
        updateConfig({ buttons: updatedButtons });
    };

    const duplicateButton = (index: number) => {
        if (localButtons.length >= 2) return;
        const buttonToDuplicate = localButtons[index];
        const duplicatedButton: ButtonConfig = {
            ...buttonToDuplicate,
            text: `${buttonToDuplicate.text} (copia)`
        };
        const updatedButtons = [
            ...localButtons.slice(0, index + 1),
            duplicatedButton,
            ...localButtons.slice(index + 1)
        ];
        setLocalButtons(updatedButtons);
        updateConfig({ buttons: updatedButtons });
    };

    const moveButton = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= localButtons.length) return;

        const updatedButtons = [...localButtons];
        [updatedButtons[index], updatedButtons[newIndex]] = [updatedButtons[newIndex], updatedButtons[index]];
        setLocalButtons(updatedButtons);
        updateConfig({ buttons: updatedButtons });
    };

    const updateButton = (index: number, updates: Partial<ButtonConfig>) => {
        const updatedButtons = localButtons.map((btn, i) =>
            i === index ? { ...btn, ...updates } : btn
        );
        setLocalButtons(updatedButtons);
        updateConfig({ buttons: updatedButtons });
    };

    const handleRemoveMedia = () => {
        onMediaChange([]);
    };

    // Wrapper para asegurar que siempre se reemplace el archivo, no se agregue
    const handleDropFilesWrapper = useCallback(async (files: File[]) => {
        if (!onDropFiles || files.length === 0) return;

        try {
            // Llamar a onDropFiles para hacer el upload
            await onDropFiles(files);
        } catch (error) {
            // El error ya se maneja en el dropzone
            console.error('Error en handleDropFilesWrapper:', error);
        }
    }, [onDropFiles]);

    // Efecto para asegurar que solo haya 1 archivo (el más reciente)
    useEffect(() => {
        if (media.length > 1) {
            // Si hay más de 1 archivo, mantener solo el más reciente
            // El más reciente será el último en el array (el recién subido)
            const mostRecent = media[media.length - 1];
            onMediaChange([mostRecent]);
        }
    }, [media, onMediaChange]);

    const aspectRatioOptions = [
        { value: 'square' as const, icon: Square, label: 'Cuadrado' },
        { value: 'vertical' as const, icon: RectangleVertical, label: 'Vertical' }
    ];

    const containerStyleOptions = [
        { value: 'fullscreen', icon: Maximize2, label: 'Pantalla completa' },
        { value: 'wrapped', icon: Shrink, label: 'Con espacio interno' }
    ];

    const verticalAlignmentOptions = [
        { value: 'top', icon: AlignStartHorizontal, label: 'Arriba' },
        { value: 'vcenter', icon: AlignVerticalJustifyCenter, label: 'Centrado Vertical' },
        { value: 'bottom', icon: AlignEndHorizontal, label: 'Abajo' }
    ];

    const horizontalAlignmentOptions = [
        { value: 'left', icon: AlignStartVertical, label: 'Izquierda' },
        { value: 'center', icon: AlignVerticalDistributeCenter, label: 'Centrado Horizontal' },
        { value: 'right', icon: AlignEndVertical, label: 'Derecha' }
    ];

    // Componentes SVG para iconos de bordes
    const NoBorderIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M6 6 L6 18 M6 6 L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    const RoundedBorderIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M6 18 L6 10 Q6 6 10 6 L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
    );

    // Componentes SVG para iconos de estilo de borde
    const NoBorderStyleIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Icono vacío - sin línea */}
        </svg>
    );

    const SolidBorderIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    const DashedBorderIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="12" x2="11" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="14" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );

    const borderRadiusOptions = [
        { value: 'none', label: 'Sin borde', icon: NoBorderIcon },
        { value: 'md', label: 'Borde ligero', icon: RoundedBorderIcon },
        { value: 'lg', label: 'Borde amplio', icon: RoundedBorderIcon }
    ];


    const buttonVariantOptions = [
        { value: 'primary', label: 'Sólido' },
        { value: 'outline', label: 'Outline' },
        { value: 'ghost', label: 'Ghost' }
    ];


    const linkTypeOptions = [
        { value: 'internal', label: 'Enlace interno' },
        { value: 'external', label: 'Abre nueva página' }
    ];

    // Iconos SVG para borderRadius de botones
    const ButtonBorderNoneIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
    );

    const ButtonBorderSmIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
    );

    const ButtonBorderFullIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <rect x="4" y="4" width="16" height="16" rx="8" ry="8" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
    );

    const buttonBorderRadiusOptions = [
        { value: 'normal' as const, label: 'Normal', icon: ButtonBorderNoneIcon },
        { value: 'sm' as const, label: 'Ligero', icon: ButtonBorderSmIcon },
        { value: 'full' as const, label: 'Completo', icon: ButtonBorderFullIcon }
    ];

    // Icono SVG para borde del botón
    const ButtonBorderIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <rect x="6" y="6" width="12" height="12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
        </svg>
    );

    // Iconos simplificados para posición de sombra
    const ShadowFullIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <rect x="6" y="6" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
    );

    const ShadowBottomIcon = ({ className }: { className?: string }) => (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <rect x="6" y="6" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
            <line x1="6" y1="18" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );

    const shadowPositionOptions = [
        { value: 'full' as const, label: 'Completo', icon: ShadowFullIcon },
        { value: 'bottom' as const, label: 'Solo abajo', icon: ShadowBottomIcon }
    ];


    const gradientPositionOptions = [
        { value: 'top' as const, icon: ArrowUp, label: 'Arriba' },
        { value: 'bottom' as const, icon: ArrowDown, label: 'Abajo' },
        { value: 'left' as const, icon: ArrowLeft, label: 'Izquierda' },
        { value: 'right' as const, icon: ArrowRight, label: 'Derecha' }
    ];

    const tabs = [
        { id: 'informacion', label: 'Información' },
        { id: 'apariencia', label: 'Apariencia' },
        { id: 'botones', label: 'Botones' },
        { id: 'fondo', label: 'Fondo' }
    ] as const;

    return (
        <ZenCard padding="none">
            <ZenCardContent className="space-y-4">
                {/* Tabs Navigation */}
                <div className="bg-zinc-800/50 p-1 rounded-lg flex gap-1 mt-3 mb-3">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 py-2 px-4 font-medium text-sm transition-all duration-200 rounded text-center",
                                activeTab === tab.id
                                    ? "bg-zinc-900 text-emerald-400 shadow-lg"
                                    : "text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-4">
                    {/* Pestaña: Información */}
                    {activeTab === 'informacion' && (
                        <div className="space-y-4">
                            <ZenInput
                                label="Título"
                                value={localConfig.title || ''}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                placeholder="Título principal"
                            />

                            <ZenInput
                                label="Subtítulo"
                                value={localConfig.subtitle || ''}
                                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                                placeholder="Subtítulo opcional"
                            />

                            <ZenTextarea
                                label="Descripción"
                                value={localConfig.description || ''}
                                onChange={(e) => handleDescriptionChange(e.target.value)}
                                placeholder="Descripción limitada a 100 caracteres"
                                maxLength={100}
                                minRows={3}
                            />
                        </div>
                    )}

                    {/* Pestaña: Apariencia */}
                    {activeTab === 'apariencia' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-200 mb-2">
                                    Aspecto
                                </label>
                                <div className="flex gap-1">
                                    {aspectRatioOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isActive = localConfig.aspectRatio === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => updateConfig({ aspectRatio: option.value })}
                                                className={cn(
                                                    "p-2 rounded transition-colors",
                                                    isActive
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                )}
                                                title={option.label}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-200 mb-2">
                                    Envoltura
                                </label>
                                <div className="flex gap-1">
                                    {containerStyleOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isActive = localConfig.containerStyle === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => updateConfig({ containerStyle: option.value as 'fullscreen' | 'wrapped' })}
                                                className={cn(
                                                    "p-2 rounded transition-colors",
                                                    isActive
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                )}
                                                title={option.label}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-200 mb-2">
                                    Alineación Vertical
                                </label>
                                <div className="flex gap-1">
                                    {verticalAlignmentOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isActive = option.value === 'vcenter'
                                            ? localConfig.verticalAlignment === 'center'
                                            : localConfig.verticalAlignment === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    if (option.value === 'vcenter') {
                                                        updateConfig({
                                                            textAlignment: localConfig.textAlignment || 'center',
                                                            verticalAlignment: 'center'
                                                        });
                                                    } else {
                                                        updateConfig({
                                                            textAlignment: localConfig.textAlignment || 'center',
                                                            verticalAlignment: option.value as 'top' | 'bottom'
                                                        });
                                                    }
                                                }}
                                                className={cn(
                                                    "p-2 rounded transition-colors",
                                                    isActive
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                )}
                                                title={option.label}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-200 mb-2">
                                    Alineación Horizontal
                                </label>
                                <div className="flex gap-1">
                                    {horizontalAlignmentOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isActive = localConfig.textAlignment === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    const alignment = option.value as 'left' | 'center' | 'right';
                                                    updateConfig({
                                                        textAlignment: alignment,
                                                        verticalAlignment: localConfig.verticalAlignment || 'center'
                                                    });
                                                }}
                                                className={cn(
                                                    "p-2 rounded transition-colors",
                                                    isActive
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                )}
                                                title={option.label}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {localConfig.containerStyle === 'wrapped' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-200 mb-2">
                                            Apariencia de las esquinas
                                        </label>
                                        <div className="flex gap-1">
                                            {borderRadiusOptions.map((option) => {
                                                const isActive = localConfig.borderRadius === option.value;
                                                const Icon = option.icon;

                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => updateConfig({ borderRadius: option.value as 'none' | 'md' | 'lg' })}
                                                        className={cn(
                                                            "p-2 rounded transition-colors",
                                                            isActive
                                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                                : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                        )}
                                                        title={option.label}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-zinc-200 mb-2">
                                            Bordes
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {/* Color */}
                                            <input
                                                type="color"
                                                value={localConfig.borderColor || '#ffffff'}
                                                onChange={(e) => updateConfig({ borderColor: e.target.value })}
                                                className="w-10 h-10 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
                                                title="Color del borde"
                                            />

                                            {/* Slider Grosor */}
                                            <div className="flex-1 flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="10"
                                                    step="0.5"
                                                    value={localConfig.borderWidth ?? 0}
                                                    onChange={(e) => {
                                                        const newWidth = parseFloat(e.target.value);
                                                        if (newWidth === 0) {
                                                            updateConfig({ borderWidth: 0, borderStyle: undefined });
                                                        } else {
                                                            updateConfig({
                                                                borderWidth: newWidth,
                                                                borderStyle: localConfig.borderStyle || 'solid',
                                                                borderColor: localConfig.borderColor || '#ffffff'
                                                            });
                                                        }
                                                    }}
                                                    className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                    title={`Grosor: ${localConfig.borderWidth ?? 0}px`}
                                                />
                                                <span className="text-xs text-zinc-400 w-10 text-right">
                                                    {localConfig.borderWidth ?? 0}px
                                                </span>
                                            </div>

                                            {/* Iconos Estilos */}
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => updateConfig({ borderWidth: 0, borderStyle: undefined })}
                                                    className={cn(
                                                        "p-2 rounded transition-colors",
                                                        (!localConfig.borderWidth || localConfig.borderWidth === 0)
                                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                    )}
                                                    title="Sin borde"
                                                >
                                                    <NoBorderStyleIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateConfig({
                                                        borderStyle: 'solid',
                                                        borderWidth: localConfig.borderWidth && localConfig.borderWidth > 0 ? localConfig.borderWidth : 0.5,
                                                        borderColor: localConfig.borderColor || '#ffffff'
                                                    })}
                                                    className={cn(
                                                        "p-2 rounded transition-colors",
                                                        localConfig.borderStyle === 'solid' && localConfig.borderWidth && localConfig.borderWidth > 0
                                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                    )}
                                                    title="Sólido"
                                                >
                                                    <SolidBorderIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateConfig({
                                                        borderStyle: 'dashed',
                                                        borderWidth: localConfig.borderWidth && localConfig.borderWidth > 0 ? localConfig.borderWidth : 0.5,
                                                        borderColor: localConfig.borderColor || '#ffffff'
                                                    })}
                                                    className={cn(
                                                        "p-2 rounded transition-colors",
                                                        localConfig.borderStyle === 'dashed' && localConfig.borderWidth && localConfig.borderWidth > 0
                                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                            : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                    )}
                                                    title="Punteado"
                                                >
                                                    <DashedBorderIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Pestaña: Botones */}
                    {activeTab === 'botones' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium text-zinc-200">Botones del Hero</span>
                                    <span className="text-xs text-zinc-500 ml-2">(opcional, máximo 2)</span>
                                </div>
                                <ZenButton
                                    size="sm"
                                    variant="outline"
                                    onClick={addButton}
                                    disabled={localButtons.length >= 2}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Agregar
                                </ZenButton>
                            </div>

                            {localButtons.map((button, index) => (
                                <div key={index} className="p-4 border border-zinc-700 rounded-lg space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-zinc-300">Botón {index + 1}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => moveButton(index, 'up')}
                                                disabled={index === 0}
                                                className={cn(
                                                    "p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors",
                                                    index === 0 && "opacity-40 cursor-not-allowed"
                                                )}
                                                title="Mover arriba"
                                            >
                                                <ChevronUp className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveButton(index, 'down')}
                                                disabled={index === localButtons.length - 1}
                                                className={cn(
                                                    "p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors",
                                                    index === localButtons.length - 1 && "opacity-40 cursor-not-allowed"
                                                )}
                                                title="Mover abajo"
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => duplicateButton(index)}
                                                disabled={localButtons.length >= 2}
                                                className={cn(
                                                    "p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors",
                                                    localButtons.length >= 2 && "opacity-40 cursor-not-allowed"
                                                )}
                                                title="Duplicar"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeButton(index)}
                                                className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Eliminar"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs text-zinc-400">Texto</label>
                                            <span className={cn(
                                                "text-xs transition-colors",
                                                button.text.length > 15
                                                    ? "text-amber-400"
                                                    : button.text.length > 12
                                                        ? "text-yellow-500"
                                                        : "text-zinc-500"
                                            )}>
                                                {button.text.length} {button.text.length === 1 ? 'carácter' : 'caracteres'}
                                                {button.text.length > 15 && (
                                                    <span className="ml-1 text-amber-400">⚠️</span>
                                                )}
                                            </span>
                                        </div>
                                        <ZenInput
                                            value={button.text}
                                            onChange={(e) => updateButton(index, { text: e.target.value })}
                                            placeholder="Ej: Ver más, Contactar"
                                        />
                                        {button.text.length > 12 && (
                                            <p className={cn(
                                                "text-xs transition-colors",
                                                button.text.length > 15
                                                    ? "text-amber-400"
                                                    : "text-yellow-500"
                                            )}>
                                                {button.text.length > 15
                                                    ? "Texto muy largo. En mobile puede verse cortado."
                                                    : "Recomendado: máximo 12 caracteres para mejor usabilidad"}
                                            </p>
                                        )}
                                    </div>

                                    <ZenInput
                                        label="Enlace"
                                        value={button.href || ''}
                                        onChange={(e) => updateButton(index, { href: e.target.value })}
                                        placeholder="/ruta-o-url"
                                    />

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs text-zinc-400 mb-1">Tipo</label>
                                            <ZenSelect
                                                value={button.linkType || 'internal'}
                                                onValueChange={(value) => updateButton(index, {
                                                    linkType: value as 'internal' | 'external',
                                                    target: value === 'external' ? '_blank' : '_self'
                                                })}
                                                options={linkTypeOptions}
                                                disableSearch
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-zinc-400 mb-1">Estilo</label>
                                            <ZenSelect
                                                value={button.variant || 'primary'}
                                                onValueChange={(value) => updateButton(index, { variant: value as ButtonConfig['variant'] })}
                                                options={buttonVariantOptions}
                                                disableSearch
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs text-zinc-400 mb-1">Color</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={button.customColor || '#3b82f6'}
                                                    onChange={(e) => updateButton(index, { customColor: e.target.value })}
                                                    className="w-full h-9 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
                                                    title="Seleccionar color personalizado"
                                                />
                                                {button.customColor && (
                                                    <button
                                                        type="button"
                                                        onClick={() => updateButton(index, { customColor: undefined })}
                                                        className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                        title="Eliminar color personalizado"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Controles rápidos: Pulse, Borde, Esquinas, Sombra */}
                                    <div className="p-2 border border-zinc-700 rounded-lg bg-zinc-800/30">
                                        <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2">
                                            {/* Pulse */}
                                            <div className="flex flex-col items-center gap-1.5 min-h-[60px] justify-between px-1 sm:px-2 flex-1 sm:flex-initial">
                                                <span className="text-xs text-zinc-400 font-medium h-4 flex items-center">Pulse</span>
                                                <div className="flex items-center justify-center h-8">
                                                    <ZenSwitch
                                                        checked={button.pulse || false}
                                                        onCheckedChange={(checked) => updateButton(index, { pulse: checked })}
                                                        className="scale-90"
                                                    />
                                                </div>
                                            </div>

                                            {/* Separador */}
                                            <div className="hidden sm:block h-12 w-px bg-zinc-700/30 flex-shrink-0"></div>

                                            {/* Borde */}
                                            <div className="flex flex-col items-center gap-1.5 min-h-[60px] justify-between px-1 sm:px-2 flex-1 sm:flex-initial">
                                                <span className="text-xs text-zinc-400 font-medium h-4 flex items-center">Borde</span>
                                                <div className="flex items-center justify-center h-8">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateButton(index, { withBorder: !button.withBorder })}
                                                        className={cn(
                                                            "size-8 p-0 rounded transition-colors flex items-center justify-center",
                                                            button.withBorder
                                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                                : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                        )}
                                                        title={button.withBorder ? "Desactivar borde" : "Activar borde"}
                                                    >
                                                        <ButtonBorderIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Separador */}
                                            <div className="hidden sm:block h-12 w-px bg-zinc-700/30 flex-shrink-0"></div>

                                            {/* Sombra - Toggle y posición en la misma línea */}
                                            <div className="flex flex-col items-center gap-1.5 min-h-[60px] justify-between px-1 sm:px-2 flex-1 sm:flex-initial">
                                                <span className="text-xs text-zinc-400 font-medium h-4 flex items-center">Sombra</span>
                                                <div className="flex items-center justify-center h-8 gap-1">
                                                    {/* Toggle On/Off */}
                                                    <button
                                                        type="button"
                                                        onClick={() => updateButton(index, { shadow: !button.shadow })}
                                                        className={cn(
                                                            "size-8 p-0 rounded transition-colors flex items-center justify-center flex-shrink-0",
                                                            button.shadow
                                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                                : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                        )}
                                                        title={button.shadow ? "Desactivar sombra" : "Activar sombra"}
                                                    >
                                                        <Layers className="h-4 w-4" />
                                                    </button>

                                                    {/* Borde lateral interno - siempre visible */}
                                                    <div className="h-6 w-px bg-zinc-700/40 flex-shrink-0"></div>

                                                    {/* Iconos de posición - siempre presentes, deshabilitados si sombra inactiva */}
                                                    <div className="flex gap-0.5 items-center">
                                                        {shadowPositionOptions.map((option) => {
                                                            const Icon = option.icon;
                                                            const isActive = (button.shadowPosition || 'full') === option.value;
                                                            const isDisabled = !button.shadow;
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (!isDisabled) {
                                                                            updateButton(index, { shadowPosition: option.value });
                                                                        }
                                                                    }}
                                                                    disabled={isDisabled}
                                                                    className={cn(
                                                                        "size-8 p-0 rounded transition-colors flex items-center justify-center flex-shrink-0",
                                                                        isDisabled && "opacity-40 cursor-not-allowed",
                                                                        !isDisabled && isActive
                                                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                                            : !isDisabled && "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                                    )}
                                                                    title={isDisabled ? "Activa la sombra primero" : option.label}
                                                                >
                                                                    <Icon className="h-4 w-4" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Separador */}
                                            <div className="hidden sm:block h-12 w-px bg-zinc-700/30 flex-shrink-0"></div>

                                            {/* Esquinas */}
                                            <div className="flex flex-col items-center gap-1.5 min-h-[60px] justify-between px-1 sm:px-2 flex-1 sm:flex-initial">
                                                <span className="text-xs text-zinc-400 font-medium h-4 flex items-center">Esquinas</span>
                                                <div className="flex gap-0.5 items-center justify-center h-8">
                                                    {buttonBorderRadiusOptions.map((option) => {
                                                        const Icon = option.icon;
                                                        const isActive = (button.borderRadius || 'normal') === option.value;
                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => updateButton(index, { borderRadius: option.value })}
                                                                className={cn(
                                                                    "size-8 p-0 rounded transition-colors flex items-center justify-center flex-shrink-0",
                                                                    isActive
                                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                                        : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                                )}
                                                                title={option.label}
                                                            >
                                                                <Icon className="h-4 w-4" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ))}

                            {localButtons.length === 0 && (
                                <div className="text-center py-8 text-zinc-500 text-sm">
                                    No hay botones. Haz clic en &quot;Agregar&quot; para crear uno.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pestaña: Fondo */}
                    {activeTab === 'fondo' && (
                        <div className="space-y-4">
                            {/* Dropzone - siempre visible */}
                            <HeroDropzone
                                media={media}
                                onDropFiles={handleDropFilesWrapper}
                                onRemoveMedia={handleRemoveMedia}
                                isUploading={isUploading}
                            />

                            {/* Controles de Degradado */}
                            <div className="p-3 border border-zinc-700 rounded-lg bg-zinc-800/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-200">Degradado de Contraste</span>
                                    <ZenSwitch
                                        checked={localConfig.gradientOverlay || false}
                                        onCheckedChange={(checked) => updateConfig({ gradientOverlay: checked })}
                                    />
                                </div>

                                {/* Posición del degradado - solo visible si está activo */}
                                {localConfig.gradientOverlay && (
                                    <>
                                        <div className="border-t border-zinc-700/50"></div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-200 mb-2">
                                                Posición del Degradado
                                            </label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {gradientPositionOptions.map((option) => {
                                                    const Icon = option.icon;
                                                    const isActive = (localConfig.gradientPosition || 'top') === option.value;
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            onClick={() => updateConfig({ gradientPosition: option.value })}
                                                            className={cn(
                                                                "p-3 rounded transition-colors flex flex-col items-center gap-1",
                                                                isActive
                                                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                                    : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent"
                                                            )}
                                                            title={option.label}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                            <span className="text-xs">{option.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

