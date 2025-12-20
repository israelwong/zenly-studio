"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ContentBlock } from "@/types/content-blocks";
import { CreateOfferData, UpdateOfferData, LeadFormField } from "@/lib/actions/schemas/offer-schemas";
import type { StudioOffer } from "@/types/offers";

// Tipos
export type OfferEditorTab = "basic" | "landing" | "leadform";

interface OfferFormData {
  name: string;
  description: string;
  slug: string;
  cover_media_url: string | null;
  cover_media_type: "image" | "video" | null;
  is_active: boolean;
  is_permanent: boolean;
  has_date_range: boolean;
  start_date: Date | null;
  end_date: Date | null;
  business_term_id: string | null; // Condición comercial especial
  event_type_id: string | null; // Tipo de evento asociado (boda, quinceañera, etc.)
}

interface LeadFormData {
  title: string;
  description: string;
  success_message: string;
  success_redirect_url: string;
  subject_options: string[]; // LEGACY: si use_event_types = false
  use_event_types: boolean; // Si true: usar studio_event_types
  selected_event_type_ids: string[]; // Para LEADFORMS GENÉRICOS: múltiples tipos (array)
  show_packages_after_submit: boolean; // Mostrar paquetes post-registro
  email_required: boolean;
  enable_interest_date: boolean;
  validate_with_calendar: boolean;
  fields_config: {
    fields: LeadFormField[];
  };
}

interface OfferEditorContextType {
  // Data
  formData: OfferFormData;
  contentBlocks: ContentBlock[];
  leadformData: LeadFormData;
  offerId?: string; // ID de la oferta (solo en modo edición)
  savedOfferId?: string | null; // ID de la oferta guardada (para modo create)

  // Estado
  activeTab: OfferEditorTab;
  isDirty: boolean;
  isSaving: boolean;

  // Actions
  updateFormData: (data: Partial<OfferFormData>) => void;
  updateContentBlocks: (blocks: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => void;
  updateLeadformData: (data: Partial<LeadFormData>) => void;
  setActiveTab: (tab: OfferEditorTab) => void;
  setIsSaving: (saving: boolean) => void;
  setSavedOfferId: (id: string | null) => void;

  // Helpers
  getOfferData: () => CreateOfferData | UpdateOfferData;
}

const OfferEditorContext = createContext<OfferEditorContextType | undefined>(undefined);

interface OfferEditorProviderProps {
  children: ReactNode;
  initialOffer?: StudioOffer;
}

export function OfferEditorProvider({ children, initialOffer }: OfferEditorProviderProps) {
  // Estado del formulario básico
  const [formData, setFormData] = useState<OfferFormData>({
    name: initialOffer?.name || "",
    description: initialOffer?.description || "",
    slug: initialOffer?.slug || "",
    cover_media_url: initialOffer?.cover_media_url || null,
    cover_media_type: initialOffer?.cover_media_type as "image" | "video" | null || null,
    is_active: initialOffer?.is_active ?? false, // Default false: solo publicar con landing page
    is_permanent: initialOffer?.is_permanent ?? false,
    has_date_range: initialOffer?.has_date_range ?? false,
    start_date: initialOffer?.start_date ? new Date(initialOffer.start_date) : null,
    end_date: initialOffer?.end_date ? new Date(initialOffer.end_date) : null,
    business_term_id: initialOffer?.business_term_id || null,
    event_type_id: initialOffer?.leadform?.event_type_id || null,
  });

  // Estado para landing page
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(
    initialOffer?.landing_page?.content_blocks
      ? (initialOffer.landing_page.content_blocks as ContentBlock[])
      : []
  );

  // Estado para leadform
  const [leadformData, setLeadformData] = useState<LeadFormData>({
    title: initialOffer?.leadform?.title || "",
    description: initialOffer?.leadform?.description || "",
    success_message: initialOffer?.leadform?.success_message || "¡Gracias! Nos pondremos en contacto pronto.",
    success_redirect_url: initialOffer?.leadform?.success_redirect_url || "",
    subject_options: (initialOffer?.leadform?.subject_options as string[]) || [],
    use_event_types: initialOffer?.leadform?.use_event_types ?? true, // Default: usar tipos de evento
    selected_event_type_ids: (initialOffer?.leadform?.selected_event_type_ids as string[]) || [],
    show_packages_after_submit: initialOffer?.leadform?.show_packages_after_submit || false,
    email_required: (initialOffer?.leadform?.email_required as boolean) || false,
    enable_interest_date: (initialOffer?.leadform?.enable_interest_date as boolean) || false,
    validate_with_calendar: (initialOffer?.leadform?.validate_with_calendar as boolean) || false,
    fields_config: {
      fields: (initialOffer?.leadform?.fields_config?.fields || []) as LeadFormField[],
    },
  });

  // Estado de UI
  const [activeTab, setActiveTab] = useState<OfferEditorTab>("basic");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedOfferId, setSavedOfferId] = useState<string | null>(initialOffer?.id || null);

