'use client';

import { use } from 'react';
import { OfferLandingPage } from '@/components/offers/OfferLandingPage';
import { PublicPageFooter } from '@/components/shared/PublicPageFooter';
import type { ContentBlock } from '@/types/content-blocks';

interface OfferPageStreamingProps {
    basicData: {
        offer: {
            id: string;
            studio_id: string;
            slug: string;
            landing_page: {
                id: string;
                offer_id: string;
                cta_config: {
                    buttons: Array<{
                        id: string;
                        text: string;
                        variant: "primary" | "secondary" | "outline";
                        position: "top" | "middle" | "bottom" | "floating";
                        href?: string;
                    }>;
                };
            } | null;
            leadform: {
                id: string;
                offer_id: string;
                title: string | null;
                description: string | null;
                success_message: string;
                success_redirect_url: string | null;
                fields_config: {
                    fields: Array<{
                        id: string;
                        type: string;
                        label: string;
                        required: boolean;
                        placeholder?: string;
                        options?: string[];
                    }>;
                };
                event_type_id: string | null;
                enable_interest_date: boolean;
                validate_with_calendar: boolean;
                email_required: boolean | null;
            } | null;
        };
        studioSlug: string;
    };
    contentBlocksPromise: Promise<{ success: boolean; data?: ContentBlock[]; error?: string }>;
}

/**
 * ⚠️ STREAMING: Componente streaming (usa use() de React 19)
 * Resuelve promesa de content blocks y renderiza el landing page completo
 */
export function OfferPageStreaming({
    basicData,
    contentBlocksPromise,
}: OfferPageStreamingProps) {
    // ⚠️ React 19: use() resuelve la promesa y suspende si no está lista
    const contentBlocksResult = use(contentBlocksPromise);
    const contentBlocks = contentBlocksResult.success && contentBlocksResult.data 
        ? contentBlocksResult.data 
        : [];

    if (!basicData.offer.landing_page) {
        return null;
    }

    return (
        <>
            {/* Container mobile centrado con padding-top para header */}
            <div className="max-w-md mx-auto min-h-screen md:py-24 pt-[81px] px-4 md:px-0">
                {/* Wrapper con scroll y glassmorphism */}
                <div className="min-h-[calc(100vh-81px)] bg-zinc-950/60 backdrop-blur-sm rounded-xl overflow-hidden border border-zinc-800/50">
                    {/* Content */}
                    <OfferLandingPage
                        studioSlug={basicData.studioSlug}
                        offerId={basicData.offer.id}
                        offerSlug={basicData.offer.slug}
                        contentBlocks={contentBlocks}
                        ctaConfig={basicData.offer.landing_page.cta_config}
                        leadformData={basicData.offer.leadform ? {
                            studioId: basicData.offer.studio_id,
                            title: basicData.offer.leadform.title,
                            description: basicData.offer.leadform.description,
                            successMessage: basicData.offer.leadform.success_message,
                            successRedirectUrl: basicData.offer.leadform.success_redirect_url,
                            fieldsConfig: basicData.offer.leadform.fields_config,
                            eventTypeId: basicData.offer.leadform.event_type_id,
                            eventTypeName: (basicData.offer.leadform as any).event_type_name || null,
                            enableInterestDate: basicData.offer.leadform.enable_interest_date,
                            validateWithCalendar: basicData.offer.leadform.validate_with_calendar,
                            emailRequired: basicData.offer.leadform.email_required,
                            enableEventName: (basicData.offer.leadform as any).enable_event_name || false,
                            eventNameRequired: (basicData.offer.leadform as any).event_name_required || false,
                            enableEventDuration: (basicData.offer.leadform as any).enable_event_duration || false,
                            eventDurationRequired: (basicData.offer.leadform as any).event_duration_required || false,
                            showPackagesAfterSubmit: (basicData.offer.leadform as any).show_packages_after_submit || false,
                            coverUrl: null,
                            coverType: null,
                        } : undefined}
                    />

                    {/* Footer */}
                    <PublicPageFooter />
                </div>
            </div>
        </>
    );
}
