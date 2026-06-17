import { cn } from "@/lib/utils";

type TossCoinProps = {
  isFlipping: boolean;
  onFlip: () => void;
  disabled?: boolean;
  flipDurationMs?: number;
  teamOneName?: string;
  teamTwoName?: string;
};

export default function TossCoin({
  isFlipping,
  onFlip,
  disabled = false,
  flipDurationMs = 1400,
  teamOneName = "",
  teamTwoName = "",
}: TossCoinProps) {
  const teamOneInitial = getCoinTeamLabel(teamOneName, "A");
  const teamTwoInitial = getCoinTeamLabel(teamTwoName, "B");
  const isCompactLabel = teamOneInitial.length + teamTwoInitial.length > 4;
  const coinLabel = (
    <span className={cn("coin-label", isCompactLabel && "coin-label-compact")}>
      <span className="coin-team-code">{teamOneInitial}</span>
      <span className="coin-vs">vs</span>
      <span className="coin-team-code">{teamTwoInitial}</span>
    </span>
  );

  return (
    <button
      type="button"
      onClick={onFlip}
      disabled={disabled || isFlipping}
      className="coin-toss-button disabled:opacity-80"
      aria-label="Flip coin"
    >
      <div className="coin-scene">
        <div
          className={cn("coin-flipper", isFlipping && "coin-flipping")}
          style={
            isFlipping ? { animationDuration: `${flipDurationMs}ms` } : undefined
          }
        >
          <div className="coin-face coin-face-front">
            {coinLabel}
          </div>
          <div className="coin-face coin-face-back">
            <span className="coin-label-back">{coinLabel}</span>
          </div>
          <div className="coin-edge" aria-hidden="true" />
        </div>
        <div
          className={cn("coin-shadow", isFlipping && "coin-shadow-flipping")}
          style={
            isFlipping ? { animationDuration: `${flipDurationMs}ms` } : undefined
          }
        />
      </div>
    </button>
  );
}

function getCoinTeamLabel(name: string | undefined, fallback: string) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return fallback;
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

  return words
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
