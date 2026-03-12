'use client';

import React from 'react';
import { PackagePlus, Eye, Loader2, ChevronDown } from 'lucide-react';
import { Accordion } from '@/components/ui/shadcn/accordion';
import { ZenButton, ZenSwitch, ZenDropdownMenu, ZenDropdownMenuTrigger, ZenDropdownMenuContent, ZenDropdownMenuItem } from '@/components/ui/zen';
import { cn } from '@/lib/utils';

export type CommercialConfigContext = 'cotizacion' | 'paquete';

export interface CommercialConfigSidebarProps {
  /** Define si el sidebar es para cotización (condiciones de cierre, auditoría) o paquete (carátula, bonos/cortesías). */
  context: CommercialConfigContext;
  /** Título del bloque (ej. "Configuración"). */
  title?: string;
  /** Valores abiertos del accordion (ej. ['base', 'negociacion']). */
  accordionValue: string[];
  /** Callback al cambiar paneles; puede incluir lógica en cadena (ej. abrir negociación abre condiciones). */
  onAccordionChange: (value: string[]) => void;
  /** Contenido del panel "Información base". En paquete, incluir aquí la Carátula (PaqueteCoverDropzone) al final para diseño compacto. Si se usa children, se ignora. */
  baseSection?: React.ReactNode;
  /** @deprecated Incluir la carátula dentro de baseSection cuando context === 'paquete'. */
  caratulaSection?: React.ReactNode;
  /** Resto de paneles. Si se usa children, se ignora. */
  restSections?: React.ReactNode;
  /** Contenido completo del accordion (alternativa a baseSection + restSections). Tiene prioridad. */
  children?: React.ReactNode;
  /** Nodo opcional: modales, sheets, confirmaciones que viven dentro del sidebar. */
  modalsAndSheets?: React.ReactNode;
  /** Bloque de botones de acción (Guardar como paquete, Vista previa, Guardar/Cancelar). */
  actionButtons: React.ReactNode;
  /** Si true, no se muestra el bloque de botones (ej. padre usa customActionButtons o toolbar flotante). */
  hideActionButtons?: boolean;
  /** Contenido opcional debajo del accordion y encima de los botones (ej. ficha pre-autorizada). */
  extraContent?: React.ReactNode;
  /** Clase del contenedor sticky (para focusMode o layout). */
  className?: string;
  /** Si true, layout más compacto (columna única en focus). */
  focusMode?: boolean;
  /** Handler de submit del form (evita envío por Enter). */
  onSubmit?: (e: React.FormEvent) => void;
}

const defaultSubmit = (e: React.FormEvent) => e.preventDefault();

/**
 * Sidebar reutilizable de configuración comercial (cotización o paquete).
 * Centraliza: información base, opcional carátula (paquete), ajustes de negociación,
 * condiciones de cierre (cotización) y bloque de acciones.
 * Sticky con scroll interno independiente.
 */
export function CommercialConfigSidebar({
  context,
  title = 'Configuración',
  accordionValue,
  onAccordionChange,
  baseSection,
  caratulaSection,
  restSections,
  children,
  modalsAndSheets,
  actionButtons,
  hideActionButtons = false,
  extraContent,
  className,
  focusMode = false,
  onSubmit = defaultSubmit,
}: CommercialConfigSidebarProps) {
  const accordionContent = children ?? (
    <>
      {baseSection}
      {restSections}
    </>
  );

  return (
    <div
      className={cn(
        'lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto',
        focusMode ? 'lg:col-span-1 pl-3 pr-6 py-6' : 'lg:py-4 lg:pr-2',
        className
      )}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

          <Accordion
            type="multiple"
            value={accordionValue}
            onValueChange={onAccordionChange}
            className="space-y-0"
          >
            {accordionContent}
          </Accordion>

          {modalsAndSheets}

          {extraContent}
        </div>

        {!hideActionButtons && (
          <div className="border-t border-zinc-700 pt-3 mt-4">
            {actionButtons}
          </div>
        )}
      </form>
    </div>
  );
}

