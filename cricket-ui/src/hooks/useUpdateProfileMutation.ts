import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profileQueryKey } from "@/hooks/useProfileQuery";
import { updateProfile, type UpdateProfilePayload } from "@/services/profile";

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile);
    },
  });
}
