import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Phone, Lock, Eye, EyeOff, Trophy, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import SplashScreen from "@/components/SplashScreen";
import { useAuth } from "@/context/AuthContext";
import { useLoginMutation } from "@/hooks/useLoginMutation";
import { getAuthErrorMessage } from "@/services/auth";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const loginMutation = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const isSubmitting = loginMutation.isPending;
  const successMessage =
    typeof location.state === "object" &&
    location.state &&
    "message" in location.state
      ? String(location.state.message)
      : "";

  useEffect(() => {
    if (!showSplash) return;

    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [showSplash]);

  function closeSplash() {
    setShowSplash(false);
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneNumber = normalizePhoneNumber(phone);

    if (!isValidPhoneNumber(phone)) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    try {
      setError("");
      const session = await loginMutation.mutateAsync({
        phone_number: phoneNumber,
        password,
      });

      setSession({
        token: session.token || null,
        user: session.user,
      });
      navigate("/home");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  if (showSplash) {
    return <SplashScreen onDone={closeSplash} />;
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
            <>
              <CardHeader className="px-0 pb-6 text-center">
                <CardTitle className="text-3xl">Welcome Back</CardTitle>
                <p className="text-muted-foreground text-sm mt-2">
                  Sign in to continue to your cricket world
                </p>
              </CardHeader>

              <form onSubmit={handleLogin} className="space-y-5">
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
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="pl-10 h-11"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-semibold text-primary hover:text-primary/80"
                    >
                      Forgot password?
                    </Link>
                  </div>
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
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {successMessage && !error && (
                  <p className="text-sm font-medium text-green-600">
                    {successMessage}
                  </p>
                )}
                {error && <p className="text-sm font-medium">{error}</p>}

                <Button
                  type="submit"
                  className="w-full h-11 text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Signing in
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>

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
                disabled={isSubmitting}
              >
                Continue as Guest
              </Button>
            </>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-muted-foreground text-sm">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold text-foreground underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
