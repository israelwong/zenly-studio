/**
 * Profile Components - Reutilizables para perfil público y builder
 * 
 * Componentes migrados desde:
 * - Builder preview (/app/[slug]/studio/builder/components/previews/)
 * - Perfil público (/app/[slug]/perfil/)
 * 
 * Con mejor naming y reutilización
 */

// Core Profile Components
export { ProfileHeader } from './ProfileHeader';
export { ProfileNavigation } from './ProfileNavigation';
export { ProfileNavTabs } from './ProfileNavTabs';
export { ProfileContent } from './ProfileContent';
export { ProfileFooter } from './ProfileFooter';
// ProfileFAQ deprecated - usar FaqSection desde sections
export { FaqSection as ProfileFAQ } from './sections';

// Container Components
// MobilePreviewContainer moved to builder components

// Advanced Components
export { ProfileCTA } from './ProfileCTA';
export { ProfileAIChat } from './ProfileAIChat';

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
