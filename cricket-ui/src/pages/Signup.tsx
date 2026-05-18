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
} from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
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
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold">
            <Trophy size={18} />
            Cricket Duniya
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          {step === "details" ? (
            <>
              <h1 className="text-3xl font-bold text-center mb-2">
                Create Account
              </h1>
              <p className="text-slate-400 text-center mb-8">
                Join the cricket revolution today
              </p>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      size={20}
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      size={20}
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      size={20}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 py-3 rounded-xl font-bold text-lg transition"
                >
                  Send OTP
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("details")}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
              >
                <ArrowLeft size={20} />
                Back
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="text-green-400" size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Verify OTP</h1>
                <p className="text-slate-400">
                  Enter the 6-digit code sent to{" "}
                  <span className="text-green-400">{phone}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`signup-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl text-center text-xl font-bold focus:outline-none focus:border-green-500 transition"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 py-3 rounded-xl font-bold text-lg transition"
                >
                  Verify & Create Account
                </button>
              </form>

              <p className="text-center text-slate-400 mt-6">
                Didn't receive the code?{" "}
                <button
                  onClick={resendOtp}
                  className="text-green-400 hover:text-green-300"
                >
                  Resend OTP
                </button>
              </p>
            </>
          )}

          {step === "details" && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-slate-500 text-sm">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <button
                onClick={() => navigate("/matches")}
                className="w-full border border-slate-700 hover:border-green-400 py-3 rounded-xl font-bold transition"
              >
                Continue as Guest
              </button>
            </>
          )}
        </div>

        {step === "details" && (
          <p className="text-center mt-6 text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-green-400 hover:text-green-300 font-semibold"
            >
              Sign In
            </Link>
          </p>
        )}

        <div className="text-center mt-4">
          <Link to="/" className="text-slate-500 hover:text-slate-400 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
