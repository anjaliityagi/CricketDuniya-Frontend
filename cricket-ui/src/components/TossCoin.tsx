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
  const teamOneInitial = getTeamInitial(teamOneName, "A");
  const teamTwoInitial = getTeamInitial(teamTwoName, "B");
  const coinLabel = (
    <span className="coin-label">
      <span>{teamOneInitial}</span>
      <span className="coin-vs">vs</span>
      <span>{teamTwoInitial}</span>
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

function getTeamInitial(name: string, fallback: string) {
  return name.trim().charAt(0).toUpperCase() || fallback;
}
