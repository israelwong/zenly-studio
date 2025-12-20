'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface BreadcrumbItem {
    label: string;
    href?: string;
    active: boolean;
}

interface BreadcrumbHeaderProps {
    className?: string;
    studioSlug: string; // Recibe el slug como prop
}

export function BreadcrumbHeader({ className, studioSlug }: BreadcrumbHeaderProps) {
    const pathname = usePathname();
    // Se elimina el uso de useParams

    // Función para generar breadcrumb basado en la ruta
    const generateBreadcrumb = (): BreadcrumbItem[] => {
        const segments = pathname.split('/').filter(Boolean);
        const breadcrumb: BreadcrumbItem[] = [];

        // Rutas contenedoras que no tienen page.tsx (solo agrupan subsecciones)
        const CONTAINER_ROUTES = ['commercial', 'business', 'content', 'account', 'profile', 'dashboard', 'configuracion', 'paquetes'];

        // Función para detectar si un segmento es un ID (CUID típicamente ~25 caracteres alfanuméricos)
        const isId = (segment: string): boolean => {
            // CUIDs típicamente tienen 25 caracteres, alfanuméricos
            // También detectamos UUIDs (36 caracteres con guiones)
            const cuidPattern = /^[a-z0-9]{20,30}$/i; // 20-30 caracteres alfanuméricos
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            return cuidPattern.test(segment) || uuidPattern.test(segment);
        };

        // Función para truncar IDs
        const truncateId = (id: string, maxLength: number = 5): string => {
            if (id.length <= maxLength) return id;
            return `${id.substring(0, maxLength)}...`;
        };

        // Función para formatear segmentos automáticamente
        const formatSegment = (segment: string): string => {
            // Si es un ID, truncarlo
            if (isId(segment)) {
                return truncateId(segment);
            }

            // Palabras que deben permanecer en minúsculas (excepto la primera)
            const lowercaseWords = ['de', 'y', 'en', 'con', 'para', 'por', 'del', 'la', 'el', 'los', 'las'];

            return segment
                .split('-')
                .map((word, index) => {
                    const lowerWord = word.toLowerCase();

                    // Si es la primera palabra o no está en la lista de minúsculas, capitalizar
                    if (index === 0 || !lowercaseWords.includes(lowerWord)) {
                        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                    }

                    // Mantener en minúsculas las palabras especiales
                    return lowerWord;
                })
                .join(' ');
        };

        // Encontrar el índice de 'studio' para empezar a construir el breadcrumb
        const studioIndex = segments.findIndex(seg => seg === 'studio');

        // Si encontramos 'studio', procesar desde ahí
        if (studioIndex !== -1) {
            // Procesar segmentos después de "studio"
            for (let i = studioIndex + 1; i < segments.length; i++) {
                const segment = segments[i];
                const label = formatSegment(segment);
                const isLast = i === segments.length - 1;
                const isContainerRoute = CONTAINER_ROUTES.includes(segment);

                // Construir el href acumulativo
                const currentHrefSegments = segments.slice(0, i + 1);
                const currentHref = `/${currentHrefSegments.join('/')}`;

                // Si es una ruta contenedora y no es el último segmento, omitir href
                if (isContainerRoute && !isLast) {
                    breadcrumb.push({
                        label,
                        active: false
                    });
                } else {
                    breadcrumb.push({
                        label,
                        href: currentHref,
                        active: isLast
                    });
                }
            }
        } else {
            // Si no encontramos 'studio', solo mostrar el segmento actual si existe
            if (segments.length > 0) {
                const lastSegment = segments[segments.length - 1];
                const label = formatSegment(lastSegment);
                breadcrumb.push({ label, active: true });
            }
        }

        return breadcrumb;
    };

    const breadcrumbItems = generateBreadcrumb();

    return (
        <div className={`flex items-center gap-4 ${className}`}>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
                {breadcrumbItems.map((item, index) => (
                    <React.Fragment key={`${index}-${item.href || item.label}`}>
                        {item.href && !item.active ? (
                            <Link href={item.href} className="hover:text-zinc-200 transition-colors">
                                {item.label}
                            </Link>
                        ) : (
                            <span className={item.active ? "text-white" : ""}>
                                {item.label}
                            </span>
                        )}
                        {index < breadcrumbItems.length - 1 && (
                            <span>/</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
