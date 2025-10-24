// Container principal
export { CatalogoContainer } from "./CatalogoContainer";
export { CatalogoNavigationWrapper } from "./CatalogoNavigationWrapper";
export { CatalogoAcordeonNavigation } from "./CatalogoAcordeonNavigation";

// Storage & UI Components

// Skeletons - Orquestador + Individuales
export { CatalogoTabSkeletonContainer, SeccionSkeleton, CategoriaSkeleton, ItemSkeleton } from "./shared";

// Navigation Levels - Secciones
export { SeccionesListView, SeccionEditorModal } from "./secciones";

// Navigation Levels - Categorias
export { CategoriasListView, CategoriaCard } from "./categorias";

// Navigation Levels - Items
export { ItemsListView, ItemCard } from "./items";

// Types
export type { CatalogoContainerProps } from "./CatalogoContainer";
export type { SeccionesListViewProps, SeccionFormData } from "./secciones";
export type { CategoriasListViewProps, CategoriaCardProps } from "./categorias";
export type { ItemsListViewProps, ItemCardProps } from "./items";
