import type { RoomModeId } from "./room";

export type RawEventItem = {
  source: "iticket";
  title: string;
  url?: string;
  slug?: string;
  eventId?: number;
  category?: string;
  categorySlug?: string;
  venue?: string;
  city?: string;
  dateText?: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  minPrice?: number;
  maxPrice?: number;
  ageLimit?: string;
  price?: string;
};

/** A candidate link extracted from the listing page */
export type EventLink = {
  href: string;
  text: string;
};

export type SidebarEventItem = {
  id: string;
  source: "iticket";
  title: string;
  sourceUrl: string;
  price?: string;
  priceRu?: string;
  dateText?: string;
  dateTextRu?: string;
  venue?: string;
  category?: string;
  topicSuggestion: string;
  topicSuggestionRu: string;
  modeSuggestion: RoomModeId;
};
