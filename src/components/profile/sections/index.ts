/**
 * Profile Sections - Componentes para diferentes secciones del perfil
 * 
 * Secciones principales (visibles en menú):
 * - Inicio/Portafolio: MainSection
 * - Paquetes: PaquetesSection
 * - Contacto: ContactSection
 * 
 * Secciones adicionales (rutas específicas):
 * - Payments: PaymentsSection (/[slug]/payment)
 * - Clientes: ClientsSection (/[slug]/client)
 */

// Secciones principales
export { MainSection } from './MainSection';
export { PortfolioSection } from './PortfolioSection';
export { PortfolioDetailSection } from './PortfolioDetailSection';
export { PostSection } from './PostSection';
export { PostDetailSection } from './PostDetailSection';
export { PostDetailModal } from './PostDetailModal';
export { PostFeedCard } from './PostFeedCard';
export { PostCardMenu } from './PostCardMenu';
export { PostCarouselContent } from './PostCarouselContent';
export { PaquetesSection } from './PaquetesSection';
export { ContactSection } from './ContactSection';
export { FaqSection } from './FaqSection';

// Secciones adicionales
export { PaymentsSection } from './PaymentsSection';
export { ClientsSection } from './ClientsSection';
export { PromesaPreviewSection } from './PromesaPreviewSection';
