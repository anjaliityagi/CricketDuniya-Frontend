import { useQuery } from "@tanstack/react-query";

import { fetchProfile } from "@/services/profile";

export const profileQueryKey = ["profile"];

export function useProfileQuery(enabled = true) {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
    enabled,
  });
}