  // Actions
  const updateFormData = useCallback((data: Partial<OfferFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setIsDirty(true);
  }, []);

  const updateContentBlocks = useCallback((blocks: ContentBlock[] | ((prev: ContentBlock[]) => ContentBlock[])) => {
    setContentBlocks((prev) => {
      const newBlocks = typeof blocks === "function" ? blocks(prev) : blocks;
      return newBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));
    });
    setIsDirty(true);
  }, []);

  const updateLeadformData = useCallback((data: Partial<LeadFormData>) => {
    setLeadformData((prev) => ({ ...prev, ...data }));
    setIsDirty(true);
  }, []);

  // Helper para obtener datos completos para guardar
  const getOfferData = useCallback((): CreateOfferData | UpdateOfferData => {
    const baseData = {
      name: formData.name,
      description: formData.description || undefined,
      slug: formData.slug,
      cover_media_url: formData.cover_media_url ?? null,
      cover_media_type: formData.cover_media_type ?? null,
      is_active: formData.is_active,
      is_permanent: formData.is_permanent,
      has_date_range: formData.has_date_range,
      start_date: formData.start_date,
      end_date: formData.end_date,
      business_term_id: formData.business_term_id,
      landing_page: {
        content_blocks: contentBlocks,
        cta_config: {
          buttons: [],
        },
      },
      leadform: {
        title: leadformData.title || undefined,
        description: leadformData.description || undefined,
        success_message: leadformData.success_message,
        success_redirect_url: leadformData.success_redirect_url || undefined,
        fields_config: leadformData.fields_config,
        subject_options: leadformData.subject_options,
        use_event_types: leadformData.use_event_types,
        event_type_id: formData.event_type_id || undefined, // Ahora viene de formData (info básica)
        selected_event_type_ids: leadformData.selected_event_type_ids,
        show_packages_after_submit: leadformData.show_packages_after_submit,
        email_required: leadformData.email_required,
        enable_interest_date: leadformData.enable_interest_date,
        validate_with_calendar: leadformData.validate_with_calendar,
      },
    };

    // Si hay offerId, incluir id para UpdateOfferData
    if (initialOffer?.id) {
      return {
        ...baseData,
        id: initialOffer.id,
      };
    }

    return baseData;
  }, [formData, contentBlocks, leadformData, initialOffer?.id]);

  const value: OfferEditorContextType = {
    formData,
    contentBlocks,
    leadformData,
    offerId: initialOffer?.id,
    savedOfferId,
    activeTab,
    isDirty,
    isSaving,
    updateFormData,
    updateContentBlocks,
    updateLeadformData,
    setActiveTab,
    setIsSaving,
    setSavedOfferId,
    getOfferData,
  };

  return (
    <OfferEditorContext.Provider value={value}>
      {children}
    </OfferEditorContext.Provider>
  );
}

export function useOfferEditor() {
  const context = useContext(OfferEditorContext);
  if (!context) {
    throw new Error("useOfferEditor debe usarse dentro de OfferEditorProvider");
  }
  return context;
}
