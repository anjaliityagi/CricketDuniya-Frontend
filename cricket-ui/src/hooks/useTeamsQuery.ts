import { useQuery } from "@tanstack/react-query";

import { fetchTeams } from "@/services/teams";

export const teamsQueryKey = ["teams"];

export function useTeamsQuery() {
  return useQuery({
    queryKey: teamsQueryKey,
    queryFn: fetchTeams,
  });
}
