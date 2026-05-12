"use client";

import { useMutation } from "@tanstack/react-query";
import { createDocentMutationOptions } from "./queries";

export function useAIDocentAPI() {
  return useMutation(createDocentMutationOptions());
}
