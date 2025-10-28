// UI Components - Shared reusable interface components
export { default as Button } from './Button';
export type { ButtonVariant, ButtonSize } from './Button';
export { default as ServiceSection } from './ServiceSection';
export { default as CTASection } from './CTASection';
export { default as FooterMarketing } from './FooterMarketing';

// Re-export gallery components for backwards compatibility
export { GallerySlider as MediaSlider } from '../galleries';

// VideoSection moved to video/ folder - use video/VideoSingle instead
