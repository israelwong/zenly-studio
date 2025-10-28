// app/components/ui/card.tsx
import React from 'react';

// --- Card Root ---
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    // Estilos base según tu guía de estilos para tarjetas
    // Guía: "div bg-zinc-800 border border-zinc-700 rounded-lg shadow-md overflow-hidden"
    const baseClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md overflow-hidden";
    return (
      <div
        ref={ref}
        className={`${baseClasses} ${className || ''}`.trim()}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

// --- Card Header ---
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    // Guía: "px-4 py-3 border-b border-zinc-700 flex justify-between items-center"
    // Haremos el flex y justify/items opcional para más flexibilidad, aplicando solo padding y borde.
    const baseClasses = "px-4 py-3 border-b border-zinc-700";
    return (
      <div
        ref={ref}
        className={`${baseClasses} ${className || ''}`.trim()}
        {...props}
      />
    );
  }
);
CardHeader.displayName = "CardHeader";

// --- Card Title ---
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    // Guía: "text-lg font-semibold text-zinc-100" o "text-base font-medium text-zinc-200"
    // Usaremos el más prominente como base.
    const baseClasses = "text-lg font-semibold leading-none tracking-tight text-zinc-100";
    return (
      // Usualmente un h3 o h4 dentro de un CardHeader
      <h3
        ref={ref}
        className={`${baseClasses} ${className || ''}`.trim()}
        {...props}
      >
        {children}
      </h3>
    );
  }
);
CardTitle.displayName = "CardTitle";

// --- Card Description ---
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    // Un estilo común para descripciones, usando colores de tu guía
    // Guía: text-zinc-300 o text-zinc-400. Usaremos text-zinc-400 para descripciones.
    const baseClasses = "text-sm text-zinc-400";
    return (
      <p
        ref={ref}
        className={`${baseClasses} ${className || ''}`.trim()}
        {...props}
      />
    );
  }
);
CardDescription.displayName = "CardDescription";

// --- Card Content ---
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    // Guía: "p-4" o "p-6". Usaremos p-4 como base.
    const baseClasses = "p-4";
    return (
      <div
        ref={ref}
        className={`${baseClasses} ${className || ''}`.trim()}
        {...props}
      />
    );
  }
);
CardContent.displayName = "CardContent";

// --- Card Footer ---
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    // Guía: "px-4 py-3 bg-zinc-800/50 border-t border-zinc-700 flex justify-end items-center gap-3"
    // Haremos el flex y justify/items opcional, aplicando solo padding y borde.
    const baseClasses = "px-4 py-3 border-t border-zinc-700";
    return (
      <div
        ref={ref}
        className={`${baseClasses} ${className || ''}`.trim()}
        {...props}
      />
    );
  }
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
