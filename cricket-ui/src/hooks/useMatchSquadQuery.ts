import { useQuery } from "@tanstack/react-query";

import { fetchMatchSquad } from "@/services/matches";

export function useMatchSquadQuery(matchId?: string) {
  return useQuery({
    queryKey: ["matches", matchId, "squad"],
    queryFn: () => fetchMatchSquad(matchId!),
    enabled: Boolean(matchId),
  });
}
