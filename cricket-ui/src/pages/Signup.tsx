import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Phone, Lock, Eye, EyeOff, User, Trophy, Loader2 } from "lucide-react";

import { useSignupMutation } from "@/hooks/useSignupMutation";
import { getAuthErrorMessage } from "@/services/auth";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const signupMutation = useSignupMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isSubmitting = signupMutation.isPending;
  const message =
    typeof location.state === "object" &&
    location.state &&
    "message" in location.state
      ? String(location.state.message)
      : "";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const phoneNumber = normalizePhoneNumber(phone);

    if (!trimmedName) {
      setError("Please enter your name");
      return;
    }
    if (!isValidPhoneNumber(phone)) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setError("");
      await signupMutation.mutateAsync({
        name: trimmedName,
        phone_number: phoneNumber,
        password,
      });
      navigate("/login", {
        state: { message: "Account created successfully. Please login." },
      });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <div className="team-india-surface min-h-screen text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm font-semibold text-primary shadow-sm">
            <Trophy size={18} />
            CricRx
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/95 p-8 shadow-xl backdrop-blur">
          <div className="india-accent-strip -mx-8 -mt-8 mb-7 h-1.5 rounded-t-2xl" />
          <h1 className="text-3xl font-bold text-center mb-2">
            Create Account
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Join the cricket revolution today
          </p>

          {message && (
            <p className="mb-5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
              {message}
            </p>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Full Name
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={20}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-input bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={20}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-input bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={20}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full rounded-xl border border-input bg-background py-3 pl-12 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-lg font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating account
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-sm">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={() => navigate("/matches")}
            className="w-full rounded-xl border border-border py-3 font-bold transition hover:border-primary disabled:opacity-70"
            disabled={isSubmitting}
          >
            Continue as Guest
          </button>
        </div>

        <p className="text-center mt-6 text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-primary hover:text-primary/80 font-semibold"
          >
            Sign In
          </Link>
        </p>

        <div className="text-center mt-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
