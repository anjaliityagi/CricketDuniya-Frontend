import { useMutation, useQueryClient } from "@tanstack/react-query";

import { submitToss } from "@/services/matches";

export function useTossMutation(matchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitToss,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      if (matchId) {
        queryClient.invalidateQueries({ queryKey: ["matches", matchId] });
      }
    },
  });
}
