'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { AlignStartVertical, AlignVerticalDistributeCenter, AlignEndVertical, AlignStartHorizontal, Square, RectangleVertical, Maximize2, Shrink, AlignVerticalJustifyCenter, AlignEndHorizontal, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { ZenInput, ZenTextarea, ZenCard, ZenCardContent, ZenSwitch } from '@/components/ui/zen';
import { HeroPortfolioConfig, MediaItem } from '@/types/content-blocks';
import { cn } from '@/lib/utils';
import HeroDropzone from '../HeroDropzone';

// Iconos de bordes (inline)
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

// Iconos de estilo de borde
const NoBorderStyleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <line x1="3" y1="21" x2="21" y2="3" />
    </svg>
);

const SolidBorderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
    </svg>
);

const DashedBorderIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <line x1="2" y1="12" x2="5" y2="12" strokeLinecap="round" />
        <line x1="8" y1="12" x2="11" y2="12" strokeLinecap="round" />
        <line x1="14" y1="12" x2="17" y2="12" strokeLinecap="round" />
        <line x1="20" y1="12" x2="22" y2="12" strokeLinecap="round" />
    </svg>
);

interface HeroPortfolioEditorProps {
    config: HeroPortfolioConfig;
    media: MediaItem[];
    onConfigChange: (config: HeroPortfolioConfig) => void;
    onMediaChange: (media: MediaItem[]) => void;
    onDropFiles?: (files: File[]) => Promise<void>;
    isUploading?: boolean;
    studioSlug: string;
    eventTypeName?: string; // Nombre del tipo de evento (NO editable)
}

