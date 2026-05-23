import { useMutation, useQueryClient } from "@tanstack/react-query";

import { submitFirstPick } from "@/services/matches";

export function useFirstPickMutation(matchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (firstPickTeamId: string) => submitFirstPick(matchId!, firstPickTeamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      if (matchId) {
        queryClient.invalidateQueries({ queryKey: ["matches", matchId] });
      }
    },
  });
}
