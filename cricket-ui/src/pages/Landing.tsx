import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="w-full">
            <div className="text-center lg:text-left">
              <div className="inline-block bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs sm:text-sm mb-6">
                Cricket Platform
              </div>

              <h1 className="text-3xl sm:text-5xl font-black leading-tight">
                Welcome to
                <span className="text-green-400"> Cricket Duniya</span>
              </h1>

              <p className="text-slate-400 mt-5 text-sm sm:text-base leading-6 sm:leading-7 max-w-xl mx-auto lg:mx-0">
                Create teams, manage matches, track live scores and run
                tournaments.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="w-full sm:w-auto bg-green-500 hover:bg-green-600 py-3 rounded-xl font-bold text-center"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="w-full sm:w-auto border border-slate-700 hover:border-green-400 py-3 rounded-xl font-bold text-center"
                >
                  Signup
                </Link>
              </div>

              <Link
                to="/home"
                className="block mt-5 text-sm text-slate-400 hover:text-green-400"
              >
                Continue as Guest →
              </Link>
            </div>
          </div>

          <div className="hidden lg:block w-full">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 blur-[120px] opacity-20" />

              <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <p className="text-slate-400 text-sm">Live Match</p>
                    <h2 className="text-2xl font-bold mt-1">
                      India vs Australia
                    </h2>
                  </div>

                  <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold">
                    LIVE
                  </span>
                </div>

                <div className="grid grid-cols-3 items-center text-center">
                  <div>
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 mb-3" />
                    <p className="font-bold">IND</p>
                    <p className="text-green-400 text-2xl font-black mt-2">
                      186/4
                    </p>
                  </div>

                  <div className="text-green-400 font-black text-3xl">VS</div>

                  <div>
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 mb-3" />
                    <p className="font-bold">AUS</p>
                    <p className="text-slate-400 mt-2">Yet to Bat</p>
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
