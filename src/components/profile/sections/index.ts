/**
 * Profile Sections - Componentes para diferentes secciones del perfil
 * 
 * Secciones principales (visibles en menú):
 * - Inicio/Portafolio: MainSection
 * - Catálogo: CatalogSection  
 * - Paquetes: PaquetesSection
 * - Contacto: ContactSection
 * 
 * Secciones adicionales (rutas específicas):
 * - Payments: PaymentsSection (/[slug]/payment)
 * - Clientes: ClientsSection (/[slug]/cliente)
 */

// Secciones principales
export { MainSection } from './MainSection';
export { PortfolioSection } from './PortfolioSection';
export { PortfolioDetailSection } from './PortfolioDetailSection';
export { PostSection } from './PostSection';
export { PostDetailSection } from './PostDetailSection';
export { PostFeedCard } from './PostFeedCard';
export { PostCarouselContent } from './PostCarouselContent';
export { PaquetesSection } from './PaquetesSection';
export { CatalogSection } from './CatalogSection';
export { ContactSection } from './ContactSection';
export { ProductCard } from './ProductCard';

// Secciones adicionales
export { PaymentsSection } from './PaymentsSection';
export { ClientsSection } from './ClientsSection';
