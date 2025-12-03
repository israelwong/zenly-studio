// ZEN Design System - Exports centralizados
// Importa y exporta todos los componentes ZEN para uso consistente

// =============================================================================
// BASE COMPONENTS (DISPONIBLES)
// =============================================================================
export { ZenButton, zenButtonVariants } from './base/ZenButton';
export { ZenButtonWithEffects } from './buttonEffects/ZenButtonWithEffects';
export { ZenInput } from './base/ZenInput';
export { ZenCard, ZenCardHeader, ZenCardContent, ZenCardTitle, ZenCardDescription } from './base/ZenCard';
export { ZenBadge } from './base/ZenBadge';
export { ZenLabel } from './base/ZenLabel';
export { ZenCalendar, ZenCalendarDayButton } from './base/ZenCalendar';
export { SeparadorZen } from './SeparadorZen';

// =============================================================================
// FORM COMPONENTS (DISPONIBLES)
// =============================================================================
export { ZenTextarea } from './forms/ZenTextarea';
export { ZenSelect } from './forms/ZenSelect';
export { ZenSwitch } from './forms/ZenSwitch';

// =============================================================================
// MEDIA COMPONENTS (DISPONIBLES)
// =============================================================================
export { ZenAvatar, ZenAvatarImage, ZenAvatarFallback } from './media/ZenAvatar';

// =============================================================================
// LAYOUT COMPONENTS (DISPONIBLES)
// =============================================================================
export {
  ZenSidebarProvider,
  ZenSidebar,
  ZenSidebarTrigger,
  ZenSidebarContent,
  ZenSidebarHeader,
  ZenSidebarFooter,
  ZenSidebarGroup,
  ZenSidebarGroupLabel,
  ZenSidebarGroupContent,
  ZenSidebarMenu,
  ZenSidebarMenuItem,
  ZenSidebarMenuButton,
  ZenSidebarMenuSub,
  ZenSidebarMenuSubItem,
  ZenSidebarMenuSubButton,
  ZenSidebarOverlay,
  useZenSidebar
} from './layout/ZenSidebar';

export { ZenHeader } from './layout/ZenHeader';

// =============================================================================
// NAVIGATION COMPONENTS (DISPONIBLES)
// =============================================================================
export { ZenTabs } from './navigation/ZenTabs';
export type { ZenTabsProps, ZenTab } from './navigation/ZenTabs';

// =============================================================================
// OVERLAYS COMPONENTS (DISPONIBLES)
// =============================================================================
export { ZenConfirmModal } from './overlays/ZenConfirmModal';

// =============================================================================
// MODAL COMPONENTS (DISPONIBLES)
// =============================================================================
export { ZenTagModal } from './modals/ZenTagModal';
export { ZenDialog } from './modals/ZenDialog';
export {
  ZenDropdownMenu,
  ZenDropdownMenuTrigger,
  ZenDropdownMenuContent,
  ZenDropdownMenuItem,
  ZenDropdownMenuCheckboxItem,
  ZenDropdownMenuRadioItem,
  ZenDropdownMenuLabel,
  ZenDropdownMenuSeparator,
  ZenDropdownMenuShortcut,
  ZenDropdownMenuGroup,
  ZenDropdownMenuPortal,
  ZenDropdownMenuSub,
  ZenDropdownMenuSubContent,
  ZenDropdownMenuSubTrigger,
  ZenDropdownMenuRadioGroup,
} from './overlays/ZenDropdownMenu';

// =============================================================================
// CONTRACT COMPONENTS (DISPONIBLES)
// =============================================================================
export { ContractEditor, ContractEditorToolbar } from './contract/ContractEditor';
export { ContractPreview } from './contract/ContractPreview';
export { ContractVariables } from './contract/ContractVariables';
export { ContractTemplateCard } from './contract/ContractTemplate';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
export { ZEN_COLORS } from './tokens/colors';
export { ZEN_SPACING } from './tokens/spacing';
export { ZEN_TYPOGRAPHY } from './tokens/typography';

// =============================================================================
// TYPES (DISPONIBLES)
// =============================================================================
export type { ZenButtonProps } from './base/ZenButton';
export type { ZenButtonWithEffectsProps } from './buttonEffects/ZenButtonWithEffects';
export type { ZenInputProps } from './base/ZenInput';
export type { ZenCardProps, ZenCardHeaderProps, ZenCardContentProps, ZenCardTitleProps, ZenCardDescriptionProps } from './base/ZenCard';
export type { ZenBadgeProps } from './base/ZenBadge';
export type { ZenLabelProps } from './base/ZenLabel';
export type { ZenCalendarProps } from './base/ZenCalendar';
export type { ZenTextareaProps } from './forms/ZenTextarea';
export type { ZenSelectProps, ZenSelectOption } from './forms/ZenSelect';
export type { ZenSwitchProps } from './forms/ZenSwitch';
export type { SeparadorZenProps } from './SeparadorZen';

// =============================================================================
// MODAL TYPES (DISPONIBLES)
// =============================================================================
export type { ZenTagModalProps } from './modals/ZenTagModal';
export type { ZenDialogProps } from './modals/ZenDialog';

// =============================================================================
// CONTRACT TYPES (DISPONIBLES)
// =============================================================================
export type { ContractEditorProps } from './contract/ContractEditor';
export type { ContractPreviewProps } from './contract/ContractPreview';
export type { ContractVariablesProps } from './contract/ContractVariables';
export type { ContractTemplateProps } from './contract/ContractTemplate';

// =============================================================================
// COMPONENTES PENDIENTES (comentados hasta implementación)
// =============================================================================
// export { ZenBadge } from './base/ZenBadge';
// export { ZenFormSection } from './forms/ZenFormSection';
// export { ZenSelect } from './forms/ZenSelect';
// export { ZenCheckbox } from './forms/ZenCheckbox';
// export { ZenSwitch } from './forms/ZenSwitch';
// export { ZenSidebar } from './layout/ZenSidebar';
// export { ZenNavbar } from './layout/ZenNavbar';
// export { ZenModal } from './layout/ZenModal';
// export { ZenProgressHeader } from './specialized/ZenProgressHeader';
// export { ZenConfigGrid } from './specialized/ZenConfigGrid';
// export { ZenLoadingState } from './specialized/ZenLoadingState';
// export { useZenTheme } from './hooks/useZenTheme';
// export { useZenForm } from './hooks/useZenForm';

// TYPES PENDIENTES:
// export type { ZenBadgeProps } from './base/ZenBadge';
// export type { ZenFormSectionProps } from './forms/ZenFormSection';
// export type { ZenSelectProps } from './forms/ZenSelect';
// export type { ZenCheckboxProps } from './forms/ZenCheckbox';
// export type { ZenSwitchProps } from './forms/ZenSwitch';
// export type { ZenSidebarProps } from './layout/ZenSidebar';
// export type { ZenNavbarProps } from './layout/ZenNavbar';
// export type { ZenModalProps } from './layout/ZenModal';
// export type { ZenProgressHeaderProps } from './specialized/ZenProgressHeader';
// export type { ZenConfigGridProps } from './specialized/ZenConfigGrid';
// export type { ZenLoadingStateProps } from './specialized/ZenLoadingState';
