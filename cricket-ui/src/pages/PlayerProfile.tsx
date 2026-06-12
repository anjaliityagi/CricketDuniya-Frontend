import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2, Phone, Shield, Star, Trophy } from "lucide-react";

import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  fetchPlayerProfile,
  type BattingStats,
  type BowlingStats,
  type FieldingStats,
  type RecentMatchPerformance,
} from "@/services/profile";

type PlayerTab = "overview" | "batting" | "bowling" | "fielding" | "recent";

const tabs: { id: PlayerTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "batting", label: "Batting" },
  { id: "bowling", label: "Bowling" },
  { id: "fielding", label: "Fielding" },
  { id: "recent", label: "Recent" },
];

export default function PlayerProfile() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<PlayerTab>("overview");

  const { data: profile, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["player-profile", id],
    queryFn: () => fetchPlayerProfile(id || ""),
    enabled: Boolean(id),
  });

  const initials = useMemo(() => {
    const source = profile?.user.name || "Player";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.user.name]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[430px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-semibold">Loading player profile</span>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-[430px] px-4 py-8">
        <div className="rounded-3xl border border-dashed border-border bg-muted px-5 py-12 text-center">
          <p className="text-lg font-bold text-foreground">Could not load player profile</p>
          <p className="mt-2 text-sm text-muted-foreground">Check the player link and try again.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button type="button" variant="outline" asChild>
              <Link to="/matches">Back to matches</Link>
            </Button>
            <Button type="button" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="animate-spin" size={16} /> : "Retry"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { user, summary, batting, bowling, fielding, recent_matches } = profile;

  return (
    <div className="mx-auto max-w-[430px] px-4 pb-24 pt-3">
      <div className="mb-4 flex items-center justify-between gap-3">
        <BackButton fallbackTo="/matches" label="Back to previous screen" iconOnly />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Player Profile</p>
          <h1 className="truncate text-xl font-black text-foreground">{user.name}</h1>
        </div>
        <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Shield size={20} />
        </div>
      </div>

      <Card className="overflow-hidden border-border bg-card py-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-background/80 p-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg font-black text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-2xl font-black text-foreground">{user.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone size={14} />
                {user.phone_number || "Phone not available"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StylePill icon={Activity} label={user.batting_style || "Batting style not added"} />
                <StylePill icon={Shield} label={user.bowling_style || "Bowling style not added"} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <SummaryCard label="Matches" value={summary.matches_played} />
            <SummaryCard label="Points" value={summary.points} />
            <SummaryCard label="Win %" value={summary.win_percentage + "%"} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <SummaryCard label="Won" value={summary.won} />
            <SummaryCard label="Lost" value={summary.lost} />
            <SummaryCard label="MVPs" value={summary.mvps} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-5 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "h-10 rounded-xl px-1 text-[11px] font-bold uppercase tracking-wide transition",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "overview" && (
          <div className="space-y-3">
            <Card className="border-border bg-card shadow-sm">
              <CardContent className="grid grid-cols-2 gap-3 p-4">
                <MetricCard icon={Star} label="Career runs" value={batting.runs} />
                <MetricCard icon={Trophy} label="Career wickets" value={bowling.wickets} />
                <MetricCard icon={Activity} label="Batting SR" value={batting.strike_rate.toFixed(2)} />
                <MetricCard icon={Shield} label="Economy" value={bowling.economy.toFixed(2)} />
              </CardContent>
            </Card>
            <RecentMatchesSection matches={recent_matches} />
          </div>
        )}

        {activeTab === "batting" && <BattingPanel batting={batting} />}
        {activeTab === "bowling" && <BowlingPanel bowling={bowling} />}
        {activeTab === "fielding" && <FieldingPanel fielding={fielding} />}
        {activeTab === "recent" && <RecentMatchesSection matches={recent_matches} />}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-3 py-3 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-black text-foreground">{value}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={14} />
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <p className="mt-2 text-xl font-black text-foreground">{value}</p>
    </div>
  );
}

function StylePill({ icon: Icon, label }: { icon: typeof Activity; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
      <Icon size={12} className="text-primary" />
      <span>{label}</span>
    </div>
  );
}

function BattingPanel({ batting }: { batting: BattingStats }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="grid grid-cols-2 gap-3 p-4">
        <StatBox label="Runs" value={batting.runs} />
        <StatBox label="Innings" value={batting.innings} />
        <StatBox label="Average" value={batting.average.toFixed(2)} />
        <StatBox label="Strike rate" value={batting.strike_rate.toFixed(2)} />
        <StatBox label="High score" value={batting.high_score} />
        <StatBox label="Ducks" value={batting.ducks} />
        <StatBox label="30s" value={batting.thirties} />
        <StatBox label="50s" value={batting.fifties} />
        <StatBox label="100s" value={batting.hundreds} />
        <StatBox label="Fours" value={batting.fours} />
        <StatBox label="Sixes" value={batting.sixes} />
      </CardContent>
    </Card>
  );
}

function BowlingPanel({ bowling }: { bowling: BowlingStats }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="grid grid-cols-2 gap-3 p-4">
        <StatBox label="Overs" value={bowling.overs_bowled} />
        <StatBox label="Wickets" value={bowling.wickets} />
        <StatBox label="Runs conceded" value={bowling.runs_conceded} />
        <StatBox label="Maidens" value={bowling.maidens} />
        <StatBox label="Economy" value={bowling.economy.toFixed(2)} />
      </CardContent>
    </Card>
  );
}

function FieldingPanel({ fielding }: { fielding: FieldingStats }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="grid grid-cols-3 gap-3 p-4">
        <StatBox label="Catches" value={fielding.catches} />
        <StatBox label="Stumping" value={fielding.stumping} />
        <StatBox label="Run outs" value={fielding.run_outs} />
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-black text-foreground">{value}</p>
    </div>
  );
}

function RecentMatchesSection({ matches }: { matches: RecentMatchPerformance[] }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <p className="text-sm font-black text-foreground">Recent matches</p>
        {matches.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No recent performances yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {matches.map((match) => (
              <div key={match.match_id} className="rounded-2xl border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-foreground">
                      {match.team_name} vs {match.opponent_name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(match.match_date)}
                    </p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase",
                    match.result === "Won"
                      ? "bg-emerald-100 text-emerald-700"
                      : match.result === "Lost"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {match.result}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p className="rounded-xl border border-border px-3 py-2">Runs: <span className="font-bold">{match.runs_scored}</span> ({match.balls_faced})</p>
                  <p className="rounded-xl border border-border px-3 py-2">Wkts: <span className="font-bold">{match.wickets_taken}</span></p>
                  <p className="rounded-xl border border-border px-3 py-2">Overs: <span className="font-bold">{match.overs_bowled}</span></p>
                  <p className="rounded-xl border border-border px-3 py-2">Points: <span className="font-bold">{match.fantasy_points}</span></p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Fielding: {match.catches} catches, {match.stumping} stumpings, {match.run_outs} run outs
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
