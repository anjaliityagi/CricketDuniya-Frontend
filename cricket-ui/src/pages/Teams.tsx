import { Link } from "react-router-dom";
import { CalendarPlus, Loader2, RefreshCw } from "lucide-react";

import TeamCard from "@/components/TeamCard";
import { Button } from "@/components/ui/button";
import { useTeamsQuery } from "@/hooks/useTeamsQuery";

export default function Teams() {
  const {
    data: allTeams = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useTeamsQuery();

  return (
    <div className="max-w-[430px] mx-auto min-h-[85vh] pb-28">
      <div className="mb-6">
        <p className="brand-wordmark mb-2 text-[11px] font-black uppercase tracking-[0.2em]">
          CricRx
        </p>
        <h1 className="text-3xl font-black">Teams</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          View teams created from matches
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card/75 px-4 py-3 text-center shadow-sm">
        <p className="text-2xl font-black">{allTeams.length}</p>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-1">
          Total Teams
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-medium">Loading teams</span>
        </div>
      ) : isError ? (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-muted">
          <p className="font-semibold">Could not load teams</p>
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
      ) : allTeams.length > 0 ? (
        <div>
          {allTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-muted">
          <p className="font-semibold">No teams yet</p>
          <p className="text-muted-foreground text-sm mt-2">
            Create a match to add teams and players
          </p>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-6 pt-10 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <Button asChild className="pointer-events-auto w-full h-12 rounded-2xl text-base font-bold shadow-xl gap-2">
          <Link to="/matches/create">
            <CalendarPlus size={20} strokeWidth={2.5} />
            Create Match
          </Link>
        </Button>
      </div>
    </div>
  );
}
