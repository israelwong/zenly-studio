"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Layout, MessageSquare } from "lucide-react";
import { ZenButton } from "@/components/ui/zen";
import { OfferEditorProvider, useOfferEditor } from "./OfferEditorContext";
import { BasicInfoTab } from "./tabs/BasicInfoTab";
import { LandingPageTab } from "./tabs/LandingPageTab";
import { LeadFormTab } from "./tabs/LeadFormTab";
import type { StudioOffer } from "@/types/offers";

interface OfferEditorProps {
  studioSlug: string;
  mode: "create" | "edit";
  offer?: StudioOffer;
}

function OfferEditorContent({ studioSlug, mode, offer }: OfferEditorProps) {
  const router = useRouter();
  const { activeTab, setActiveTab, isSaving, setIsSaving, formData, contentBlocks, updateFormData } = useOfferEditor();

  const tabs = [
    { id: "basic" as const, label: "Información", icon: FileText },
    { id: "landing" as const, label: "Landing Page", icon: Layout },
    { id: "leadform" as const, label: "Formulario", icon: MessageSquare },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implementar lógica de guardado
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ZenButton variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </ZenButton>
        <h1 className="text-2xl font-bold text-zinc-100">
          {mode === "create" ? "Nueva Oferta" : "Editar Oferta"}
        </h1>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-zinc-900/50 rounded-lg p-1.5 border border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${isActive
                    ? "bg-emerald-500 text-white"
                    : "text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
        <BasicInfoTab
          studioSlug={studioSlug}
          mode={mode}
          offerId={offer?.id}
          onSave={handleSave}
          onCancel={() => router.back()}
          isSaving={isSaving}
          savedOfferId={offer?.id || null}
        />
      )}
      {activeTab === "landing" && <LandingPageTab studioSlug={studioSlug} />}
      {activeTab === "leadform" && <LeadFormTab studioSlug={studioSlug} />}
    </div>
  );
}

export function OfferEditor(props: OfferEditorProps) {
  return (
    <OfferEditorProvider initialOffer={props.offer}>
      <OfferEditorContent {...props} />
    </OfferEditorProvider>
  );
}
