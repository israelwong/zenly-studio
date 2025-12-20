'use client';

import React from 'react';
import Link, { LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { ZenSidebarMenuButton } from '@/components/ui/zen';

type ActiveLinkProps = LinkProps & {
    children: React.ReactNode;
    className?: string;
    exact?: boolean; // Si es true, solo activa con coincidencia exacta
};

export function ActiveLink({ children, href, exact = false, ...props }: ActiveLinkProps) {
    const pathname = usePathname();
    const hrefString = href as string;
    
    // Coincidencia exacta si exact es true, sino startsWith
    const isActive = exact 
        ? pathname === hrefString || pathname === `${hrefString}/`
        : pathname.startsWith(hrefString);

    return (
        <ZenSidebarMenuButton asChild isActive={isActive}>
            <Link href={href} {...props}>
                <div className="flex items-center gap-3">
                    {children}
                </div>
            </Link>
        </ZenSidebarMenuButton>
    );
}
