'use client';
import React from 'react';
import Button from './Button';
import Link from 'next/link';

interface CTASectionProps {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonHref?: string;
    buttonId?: string;
    buttonTarget?: string;
    secondaryLinkText?: string;
    secondaryLinkHref?: string;
    secondaryLinkTitle?: string;
    className?: string;
}

function CTASection({
    title = "¡Contacta hoy mismo!",
    subtitle = "tenemos fechas limitadas.",
    buttonText = "Solicitar cotización",
    buttonHref = "/contacto",
    buttonId = "btn-contacto-desde-hero",
    buttonTarget = "_self",
    secondaryLinkText = "Conoce nuestros servicios",
    secondaryLinkHref = "/contacto",
    secondaryLinkTitle = "Contacto - Servicios",
    className = ""
}: CTASectionProps) {
    return (
        <div className={className}>
            <div className="text-center space-y-3 px-8 pt-5">
                <p className="text-center mx-auto text-xl mb-5 tracking-wide">
                    {title} <span className="underline">{subtitle}</span>
                </p>

                <div className="flex items-center justify-center text-center w-full max-w-lg mx-auto">
                    <Button
                        variant="primary"
                        size="lg"
                        href={buttonHref}
                        target={buttonTarget === "_blank" ? "_blank" : "_self"}
                        className="w-full"
                    >
                        {buttonText}
                    </Button>
                </div>

                {secondaryLinkText && secondaryLinkHref && (
                    <Link
                        href={secondaryLinkHref}
                        className="block my-5 underline md:text-md text-sm text-violet-400 font-light"
                        title={secondaryLinkTitle}
                    >
                        {secondaryLinkText}
                    </Link>
                )}
            </div>
        </div>
    );
}

export default CTASection;
