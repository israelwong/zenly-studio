import type { PublicSeccionData } from './public-promise';

/**
 * Types para Portal de Cliente
 * Cliente = studio_contacts con promesas autorizadas
 */

export interface ClientSession {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  studio_id: string;
  avatar_url?: string | null;
}

export interface ClientCotizacion {
  id: string;
  name: string;
  status: string;
  /** Total a pagar (resuelto en servidor por cotizacion-calculation-engine). */
  total: number;
  /** Monto ya pagado. */
  pagado: number;
  /** Saldo pendiente (total − pagado). */
  pendiente: number;
  descuento: number | null;
  descripcion: string | null;
  servicios: PublicSeccionData[];
}

export interface ClientEvent {
  id: string; // promise_id
  name: string | null;
  event_date: string;
  event_location: string | null;
  event_type: {
    id: string;
    name: string;
  } | null;
  cotizacion: ClientCotizacion;
}

export interface ClientPipelineStage {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  stage_type: string;
}

export interface ClientEventDetail extends Omit<ClientEvent, 'cotizacion'> {
  address: string | null;
  cotizaciones: ClientCotizacion[]; // Array de cotizaciones
  // Totales consolidados (suma de todas las cotizaciones)
  total: number;
  pagado: number;
  pendiente: number;
  descuento: number | null;
  // Pipeline stage del evento
  pipeline_stage: ClientPipelineStage | null;
}

export interface ClientPago {
  id: string;
  amount: number;
  payment_date: string | null;
  status: string;
  metodo_pago: string;
  concept: string;
  description: string | null;
}

export interface StudioBankInfo {
  studio_id: string;
  clabe: string | null;
  banco: string | null;
  titular: string | null;
}

/**
 * Response types para actions
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface LoginData {
  phone?: string;
  email?: string;
  studioSlug: string;
}

