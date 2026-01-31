export interface PortfolioForWhatsApp {
  id: string;
  title: string;
  slug: string;
}

export type PortfoliosResult =
  | { success: true; data: PortfolioForWhatsApp[] }
  | { success: false; error: string };
