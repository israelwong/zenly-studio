// components/ui/input.tsx (o tu ruta de componentes UI)
import React from 'react';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => {
        // Clases base de Tailwind para el input
        const baseClasses = "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-base sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50";

        return (
            <input
                type={type}
                // Combina clases base con las pasadas a través de className
                className={`${baseClasses} ${className || ''}`}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
