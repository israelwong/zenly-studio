"use client";

import React from 'react';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import { PlatformLogo } from './PlatformLogo';
import { ContactInfo } from './ContactInfo';
import { SocialMediaLinks } from './SocialMediaLinks';
import { BRANDING } from '@/config/branding';

interface PlatformFooterProps {
    className?: string;
    showContact?: boolean;
    showSocial?: boolean;
    showLegal?: boolean;
}

export function PlatformFooter({ 
    className = "",
    showContact = true,
    showSocial = true,
    showLegal = true
}: PlatformFooterProps) {
    const { config } = usePlatformConfig();

    const currentYear = BRANDING.copyrightYear;
    const companyName = config?.nombre_empresa || BRANDING.fullName;

    return (
        <footer className={`bg-zinc-900 border-t border-zinc-800 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Logo y Descripción */}
                    <div className="col-span-1 md:col-span-2">
                        <PlatformLogo showText={true} />
                        <p className="mt-4 text-sm text-zinc-400 max-w-md">
                            {config?.meta_description || BRANDING.tagline}
                        </p>
                        {showSocial && (
                            <div className="mt-6">
                                <SocialMediaLinks />
                            </div>
                        )}
                    </div>

                    {/* Contacto */}
                    {showContact && (
                        <div>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                                Contacto
                            </h3>
                            <div className="mt-4">
                                <ContactInfo type="both" />
                            </div>
                        </div>
                    )}

                    {/* Enlaces Legales */}
                    {showLegal && (
                        <div>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                                Legal
                            </h3>
                            <div className="mt-4 space-y-2">
                                {config?.terminos_condiciones && (
                                    <a 
                                        href={config.terminos_condiciones}
                                        className="block text-sm text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Términos y Condiciones
                                    </a>
                                )}
                                {config?.politica_privacidad && (
                                    <a 
                                        href={config.politica_privacidad}
                                        className="block text-sm text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Política de Privacidad
                                    </a>
                                )}
                                {config?.aviso_legal && (
                                    <a 
                                        href={config.aviso_legal}
                                        className="block text-sm text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Aviso Legal
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Copyright */}
                <div className="mt-8 pt-8 border-t border-zinc-800">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-sm text-zinc-400">
                            © {currentYear} {companyName}. Todos los derechos reservados.
                        </p>
                        {config?.direccion && (
                            <p className="text-sm text-zinc-500 mt-2 md:mt-0">
                                {config.direccion}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
}