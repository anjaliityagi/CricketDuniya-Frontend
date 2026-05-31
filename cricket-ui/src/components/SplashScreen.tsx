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
            <p className="brand-wordmark text-sm font-black uppercase tracking-[0.28em]">
              CricRx
            </p>
            <p className="text-xs text-muted-foreground">Live cricket scoring</p>
          </div>
        </div>

        <div className="splash-player-wrap" aria-hidden="true">
          <div className="splash-ball" />
          <svg
            className="splash-player"
            viewBox="0 0 260 300"
            role="img"
            aria-label="Cricket bat transition"
          >
            <defs>
              <linearGradient id="batGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#f8d9a6" />
                <stop offset="48%" stopColor="#d79545" />
                <stop offset="100%" stopColor="#81501f" />
              </linearGradient>
              <linearGradient id="batEdgeGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#fff2cd" />
                <stop offset="100%" stopColor="#b8742a" />
              </linearGradient>
            </defs>
            <g className="splash-bat" transform="rotate(-23 134 144)">
              <rect
                x="116"
                y="58"
                width="42"
                height="158"
                rx="20"
                fill="url(#batGradient)"
              />
              <rect
                x="121"
                y="68"
                width="11"
                height="136"
                rx="6"
                fill="url(#batEdgeGradient)"
                opacity="0.58"
              />
              <rect x="129" y="20" width="15" height="56" rx="7.5" fill="#2d3c57" />
              <rect x="126" y="16" width="21" height="13" rx="6.5" fill="#172238" />
              <path
                d="M116 204c12 12 30 12 42 0v22c0 16-10 27-21 27s-21-11-21-27v-22Z"
                fill="#c47a2d"
              />
            </g>

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
