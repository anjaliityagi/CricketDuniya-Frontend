import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  RotateCcw,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PhoneValidCheck from "@/components/PhoneValidCheck";
import { useForgotPasswordMutation } from "@/hooks/useForgotPasswordMutation";
import { useVerifyOtpMutation } from "@/hooks/useVerifyOtpMutation";
import { getPasswordResetErrorMessage } from "@/services/auth";
import {
  getPhoneValidationMessage,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/utils";

const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN_SECONDS = 45;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const verifyOtpMutation = useVerifyOtpMutation();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const normalizedPhone = useMemo(() => normalizePhoneNumber(phone), [phone]);
  const phoneError = getPhoneValidationMessage(phone);
  const isPhoneValid = !phoneError && isValidPhoneNumber(phone);
  const isSendingOtp = forgotPasswordMutation.isPending;
  const isVerifyingOtp = verifyOtpMutation.isPending;
  const isSubmitting = isSendingOtp || isVerifyingOtp;

  useEffect(() => {
    if (step !== "otp" || otpSecondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setOtpSecondsLeft((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpSecondsLeft, step]);

  useEffect(() => {
    if (step !== "otp" || resendSecondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setResendSecondsLeft((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSecondsLeft, step]);

  async function sendOtp(nextMessage = "OTP sent successfully") {
    if (phoneError || !isValidPhoneNumber(phone)) {
      setError(phoneError || "Enter a valid 10-digit phone number");
      return;
    }

    try {
      setError("");
      setMessage("");
      const response = await forgotPasswordMutation.mutateAsync({
        phone: normalizedPhone,
      });
      setStep("otp");
      setOtp("");
      setDevOtp(response.otp ?? "");
      setOtpSecondsLeft(OTP_EXPIRY_SECONDS);
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setMessage(nextMessage);
    } catch (err) {
      setError(getPasswordResetErrorMessage(err));
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    await sendOtp();
  }

  async function handleResendOtp() {
    if (resendSecondsLeft > 0 || isSubmitting) return;

    await sendOtp("OTP sent again");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();

    if (phoneError || !isValidPhoneNumber(phone)) {
      setError(phoneError || "Enter a valid 10-digit phone number");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill all required fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setError("");
      setMessage("");
      await verifyOtpMutation.mutateAsync({
        phone: normalizedPhone,
        otp,
        new_password: newPassword,
      });
      navigate("/login", {
        state: { message: "Password updated successfully. Please login." },
      });
    } catch (err) {
      setError(getPasswordResetErrorMessage(err));
    }
  }

  return (
    <div className="team-india-surface min-h-screen text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Badge variant="outline" className="gap-2 px-4 py-2">
            <Trophy size={18} />
            <span className="brand-wordmark">CricRx</span>
          </Badge>
        </div>

        <Card className="overflow-hidden p-2 shadow-xl">
          <div className="india-accent-strip -mx-2 -mt-2 mb-2 h-1.5" />
          <CardContent className="pt-6">
            <CardHeader className="px-0 pb-6 text-center">
              <CardTitle className="text-3xl">Reset Password</CardTitle>
              <p className="text-muted-foreground text-sm mt-2">
                {step === "phone"
                  ? "Enter your registered phone number"
                  : `OTP expires in ${formatTime(otpSecondsLeft)}`}
              </p>
            </CardHeader>

            {step === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={18}
                    />
                    <Input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError("");
                      }}
                      placeholder="9876543210"
                      className="pl-10 pr-10 h-11"
                      required
                      disabled={isSubmitting}
                    />
                    <PhoneValidCheck valid={isPhoneValid} className="right-3" />
                  </div>
                  {phoneError && (
                    <p className="mt-2 text-sm font-medium text-destructive">
                      {phoneError}
                    </p>
                  )}
                </div>

                {error && <p className="text-sm font-medium">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={isSubmitting}
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Sending OTP
                    </>
                  ) : (
                    <>
                      <KeyRound size={18} />
                      Send OTP
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    OTP
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={18}
                    />
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      pattern="\d{6}"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="123456"
                      className="pl-10 h-11"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={18}
                    />
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="pl-10 pr-10 h-11"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={18}
                    />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="pl-10 pr-10 h-11"
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {message && !error && (
                  <p className="text-sm font-medium text-green-600">
                    {message}
                  </p>
                )}
                {devOtp && (
                  <p className="text-xs text-muted-foreground">
                    OTP for testing: {devOtp}
                  </p>
                )}
                {error && <p className="text-sm font-medium">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={isSubmitting}
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Updating Password
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleResendOtp}
                  disabled={isSubmitting || resendSecondsLeft > 0}
                >
                  <RotateCcw size={18} />
                  {resendSecondsLeft > 0
                    ? `Resend OTP in ${resendSecondsLeft}s`
                    : "Resend OTP"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <ArrowLeft size={16} className="text-muted-foreground" />
          <Link to="/login" className="font-semibold text-foreground underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
