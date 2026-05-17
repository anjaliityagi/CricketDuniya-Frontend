import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Phone, Lock, Eye, EyeOff, Trophy, ArrowLeft, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setError("");
    setStep("otp");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter valid OTP");
      return;
    }
    setError("");
    navigate("/home");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const resendOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Badge variant="outline" className="gap-2 px-4 py-2">
            <Trophy size={18} />
            Cricket Duniya
          </Badge>
        </div>

        <Card className="p-2">
          <CardContent className="pt-6">
            {step === "phone" ? (
              <>
                <CardHeader className="px-0 pb-6 text-center">
                  <CardTitle className="text-3xl">Welcome Back</CardTitle>
                  <p className="text-muted-foreground text-sm mt-2">
                    Sign in to continue to your cricket world
                  </p>
                </CardHeader>

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
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={18}
                      />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm font-medium">{error}</p>}

                  <Button type="submit" className="w-full h-11 text-base">
                    Send OTP
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("phone")}
                  className="mb-4 px-0"
                >
                  <ArrowLeft size={18} />
                  Back
                </Button>

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={28} />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Verify OTP</h1>
                  <p className="text-muted-foreground text-sm">
                    Code sent to <span className="font-semibold text-foreground">{phone}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-11 text-center text-lg font-bold"
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-sm text-center font-medium">{error}</p>
                  )}

                  <Button type="submit" className="w-full h-11 text-base">
                    Verify & Login
                  </Button>
                </form>

                <p className="text-center text-muted-foreground text-sm mt-6">
                  Didn&apos;t receive the code?{" "}
                  <button
                    type="button"
                    onClick={resendOtp}
                    className="font-semibold text-foreground underline"
                  >
                    Resend OTP
                  </button>
                </p>
              </>
            )}

            {step === "phone" && (
              <>
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-muted-foreground text-sm">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => navigate("/matches")}
                >
                  Continue as Guest
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {step === "phone" && (
          <p className="text-center mt-6 text-muted-foreground text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold text-foreground underline">
              Sign Up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
