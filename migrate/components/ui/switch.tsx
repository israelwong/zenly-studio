// app/components/ui/switch.tsx
'use client';

import * as React from 'react';
// Importamos Root y Thumb directamente de Radix Switch
import { Root as RadixSwitchRoot, Thumb as RadixSwitchThumb } from '@radix-ui/react-switch';

const Switch = React.forwardRef<
    React.ElementRef<typeof RadixSwitchRoot>,
    React.ComponentPropsWithoutRef<typeof RadixSwitchRoot>
>(({ className, ...props }, ref) => {
    // Clases base para el contenedor del Switch (Root)
    const rootBaseClasses = [
        'peer',
        'inline-flex',
        'h-[24px]',       // Altura total
        'w-[44px]',       // Ancho total
        'shrink-0',
        'cursor-pointer',
        'items-center',
        'rounded-full',
        'border-2',
        'border-transparent',
        'transition-colors',
        // Estilos de focus según tu guía (Paleta Zinc para offset, Azul para el anillo)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 focus-visible:ring-blue-500',
        // Estado deshabilitado
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Colores de fondo según estado (Guía: Azul para checked, un Zinc para unchecked)
        'data-[state=checked]:bg-blue-600',
        'data-[state=unchecked]:bg-zinc-700', // Un gris oscuro que contraste con el fondo de página (zinc-900)
    ].join(' ');

    // Clases base para el círculo deslizable (Thumb)
    const thumbBaseClasses = [
        'pointer-events-none',
        'block',
        'h-5 w-5',         // Tamaño del círculo (ligeramente menor que la altura del Root)
        'rounded-full',
        'bg-white',        // El círculo es blanco, contrasta bien
        'shadow-lg',
        'ring-0',
        'transition-transform',
        'data-[state=checked]:translate-x-5',   // Posición cuando está activado (movido a la derecha)
        'data-[state=unchecked]:translate-x-0', // Posición cuando está desactivado
    ].join(' ');

    return (
        <RadixSwitchRoot
            className={`${rootBaseClasses} ${className || ''}`.trim()}
            {...props}
            ref={ref}
        >
            <RadixSwitchThumb className={thumbBaseClasses} />
        </RadixSwitchRoot>
    );
});
Switch.displayName = "Switch"; // O RadixSwitchRoot.displayName

export { Switch };