import type {
  AssistantChatRequest,
  AssistantChatResponse,
} from "../model/types";
import AssistantChatAPI from "./AssistantChatAPI";

export const assistantChatMutationKey = ["assistant-chat", "send"] as const;

export function createAssistantChatMutationOptions() {
  return {
    mutationKey: assistantChatMutationKey,
    mutationFn: async (
      input: AssistantChatRequest,
    ): Promise<AssistantChatResponse> => {
      const { data } = await AssistantChatAPI.send(input);
      return data;
    },
  };
}
