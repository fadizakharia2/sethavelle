/** Browser-safe configuration shapes (values come from `toPublicConfig`). */
export type PublicMarketingIds = {
  ga4?: string;
  googleAds?: string;
  metaPixel?: string;
  tiktokPixel?: string;
};

export type PublicConfig = {
  siteUrl?: string;
  marketing: PublicMarketingIds;
  customerAccountsEnabled: boolean;
  demoMode: boolean;
};
