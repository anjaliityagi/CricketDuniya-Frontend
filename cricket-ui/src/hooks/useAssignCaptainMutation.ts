import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignTeamCaptain } from "@/services/players";

export function useAssignCaptainMutation(matchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerId,
      teamId,
    }: {
      playerId: string;
      teamId: string;
    }) => assignTeamCaptain(playerId, teamId),
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
