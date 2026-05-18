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
          "mb-2 rounded-2xl border border-border bg-card py-0 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        isLive && "border-green-600/30 dark:border-green-500/40 shadow-green-600/5 ring-1 ring-green-600/10"
        )}
      >
        <CardContent className="p-3.5 space-y-2.5">
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
              {getStatusLabel(match.status)}
            </p>
          </div>

          <h3 className="text-[1.15rem] font-bold leading-snug tracking-tight">
            {title}
          </h3>

          <div className="rounded-xl bg-background border border-border overflow-hidden">
            <div className="flex items-stretch">
              <TeamScore
                team={match.teamOneName}
                score={match.teamOneScore}
                highlight={isLive}
              />
              <div className="w-px bg-border self-stretch my-2" />
              <TeamScore
                team={match.teamTwoName}
                score={match.teamTwoScore}
                highlight={isLive}
              />
            </div>
          </div>

          <p className="text-muted-foreground text-sm leading-snug border-t border-dashed border-border pt-2">
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
    <div className="flex-1 py-2.5 px-2 text-center">
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
