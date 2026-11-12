import { useMutation } from "@tanstack/react-query";

import { generateContent } from "../api/content-api";
import type { GenerateContentRequest } from "../types/content.types";

export function useGenerateContent() {
  return useMutation({
    mutationFn: (request: GenerateContentRequest) => generateContent(request),
  });
}
