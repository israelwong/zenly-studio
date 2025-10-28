// components/ui/multi-select.tsx (o tu ruta de componentes UI)
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

// Importar primitivas de Radix UI
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

// Importar otros componentes UI si los usas (Button, Badge)
import { Button } from "./button";
// import { Badge } from "@/components/ui/badge"; // Ya no se usa en el trigger

// Helper para combinar clases
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// --- Tipo para las opciones ---
export type MultiSelectOption = {
    value: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    color?: string;
};

// --- Props del componente ---
interface MultiSelectProps {
    options: MultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    maxHeight?: string;
}

function MultiSelect({
    options,
    selected,
    onChange,
    className,
    placeholder = "Seleccionar...",
    disabled,
    maxHeight = "300px",
    ...props
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    // --- Clases de Tailwind (sin cambios) ---
    const triggerClasses = cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
        className
    );
    const contentClasses = cn(
        "w-[var(--radix-popover-trigger-width)] z-50 overflow-hidden rounded-md border border-zinc-700 bg-zinc-800 text-zinc-100 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 p-1"
    );
    const itemClasses = cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-zinc-700 focus:text-zinc-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    );
    const checkboxRootClasses = cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-zinc-500 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-sky-600 data-[state=checked]:text-sky-50"
    );
    const checkboxIndicatorClasses = cn("flex items-center justify-center text-current");
    // const selectedBadgeClasses = "mr-1 mb-1"; // Ya no se usa

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger asChild disabled={disabled}>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={`${triggerClasses} justify-between hover:bg-zinc-800`}
                    {...props}
                >
                    {/* --- Trigger Simplificado --- */}
                    <div className="flex-1 text-left truncate"> {/* Contenedor para el texto */}
                        {selected.length > 0 ? (
                            // Mostrar conteo o un texto genérico
                            <span className="text-zinc-100">{`${selected.length} seleccionada(s)`}</span>
                        ) : (
                            // Mostrar placeholder
                            <span className="text-zinc-500">{placeholder}</span>
                        )}
                    </div>
                    {/* --- Fin Trigger Simplificado --- */}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Content
                className={contentClasses}
                style={{ maxHeight: maxHeight }}
                align="start"
            >
                <div className="overflow-y-auto pr-1" style={{ maxHeight: `calc(${maxHeight} - 0.5rem)` }}>
                    {options.length > 0 ? (
                        options.map((option) => {
                            const isSelected = selected.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    className={itemClasses}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                        <CheckboxPrimitive.Root
                                            checked={isSelected}
                                            className={checkboxRootClasses}
                                            aria-label={`Seleccionar ${option.label}`}
                                            tabIndex={-1}
                                        >
                                            <CheckboxPrimitive.Indicator className={checkboxIndicatorClasses}>
                                                <Check className="h-4 w-4" />
                                            </CheckboxPrimitive.Indicator>
                                        </CheckboxPrimitive.Root>
                                    </span>
                                    {option.color && (
                                        <span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: option.color }}></span>
                                    )}
                                    {option.label}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-2 text-center text-sm text-zinc-400">
                            No hay opciones disponibles.
                        </div>
                    )}
                </div>
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Root>
    );
}

export { MultiSelect };