/** Props para el bloque de botones de acción del sidebar (Guardar como paquete, Vista previa, Guardar, Cancelar). */
export interface CommercialConfigActionButtonsProps {
  onGuardarComoPaquete: () => void;
  isSavingAsPaquete?: boolean;
  loading?: boolean;
  isDisabled?: boolean;
  onRequestPreview?: () => void;
  isEditMode?: boolean;
  visibleToClient?: boolean;
  condicionIdsVisiblesSize?: number;
  onSaveDraft: () => void;
  onSavePublish: () => void;
  onCancel: () => void;
  savingIntent?: 'draft' | 'publish' | null;
  customActionButtons?: React.ReactNode;
  hideActionButtons?: boolean;
  /** Condición para deshabilitar guardar (ej. "Selecciona al menos una condición"). */
  saveDisabledTitle?: string;
  /** Botón de autorizar (cotización en cierre). */
  onAutorizar?: () => void;
  isAutorizando?: boolean;
  isAlreadyAuthorized?: boolean;
  autorizarNode?: React.ReactNode;
  /** Si true, no se muestra el botón "Guardar como paquete" (ej. en editor de paquete). */
  hideGuardarComoPaquete?: boolean;
  /** Si true, en la barra lateral solo se muestran "Vista previa" y "Cancelar" (acciones de guardado se mueven al footer del modal de vista previa). */
  sidebarOnlyPreviewAndCancel?: boolean;
  /** Callback para cambiar el estado de publicación (switch). */
  onPublishToggle?: (published: boolean) => void;
  /** Si true, muestra el switch de publicación. */
  showPublishSwitch?: boolean;
  /** Si true, el switch está deshabilitado (ej. validación pendiente). */
  publishSwitchDisabled?: boolean;
  /** Si true, el switch está procesando un cambio de estado. */
  isTogglingPublish?: boolean;
}

/**
 * Bloque de botones estándar para CommercialConfigSidebar: Guardar como paquete, Vista previa, Guardar/Crear, Cancelar.
 * Úsalo desde el padre (CotizacionForm) pasando los handlers.
 */
