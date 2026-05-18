import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  Trophy,
  ArrowLeft,
  MessageSquare,
  Moon,
  Sun,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/context/ThemeContext";

export default function Signup() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
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
      const nextInput = document.getElementById(`signup-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`signup-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const resendOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 z-10">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Badge variant="outline" className="gap-2 px-4 py-2">
            <Trophy size={18} />
            Cricket Duniya
          </Badge>
        </div>

        <Card className="p-2 border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="pt-6">
            {step === "details" ? (
              <>
                <CardHeader className="px-0 pb-6 text-center">
                  <CardTitle className="text-3xl">Create account</CardTitle>
                  <p className="text-muted-foreground text-sm mt-2">
                    Join the cricket revolution today
                  </p>
                </CardHeader>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Full name</label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        size={18}
                      />
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="pl-10 h-11 bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Phone number</label>
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        size={18}
                      />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        className="pl-10 h-11 bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Password</label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        size={18}
                      />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="pl-10 pr-10 h-11 bg-background"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive font-medium">{error}</p>}

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
                  onClick={() => setStep("details")}
                  className="mb-4 px-0"
                >
                  <ArrowLeft size={18} />
                  Back
                </Button>

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                    <MessageSquare className="text-foreground" size={28} />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Verify OTP</h1>
                  <p className="text-muted-foreground text-sm">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-semibold text-foreground">{phone}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        id={`signup-otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-11 text-center text-lg font-bold bg-background"
                      />
                    ))}
                  </div>

                  {error && (
                    <p className="text-sm text-destructive text-center font-medium">{error}</p>
                  )}

                  <Button type="submit" className="w-full h-11 text-base">
                    Verify & create account
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

            {step === "details" && (
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
                  Continue as guest
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {step === "details" && (
          <p className="text-center mt-6 text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-foreground underline">
              Sign in
            </Link>
          </p>
        )}

        <p className="text-center mt-4">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