export default function HeroPortfolioEditor({
    config,
    media,
    onConfigChange,
    onMediaChange,
    onDropFiles,
    isUploading = false,
    eventTypeName
}: HeroPortfolioEditorProps) {
    const [localConfig, setLocalConfig] = useState<HeroPortfolioConfig>(config);
    const [activeTab, setActiveTab] = useState<'informacion' | 'apariencia' | 'fondo'>('informacion');

    // Sincronizar cuando cambia el config externo
    const configString = useMemo(() => JSON.stringify(config), [config]);
    useEffect(() => {
        setLocalConfig(config);
    }, [configString]);

    const updateConfig = useCallback((updates: Partial<HeroPortfolioConfig>) => {
        const newConfig = { ...localConfig, ...updates };
        setLocalConfig(newConfig);
        onConfigChange(newConfig);
    }, [localConfig, onConfigChange]);

    const handleInputChange = useCallback((field: keyof HeroPortfolioConfig, value: string) => {
        updateConfig({ [field]: value });
    }, [updateConfig]);

    const handleDescriptionChange = useCallback((value: string) => {
        if (value.length <= 100) {
            updateConfig({ description: value });
        }
    }, [updateConfig]);

    const handleRemoveMedia = () => {
        onMediaChange([]);
    };

    // Opciones de alineación
    const verticalAlignmentOptions = [
        { value: 'top' as const, icon: AlignStartHorizontal, label: 'Arriba' },
        { value: 'center' as const, icon: AlignVerticalJustifyCenter, label: 'Centro' },
        { value: 'bottom' as const, icon: AlignEndHorizontal, label: 'Abajo' }
    ];

    const horizontalAlignmentOptions = [
        { value: 'left' as const, icon: AlignStartVertical, label: 'Izquierda' },
        { value: 'center' as const, icon: AlignVerticalDistributeCenter, label: 'Centro' },
        { value: 'right' as const, icon: AlignEndVertical, label: 'Derecha' }
    ];

    const aspectRatioOptions = [
        { value: 'original' as const, icon: Maximize2, label: 'Original' },
        { value: 'square' as const, icon: Square, label: 'Cuadrado' },
        { value: 'vertical' as const, icon: RectangleVertical, label: 'Vertical' }
    ];

    const containerStyleOptions = [
        { value: 'fullscreen' as const, icon: Maximize2, label: 'Pantalla completa' },
        { value: 'wrapped' as const, icon: Shrink, label: 'Contenido envuelto' }
    ];

    const borderRadiusOptions = [
        { value: 'none' as const, icon: NoBorderIcon, label: 'Sin redondeo' },
        { value: 'md' as const, icon: RoundedBorderIcon, label: 'Medio' },
        { value: 'lg' as const, icon: RoundedBorderIcon, label: 'Grande' }
    ];

    const gradientPositionOptions = [
        { value: 'bottom' as const, icon: ArrowDown, label: 'Abajo' },
        { value: 'top' as const, icon: ArrowUp, label: 'Arriba' },
        { value: 'left' as const, icon: ArrowLeft, label: 'Izquierda' },
        { value: 'right' as const, icon: ArrowRight, label: 'Derecha' }
    ];

    const tabs = [
        { id: 'informacion', label: 'Información' },
        { id: 'apariencia', label: 'Apariencia' },
        { id: 'fondo', label: 'Fondo' }
    ] as const;

    return (
        <ZenCard padding="none">
            <ZenCardContent className="space-y-4 px-4!">
                {/* Tabs Navigation */}
                <div className="bg-zinc-800/50 p-1 rounded-lg flex gap-1 mt-3 mb-3 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "shrink-0 py-2 px-4 font-medium text-sm transition-all duration-200 rounded text-center whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-zinc-900 text-emerald-400 shadow-lg"
                                    : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
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
                                placeholder="Título de tu portafolio"
                            />

                            {/* Mostrar tipo de evento (NO editable) */}
                            {eventTypeName && (
                                <div>
                                    <label className="block text-sm font-medium text-zinc-200 mb-2">
                                        Categoría
                                    </label>
                                    <div className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300">
                                        {eventTypeName}
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        La categoría se define en la configuración del portafolio
                                    </p>
                                </div>
                            )}

                            <ZenTextarea
                                label="Descripción"
                                value={localConfig.description || ''}
                                onChange={(e) => handleDescriptionChange(e.target.value)}
                                placeholder="Descripción breve de tu portafolio"
                                maxLength={100}
                                minRows={3}
                            />
                        </div>
                    )}

                    {/* Pestaña: Apariencia */}
                    {activeTab === 'apariencia' && (
                        <div className="space-y-4">
                            {/* Aspecto */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-200 mb-2">
                                    Aspecto
                                </label>
                                <div className="flex gap-1">
                                    {aspectRatioOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isActive = option.value === 'original'
                                            ? !localConfig.aspectRatio
                                            : localConfig.aspectRatio === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    if (option.value === 'original') {
                                                        updateConfig({ aspectRatio: undefined });
                                                    } else {
                                                        updateConfig({ aspectRatio: option.value });
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
                                {!localConfig.aspectRatio && (
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Usando aspecto original del archivo (alto automático)
                                    </p>
                                )}
                            </div>

                            {/* Estilo de Contenedor */}
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

                            {/* Alineación Vertical */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-200 mb-2">
                                    Alineación Vertical
                                </label>
                                <div className="flex gap-1">
                                    {verticalAlignmentOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isActive = localConfig.verticalAlignment === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => updateConfig({ verticalAlignment: option.value })}
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

                            {/* Alineación Horizontal */}
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
                                                onClick={() => updateConfig({ textAlignment: option.value })}
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

                            {/* Configuraciones adicionales solo para wrapped */}
                            {localConfig.containerStyle === 'wrapped' && (
                                <>
                                    {/* Apariencia de las esquinas */}
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

                                </>
                            )}
                        </div>
                    )}

                    {/* Pestaña: Fondo */}
                    {activeTab === 'fondo' && (
                        <div className="space-y-4">
                            <HeroDropzone
                                media={media}
                                backgroundType={localConfig.backgroundType || 'image'}
                                onBackgroundTypeChange={(type) => updateConfig({ backgroundType: type })}
                                onMediaChange={onMediaChange}
                                onDropFiles={onDropFiles}
                                onRemoveMedia={handleRemoveMedia}
                                isUploading={isUploading}
                            />

                            {/* Degradado de contraste */}
                            <div className="p-3 border border-zinc-700 rounded-lg bg-zinc-800/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-zinc-200">Degradado de Contraste</span>
                                    <ZenSwitch
                                        checked={localConfig.gradientOverlay ?? false}
                                        onCheckedChange={(checked) => updateConfig({ gradientOverlay: checked })}
                                    />
                                </div>
                                {localConfig.gradientOverlay && (
                                    <>
                                        <div className="border-t border-zinc-700/50"></div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {gradientPositionOptions.map((option) => {
                                                const Icon = option.icon;
                                                const isActive = (localConfig.gradientPosition || 'bottom') === option.value;
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
                                    </>
                                )}
                            </div>

                            {/* Efecto parallax - Solo mostrar si no es video */}
                            {media[0]?.file_type !== 'video' && (
                                <div className="p-3 border border-zinc-700 rounded-lg bg-zinc-800/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-zinc-200">Efecto Parallax</span>
                                            <span className="text-xs text-zinc-500 mt-0.5">El fondo se mueve más lento que el contenido</span>
                                        </div>
                                        <ZenSwitch
                                            checked={localConfig.parallax ?? false}
                                            onCheckedChange={(checked) => updateConfig({ parallax: checked })}
                                        />
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
