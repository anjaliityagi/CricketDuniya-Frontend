import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Trophy } from "lucide-react";

export default function Landing() {
  return (
    <div className="team-india-surface min-h-screen text-foreground">
      <div className="mx-auto max-w-[430px] px-4 py-8">
        <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center gap-8">
          <div className="w-full">
            <div className="text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/85 px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
                <Trophy size={14} />
                Simple Cricket Scoring App
              </div>

              <h1 className="text-[2.55rem] font-black leading-[0.98]">
                Welcome to
                <span className="brand-wordmark block">CricRx</span>
              </h1>

              <p className="text-muted-foreground mx-auto mt-5 max-w-sm text-[0.95rem] leading-7">
                Create teams, manage matches, track live scores and run
                tournaments.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  to="/login"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-center font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.98]"
                >
                  Login
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-card/80 px-6 text-center font-bold shadow-sm transition hover:border-primary/40 hover:bg-accent active:scale-[0.98]"
                >
                  Signup
                </Link>
              </div>

              <Link
                to="/home"
                className="block mt-5 text-sm text-muted-foreground hover:text-primary"
              >
                Continue as Guest
              </Link>
            </div>
          </div>

          <div className="w-full">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 p-5 shadow-xl">
              <div className="india-accent-strip absolute left-0 right-0 top-0 h-1.5" />
              <div className="mb-7 flex items-center justify-between">
                <div>
                  <p className="section-eyebrow">Live Match</p>
                  <h2 className="mt-1 text-xl font-bold">
                    Strikers vs Chargers
                  </h2>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-extrabold text-green-600 dark:text-green-300">
                  <ShieldCheck size={13} />
                  LIVE
                </span>
              </div>

              <div className="grid grid-cols-3 items-center text-center">
                <div>
                  <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-sm font-black text-primary">
                    STR
                  </div>
                  <p className="font-bold">Strikers</p>
                  <p className="mt-2 text-2xl font-black text-primary">
                    186/4
                  </p>
                </div>

                <div className="text-2xl font-black text-muted-foreground">VS</div>

                <div>
                  <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-sm font-black text-amber-600">
                    CHG
                  </div>
                  <p className="font-bold">Chargers</p>
                  <p className="mt-2 text-sm font-bold text-muted-foreground">
                    Yet to Bat
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
