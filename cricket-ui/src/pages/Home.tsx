import { ChevronRight, Radio } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[90vh] flex items-center">
      <div className="max-w-7xl mx-auto px-6 py-16 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <Radio size={16} />
              Live Cricket Platform
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight">
              Manage Your
              <span className="text-green-400"> Cricket </span>
              World Easily
            </h1>

            {/* Description */}
            <p className="text-slate-400 text-lg leading-8 mt-8 max-w-2xl">
              Create teams, organize tournaments, manage live matches, track
              scores and build your own cricket ecosystem with modern tools.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <button className="bg-green-500 hover:bg-green-600 transition px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2">
                Explore Matches
                <ChevronRight size={20} />
              </button>

              <button className="border border-slate-700 hover:border-green-400 hover:text-green-400 transition px-8 py-4 rounded-2xl font-bold text-lg">
                Create Team
              </button>
            </div>
          </div>

          {/* Right Side Card */}
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-green-500 blur-[120px] opacity-20" />

            {/* Match Card */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl">
              {/* Top */}
              <div className="flex items-center justify-between mb-10">
                <div>
                  <p className="text-slate-400 text-sm">Live Match</p>

                  <h2 className="text-2xl font-bold mt-2">
                    India vs Australia
                  </h2>
                </div>

                <span className="bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                  LIVE
                </span>
              </div>

              {/* Teams */}
              <div className="grid grid-cols-3 items-center mb-10">
                {/* Team 1 */}
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-blue-500/20 mx-auto mb-4" />

                  <h3 className="text-xl font-bold">IND</h3>

                  <p className="text-3xl font-black text-green-400 mt-3">
                    186/4
                  </p>
                </div>

                {/* VS */}
                <div className="text-center text-3xl font-black text-green-400">
                  VS
                </div>

                {/* Team 2 */}
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-yellow-500/20 mx-auto mb-4" />

                  <h3 className="text-xl font-bold">AUS</h3>

                  <p className="text-xl text-slate-400 font-bold mt-3">
                    Yet to Bat
                  </p>
                </div>
              </div>

              {/* Bottom Stats */}
              <div className="bg-slate-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Current Over</p>

                  <h3 className="text-xl font-bold mt-1">18.4 Overs</h3>
                </div>

                <div>
                  <p className="text-slate-400 text-sm">Run Rate</p>

                  <h3 className="text-xl font-bold text-green-400 mt-1">
                    10.15
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
