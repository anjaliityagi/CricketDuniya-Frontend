import { useMutation } from "@tanstack/react-query";

import { signup, type SignupPayload } from "@/services/auth";

export function useSignupMutation() {
  return useMutation({
    mutationFn: (payload: SignupPayload) => signup(payload),
  });
}
