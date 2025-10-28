// components/ui/textarea.tsx (o tu ruta de componentes UI)
import * as React from "react";

// Helper para combinar clases (si no usas cn, puedes usar template literals)
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, ...props }, ref) => {
        // Clases base de Tailwind para el textarea
        const baseClasses =
            "flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50";

        return (
            <textarea
                // Combina clases base con las pasadas a través de className
                className={cn(baseClasses, className)}
                ref={ref}
                {...props}
            />
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea };

