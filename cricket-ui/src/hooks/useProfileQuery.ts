import { useQuery } from "@tanstack/react-query";

import { fetchProfile } from "@/services/profile";

export const profileQueryKey = ["profile"];

export function useProfileQuery() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
  });
}
