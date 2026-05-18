import { useQuery } from "@tanstack/react-query";

import { fetchMatches } from "@/services/matches";

export function useMatchesQuery() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: fetchMatches,
  });
}
