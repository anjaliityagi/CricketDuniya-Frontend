import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addBall, type AddBallPayload } from "@/services/matches";

export function useBallMutation(matchId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddBallPayload) => addBall(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", matchId, "scorecard"] });
      queryClient.invalidateQueries({ queryKey: ["matches", matchId] });
    },
  });
}
