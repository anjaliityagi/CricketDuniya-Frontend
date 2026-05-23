import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMatch, type CreateMatchPayload } from "@/services/matches";

export function useCreateMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMatchPayload) => createMatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}
