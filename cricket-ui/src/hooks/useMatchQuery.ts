import { useQuery } from "@tanstack/react-query";

import { fetchMatchById } from "@/services/matches";

export function useMatchQuery(id?: string) {
  return useQuery({
    queryKey: ["matches", id],
    queryFn: () => fetchMatchById(id!),
    enabled: Boolean(id),
  });
}
