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
export { ProfileIdentity } from './ProfileIdentity';
export { ProfileNavigation } from './ProfileNavigation';
export { ProfileHeader } from './ProfileHeader';
export { ProfileNavTabs } from './ProfileNavTabs';
export { ProfileContent } from './ProfileContent';
export { ProfileFooter } from './ProfileFooter';
export { ProfileFAQ } from './ProfileFAQ';

// Container Components
// MobilePreviewContainer moved to builder components

// Advanced Components
export { ProfileCTA } from './ProfileCTA';
export { ProfileAIChat } from './ProfileAIChat';

// Content Components (from sections)
export {
    MainSection,
    PortfolioSection,
    CatalogSection,
    ContactSection,
    ProductCard,
    PaymentsSection,
    ClientsSection
} from './sections';
