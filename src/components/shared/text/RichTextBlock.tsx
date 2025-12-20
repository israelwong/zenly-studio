'use client';

import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, Heading1, Heading3, Type, Quote, Plus, Minus, Bold, Italic } from 'lucide-react';
import { TextBlockConfig, TextAlignment } from '@/types/content-blocks';

interface RichTextBlockProps {
    config: Partial<TextBlockConfig>;
    onConfigChange: (config: Partial<TextBlockConfig>) => void;
    placeholder?: string;
    className?: string;
}

type TextType = 'heading-1' | 'heading-3' | 'text' | 'blockquote';
type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';

export function RichTextBlock({
    config,
    onConfigChange,
    placeholder = 'Escribe tu texto aquí...',
    className = ''
}: RichTextBlockProps) {
    // Valores por defecto
    const textType = (config.textType as TextType) || 'text';
    const alignment = (config.alignment as TextAlignment) || 'left';
    const fontSize = (config.fontSize as FontSize) || 'base';
    const fontWeight = config.fontWeight || 'normal';
    const italic = config.italic || false;
    const text = config.text || '';

    // Tamaños de fuente disponibles
    const fontSizeOptions: { value: FontSize; label: string }[] = [
        { value: 'sm', label: 'Pequeño' },
        { value: 'base', label: 'A' },
        { value: 'lg', label: 'Grande' },
        { value: 'xl', label: 'Extra Grande' },
        { value: '2xl', label: 'Muy Grande' },
    ];

    // Mapeo de tamaños a clases Tailwind
    const fontSizeClasses = {
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
        '2xl': 'text-2xl',
    };

    // Mapeo de tipos de texto a clases Tailwind
    const textTypeClasses = {
        'heading-1': 'text-2xl font-bold',
        'heading-3': 'text-xl font-semibold',
        'text': fontSizeClasses[fontSize],
        'blockquote': 'text-md italic border-l-4 border-zinc-800 pl-4 py-1',
    };

    // Mapeo de alineación
    const alignmentClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    const handleConfigUpdate = (updates: Partial<TextBlockConfig>) => {
        onConfigChange({
            ...config,
            ...updates,
        });
    };

    const handleTextTypeChange = (newType: TextType) => {
        // Si cambia a blockquote, mantener italic
        // Si cambia a heading-1 o heading-3, resetear a valores por defecto
        const updates: Partial<TextBlockConfig> = {
            textType: newType,
        };

        if (newType === 'heading-1') {
            updates.fontSize = '2xl';
            updates.fontWeight = 'bold';
            updates.italic = false;
        } else if (newType === 'heading-3') {
            updates.fontSize = 'xl';
            updates.fontWeight = 'semibold';
            updates.italic = false;
        } else if (newType === 'blockquote') {
            updates.fontSize = 'base';
            updates.italic = true;
        } else {
            // text
            updates.fontSize = fontSize;
        }

        handleConfigUpdate(updates);
    };

    const handleFontSizeChange = (direction: 'increase' | 'decrease') => {
        const currentIndex = fontSizeOptions.findIndex(f => f.value === fontSize);
        let newIndex: number;

        if (direction === 'increase') {
            newIndex = Math.min(currentIndex + 1, fontSizeOptions.length - 1);
        } else {
            newIndex = Math.max(currentIndex - 1, 0);
        }

        handleConfigUpdate({
            fontSize: fontSizeOptions[newIndex].value,
        });
    };

    const handleFontWeightToggle = () => {
        handleConfigUpdate({
            fontWeight: fontWeight === 'bold' ? 'normal' : 'bold',
        });
    };

    const handleItalicToggle = () => {
        handleConfigUpdate({
            italic: !italic,
        });
    };

    const handleAlignmentChange = (newAlignment: TextAlignment) => {
        handleConfigUpdate({
            alignment: newAlignment,
        });
    };

    // Determinar si usar textarea o input según el tipo
    const isMultiline = textType === 'text' || textType === 'blockquote';
    const InputComponent = isMultiline ? 'textarea' : 'input';

    // Mostrar controles de tamaño y formato solo para 'text' y 'blockquote'
    const showSizeAndFormatControls = textType === 'text' || textType === 'blockquote';

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
                {/* Tipo de texto */}
                <div className={`flex items-center gap-1 ${showSizeAndFormatControls ? 'border-r border-zinc-700 pr-2' : ''}`}>
                    <button
                        type="button"
                        data-internal-button="true"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onClick={() => handleTextTypeChange('heading-1')}
                        className={`p-1.5 rounded transition-colors ${textType === 'heading-1'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        title="Título (H1)"
                    >
                        <Heading1 className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        data-internal-button="true"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onClick={() => handleTextTypeChange('heading-3')}
                        className={`p-1.5 rounded transition-colors ${textType === 'heading-3'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        title="Subtítulo (H3)"
                    >
                        <Heading3 className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        data-internal-button="true"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onClick={() => handleTextTypeChange('text')}
                        className={`p-1.5 rounded transition-colors ${textType === 'text'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        title="Párrafo"
                    >
                        <Type className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        data-internal-button="true"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onClick={() => handleTextTypeChange('blockquote')}
                        className={`p-1.5 rounded transition-colors ${textType === 'blockquote'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        title="Cita"
                    >
                        <Quote className="h-4 w-4" />
                    </button>
                </div>

                {/* Tamaño de fuente - Solo para 'text' y 'blockquote' */}
                {showSizeAndFormatControls && (
                    <div className="flex items-center gap-0.5 border-r border-zinc-700 pr-2">
                        <button
                            type="button"
                            data-internal-button="true"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onClick={() => handleFontSizeChange('decrease')}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                            title="Reducir tamaño"
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs text-zinc-500 px-0.5 min-w-[1.25rem] text-center">
                            {fontSizeOptions.find(f => f.value === fontSize)?.label || 'A'}
                        </span>
                        <button
                            type="button"
                            data-internal-button="true"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onClick={() => handleFontSizeChange('increase')}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                            title="Aumentar tamaño"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Bold e Italic - Solo para 'text' y 'blockquote' */}
                {showSizeAndFormatControls && (
                    <div className="flex items-center gap-1 flex-shrink-0 border-r border-zinc-700 pr-2">
                        <button
                            type="button"
                            data-internal-button="true"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onClick={handleFontWeightToggle}
                            className={`p-1.5 rounded transition-colors flex-shrink-0 ${fontWeight === 'bold'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                                }`}
                            title="Negrita"
                        >
                            <Bold className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            data-internal-button="true"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                            }}
                            onClick={handleItalicToggle}
                            className={`p-1.5 rounded transition-colors flex-shrink-0 ${italic
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                                }`}
                            title="Cursiva"
                        >
                            <Italic className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Alineación */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        data-internal-button="true"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onClick={() => handleAlignmentChange('left')}
                        className={`p-1.5 rounded transition-colors flex-shrink-0 ${alignment === 'left'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        title="Alinear izquierda"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        data-internal-button="true"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onClick={() => handleAlignmentChange('center')}
                        className={`p-1.5 rounded transition-colors flex-shrink-0 ${alignment === 'center'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        title="Alinear centro"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        data-internal-button="true"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        onClick={() => handleAlignmentChange('right')}
                        className={`p-1.5 rounded transition-colors flex-shrink-0 ${alignment === 'right'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        title="Alinear derecha"
                    >
                        <AlignRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Input/Textarea */}
            <InputComponent
                value={text}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    handleConfigUpdate({ text: e.target.value });
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                }}
                placeholder={placeholder}
                className={`w-full p-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none ${textTypeClasses[textType]} ${alignmentClasses[alignment]} ${fontWeight === 'bold' ? 'font-bold' : fontWeight === 'semibold' ? 'font-semibold' : 'font-normal'} ${italic ? 'italic' : ''} ${textType === 'blockquote' ? 'text-zinc-400' : ''}`}
                rows={isMultiline ? 4 : undefined}
            />
        </div>
    );
}

