'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ZenSelectOption {
    value: string;
    label?: string;
}

export interface ZenSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    options: readonly ZenSelectOption[] | ZenSelectOption[];
    label?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    disableSearch?: boolean;
    className?: string;
    required?: boolean;
}

export function ZenSelect({
    value,
    onValueChange,
    options,
    label,
    placeholder = "Selecciona una opción",
    error,
    disabled = false,
    disableSearch = false,
    className,
    required = false
}: ZenSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    const filteredOptions = disableSearch
        ? [...options]
        : [...options].filter(option =>
            option.label?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const selectedOption = options.find(option => option.value === value);

    const handleSelect = (optionValue: string) => {
        onValueChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    // Cerrar al hacer click fuera
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative space-y-2" ref={containerRef}>
            {label && (
                <label className="text-sm font-medium text-zinc-300 block flex items-center gap-1">
                    {label}
                    {required && (
                        <span className="text-red-400">*</span>
                    )}
                </label>
            )}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "flex w-full items-center justify-between rounded-md border border-zinc-600 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
                    error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                    className
                )}
            >
                <span className={selectedOption ? "text-white" : "text-zinc-400"}>
                    {selectedOption ? (selectedOption.label || selectedOption.value) : placeholder}
                </span>
                <ChevronDown className={cn(
                    "h-4 w-4 text-zinc-400 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <div className="absolute z-[9999] mt-1 w-full rounded-md border border-zinc-600 bg-zinc-900 shadow-lg">
                    {!disableSearch && (
                        <div className="p-2">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        "flex w-full items-center px-3 py-2 text-left text-sm text-white hover:bg-zinc-800",
                                        value === option.value && "bg-blue-600/20 text-blue-400"
                                    )}
                                >
                                    {option.label || option.value}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-zinc-400">
                                No se encontraron opciones
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1 text-xs text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}
