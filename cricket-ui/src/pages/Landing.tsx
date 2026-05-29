import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="team-india-surface min-h-screen text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="w-full">
            <div className="text-center lg:text-left">
              <div className="inline-block rounded-full border border-border bg-card/80 px-3 py-1 text-xs sm:text-sm mb-6 text-primary">
                Simple Cricket Scoring App
              </div>

              <h1 className="text-3xl sm:text-5xl font-black leading-tight">
                Welcome to
                <span className="brand-wordmark"> CricRx</span>
              </h1>

              <p className="text-muted-foreground mt-5 text-sm sm:text-base leading-6 sm:leading-7 max-w-xl mx-auto lg:mx-0">
                Create teams, manage matches, track live scores and run
                tournaments.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="w-full sm:w-auto rounded-xl bg-primary px-6 py-3 text-center font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="w-full sm:w-auto rounded-xl border border-border px-6 py-3 text-center font-bold hover:border-primary"
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

          <div className="hidden lg:block w-full">
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 p-6 shadow-xl sm:p-10">
                <div className="india-accent-strip absolute left-0 right-0 top-0 h-1.5" />
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <p className="text-muted-foreground text-sm">Live Match</p>
                    <h2 className="text-2xl font-bold mt-1">
                      Strikers vs Chargers
                    </h2>
                  </div>

                  <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-bold text-green-500">
                    LIVE
                  </span>
                </div>

                <div className="grid grid-cols-3 items-center text-center">
                  <div>
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 mb-3 border border-primary/30" />
                    <p className="font-bold">STR</p>
                    <p className="text-primary text-2xl font-black mt-2">
                      186/4
                    </p>
                  </div>

                  <div className="text-primary font-black text-3xl">VS</div>

                  <div>
                    <div className="w-16 h-16 mx-auto rounded-full bg-[#ff8a00]/20 mb-3 border border-[#ff8a00]/30" />
                    <p className="font-bold">CHG</p>
                    <p className="text-muted-foreground mt-2">Yet to Bat</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
