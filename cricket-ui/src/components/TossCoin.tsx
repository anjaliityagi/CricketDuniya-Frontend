import { cn } from "@/lib/utils";

type TossCoinProps = {
  isFlipping: boolean;
  onFlip: () => void;
  disabled?: boolean;
  flipDurationMs?: number;
};

export default function TossCoin({
  isFlipping,
  onFlip,
  disabled = false,
  flipDurationMs = 1400,
}: TossCoinProps) {
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
            <span className="coin-label">CD</span>
          </div>
          <div className="coin-face coin-face-back">
            <span className="coin-label coin-label-back">CD</span>
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
