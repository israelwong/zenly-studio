'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Video, AlignStartVertical, AlignVerticalDistributeCenter, AlignEndVertical, AlignEndHorizontal, AlignStartHorizontal, Square, RectangleVertical, Maximize2, Shrink, AlignVerticalJustifyCenter } from 'lucide-react';
import { ZenInput, ZenTextarea, ZenSelect, ZenButton, ZenCard, ZenCardContent, ZenSwitch } from '@/components/ui/zen';
import { HeroConfig, ButtonConfig, MediaItem } from '@/types/content-blocks';
import { cn } from '@/lib/utils';

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

    const updateButton = (index: number, updates: Partial<ButtonConfig>) => {
        const updatedButtons = localButtons.map((btn, i) =>
            i === index ? { ...btn, ...updates } : btn
        );
        setLocalButtons(updatedButtons);
        updateConfig({ buttons: updatedButtons });
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0 && onDropFiles) {
            await onDropFiles(files);
        }
    }, [onDropFiles]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0 && onDropFiles) {
            await onDropFiles(files);
        }
    };

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
        { value: 'primary', label: 'Primario' },
        { value: 'secondary', label: 'Secundario' },
        { value: 'outline', label: 'Outline' },
        { value: 'ghost', label: 'Ghost' }
    ];


    const linkTypeOptions = [
        { value: 'internal', label: 'Enlace interno' },
        { value: 'external', label: 'Abre nueva página' }
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
                                <span className="text-sm font-medium text-zinc-200">Botones del Hero</span>
                                <ZenButton
                                    size="sm"
                                    variant="outline"
                                    onClick={addButton}
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
                                        <button
                                            type="button"
                                            onClick={() => removeButton(index)}
                                            className="text-zinc-500 hover:text-red-400"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <ZenInput
                                        label="Texto"
                                        value={button.text}
                                        onChange={(e) => updateButton(index, { text: e.target.value })}
                                        placeholder="Texto del botón"
                                    />

                                    <ZenInput
                                        label="Enlace"
                                        value={button.href || ''}
                                        onChange={(e) => updateButton(index, { href: e.target.value })}
                                        placeholder="/ruta-o-url"
                                    />

                                    <div className="grid grid-cols-2 gap-3">
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
                                            <label className="block text-xs text-zinc-400 mb-1">Color</label>
                                            <ZenSelect
                                                value={button.variant || 'primary'}
                                                onValueChange={(value) => updateButton(index, { variant: value as ButtonConfig['variant'] })}
                                                options={buttonVariantOptions}
                                                disableSearch
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs text-zinc-400">Pulse</label>
                                        <ZenSwitch
                                            checked={button.pulse || false}
                                            onCheckedChange={(checked) => updateButton(index, { pulse: checked })}
                                        />
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
                        <div>
                            {media.length > 0 ? (
                                <div className="relative">
                                    {media[0].file_type === 'video' ? (
                                        <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-900">
                                            <video
                                                src={media[0].file_url}
                                                className="w-full h-full object-cover"
                                                muted
                                                loop
                                                playsInline
                                            />
                                            <button
                                                onClick={() => onMediaChange([])}
                                                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img
                                                src={media[0].file_url}
                                                alt={media[0].filename}
                                                className="w-full rounded-lg"
                                            />
                                            <button
                                                onClick={() => onMediaChange([])}
                                                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-zinc-700 rounded-lg text-center hover:border-emerald-500 transition-colors cursor-pointer"
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*,video/*';
                                        input.onchange = (e: Event) => {
                                            const target = e.target as HTMLInputElement;
                                            const reactEvent = {
                                                ...e,
                                                target,
                                                currentTarget: target,
                                                nativeEvent: e,
                                                isDefaultPrevented: () => e.defaultPrevented,
                                                isPropagationStopped: () => false,
                                                persist: () => { }
                                            } as React.ChangeEvent<HTMLInputElement>;
                                            handleFileInput(reactEvent);
                                        };
                                        input.click();
                                    }}
                                >
                                    <div className="p-8 space-y-3">
                                        {isUploading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-400 border-t-transparent mx-auto"></div>
                                                <div className="text-sm text-zinc-500">Subiendo archivo...</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-center gap-4">
                                                    <ImageIcon className="h-8 w-8 text-zinc-500" />
                                                    <Video className="h-8 w-8 text-zinc-500" />
                                                </div>
                                                <div className="text-sm font-medium text-zinc-300">Arrastra imagen o video aquí</div>
                                                <div className="text-xs text-zinc-500">O haz clic para seleccionar</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ZenCardContent>
        </ZenCard>
    );
}

