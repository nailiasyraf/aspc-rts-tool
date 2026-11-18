export type TikTokProduct = {
  id: string;
  name: string;
  websitePrice: number | null;
  activatedPrice: number | null;
  unactivatedPrice: number | null;
};

export type TikTokPricingResult = {
  products: TikTokProduct[];
  warnings: string[];
};
