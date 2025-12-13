import type { PublicSeccionData, PublicServicioData } from '@/types/public-promise';

/**
 * Obtener el total de servicios de una estructura jerárquica
 */
export function getTotalServicios(secciones: PublicSeccionData[]): number {
  return secciones.reduce((total, seccion) => {
    return total + seccion.categorias.reduce((catTotal, categoria) => {
      return catTotal + categoria.servicios.length;
    }, 0);
  }, 0);
}

/**
 * Obtener todos los servicios planos de una estructura jerárquica
 */
export function getAllServicios(secciones: PublicSeccionData[]): PublicServicioData[] {
  const servicios: PublicServicioData[] = [];
  secciones.forEach((seccion) => {
    seccion.categorias.forEach((categoria) => {
      servicios.push(...categoria.servicios);
    });
  });
  return servicios;
}

/**
 * Obtener los primeros N servicios de una estructura jerárquica
 */
export function getFirstServicios(secciones: PublicSeccionData[], limit: number): PublicServicioData[] {
  return getAllServicios(secciones).slice(0, limit);
}