export function CommercialConfigActionButtons({
  onGuardarComoPaquete,
  isSavingAsPaquete = false,
  loading = false,
  isDisabled = false,
  onRequestPreview,
  isEditMode = false,
  visibleToClient = false,
  condicionIdsVisiblesSize = 0,
  onSaveDraft,
  onSavePublish,
  onCancel,
  savingIntent,
  customActionButtons,
  hideActionButtons,
  saveDisabledTitle,
  autorizarNode,
  hideGuardarComoPaquete = false,
  sidebarOnlyPreviewAndCancel = false,
  onPublishToggle,
  showPublishSwitch = false,
  publishSwitchDisabled = false,
  isTogglingPublish = false,
}: CommercialConfigActionButtonsProps) {
  if (customActionButtons) {
    return <>{customActionButtons}</>;
  }
  if (hideActionButtons) {
    return null;
  }

  const condicionDisabled = condicionIdsVisiblesSize === 0;
  const isCurrentlyVisible = visibleToClient;

  return (
    <div className="space-y-3">
      {/* Switch de publicación (solo en modo edición) */}
      {showPublishSwitch && isEditMode && onPublishToggle && (
        <div
          className={`mb-3 rounded-lg border p-3 ${isCurrentlyVisible ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-amber-500/50 bg-amber-950/20'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-200">Estado de publicación</p>
              <div className="flex items-center gap-2 mt-0.5">
                {isTogglingPublish && (
                  <Loader2 className="h-3.5 w-3.5 text-zinc-400 animate-spin shrink-0" />
                )}
                <p className={`text-xs ${isTogglingPublish ? 'text-zinc-400' : isCurrentlyVisible ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isTogglingPublish ? 'Guardando...' : (isCurrentlyVisible ? 'Visible para el cliente' : 'Solo visible para el estudio')}
                </p>
              </div>
            </div>
            <ZenSwitch
              checked={isCurrentlyVisible}
              onCheckedChange={onPublishToggle}
              disabled={publishSwitchDisabled || isTogglingPublish}
              variant={isCurrentlyVisible ? 'emerald' : 'default'}
            />
          </div>
        </div>
      )}

      {onRequestPreview && (
        <ZenButton
          type="button"
          variant="outline"
          onClick={onRequestPreview}
          disabled={loading || isDisabled}
          className="w-full gap-1.5 border-emerald-600/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/70"
        >
          <Eye className="h-3.5 w-3.5" />
          Vista previa
        </ZenButton>
      )}
      
      {isEditMode ? (
        // Modo edición: Button Group con Guardar cambios + dropdown
        <div className="flex gap-0 w-full">
          <ZenButton
            type="button"
            variant="primary"
            onClick={isCurrentlyVisible ? onSavePublish : onSaveDraft}
            loading={loading && savingIntent !== null}
            loadingText="Guardando..."
            disabled={loading || isDisabled || condicionDisabled}
            title={saveDisabledTitle}
            className="flex-1 rounded-r-none"
          >
            Guardar cambios
          </ZenButton>
          <ZenDropdownMenu>
            <ZenDropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={loading || isDisabled || condicionDisabled}
                className={cn(
                  "inline-flex items-center justify-center px-2 border-l border-blue-700",
                  "bg-blue-600 hover:bg-blue-700 text-white rounded-r-md",
                  "transition-all duration-200 h-9",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </ZenDropdownMenuTrigger>
            <ZenDropdownMenuContent align="end" className="min-w-[200px]">
              <ZenDropdownMenuItem
                onClick={onGuardarComoPaquete}
                disabled={loading || isDisabled || isSavingAsPaquete}
              >
                <PackagePlus className="h-4 w-4 mr-2" />
                {isSavingAsPaquete ? 'Creando paquete...' : 'Guardar como paquete'}
              </ZenDropdownMenuItem>
            </ZenDropdownMenuContent>
          </ZenDropdownMenu>
        </div>
      ) : sidebarOnlyPreviewAndCancel ? (
        // Modo creación con vista previa: Vista previa ya está arriba; aquí solo Guardar (guardado rápido sin abrir preview)
        <ZenButton
          type="button"
          variant="primary"
          onClick={onSaveDraft}
          loading={loading && savingIntent === 'draft'}
          loadingText="Guardando..."
          disabled={loading || isDisabled || condicionDisabled}
          title={saveDisabledTitle}
          className="w-full"
        >
          Guardar
        </ZenButton>
      ) : (
        // Modo creación: Button Group con Guardar borrador + dropdown
        <>
          <div className="flex gap-0 w-full">
            <ZenButton
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              loading={loading && savingIntent === 'draft'}
              loadingText="Guardando..."
              disabled={loading || isDisabled || condicionDisabled}
              title={saveDisabledTitle}
              className="flex-1 rounded-r-none"
            >
              Guardar borrador
            </ZenButton>
            <ZenDropdownMenu>
              <ZenDropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={loading || isDisabled || condicionDisabled}
                  className={cn(
                    "inline-flex items-center justify-center px-2 border-l border-zinc-600",
                    "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-r-md",
                    "transition-all duration-200 h-9",
                    "disabled:pointer-events-none disabled:opacity-50"
                  )}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </ZenDropdownMenuTrigger>
              <ZenDropdownMenuContent align="end" className="min-w-[200px]">
                <ZenDropdownMenuItem
                  onClick={onSavePublish}
                  disabled={loading || isDisabled || condicionDisabled}
                >
                  Crear y Publicar
                </ZenDropdownMenuItem>
                <ZenDropdownMenuItem
                  onClick={onGuardarComoPaquete}
                  disabled={loading || isDisabled || isSavingAsPaquete}
                >
                  <PackagePlus className="h-4 w-4 mr-2" />
                  {isSavingAsPaquete ? 'Creando paquete...' : 'Guardar como paquete'}
                </ZenDropdownMenuItem>
              </ZenDropdownMenuContent>
            </ZenDropdownMenu>
          </div>
          {autorizarNode}
        </>
      )}
      
      <ZenButton
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={loading || isDisabled}
        className="w-full"
      >
        Cancelar
      </ZenButton>
    </div>
  );
}
