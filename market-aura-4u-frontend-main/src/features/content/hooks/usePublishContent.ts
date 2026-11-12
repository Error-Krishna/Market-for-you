import { useMutation } from "@tanstack/react-query";
import { publishContent } from "../api/content-api";

export function usePublishContent() {
  return useMutation({
    mutationFn: publishContent,
  });
}
