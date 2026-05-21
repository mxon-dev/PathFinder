export type AssistantChatRole = "user" | "assistant";

export type AssistantChatMessageDTO = {
  role: AssistantChatRole;
  content: string;
};

export type AssistantChatLocationContext = {
  mode: "current" | "selected";
  name?: string;
  address?: string;
  lat: number;
  lng: number;
  placeUrl?: string;
};

export type AssistantChatRequest = {
  messages: AssistantChatMessageDTO[];
  location?: AssistantChatLocationContext;
};

export type AssistantChatResponse = {
  reply: string;
};
