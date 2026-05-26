import { useMutation } from "@tanstack/react-query";

import { verifyOtp, type VerifyOtpPayload } from "@/services/auth";

export function useVerifyOtpMutation() {
  return useMutation({
    mutationFn: (payload: VerifyOtpPayload) => verifyOtp(payload),
  });
}
