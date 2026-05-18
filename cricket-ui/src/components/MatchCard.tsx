import { Link } from "react-router-dom";

import type { Match } from "@/data/mockMatches";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MatchCardProps = {
  match: Match;
};

function getStatusLabel(status: Match["status"]) {
  if (status === "live") return "LIVE NOW";
  if (status === "completed") return "COMPLETED";
  return "UPCOMING";
}

function MatchCard({ match }: MatchCardProps) {
  const title = `${match.teamOneName} vs ${match.teamTwoName}`;
  const isLive = match.status === "live";

  return (
    <Link to={`/matches/${match.id}`} className="block">
      <Card
        className={cn(
          "mb-4 overflow-hidden rounded-2xl border border-border bg-card py-0 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        isLive && "border-primary/35 shadow-primary/10 ring-1 ring-primary/15"
        )}
      >
        {isLive && <div className="india-accent-strip h-1" />}
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
            <p
              className={cn(
                "text-[11px] font-bold tracking-[0.14em] uppercase",
                isLive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {getStatusLabel(match.status)}
            </p>
          </div>

          <h3 className="text-[1.35rem] font-bold leading-snug tracking-tight">
            {title}
          </h3>

          <div className="rounded-xl bg-background border border-border overflow-hidden">
            <div className="flex items-stretch">
              <TeamScore
                team={match.teamOneName}
                score={match.teamOneScore}
                highlight={isLive}
              />
              <div className="w-px bg-border self-stretch my-4" />
              <TeamScore
                team={match.teamTwoName}
                score={match.teamTwoScore}
                highlight={isLive}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed border-t border-dashed border-border pt-3">
            {match.matchNote || `${match.overs_per_side} overs`}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function TeamScore({
  team,
  score,
  highlight,
}: {
  team: string;
  score?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex-1 py-4 px-2 text-center">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        {team}
      </p>
      <p
        className={cn(
          "font-mono text-base font-bold tracking-tight",
          highlight ? "text-foreground" : "text-foreground/80"
        )}
      >
        {score || "—"}
      </p>
    </div>
  );
}

export default MatchCard;
