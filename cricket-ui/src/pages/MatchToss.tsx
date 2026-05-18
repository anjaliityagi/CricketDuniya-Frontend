import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { canProceedToBatBowlToss, getMatchById, startMatchWithToss } from "@/data/matchStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TossCoin3D from "@/components/TossCoin3D";
import { cn } from "@/lib/utils";

type TossWinner = "one" | "two" | "";
type TossDecision = "bat" | "bowl" | "";

export default function MatchToss() {
  const { id } = useParams();
  const navigate = useNavigate();

  const match = getMatchById(id || "");
  const [tossWinner, setTossWinner] = useState<TossWinner>("");
  const [tossDecision, setTossDecision] = useState<TossDecision>("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipNonce, setFlipNonce] = useState(0);
  const [flipTarget, setFlipTarget] = useState<"one" | "two" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (match && (match.status === "live" || match.status === "completed")) {
      navigate(`/matches/${id}`);
    }
  }, [match, id, navigate]);

  useEffect(() => {
    if (!id) return;
    const m = getMatchById(id);
    if (m && m.status === "scheduled" && !canProceedToBatBowlToss(m)) {
      navigate(`/matches/${id}/setup`, { replace: true });
    }
  }, [id, navigate]);

  if (!match || !id) {
    return (
      <div className="max-w-[430px] mx-auto text-center py-20">
        <p className="font-semibold mb-2">Match not found</p>
        <Button asChild variant="outline">
          <Link to="/matches">Go back</Link>
        </Button>
      </div>
    );
  }

  if (match.status === "live" || match.status === "completed") {
    return null;
  }

  const winnerName =
    tossWinner === "one" ? match.teamOneName : tossWinner === "two" ? match.teamTwoName : "";

  const abbrOne = match.teamOneName.trim().slice(0, 2).toUpperCase() || "T1";
  const abbrTwo = match.teamTwoName.trim().slice(0, 2).toUpperCase() || "T2";

  function handleFlipCoin() {
    if (isFlipping) return;

    const winner = Math.random() < 0.5 ? "one" : "two";
    setFlipTarget(winner);
    setFlipNonce((n) => n + 1);
    setIsFlipping(true);
    setTossWinner("");
    setTossDecision("");
    setError("");

    setTimeout(() => {
      setTossWinner(winner);
      setIsFlipping(false);
      setFlipTarget(null);
    }, 1550);
  }

  function handleConfirm() {
    if (!tossWinner) {
      setError("Please flip the coin first");
      return;
    }

    if (!tossDecision) {
      setError("Please choose bat or bowl");
      return;
    }

    startMatchWithToss(id, tossWinner, tossDecision);
    navigate(`/matches/${id}`);
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to={`/matches/${id}/setup`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back
      </Link>

      <h1 className="text-2xl font-bold mb-1">Toss — bat or bowl</h1>
      <p className="text-muted-foreground text-sm mb-6">
        After setup: flip the coin, then choose bat or bowl.
      </p>

      <div className="flex flex-col items-center mb-8">
        <button
          type="button"
          onClick={handleFlipCoin}
          disabled={isFlipping}
          className="group relative touch-manipulation disabled:opacity-90"
          aria-label="Flip toss coin"
        >
          <TossCoin3D
            abbrOne={abbrOne}
            abbrTwo={abbrTwo}
            flipNonce={flipNonce}
            isFlipping={isFlipping}
            flipTarget={flipTarget}
            landedWinner={tossWinner}
          />
          {!isFlipping ? (
            <p className="mt-2 text-center text-xs font-medium text-muted-foreground">Tap to flip</p>
          ) : null}
        </button>

        <p className="text-sm text-muted-foreground mt-4 min-h-[1.25rem] text-center">
          {isFlipping ? "Flipping…" : tossWinner ? "Toss result is ready" : "Tap the coin to flip"}
        </p>

        {tossWinner && !isFlipping && (
          <p className="text-base font-bold mt-2 text-green-600">{winnerName} won the toss!</p>
        )}
      </div>

      <div className="flex justify-center gap-10 mb-8">
        <TossTeamCircle
          label={match.teamOneName}
          isWinner={tossWinner === "one"}
          isFlipping={isFlipping}
        />
        <TossTeamCircle
          label={match.teamTwoName}
          isWinner={tossWinner === "two"}
          isFlipping={isFlipping}
        />
      </div>

      {tossWinner && !isFlipping && (
        <Card className="bg-card border-border mb-4">
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold">
              {winnerName} won the toss — choose to
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={tossDecision === "bat" ? "default" : "outline"}
                className="h-12"
                onClick={() => {
                  setTossDecision("bat");
                  setError("");
                }}
              >
                Bat
              </Button>
              <Button
                type="button"
                variant={tossDecision === "bowl" ? "default" : "outline"}
                className="h-12"
                onClick={() => {
                  setTossDecision("bowl");
                  setError("");
                }}
              >
                Bowl
              </Button>
            </div>

            <Button type="button" variant="ghost" className="w-full" onClick={handleFlipCoin}>
              Flip coin again
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm font-medium mb-4">{error}</p>}

      <Button className="w-full h-11" onClick={handleConfirm} disabled={isFlipping}>
        Start Match
      </Button>
    </div>
  );
}

function TossTeamCircle({
  label,
  isWinner,
  isFlipping,
}: {
  label: string;
  isWinner: boolean;
  isFlipping: boolean;
}) {
  const shortName = label.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "w-20 h-20 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-all",
          isWinner && !isFlipping
            ? "border-green-600 bg-green-50 dark:bg-green-950/40 text-foreground scale-105"
            : "border-border bg-card text-foreground opacity-80"
        )}
      >
        {shortName}
      </div>
      <p className="text-sm font-semibold max-w-[100px] truncate">{label}</p>
      {isWinner && !isFlipping && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-green-600">
          Won toss
        </span>
      )}
    </div>
  );
}
