import { useQuery } from "@tanstack/react-query";

import { fetchWinProbability } from "@/services/matches";

export function useWinProbabilityQuery(matchId?: string, enabled = true) {
  return useQuery({
    queryKey: ["matches", matchId, "win-probability"],
    queryFn: () => fetchWinProbability(matchId!),
    enabled: Boolean(matchId) && enabled,
    refetchInterval: enabled ? 4000 : false,
    retry: false,
  });
}
