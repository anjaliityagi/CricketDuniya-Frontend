import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useAddTeamPlayerMutation,
  useRemoveTeamPlayerMutation,
} from "@/hooks/useTeamPlayerMutations";
import { useTeamPlayersQuery, useTeamQuery } from "@/hooks/useTeamQuery";
import { useUserSearchQuery } from "@/hooks/useUserSearchQuery";

export default function TeamDetail() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [playerError, setPlayerError] = useState("");
  const {
    data: team,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useTeamQuery(id);
  const { data: players = [] } = useTeamPlayersQuery(id);
  const { data: userResults = [], isFetching: isSearching } = useUserSearchQuery(search);
  const addPlayerMutation = useAddTeamPlayerMutation(id);
  const removePlayerMutation = useRemoveTeamPlayerMutation(id);

  async function handleAddPlayer(playerId: string) {
    setPlayerError("");

    try {
      await addPlayerMutation.mutateAsync(playerId);
      setSearch("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setPlayerError(err.response?.data?.message ?? "Could not add player");
        return;
      }
      setPlayerError("Could not add player");
    }
  }

  async function handleRemovePlayer(teamPlayerId: string) {
    setPlayerError("");

    try {
      await removePlayerMutation.mutateAsync(teamPlayerId);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setPlayerError(err.response?.data?.message ?? "Could not remove player");
        return;
      }
      setPlayerError("Could not remove player");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-[430px] mx-auto flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Loading team</span>
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="max-w-[430px] mx-auto text-center py-20">
        <p className="font-semibold mb-2">Team not found</p>
        <p className="text-sm text-muted-foreground mb-4">
          Check the backend and try again
        </p>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
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
    );
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to="/teams"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back to teams
      </Link>

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5 space-y-5">
          <h1 className="text-2xl font-bold">{team.name}</h1>

          <div className="space-y-3 text-sm">
            {team.captainName && (
              <div className="flex items-center gap-3">
                <User size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    Captain
                  </p>
                  <p className="font-semibold">{team.captainName}</p>
                </div>
              </div>
            )}

            {team.city && (
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    City
                  </p>
                  <p className="font-semibold">{team.city}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Users size={18} className="text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  Players
                </p>
                <p className="font-semibold">
                  {players.length || team.playerCount} players
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={16} />
            <p className="text-sm font-semibold">Add Player</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPlayerError("");
                }}
                className="pl-9"
                placeholder="Search by phone or name"
              />
            </div>

            {isSearching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="animate-spin" size={14} />
                Searching players
              </div>
            )}

            {search.trim().length >= 2 && userResults.length > 0 && (
              <div className="space-y-2">
                {userResults.map((user) => {
                  const alreadyAdded = players.some(
                    (player) => player.player_id === user.id
                  );

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.phone_number}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={alreadyAdded ? "outline" : "default"}
                        disabled={alreadyAdded || addPlayerMutation.isPending}
                        onClick={() => handleAddPlayer(user.id)}
                      >
                        {alreadyAdded ? "Added" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {search.trim().length >= 2 && !isSearching && userResults.length === 0 && (
              <p className="text-xs text-muted-foreground">No users found</p>
            )}

            {playerError && (
              <p className="text-xs font-medium text-destructive">{playerError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-3">Players</p>
          {players.length > 0 ? (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{player.name}</p>
                    {player.phone_number && (
                      <p className="text-xs text-muted-foreground">
                        {player.phone_number}
                      </p>
                    )}
                    {player.is_captain && (
                      <p className="text-xs font-semibold text-primary">Captain</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${player.name}`}
                    disabled={removePlayerMutation.isPending}
                    onClick={() => handleRemovePlayer(player.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No players added yet</p>
          )}
        </CardContent>
      </Card>

      <Button asChild className="w-full h-11">
        <Link to="/matches/create">Create Match With This Team</Link>
      </Button>
    </div>
  );
}
