import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";

import TossCoin from "@/components/TossCoin";
import { useFirstPickMutation } from "@/hooks/useFirstPickMutation";
import { useMatchQuery } from "@/hooks/useMatchQuery";
import { Button } from "@/components/ui/button";
import { formatTeamName, getTeamInitials } from "@/lib/teamName";
import { cn } from "@/lib/utils";

type TossWinner = "one" | "two" | "";

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

export default function MatchPickToss() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading } = useMatchQuery(id);
  const firstPickMutation = useFirstPickMutation(id);

  const [tossWinner, setTossWinner] = useState<TossWinner>("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (match?.first_pick_team_id && id) {
      navigate(`/matches/${id}/players`, { replace: true });
    }
  }, [match?.first_pick_team_id, id, navigate]);

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

  if (match.first_pick_team_id) {
    return null;
  }

  const currentMatch = match;
  const winnerName =
    tossWinner === "one" ? formatTeamName(currentMatch.teamOneName) : tossWinner === "two" ? formatTeamName(currentMatch.teamTwoName) : "";

  function handleFlipCoin() {
    if (isFlipping) return;

    setIsFlipping(true);
    setTossWinner("");
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

    const winnerTeamId =
      tossWinner === "one" ? currentMatch.team_a_id : currentMatch.team_b_id;
    const firstPickTeamId = winnerTeamId;

    if (!firstPickTeamId) {
      setError("Team details are missing for this match");
      return;
    }

    try {
      await firstPickMutation.mutateAsync(firstPickTeamId);
      sessionStorage.setItem(`cricket_match_draft_first_pick_${id}`, firstPickTeamId);
      navigate(`/matches/${id}/players`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save pick order. Please try again."));
    }
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to="/matches"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back to matches
      </Link>

      <h1 className="text-2xl font-bold mb-1">Player Pick Toss</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Flip the coin to decide who gets the first player pick. The toss winner always picks first.
      </p>

      <div className="flex flex-col items-center mb-8">
        <TossCoin
          isFlipping={isFlipping}
          onFlip={handleFlipCoin}
          teamOneName={currentMatch.teamOneName}
          teamTwoName={currentMatch.teamTwoName}
        />

        <p className="text-sm text-muted-foreground mt-4">
          {isFlipping
            ? "Flipping..."
            : tossWinner
              ? "Toss result is ready"
              : "Tap coin to flip"}
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


      {error && (
        <p className="text-sm font-medium text-destructive mb-4">{error}</p>
      )}

      <Button
        className="w-full h-11"
        onClick={handleConfirm}
        disabled={isFlipping || firstPickMutation.isPending}
      >
        {firstPickMutation.isPending && <Loader2 className="animate-spin" size={16} />}
        {firstPickMutation.isPending ? "Saving..." : "Continue to Player Pick"}
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
  const shortName = getTeamInitials(label);

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
      <p className="text-sm font-semibold max-w-[100px] truncate">
        {formatTeamName(label)}
      </p>
      {isWinner && !isFlipping && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-green-600">
          Won toss
        </span>
      )}
    </div>
  );
}
