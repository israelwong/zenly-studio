/**
 * Profile Components - Reutilizables para perfil público y builder
 * 
 * Componentes migrados desde:
 * - Builder preview (/app/[slug]/studio/components/previews/)
 * - Perfil público (/app/[slug]/profile/public/)
 * 
 * Con mejor naming y reutilización
 */

// Core Profile Components
export { ProfileHeader } from './ProfileHeader';
export { PublicProfileEditButton } from './PublicProfileEditButton';
export { ProfileNavTabs } from './ProfileNavTabs';
export { ProfileContent } from './ProfileContent';
// ProfileFooter deprecated - use PublicPageFooter from @/components/shared
export { SearchCommandPalette } from './SearchCommandPalette';
export { MediaDisplay } from './MediaDisplay';
export { MobileActionsSheet } from './MobileActionsSheet';
export { MobileGuestActionsSheet } from './MobileGuestActionsSheet';
// ProfileFAQ deprecated - usar FaqSection desde sections
export { FaqSection as ProfileFAQ } from './sections';

// Sheets
export { PostEditorSheet } from './sheets/PostEditorSheet';

// Container Components
// MobilePreviewContainer moved to builder components

// Advanced Components
export { ProfileCTA } from './ProfileCTA';
export { ProfileAIChat } from './ProfileAIChat';
export { QuickActions } from './QuickActions';

// Card Components (new)
export { ZenCreditsCard } from './cards/ZenCreditsCard';
export { BusinessPresentationCard } from './cards/BusinessPresentationCard';
export { PromotionsCard } from './cards/PromotionsCard';
export { OffersCard } from './cards/OffersCard';

// Mobile Components (new)
export { MobilePromotionsSection } from './mobile/MobilePromotionsSection';
export { PromoIsland } from './PromoIsland';

// Content Components (from sections)
export {
    MainSection,
    PortfolioSection,
    ContactSection,
    PaquetesSection,
    FaqSection,
    PaymentsSection,
    ClientsSection
} from './sections';
