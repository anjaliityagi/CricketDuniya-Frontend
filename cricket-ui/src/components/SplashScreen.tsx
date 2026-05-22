import { Trophy } from "lucide-react";

type SplashScreenProps = {
  onDone: () => void;
};

const cricketQuotes = [
  "Every innings starts with belief.",
  "Play bold. Back your shot.",
  "One ball can change the whole match.",
  "Great teams are built one run at a time.",
  "Pressure is just the crowd getting louder.",
  "Stay in the crease. Dream beyond the boundary.",
  "Champions make the next delivery count.",
  "When the bat speaks, the scoreboard listens.",
];

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const quote =
    cricketQuotes[Math.floor(Math.random() * cricketQuotes.length)];

  return (
    <div className="splash-screen team-india-surface">
      <div className="splash-lights" />

      <div className="splash-content">
        <div className="splash-brand">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Trophy size={20} />
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-primary">
              CricRx
            </p>
            <p className="text-xs text-muted-foreground">Team India energy</p>
          </div>
        </div>

        <div className="splash-player-wrap" aria-hidden="true">
          <div className="splash-ball" />
          <svg
            className="splash-player"
            viewBox="0 0 260 300"
            role="img"
            aria-label="Female cricketer batting illustration"
          >
            <defs>
              <linearGradient id="jerseyGradient" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#1f7cff" />
                <stop offset="100%" stopColor="#073b91" />
              </linearGradient>
              <linearGradient id="batGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#f6d69d" />
                <stop offset="100%" stopColor="#b87322" />
              </linearGradient>
            </defs>

            <g className="splash-bat">
              <rect
                x="174"
                y="26"
                width="16"
                height="116"
                rx="8"
                fill="url(#batGradient)"
                transform="rotate(35 182 84)"
              />
              <rect
                x="180"
                y="3"
                width="8"
                height="40"
                rx="4"
                fill="#6b3b16"
                transform="rotate(35 184 23)"
              />
            </g>

            <ellipse cx="130" cy="276" rx="88" ry="15" fill="rgb(0 0 0 / 0.18)" />

            <path
              d="M103 79c-18 5-33 22-36 43 16 0 35-4 46-15 10-10 10-21-10-28Z"
              fill="#20122f"
            />
            <circle cx="124" cy="74" r="27" fill="#8b4f32" />
            <path
              d="M96 74c6-29 51-34 63-4-25-2-39 8-51 25-7-5-12-11-12-21Z"
              fill="#21152e"
            />
            <path
              d="M147 82c12 8 18 19 18 31-15-6-26-16-32-31h14Z"
              fill="#21152e"
            />

            <path
              d="M91 126c8-22 65-26 80-2l14 69c-31 19-72 19-105 0l11-67Z"
              fill="url(#jerseyGradient)"
            />
            <path
              d="M89 132c14 12 69 12 84-1l4 17c-19 12-73 12-91 0l3-16Z"
              fill="#ff8a00"
            />
            <path d="M108 123h34l-17 30-17-30Z" fill="#ffffff" opacity="0.9" />
            <path d="M112 136h26" stroke="#1fbf75" strokeWidth="5" strokeLinecap="round" />

            <path
              d="M95 133c-27 16-39 32-46 55"
              fill="none"
              stroke="#8b4f32"
              strokeWidth="15"
              strokeLinecap="round"
            />
            <path
              d="M162 130c22 15 36 31 43 54"
              fill="none"
              stroke="#8b4f32"
              strokeWidth="15"
              strokeLinecap="round"
            />
            <circle cx="49" cy="188" r="8" fill="#8b4f32" />
            <circle cx="207" cy="185" r="8" fill="#8b4f32" />

            <path d="M96 192l-17 70" stroke="#102a60" strokeWidth="18" strokeLinecap="round" />
            <path d="M157 192l32 66" stroke="#102a60" strokeWidth="18" strokeLinecap="round" />
            <path d="M79 263h-31" stroke="#ff8a00" strokeWidth="12" strokeLinecap="round" />
            <path d="M190 261h31" stroke="#ff8a00" strokeWidth="12" strokeLinecap="round" />
          </svg>
        </div>

        <div className="splash-copy">
          <h1>Ready for the next innings?</h1>
          <p>{quote}</p>
        </div>

        <div className="splash-loader" aria-hidden="true">
          <span />
        </div>

        <button type="button" className="splash-skip" onClick={onDone}>
          Skip
        </button>
      </div>
    </div>
  );
}
