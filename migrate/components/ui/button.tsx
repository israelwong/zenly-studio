
// components/ui/button.tsx (o tu ruta de componentes UI)
import React from 'react';
import { Slot } from '@radix-ui/react-slot'; // Necesario para 'asChild'

// Definir variantes de estilo (puedes añadir más)
const buttonVariants = {
    variant: {
        default: "bg-sky-600 text-sky-50 hover:bg-sky-700/90",
        destructive: "bg-red-600 text-red-50 hover:bg-red-700/90",
        destructiveOutline: "border border-red-600 text-red-50 hover:bg-red-700/90",
        outline: "border border-zinc-700 bg-transparent hover:bg-zinc-800 hover:text-zinc-100",
        secondary: "bg-zinc-700 text-zinc-100 hover:bg-zinc-600/80",
        ghost: "hover:bg-zinc-700 hover:text-zinc-100",
        link: "text-sky-400 underline-offset-4 hover:underline",
        green: "bg-green-600 text-green-50 hover:bg-green-700/90",
        warning: "bg-yellow-500 text-yellow-50 hover:bg-yellow-600/90",
    },
    size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof buttonVariants.variant;
    size?: keyof typeof buttonVariants.size;
    asChild?: boolean; // Para usar con <Slot>
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        { className, variant = "default", size = "default", asChild = false, ...props },
        ref
    ) => {
        const Comp = asChild ? Slot : "button";
        // Clases base y combinación con variantes
        const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
        const variantClasses = buttonVariants.variant[variant];
        const sizeClasses = buttonVariants.size[size];

        return (
            <Comp
                className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className || ''}`}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };

