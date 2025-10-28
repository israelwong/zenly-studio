// components/ui/badge.tsx (o tu ruta de componentes UI)
import React from 'react';

// Definir variantes (puedes añadir más)
const badgeVariants = {
    variant: {
        default: "border-transparent bg-zinc-700 text-zinc-100 hover:bg-zinc-700/80",
        secondary: "border-transparent bg-zinc-600 text-zinc-300 hover:bg-zinc-600/80",
        destructive: "border-transparent bg-red-600 text-red-50 hover:bg-red-600/80",
        outline: "text-zinc-100 border-zinc-600",
        warning: "border-transparent bg-yellow-500 text-yellow-900 hover:bg-yellow-500/80",
        success: "border-transparent bg-green-600 text-green-50 hover:bg-green-600/80",
    },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: keyof typeof badgeVariants.variant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
    const variantClasses = badgeVariants.variant[variant];

    return (
        <div
            className={`${baseClasses} ${variantClasses} ${className || ''}`}
            {...props}
        />
    );
}

export { Badge };

