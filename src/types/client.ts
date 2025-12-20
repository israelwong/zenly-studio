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
  studio_id: string;
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
  cotizacion: {
    id: string;
    status: string;
    total: number;
    pagado: number;
    pendiente: number;
    descuento: number | null;
    servicios: PublicSeccionData[];
  };
}

export interface ClientEventDetail extends ClientEvent {
  address: string | null;
  cotizacion: ClientEvent['cotizacion'] & {
    descripcion: string | null;
  };
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

