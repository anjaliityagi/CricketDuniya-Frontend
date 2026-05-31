import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldPlus,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
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
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
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
  const trimmedSearch = search.trim();
  const canSearch = trimmedSearch.length >= 2;
  const shouldShowManualAdd = canSearch && !isSearching && userResults.length === 0;

  useEffect(() => {
    if (!shouldShowManualAdd) {
      return;
    }

    const digitsOnly = trimmedSearch.replace(/\D/g, "");

    if (digitsOnly.length >= 6 && !manualPhone) {
      setManualPhone(digitsOnly.slice(0, 10));
    } else if (!manualName) {
      setManualName(trimmedSearch);
    }
  }, [manualName, manualPhone, shouldShowManualAdd, trimmedSearch]);

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

  async function handleAddManualPlayer() {
    const name = manualName.trim();
    const phoneNumber = manualPhone.trim();

    if (!name || !phoneNumber) {
      setPlayerError("Enter player name and phone number");
      return;
    }

    setPlayerError("");

    try {
      await addPlayerMutation.mutateAsync({
        name,
        phone_number: phoneNumber,
      });
      setSearch("");
      setManualName("");
      setManualPhone("");
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

      <Card className="mb-4 overflow-hidden border-border bg-card">
        <div className="india-accent-strip h-1" />
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                <ShieldPlus size={17} />
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-wide">
                  Recruit Bay
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Search, lock, roster
                </p>
              </div>
            </div>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-black text-muted-foreground">
              {players.length} active
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-background/75 p-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-primary"
              />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setManualName("");
                  setManualPhone("");
                  setPlayerError("");
                }}
                className="h-12 rounded-xl border-border bg-card pl-9 pr-10 text-sm font-bold"
                placeholder="Search player name or phone"
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setSearch("");
                    setManualName("");
                    setManualPhone("");
                    setPlayerError("");
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="mt-3 min-h-8">
              {isSearching && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground">
                  <Loader2 className="animate-spin text-primary" size={14} />
                  Scanning player grid
                </div>
              )}

              {!canSearch && !isSearching && (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <Sparkles size={14} className="text-primary" />
                  Type at least 2 characters to scan
                </div>
              )}

              {canSearch && userResults.length > 0 && (
                <div className="space-y-2">
                  {userResults.map((user) => {
                    const alreadyAdded = players.some(
                      (player) => player.player_id === user.id
                    );

                    return (
                      <div
                        key={user.id}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm"
                      >
                        <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-sm font-black text-primary">
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{user.name}</p>
                          <p className="truncate text-xs font-semibold text-muted-foreground">
                            {user.phone_number}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={alreadyAdded ? "outline" : "default"}
                          className="h-9 rounded-full px-3"
                          disabled={alreadyAdded || addPlayerMutation.isPending}
                          onClick={() => handleAddPlayer(user.id)}
                        >
                          {alreadyAdded ? (
                            <>
                              <Check size={14} />
                              Locked
                            </>
                          ) : (
                            <>
                              <UserPlus size={14} />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {shouldShowManualAdd && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <UserPlus size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-black">Create recruit card</p>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        No match found in the player grid
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Input
                      value={manualName}
                      onChange={(event) => {
                        setManualName(event.target.value);
                        setPlayerError("");
                      }}
                      className="h-11 rounded-xl bg-card text-sm font-bold"
                      placeholder="Player name"
                    />
                    <div className="relative">
                      <Phone
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        value={manualPhone}
                        onChange={(event) => {
                          setManualPhone(event.target.value);
                          setPlayerError("");
                        }}
                        className="h-11 rounded-xl bg-card pl-9 text-sm font-bold"
                        placeholder="Phone number"
                        inputMode="tel"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="mt-3 h-10 w-full rounded-xl"
                    onClick={handleAddManualPlayer}
                    disabled={addPlayerMutation.isPending}
                  >
                    {addPlayerMutation.isPending ? (
                      <Loader2 className="animate-spin" size={15} />
                    ) : (
                      <ShieldPlus size={15} />
                    )}
                    Add to roster
                  </Button>
                </div>
              )}
            </div>

            {playerError && (
              <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                {playerError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-wide">Roster</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
              {players.length || 0} selected
            </p>
          </div>
          {players.length > 0 ? (
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-background px-3 py-2.5"
                >
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-sm font-black text-primary">
                    {getInitials(player.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{player.name}</p>
                    {player.phone_number && (
                      <p className="truncate text-xs font-semibold text-muted-foreground">
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
                    className="size-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return (parts[0]?.slice(0, 2) || "P").toUpperCase();
}
