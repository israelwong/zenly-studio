export interface PortfolioForWhatsApp {
  id: string;
  title: string;
  slug: string;
  event_type_name: string | null;
}

export interface PortfolioGroup {
  eventTypeName: string;
  portfolios: PortfolioForWhatsApp[];
}

export type PortfoliosResult =
  | { success: true; data: PortfolioGroup[] }
  | { success: false; error: string };
