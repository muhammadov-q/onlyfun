import type { RoomModeId } from "./room";

export type SourceArticlePreview = {
  title: string;
  url: string;
  publishedAt?: string;
  category?: string;
};

export type RawNewsItem = {
  source: "kaktus";
  title: string;
  url: string;
  publishedAt?: string;
  category?: string;
  bodyText: string;
};

export type RelevanceResult = {
  item: RawNewsItem;
  score: number;
  matched: string[];
};

export type GeminiNewsSummary = {
  headline: string;
  headlineRu: string;
  line1: string;
  line1Ru: string;
  line2: string;
  line2Ru: string;
  topicSuggestion: string;
  topicSuggestionRu: string;
  modeSuggestion: RoomModeId;
};

export type FeedItem = {
  id: string;
  source: "kaktus";
  sourceUrl: string;
  headline: string;
  headlineRu: string;
  line1: string;
  line1Ru: string;
  line2: string;
  line2Ru: string;
  topicSuggestion: string;
  topicSuggestionRu: string;
  modeSuggestion: RoomModeId;
  publishedAt?: string;
};
