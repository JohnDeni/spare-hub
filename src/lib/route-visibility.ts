export const routeVisibility = {
  backend: {
    productsApiReady: true,
    categoriesApiReady: true,
    /** Nested seller on product list/detail responses. */
    productSellerInApi: true,
  },
  header: {
    browse: true,
    sell: true,
    about: false,
  },
  supportFooter: {
    howItWorks: false,
    safety: false,
    help: false,
  },
  legalFooter: {
    terms: false,
    privacy: false,
    cookies: false,
  },
  accountTabs: {
    profile: true,
    listings: true,
    orders: true,
    favorites: false,
    settings: true,
  },
  sitemap: {
    sell: false,
    about: false,
    howItWorks: false,
    safety: false,
    help: false,
    legal: false,
  },
} as const;
