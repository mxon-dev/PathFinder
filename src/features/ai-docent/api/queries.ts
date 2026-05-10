import type { AIDocentRequest, AIDocentResponse } from "../model/types";
import AIDocentAPI from "./AIDocentAPI";

export const aiDocentMutationKey = ["ai-docent", "generate"] as const;

export function createDocentMutationOptions() {
  return {
    mutationKey: aiDocentMutationKey,
    mutationFn: async (input: AIDocentRequest): Promise<AIDocentResponse> => {
      const { data } = await AIDocentAPI.generate(input);
      return data;
    },
  };
}
