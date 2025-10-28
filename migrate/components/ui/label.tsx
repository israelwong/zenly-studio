// app/components/ui/label.tsx
'use client';

import * as React from 'react';
// Importamos directamente el componente Root de Radix Label
import { Root as RadixLabelRoot } from '@radix-ui/react-label';

// Usamos directamente las props del componente Root de Radix

const Label = React.forwardRef<
    React.ElementRef<typeof RadixLabelRoot>,
    React.ComponentPropsWithoutRef<typeof RadixLabelRoot>
>(({ className, ...props }, ref) => {
    // Estilos base según tu guía de estilos y buenas prácticas de accesibilidad
    // Guía: "block mb-1 text-sm font-medium text-zinc-300"
    // Dejaremos el 'mb-1' para que se aplique en el lugar de uso para mayor flexibilidad de layout.
    const baseClasses = "block text-sm font-medium text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

    return (
        <RadixLabelRoot
            ref={ref}
            // Combinamos clases base con las que se pasen a través de la prop className
            className={`${baseClasses} ${className || ''}`.trim()}
            {...props}
        />
    );
});
Label.displayName = "Label"; // O podrías usar RadixLabelRoot.displayName si lo prefieres

export { Label };