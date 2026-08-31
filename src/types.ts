/**
 * Pâtisserie El Walida - Menu Types
 */

export type Language = 'fr' | 'ar';

export interface LocalizedText {
  fr: string;
  ar: string;
}

export interface RestaurantInfo {
  name: LocalizedText;
  headline: LocalizedText;
  subtitle: LocalizedText;
  openingLabel: LocalizedText;
  openingHours: LocalizedText;
  logoUrl?: string;
}

export interface Category {
  id: string;
  label: LocalizedText;
  image: string;
  alt?: LocalizedText;
}

export interface ShowcaseProduct {
  id: string;
  name: LocalizedText;
  desc: LocalizedText;
  price: number;
  currency: LocalizedText;
  image: string;
  tag: LocalizedText;
  sideImages: [string, string, string, string];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: LocalizedText;
  desc?: LocalizedText;
  price: number;
  currency: LocalizedText;
  image: string;
  badge?: LocalizedText;
  isPopular?: boolean;
}

export interface UITranslations {
  swipeHint: LocalizedText;
  popularTitle: LocalizedText;
  seeAll: LocalizedText;
  addedToastSuffix: LocalizedText;
  selectedCategoryToast: LocalizedText;
  viewOnTable: LocalizedText;
  comingSoon: LocalizedText;
  tablePerspectiveHint: LocalizedText;
  close: LocalizedText;
  clickToSeeLogo: LocalizedText;
}
