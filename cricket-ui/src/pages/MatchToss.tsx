import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";

import TossCoin from "@/components/TossCoin";
import { useMatchQuery } from "@/hooks/useMatchQuery";
import { useTossMutation } from "@/hooks/useTossMutation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TossWinner = "one" | "two" | "";
type TossDecision = "bat" | "bowl" | "";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | string
      | undefined;

    if (typeof data === "string") return data;
    return data?.message ?? data?.error ?? fallback;
  }

  return fallback;
}

export default function MatchToss() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: match, isLoading } = useMatchQuery(id);
  const tossMutation = useTossMutation(id);
  const [tossWinner, setTossWinner] = useState<TossWinner>("");
  const [tossDecision, setTossDecision] = useState<TossDecision>("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [error, setError] = useState("");

  const tossAlreadyDone =
    Boolean(match?.tossDecision) ||
    match?.status === "live" ||
    match?.status === "completed";

  useEffect(() => {
    if (!match || !id) return;

    if (!match.first_pick_team_id) {
      navigate(`/matches/${id}/pick-toss`, { replace: true });
      return;
    }

    if (tossAlreadyDone) {
      navigate(`/matches/${id}`, { replace: true });
    }
  }, [match, tossAlreadyDone, id, navigate]);

  if (isLoading) {
    return (
      <div className="max-w-[430px] mx-auto flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Loading match</span>
      </div>
    );
  }

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

  if (tossAlreadyDone || !match.first_pick_team_id) {
    return null;
  }

  const winnerName =
    tossWinner === "one" ? match.teamOneName : tossWinner === "two" ? match.teamTwoName : "";

  function handleFlipCoin() {
    if (isFlipping) return;

    setIsFlipping(true);
    setTossWinner("");
    setTossDecision("");
    setError("");

    setTimeout(() => {
      setTossWinner(Math.random() < 0.5 ? "one" : "two");
      setIsFlipping(false);
    }, 1400);
  }

  async function handleConfirm() {
    if (!tossWinner) {
      setError("Please flip the coin first");
      return;
    }

    if (!tossDecision) {
      setError("Please choose bat or bowl");
      return;
    }

    const winnerTeamId = tossWinner === "one" ? match.team_a_id : match.team_b_id;

    if (!winnerTeamId) {
      setError("Team details are missing for this match");
      return;
    }

    try {
      await tossMutation.mutateAsync({
        match_id: id,
        toss_winner_team_id: winnerTeamId,
        decision: tossDecision,
      });
      navigate(`/matches/${id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit toss. Please try again."));
    }
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to={`/matches/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back to match
      </Link>

      <h1 className="text-2xl font-bold mb-1">Match Toss</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Flip the coin, then choose bat or bowl. The match will start after toss.
      </p>

      <div className="flex flex-col items-center mb-8">
        <TossCoin isFlipping={isFlipping} onFlip={handleFlipCoin} />

        <p className="text-sm text-muted-foreground mt-4">
          {isFlipping ? "Flipping..." : tossWinner ? "Toss result is ready" : "Tap coin to flip"}
        </p>

        {tossWinner && !isFlipping && (
          <p className="text-base font-bold mt-2 text-green-600">
            {winnerName} won the toss!
          </p>
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

          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm font-medium text-destructive mb-4">{error}</p>}

      <Button
        className="w-full h-11"
        onClick={handleConfirm}
        disabled={isFlipping || tossMutation.isPending}
      >
        {tossMutation.isPending && <Loader2 className="animate-spin" size={16} />}
        {tossMutation.isPending ? "Starting match..." : "Confirm Toss & Start Match"}
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
