import { ContentBlock } from './content-blocks';
import type {
  OfferObjective,
  CTAConfig,
  LeadFormFieldsConfig,
} from '@/lib/actions/schemas/offer-schemas';

// =============================================================================
// TYPES PARA OFERTAS COMERCIALES
// =============================================================================

export interface StudioOffer {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  objective: OfferObjective;
  slug: string;
  cover_media_url?: string | null;
  cover_media_type?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  landing_page?: StudioOfferLandingPage;
  leadform?: StudioOfferLeadform;
}

export interface StudioOfferLandingPage {
  id: string;
  offer_id: string;
  content_blocks: ContentBlock[];
  cta_config: CTAConfig;
  created_at: Date;
  updated_at: Date;
}

export interface StudioOfferLeadform {
  id: string;
  offer_id: string;
  title: string | null;
  description: string | null;
  success_message: string;
  success_redirect_url: string | null;
  fields_config: LeadFormFieldsConfig;
  subject_options?: string[];
  enable_interest_date?: boolean;
  validate_with_calendar?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StudioOfferVisit {
  id: string;
  offer_id: string;
  visit_type: 'landing' | 'leadform';
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  session_id: string | null;
  created_at: Date;
}

export interface StudioOfferSubmission {
  id: string;
  offer_id: string;
  contact_id: string | null;
  visit_id: string | null;
  form_data: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  conversion_value: number | null;
  created_at: Date;
}

// Estadísticas de oferta
export interface OfferStats {
  offer_id: string;
  total_landing_visits: number;
  total_leadform_visits: number;
  total_submissions: number;
  conversion_rate: number; // (submissions / leadform_visits) * 100
  click_through_rate: number; // (leadform_visits / landing_visits) * 100
  visits_by_date: Array<{
    date: string;
    landing_visits: number;
    leadform_visits: number;
    submissions: number;
  }>;
  visits_by_utm: Array<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    landing_visits: number;
    leadform_visits: number;
    submissions: number;
  }>;
}

// Respuestas de acciones
export interface OfferResponse {
  success: boolean;
  data?: StudioOffer;
  error?: string;
}

export interface OfferListResponse {
  success: boolean;
  data?: StudioOffer[];
  error?: string;
}

export interface OfferStatsResponse {
  success: boolean;
  data?: OfferStats;
  error?: string;
}

export interface SubmitLeadFormResponse {
  success: boolean;
  data?: {
    submission_id: string;
    contact_id: string;
    promise_id?: string;
    redirect_url?: string;
  };
  error?: string;
}

export interface TrackVisitResponse {
  success: boolean;
  data?: {
    visit_id: string;
  };
  error?: string;
}
