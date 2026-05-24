import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignTeamWicketkeeper } from "@/services/players";

export function useAssignWicketkeeperMutation(matchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerId,
      teamId,
    }: {
      playerId: string;
      teamId: string;
    }) => assignTeamWicketkeeper(playerId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      if (matchId) {
        queryClient.invalidateQueries({ queryKey: ["matches", matchId] });
        queryClient.invalidateQueries({ queryKey: ["matches", matchId, "squad"] });
      }
    },
  });
}
