import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Radio, Calendar, Trophy, Loader2, RefreshCw } from "lucide-react";

import type { Match } from "@/data/mockMatches";
import MatchCard from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
import { useMatchesQuery } from "@/hooks/useMatchesQuery";
import { cn } from "@/lib/utils";

type FilterType = "all" | Match["status"];

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "scheduled", label: "Upcoming" },
  { id: "completed", label: "Done" },
];

export default function Matches() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const {
    data: allMatches = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useMatchesQuery();

  const liveCount = allMatches.filter((m) => m.status === "live").length;
  const upcomingCount = allMatches.filter((m) => m.status === "scheduled").length;
  const completedCount = allMatches.filter((m) => m.status === "completed").length;

  const filteredMatches = useMemo(() => {
    if (activeFilter === "all") return allMatches;
    return allMatches.filter((match) => match.status === activeFilter);
  }, [activeFilter, allMatches]);

  return (
    <div className="max-w-[430px] mx-auto min-h-[85vh] pb-28">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
          CricRx
        </p>
        <h1 className="text-3xl font-black tracking-tight">Matches</h1>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Follow live scores and upcoming games
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <StatCard icon={Radio} label="Live" value={liveCount} active={liveCount > 0} />
        <StatCard icon={Calendar} label="Upcoming" value={upcomingCount} />
        <StatCard icon={Trophy} label="Done" value={completedCount} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            type="button"
            variant={activeFilter === filter.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "rounded-full px-4 shrink-0 h-9 font-semibold",
              activeFilter === filter.id && "shadow-sm"
            )}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-medium">Loading matches</span>
        </div>
      ) : isError ? (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-muted">
          <p className="font-semibold">Could not load matches</p>
          <p className="text-muted-foreground text-sm mt-2">
            Check the backend and try again
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-5 gap-2"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Retry
          </Button>
        </div>
      ) : filteredMatches.length > 0 ? (
        <div className="space-y-1">
          {activeFilter === "all" && liveCount > 0 && (
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
              Live now
            </p>
          )}
          {filteredMatches.map((match, index) => (
            <div key={match.id}>
              {activeFilter === "all" &&
                index > 0 &&
                match.status !== "live" &&
                filteredMatches[index - 1]?.status === "live" && (
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-6 px-1">
                    More matches
                  </p>
                )}
              <MatchCard match={match} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-muted">
          <p className="font-semibold">No matches here</p>
          <p className="text-muted-foreground text-sm mt-2">
            Try another filter or create a new match
          </p>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-10 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <Button asChild className="pointer-events-auto w-full h-12 rounded-2xl text-base font-bold shadow-xl gap-2">
          <Link to="/matches/create">
            <Plus size={20} strokeWidth={2.5} />
            Create Match
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-3 text-center transition-colors",
        active
          ? "border-primary/30 bg-primary/10"
          : "border-border bg-muted"
      )}
    >
      <Icon
        size={16}
        className={cn(
          "mx-auto mb-1.5",
          active ? "text-primary" : "text-muted-foreground"
        )}
      />
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
