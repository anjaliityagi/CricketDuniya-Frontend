import { useMutation } from "@tanstack/react-query";

import { login, type LoginPayload } from "@/services/auth";

export function useLoginMutation() {
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
  });
}
