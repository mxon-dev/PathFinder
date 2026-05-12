export type AssistantChatRole = "user" | "assistant";

export type AssistantChatMessageDTO = {
  role: AssistantChatRole;
  content: string;
};

export type AssistantChatRequest = {
  messages: AssistantChatMessageDTO[];
};

export type AssistantChatResponse = {
  reply: string;
};
