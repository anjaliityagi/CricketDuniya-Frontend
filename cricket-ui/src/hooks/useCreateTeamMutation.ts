import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTeam } from "@/services/teams";
import { teamsQueryKey } from "@/hooks/useTeamsQuery";

export function useCreateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsQueryKey });
    },
  });
}
