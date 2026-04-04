export type RoomModeId =
  | "debate"
  | "chill"
  | "confessions"
  | "business"
  | "funny"
  | "advice"
  | "deep"
  | "night";

export type RoomMode = {
  id: RoomModeId;
  label: string;
  labelRu: string;
  emoji: string;
  description: string;
  descriptionRu: string;
};

export type IceBreakerRequest = {
  topic: string;
  mode: RoomModeId;
  lang?: "en" | "ru";
};

export type IceBreakerResponse = {
  questions: string[];
};
