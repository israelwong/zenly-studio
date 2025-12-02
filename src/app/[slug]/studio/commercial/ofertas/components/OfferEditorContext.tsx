"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ContentBlock } from "@/types/content-blocks";
import { CreateOfferData, LeadFormField } from "@/lib/actions/schemas/offer-schemas";
import type { StudioOffer } from "@/types/offers";

// Tipos
export type OfferEditorTab = "basic" | "landing" | "leadform";

interface OfferFormData {
  name: string;
  description: string;
  objective: "presencial" | "virtual";
  slug: string;
  cover_media_url: string | null;
  cover_media_type: "image" | "video" | null;
  is_active: boolean;
}

interface LeadFormData {
  title: string;
  description: string;
  success_message: string;
  success_redirect_url: string;
  subject_options: string[];
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

  // Helpers
  getOfferData: () => CreateOfferData;
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
    objective: (initialOffer?.objective || "presencial") as "presencial" | "virtual",
    slug: initialOffer?.slug || "",
    cover_media_url: initialOffer?.cover_media_url || null,
    cover_media_type: initialOffer?.cover_media_type as "image" | "video" | null || null,
    is_active: initialOffer?.is_active ?? true,
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
  const getOfferData = useCallback((): CreateOfferData => {
    return {
      name: formData.name,
      description: formData.description || undefined,
      objective: formData.objective,
      slug: formData.slug,
      cover_media_url: formData.cover_media_url ?? null,
      cover_media_type: formData.cover_media_type ?? null,
      is_active: formData.is_active,
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
        enable_interest_date: leadformData.enable_interest_date,
        validate_with_calendar: leadformData.validate_with_calendar,
      },
    };
  }, [formData, contentBlocks, leadformData]);

  const value: OfferEditorContextType = {
    formData,
    contentBlocks,
    leadformData,
    activeTab,
    isDirty,
    isSaving,
    updateFormData,
    updateContentBlocks,
    updateLeadformData,
    setActiveTab,
    setIsSaving,
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
