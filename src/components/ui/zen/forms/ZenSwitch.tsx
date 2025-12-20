'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface ZenSwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
    className?: string;
    id?: string;
    variant?: "default" | "amber" | "green"; // Variante de color cuando está activo
}

/**
 * ZenSwitch - Switch component con tema ZEN
 * 
 * Características:
 * - Tema oscuro consistente
 * - Estados de hover y focus
 * - Accesibilidad completa
 * - Label y descripción opcionales
 * - Animaciones suaves
 */
export function ZenSwitch({
    checked,
    onCheckedChange,
    disabled = false,
    label,
    description,
    className,
    id,
    variant = "default"
}: ZenSwitchProps) {
    const generatedId = useId();
    const switchId = id || `switch-${generatedId}`;

    const checkedColor = variant === "amber" ? "bg-amber-500" :
        variant === "green" ? "bg-green-600" : "bg-blue-600";
    const focusRingColor = variant === "amber" ? "focus:ring-amber-500" :
        variant === "green" ? "focus:ring-green-500" : "focus:ring-blue-500";

    return (
        <div className={cn("flex items-start space-x-3", className)}>
            {/* Switch */}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-labelledby={label ? `${switchId}-label` : undefined}
                aria-describedby={description ? `${switchId}-description` : undefined}
                disabled={disabled}
                onClick={() => onCheckedChange(!checked)}
                className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    `focus:outline-none focus:ring-2 ${focusRingColor} focus:ring-offset-2 focus:ring-offset-zinc-900`,
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    checked
                        ? checkedColor
                        : "bg-zinc-600",
                    !disabled && "hover:bg-opacity-80"
                )}
            >
                <span
                    className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        checked ? "translate-x-6" : "translate-x-1"
                    )}
                />
            </button>

            {/* Label y descripción */}
            {(label || description) && (
                <div className="flex-1">
                    {label && (
                        <label
                            id={`${switchId}-label`}
                            htmlFor={switchId}
                            className={cn(
                                "text-sm font-medium cursor-pointer",
                                disabled ? "text-zinc-500" : "text-zinc-300"
                            )}
                        >
                            {label}
                        </label>
                    )}
                    {description && (
                        <p
                            id={`${switchId}-description`}
                            className={cn(
                                "text-xs mt-1",
                                disabled ? "text-zinc-600" : "text-zinc-400"
                            )}
                        >
                            {description}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
