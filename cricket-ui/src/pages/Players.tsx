import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, RefreshCw, Search, Star, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPlayers } from "@/services/players";

export default function Players() {
  const [search, setSearch] = useState("");

  const {
    data: players = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["players", search],
    queryFn: () => fetchPlayers(search),
  });

  return (
    <div className="mx-auto min-h-[85vh] max-w-[430px] pb-24">
      <div className="mb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          CricRx
        </p>
        <h1 className="text-3xl font-black tracking-tight">Players</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Browse top players by fantasy points and open any player profile.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player"
            className="h-11 rounded-xl border-border bg-background pl-9"
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-muted px-4 py-4 text-center">
          <Users size={18} className="mx-auto mb-2 text-primary" />
          <p className="text-2xl font-black">{players.length}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Showing
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-muted px-4 py-4 text-center">
          <Star size={18} className="mx-auto mb-2 text-primary" />
          <p className="text-sm font-black">
            {search.trim() ? "Search results" : "Top 10 by points"}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Directory
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-medium">Loading players</span>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted px-6 py-16 text-center">
          <p className="font-semibold">Could not load players</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check the backend and try again.
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
      ) : players.length > 0 ? (
        <div className="space-y-3">
          {players.map((player, index) => (
            <Link
              key={player.id}
              to={"/players/" + player.id}
              className="block rounded-2xl border border-border bg-card px-4 py-4 shadow-sm transition hover:border-primary/30 hover:bg-card/90"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-foreground">
                    {player.name || "Unnamed player"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-black text-primary">{player.points}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    points
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted px-6 py-16 text-center">
          <p className="font-semibold">No players found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another player name.
          </p>
        </div>
      )}
    </div>
  );
}
