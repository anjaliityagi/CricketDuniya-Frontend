import { useMemo, useState } from "react";
import { Plus, Radio, Calendar, Trophy } from "lucide-react";

import { mockMatches, type Match } from "@/data/mockMatches";
import MatchCard from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
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

  const liveCount = mockMatches.filter((m) => m.status === "live").length;
  const upcomingCount = mockMatches.filter((m) => m.status === "scheduled").length;
  const completedCount = mockMatches.filter((m) => m.status === "completed").length;

  const filteredMatches = useMemo(() => {
    if (activeFilter === "all") return mockMatches;
    return mockMatches.filter((match) => match.status === activeFilter);
  }, [activeFilter]);

  return (
    <div className="max-w-[430px] mx-auto min-h-[85vh] pb-28">
      {/* header */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Cricket Duniya
        </p>
        <h1 className="text-3xl font-black tracking-tight">Matches</h1>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Follow live scores and upcoming games
        </p>
      </div>

      {/* quick stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <StatCard icon={Radio} label="Live" value={liveCount} active={liveCount > 0} />
        <StatCard icon={Calendar} label="Upcoming" value={upcomingCount} />
        <StatCard icon={Trophy} label="Done" value={completedCount} />
      </div>

      {/* filter pills */}
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

      {/* match list */}
      {filteredMatches.length > 0 ? (
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
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-neutral-50">
          <p className="font-semibold">No matches here</p>
          <p className="text-muted-foreground text-sm mt-2">
            Try another filter or create a new match
          </p>
        </div>
      )}

      {/* create button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-10 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <Button
          type="button"
          className="pointer-events-auto w-full h-12 rounded-2xl text-base font-bold shadow-xl gap-2"
        >
          <Plus size={20} strokeWidth={2.5} />
          Create Match
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
          ? "border-green-600/25 bg-green-50"
          : "border-border bg-neutral-50"
      )}
    >
      <Icon
        size={16}
        className={cn(
          "mx-auto mb-1.5",
          active ? "text-green-600" : "text-muted-foreground"
        )}
      />
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
