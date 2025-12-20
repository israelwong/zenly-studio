'use client';

import React from 'react';
import { MobilePreviewContainer } from './MobilePreviewContainer';
// ProfileNavigation and ProfileContent are now handled by MobilePreviewContainer

interface SectionPreviewProps {
    section: string;
    studioSlug: string;
    data?: Record<string, unknown>;
    loading?: boolean;
    faqViewMode?: 'compact' | 'expanded';
    activeIdentityTab?: 'brand' | 'social' | 'contact' | 'zones';
    ownerId?: string | null;
}

// Componente IdentidadPreview integrado con tabs
function IdentidadPreview({ data, loading = false, activeTab = 'brand', studioSlug }: { data?: Record<string, unknown>; loading?: boolean; activeTab?: 'brand' | 'social' | 'contact' | 'zones'; studioSlug?: string }) {
    // Renderizar diferentes previews según el tab activo
    switch (activeTab) {
        case 'brand':
            return (
                <MobilePreviewContainer
                    data={data}
                    loading={loading}
                    showHeader={true}
                    showNavbar={true}
                    showContent={true}
                    activeTab="inicio"
                    contentVariant="info"
                    studioSlug={studioSlug}
                />
            );
        case 'social':
            return (
                <MobilePreviewContainer
                    data={data}
                    loading={loading}
                    showHeader={true}
                    showNavbar={true}
                    showContent={true}
                    activeTab="contacto"
                    contentVariant="info"
                    studioSlug={studioSlug}
                />
            );
        case 'contact':
            return (
                <MobilePreviewContainer
                    data={data}
                    loading={loading}
                    showHeader={true}
                    showNavbar={true}
                    showContent={true}
                    activeTab="contacto"
                    contentVariant="info"
                    studioSlug={studioSlug}
                />
            );
        case 'zones':
            return (
                <MobilePreviewContainer
                    data={data}
                    loading={loading}
                    showHeader={true}
                    showNavbar={true}
                    showContent={true}
                    activeTab="contacto"
                    contentVariant="info"
                    studioSlug={studioSlug}
                />
            );
        default:
            return (
                <MobilePreviewContainer
                    data={data}
                    loading={loading}
                    showHeader={true}
                    showNavbar={false}
                    showContent={true}
                    contentVariant="skeleton"
                    studioSlug={studioSlug}
                />
            );
    }
}

// Componente ContactoPreview integrado
function ContactoPreview({ data, loading = false }: { data?: Record<string, unknown>; loading?: boolean }) {
    return (
        <MobilePreviewContainer
            data={data}
            loading={loading}
            showNavbar={true}
            showContent={true}
            activeTab="contacto"
            contentVariant="info"
        />
    );
}

// Componente PortafolioPreview integrado
function PortafolioPreview({ data, loading = false }: { data?: Record<string, unknown>; loading?: boolean }) {
    return (
        <MobilePreviewContainer
            data={data}
            loading={loading}
            showNavbar={true}
            showContent={true}
            activeTab="portafolio"
            contentVariant="portfolio"
        />
    );
}

// Componente PaquetesPreview integrado
function PaquetesPreview({ data, loading = false }: { data?: Record<string, unknown>; loading?: boolean }) {
    return (
        <MobilePreviewContainer
            data={data}
            loading={loading}
            showNavbar={true}
            showContent={true}
            activeTab="paquetes"
            contentVariant="paquetes"
        />
    );
}

// Componente InicioPreview integrado
function InicioPreview({ data, loading = false }: { data?: Record<string, unknown>; loading?: boolean }) {
    return (
        <MobilePreviewContainer
            data={data}
            loading={loading}
            showNavbar={true}
            showContent={true}
            activeTab="inicio"
            contentVariant="posts"
        />
    );
}

// Componente PostsPreview integrado
function PostsPreview({ data, loading = false }: { data?: Record<string, unknown>; loading?: boolean }) {
    return (
        <MobilePreviewContainer
            data={data}
            loading={loading}
            showNavbar={true}
            showContent={true}
            activeTab="inicio"
            contentVariant="posts"
        />
    );
}

// Componente FAQPreview integrado
function FAQPreview({ data, loading = false, faqViewMode = 'expanded', studioSlug, ownerId }: { data?: Record<string, unknown>; loading?: boolean; faqViewMode?: 'compact' | 'expanded'; studioSlug?: string; ownerId?: string | null }) {
    return (
        <MobilePreviewContainer
            data={data}
            loading={loading}
            showNavbar={true}
            showContent={true}
            activeTab="faq"
            contentVariant="faq"
            faqViewMode={faqViewMode}
            studioSlug={studioSlug}
            ownerId={ownerId}
        />
    );
}

export function SectionPreview({ section, studioSlug, data, loading = false, faqViewMode, activeIdentityTab, ownerId }: SectionPreviewProps) {
    // studioSlug is available for future use if needed
    console.log('SectionPreview for studio:', studioSlug);

    switch (section) {
        case 'identidad':
        case 'identity':
            return <IdentidadPreview data={data} loading={loading} activeTab={activeIdentityTab} studioSlug={studioSlug} />;
        case 'inicio':
            return <InicioPreview data={data} loading={loading} />;
        case 'posts':
            return <PostsPreview data={data} loading={loading} />;
        case 'contacto':
            return <ContactoPreview data={data} loading={loading} />;
        case 'portafolio':
        case 'portfolios': // Soporte para ambos nombres
            return <PortafolioPreview data={data} loading={loading} />;
        case 'paquetes':
            return <PaquetesPreview data={data} loading={loading} />;
        case 'faq':
            return <FAQPreview data={data} loading={loading} faqViewMode={faqViewMode} studioSlug={studioSlug} ownerId={ownerId} />;
        default:
            return <div className="w-full max-w-sm mx-auto p-4 text-center text-zinc-500">
                <p>Preview no disponible para la sección: {section}</p>
            </div>;
    }
}