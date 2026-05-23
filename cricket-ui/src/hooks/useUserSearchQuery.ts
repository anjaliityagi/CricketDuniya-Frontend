import { useQuery } from "@tanstack/react-query";

import { searchUsers } from "@/services/teams";

export function useUserSearchQuery(search: string) {
  return useQuery({
    queryKey: ["users", search],
    queryFn: () => searchUsers(search),
    enabled: search.trim().length >= 2,
  });
}
