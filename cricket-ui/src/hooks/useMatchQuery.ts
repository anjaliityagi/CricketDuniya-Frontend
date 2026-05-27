import { useQuery } from "@tanstack/react-query";

import { fetchMatchById } from "@/services/matches";

export function useMatchQuery(id?: string) {
  return useQuery({
    queryKey: ["matches", id],
    queryFn: () => fetchMatchById(id!),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.status === "live" ? 4000 : false,
  });
}
