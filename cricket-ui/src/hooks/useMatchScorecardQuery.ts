import { useQuery } from "@tanstack/react-query";

import { fetchMatchScorecard } from "@/services/matches";

export function useMatchScorecardQuery(matchId?: string, enabled = true) {
  return useQuery({
    queryKey: ["matches", matchId, "scorecard"],
    queryFn: () => fetchMatchScorecard(matchId!),
    enabled: Boolean(matchId) && enabled,
    refetchInterval: enabled ? 6000 : false,
  });
}
