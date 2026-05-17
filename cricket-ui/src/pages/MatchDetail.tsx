import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import {
  addRuns,
  addWicket,
  endMatch,
  getMatchById,
} from "@/data/matchStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(() => getMatchById(id || ""));

  function refreshMatch() {
    setMatch(getMatchById(id || ""));
  }

  if (!match) {
    return (
      <div className="max-w-[430px] mx-auto text-center py-20">
        <p className="font-semibold mb-2">Match not found</p>
        <Button asChild variant="outline">
          <Link to="/matches">Go back</Link>
        </Button>
      </div>
    );
  }

  const title = `${match.teamOneName} vs ${match.teamTwoName}`;
  const isLive = match.status === "live";

  function handleStartMatch() {
    if (!id) return;
    navigate(`/matches/${id}/toss`);
  }

  function handleEndMatch() {
    if (!id) return;
    endMatch(id);
    refreshMatch();
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

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-600 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
              </span>
            )}
            <p
              className={cn(
                "text-[11px] font-bold tracking-[0.14em] uppercase",
                isLive ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {match.status === "live"
                ? "LIVE NOW"
                : match.status === "completed"
                  ? "COMPLETED"
                  : "UPCOMING"}
            </p>
          </div>

          <h1 className="text-2xl font-bold">{title}</h1>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-semibold text-foreground">Venue:</span>{" "}
              {match.venue || "Not added"}
            </p>
            <p>
              <span className="font-semibold text-foreground">Overs:</span>{" "}
              {match.overs_per_side}
            </p>
            {match.tossWinner && match.tossDecision && (
              <p>
                <span className="font-semibold text-foreground">Toss:</span>{" "}
                {match.tossWinner === "one" ? match.teamOneName : match.teamTwoName} won,
                chose to {match.tossDecision}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-background border border-border overflow-hidden">
            <div className="flex items-stretch">
              <ScoreBox team={match.teamOneName} score={match.teamOneScore} />
              <div className="w-px bg-border self-stretch my-4" />
              <ScoreBox team={match.teamTwoName} score={match.teamTwoScore} />
            </div>
          </div>

          <p className="text-muted-foreground text-sm border-t border-dashed border-border pt-3">
            {match.matchNote}
          </p>

          {(match.teamOnePlayers?.length || match.teamTwoPlayers?.length) ? (
            <div className="text-sm space-y-1 pt-1">
              <p>
                <span className="font-semibold text-foreground">{match.teamOneName}:</span>{" "}
                {match.teamOnePlayers?.length || 0} players
              </p>
              <p>
                <span className="font-semibold text-foreground">{match.teamTwoName}:</span>{" "}
                {match.teamTwoPlayers?.length || 0} players
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {match.status === "scheduled" && (
        <Button asChild variant="outline" className="w-full h-11 mb-3">
          <Link to={`/matches/${id}/setup`}>Edit Players</Link>
        </Button>
      )}

      {match.status === "scheduled" && (
        <Button className="w-full h-11" onClick={handleStartMatch}>
          Start Match
        </Button>
      )}

      {match.status === "live" && (
        <div className="space-y-4">
          <ScorePad
            teamName={match.teamOneName}
            onAddRuns={(runs) => {
              addRuns(id!, "one", runs);
              refreshMatch();
            }}
            onWicket={() => {
              addWicket(id!, "one");
              refreshMatch();
            }}
          />

          <ScorePad
            teamName={match.teamTwoName}
            onAddRuns={(runs) => {
              addRuns(id!, "two", runs);
              refreshMatch();
            }}
            onWicket={() => {
              addWicket(id!, "two");
              refreshMatch();
            }}
          />

          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleEndMatch}
          >
            End Match
          </Button>
        </div>
      )}
    </div>
  );
}

function ScoreBox({ team, score }: { team: string; score?: string }) {
  return (
    <div className="flex-1 py-5 px-2 text-center">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {team}
      </p>
      <p className="font-mono text-lg font-bold">{score || "—"}</p>
    </div>
  );
}

type ScorePadProps = {
  teamName: string;
  onAddRuns: (runs: number) => void;
  onWicket: () => void;
};

function ScorePad({ teamName, onAddRuns, onWicket }: ScorePadProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        <p className="font-bold text-sm">Update {teamName}</p>

        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" onClick={() => onAddRuns(0)}>
            Dot
          </Button>
          <Button type="button" variant="outline" onClick={() => onAddRuns(1)}>
            +1
          </Button>
          <Button type="button" variant="outline" onClick={() => onAddRuns(2)}>
            +2
          </Button>
          <Button type="button" variant="outline" onClick={() => onAddRuns(4)}>
            +4
          </Button>
          <Button type="button" variant="outline" onClick={() => onAddRuns(6)}>
            +6
          </Button>
          <Button type="button" variant="default" onClick={onWicket}>
            Wicket
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
