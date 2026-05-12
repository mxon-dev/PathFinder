"use client";

import { useMutation } from "@tanstack/react-query";
import { createAssistantChatMutationOptions } from "./queries";

export function useAssistantChatAPI() {
  return useMutation(createAssistantChatMutationOptions());
}
