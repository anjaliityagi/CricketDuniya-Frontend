import { useQuery } from "@tanstack/react-query";

import { fetchTeamById, fetchTeamPlayers } from "@/services/teams";

export function useTeamQuery(id?: string) {
  return useQuery({
    queryKey: ["teams", id],
    queryFn: () => fetchTeamById(id!),
    enabled: Boolean(id),
  });
}

export function useTeamPlayersQuery(id?: string) {
  return useQuery({
    queryKey: ["teams", id, "players"],
    queryFn: () => fetchTeamPlayers(id!),
    enabled: Boolean(id),
  });
}
