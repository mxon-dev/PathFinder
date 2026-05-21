"use client";

import { useMutation } from "@tanstack/react-query";
import { createLocationSearchMutationOptions } from "./queries";

export function useLocationSearchAPI() {
  return useMutation(createLocationSearchMutationOptions());
}
