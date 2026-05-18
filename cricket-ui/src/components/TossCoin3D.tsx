import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type TossCoin3DProps = {
  abbrOne: string;
  abbrTwo: string;
  flipNonce: number;
  isFlipping: boolean;
  flipTarget: "one" | "two" | null;
  /** When not flipping, which face is up (team one = 0°, team two = 180°) */
  landedWinner: "one" | "two" | "";
};

/**
 * Shared 3D coin: arc toss animation (see `.toss-coin-spin-one` / `-two` in globals.css).
 */
export default function TossCoin3D({
  abbrOne,
  abbrTwo,
  flipNonce,
  isFlipping,
  flipTarget,
  landedWinner,
}: TossCoin3DProps) {
  return (
    <div className="mx-auto [perspective:880px]">
      <div
        key={flipNonce}
        className={cn(
          "toss-coin-track relative mx-auto h-32 w-32 will-change-transform",
          isFlipping && flipTarget === "one" && "toss-coin-spin-one",
          isFlipping && flipTarget === "two" && "toss-coin-spin-two"
        )}
        style={
          !isFlipping
            ? ({
                transform: `rotateX(10deg) rotateY(${landedWinner === "two" ? 180 : 0}deg)`,
              } as CSSProperties)
            : undefined
        }
      >
        <div
          className={cn(
            "toss-coin-face absolute inset-0 flex items-center justify-center rounded-full border-4 border-blue-500",
            "bg-gradient-to-br from-sky-200 via-blue-400 to-blue-600 shadow-xl",
            "text-2xl font-black text-blue-950 ring-2 ring-blue-300/50"
          )}
        >
          {abbrOne}
        </div>
        <div
          className={cn(
            "toss-coin-face toss-coin-back absolute inset-0 flex items-center justify-center rounded-full border-4 border-sky-500",
            "bg-gradient-to-br from-sky-200 to-sky-600 shadow-xl",
            "text-2xl font-black text-sky-950 ring-2 ring-sky-300/40"
          )}
        >
          {abbrTwo}
        </div>
      </div>
    </div>
  );
}
