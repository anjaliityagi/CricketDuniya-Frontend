import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addPlayerToTeam, removePlayerFromTeam } from "@/services/teams";
import { teamsQueryKey } from "@/hooks/useTeamsQuery";

export function useAddTeamPlayerMutation(teamId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerId: string) => addPlayerToTeam(teamId!, playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "players"] });
      queryClient.invalidateQueries({ queryKey: ["teams", teamId] });
      queryClient.invalidateQueries({ queryKey: teamsQueryKey });
    },
  });
}

export function useRemoveTeamPlayerMutation(teamId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamPlayerId: string) => removePlayerFromTeam(teamPlayerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", teamId, "players"] });
      queryClient.invalidateQueries({ queryKey: ["teams", teamId] });
      queryClient.invalidateQueries({ queryKey: teamsQueryKey });
    },
  });
}
