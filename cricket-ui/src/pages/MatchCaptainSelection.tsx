import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Crown,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  Loader2,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import axios from "axios";

import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAssignCaptainMutation } from "@/hooks/useAssignCaptainMutation";
import { useAssignUmpireMutation } from "@/hooks/useAssignUmpireMutation";
import { useMatchQuery } from "@/hooks/useMatchQuery";
import { useMatchSquadQuery } from "@/hooks/useMatchSquadQuery";
import { useUserSearchQuery } from "@/hooks/useUserSearchQuery";
import type { MatchSquadPlayer } from "@/services/matches";
import type { UserSearchResult } from "@/services/teams";
import { cn } from "@/lib/utils";

type TeamCaptainOption = {
  matchTeamId: string;
  teamId: string;
  teamName: string;
  players: MatchSquadPlayer[];
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | string
      | undefined;

    if (typeof data === "string") return data;
    return data?.message ?? data?.error ?? fallback;
  }

  return fallback;
}

function getPlayerLabel(player: MatchSquadPlayer) {
  return player.player_name || player.name || player.phone_number || "Unnamed player";
}

function getRolePlayerId(player: MatchSquadPlayer) {
  return player.user_id || player.match_team_player_id;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return (parts[0]?.slice(0, 2) || "P").toUpperCase();
}

function getSelectedSquadPlayerName(
  teamA: TeamCaptainOption | undefined,
  teamB: TeamCaptainOption | undefined,
  playerId: string
) {
  if (!playerId) return "";

  const selectedPlayer = [...(teamA?.players ?? []), ...(teamB?.players ?? [])].find(
    (player) => getRolePlayerId(player) === playerId
  );

  return selectedPlayer ? getPlayerLabel(selectedPlayer) : "";
}

export default function MatchCaptainSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading: isLoadingMatch } = useMatchQuery(id);
  const {
    data: squad = [],
    isLoading: isLoadingSquad,
    isFetching,
    refetch,
  } = useMatchSquadQuery(id);
  const assignCaptainMutation = useAssignCaptainMutation(id);
  const assignUmpireMutation = useAssignUmpireMutation(id);
  const [teamACaptainId, setTeamACaptainId] = useState("");
  const [teamBCaptainId, setTeamBCaptainId] = useState("");
  const [primaryScorerUmpireId, setPrimaryScorerUmpireId] = useState("");
  const [secondaryScorerUmpireId, setSecondaryScorerUmpireId] = useState("");
  const [error, setError] = useState("");

  const teamOptions = useMemo<TeamCaptainOption[]>(() => {
    if (!match?.team_a_id || !match?.team_b_id) return [];

    const teamAMatchId = match.team_a_match_team_id ?? match.team_a_id;
    const teamBMatchId = match.team_b_match_team_id ?? match.team_b_id;

    const teamAPlayers = squad.filter(
      (player) =>
        player.match_team_id === teamAMatchId ||
        player.match_team_id === match.team_a_id
    );
    const teamBPlayers = squad.filter(
      (player) =>
        player.match_team_id === teamBMatchId ||
        player.match_team_id === match.team_b_id
    );

    return [
      {
        matchTeamId: teamAMatchId,
        teamId: match.team_a_id,
        teamName: match.teamOneName,
        players: teamAPlayers,
      },
      {
        matchTeamId: teamBMatchId,
        teamId: match.team_b_id,
        teamName: match.teamTwoName,
        players: teamBPlayers,
      },
    ];
  }, [match, squad]);

  const teamA = teamOptions[0];
  const teamB = teamOptions[1];

  useEffect(() => {
    if (!teamA || teamACaptainId) return;
    const captain = teamA.players.find((player) => player.is_captain);
    if (captain) {
      setTeamACaptainId(getRolePlayerId(captain));
    }
  }, [teamA, teamACaptainId]);

  useEffect(() => {
    if (!teamB || teamBCaptainId) return;
    const captain = teamB.players.find((player) => player.is_captain);
    if (captain) {
      setTeamBCaptainId(getRolePlayerId(captain));
    }
  }, [teamB, teamBCaptainId]);

  useEffect(() => {
    const selectedUmpires = [...(teamA?.players ?? []), ...(teamB?.players ?? [])].filter(
      (player) => player.is_umpire
    );

    if (!primaryScorerUmpireId && selectedUmpires[0]) {
      setPrimaryScorerUmpireId(getRolePlayerId(selectedUmpires[0]));
    }
    if (!secondaryScorerUmpireId && selectedUmpires[1]) {
      setSecondaryScorerUmpireId(getRolePlayerId(selectedUmpires[1]));
    }
  }, [primaryScorerUmpireId, secondaryScorerUmpireId, teamA, teamB]);

  useEffect(() => {
    if (!match || !id) return;

    if (!match.first_pick_team_id) {
      navigate(`/matches/${id}/pick-toss`, { replace: true });
    }
  }, [id, match, navigate]);

  async function handleContinue() {
    if (!id || !teamA || !teamB) return;

    if (!teamACaptainId || !teamBCaptainId) {
      setError("Select captains");
      return;
    }

    if (
      primaryScorerUmpireId &&
      secondaryScorerUmpireId &&
      primaryScorerUmpireId === secondaryScorerUmpireId
    ) {
      setError("Choose two different scorer/umpires");
      return;
    }

    const allTeamPlayers = [...teamA.players, ...teamB.players];
    function getUmpireTeamId(playerId: string) {
      const selectedUmpireSquadPlayer = allTeamPlayers.find(
        (player) => getRolePlayerId(player) === playerId
      );

      return selectedUmpireSquadPlayer?.match_team_id === teamB.matchTeamId ||
        selectedUmpireSquadPlayer?.match_team_id === teamB.teamId
        ? teamB.teamId
        : teamA.teamId;
    }

    setError("");

    try {
      await assignCaptainMutation.mutateAsync({
        playerId: teamACaptainId,
        teamId: teamA.teamId,
      });
      await assignCaptainMutation.mutateAsync({
        playerId: teamBCaptainId,
        teamId: teamB.teamId,
      });
      if (primaryScorerUmpireId) {
        await assignUmpireMutation.mutateAsync({
          playerId: primaryScorerUmpireId,
          teamId: getUmpireTeamId(primaryScorerUmpireId),
        });
      }
      if (secondaryScorerUmpireId) {
        await assignUmpireMutation.mutateAsync({
          playerId: secondaryScorerUmpireId,
          teamId: getUmpireTeamId(secondaryScorerUmpireId),
        });
      }
      sessionStorage.setItem(`cricket_match_roles_ready_${id}`, "true");
      await refetch();
      navigate(`/matches/${id}/toss`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not assign roles. Please try again."));
    }
  }

  if (isLoadingMatch || isLoadingSquad) {
    return (
      <div className="max-w-[430px] mx-auto flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Loading selected players</span>
      </div>
    );
  }

  if (!match || !id) {
    return (
      <div className="max-w-[430px] mx-auto text-center py-20">
        <p className="font-semibold mb-2">Match not found</p>
        <Button asChild variant="outline">
          <Link to="/matches">Go back</Link>
        </Button>
      </div>
    );
  }

  const hasPlayers = Boolean(teamA?.players.length && teamB?.players.length);

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <BackButton fallbackTo={`/matches/${id}/players`} label="Back to players" className="mb-6" />

      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Match Setup
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Select Roles
          </h1>
        </div>
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Crown size={22} />
        </span>
      </div>

      <Card className="mb-4 overflow-hidden border-border bg-card py-0 shadow-xl">
        <div className="india-accent-strip h-1.5" />
        <CardContent className="p-5">
          <div className="mb-4 rounded-2xl border border-border bg-muted/70 p-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              <p className="text-sm font-bold">Assign match roles</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tap a crown on each squad card, then lock in scorer/umpires.
            </p>
          </div>

          <div className="space-y-4">
            {teamA && (
              <TeamCaptainDeck
                team={teamA}
                captainValue={teamACaptainId}
                onCaptainChange={(value) => {
                  setTeamACaptainId(value);
                  setError("");
                }}
              />
            )}
            {teamB && (
              <TeamCaptainDeck
                team={teamB}
                captainValue={teamBCaptainId}
                onCaptainChange={(value) => {
                  setTeamBCaptainId(value);
                  setError("");
                }}
              />
            )}
            <ScorerDeck
              primaryValue={primaryScorerUmpireId}
              secondaryValue={secondaryScorerUmpireId}
              onPrimaryChange={(value) => {
                setPrimaryScorerUmpireId(value);
                setError("");
              }}
              onSecondaryChange={(value) => {
                setSecondaryScorerUmpireId(value);
                setError("");
              }}
              primaryFallback={
                getSelectedSquadPlayerName(teamA, teamB, primaryScorerUmpireId)
              }
              secondaryFallback={
                getSelectedSquadPlayerName(teamA, teamB, secondaryScorerUmpireId)
              }
            />
          </div>
        </CardContent>
      </Card>

      {!hasPlayers && (
        <div className="mb-4 rounded-xl border border-dashed border-border bg-muted p-4 text-center">
          <Users className="mx-auto mb-2 text-muted-foreground" size={22} />
          <p className="text-sm font-semibold">No selected players found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Go back and complete player selection for both teams.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}
            Refresh
          </Button>
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive mb-4">{error}</p>}

      <Button
        type="button"
        className="w-full h-11 gap-2"
        disabled={
          !hasPlayers ||
          assignCaptainMutation.isPending ||
          assignUmpireMutation.isPending
        }
        onClick={handleContinue}
      >
        {assignCaptainMutation.isPending || assignUmpireMutation.isPending ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <ArrowRight size={16} />
        )}
        {assignCaptainMutation.isPending || assignUmpireMutation.isPending
          ? "Saving roles..."
          : "Continue to Toss"}
      </Button>
    </div>
  );
}

function TeamCaptainDeck({
  team,
  captainValue,
  onCaptainChange,
}: {
  team: TeamCaptainOption;
  captainValue: string;
  onCaptainChange: (value: string) => void;
}) {
  const selectedCaptain = team.players.find(
    (player) => getRolePlayerId(player) === captainValue
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-background transition",
        captainValue && "border-primary/50"
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card/70 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black">{team.teamName}</p>
          <p className="text-xs font-medium text-muted-foreground">
            {selectedCaptain
              ? `${getPlayerLabel(selectedCaptain)} leads`
              : `${team.players.length} players ready`}
          </p>
        </div>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl border transition",
            selectedCaptain
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground"
          )}
        >
          <Crown size={19} />
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3">
        {team.players.map((player) => {
          const playerId = getRolePlayerId(player);
          const isCaptain = playerId === captainValue;

          return (
            <button
              key={player.match_team_player_id}
              type="button"
              className={cn(
                "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                isCaptain
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
              )}
              onClick={() => onCaptainChange(playerId)}
            >
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl text-sm font-black",
                  isCaptain
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {getInitials(getPlayerLabel(player))}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">
                  {getPlayerLabel(player)}
                </span>
                {player.phone_number && (
                  <span className="block truncate text-xs font-semibold text-muted-foreground">
                    {player.phone_number}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full border transition",
                  isCaptain
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                )}
                aria-label={isCaptain ? "Captain selected" : "Select captain"}
              >
                <Crown size={16} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScorerDeck({
  primaryValue,
  secondaryValue,
  onPrimaryChange,
  onSecondaryChange,
  primaryFallback,
  secondaryFallback,
}: {
  primaryValue: string;
  secondaryValue: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  primaryFallback: string;
  secondaryFallback: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card/70 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black">Scorer Deck</p>
          <p className="text-xs font-medium text-muted-foreground">
            Two scorer/umpire slots for the match
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Radio size={19} />
        </span>
      </div>

      <div className="space-y-3 p-3">
        <UmpireSearchSelect
          label="Primary"
          value={primaryValue}
          blockedValue={secondaryValue}
          onChange={onPrimaryChange}
          selectedFallback={primaryFallback}
        />
        <UmpireSearchSelect
          label="Secondary"
          value={secondaryValue}
          blockedValue={primaryValue}
          onChange={onSecondaryChange}
          selectedFallback={secondaryFallback}
        />
      </div>
    </div>
  );
}

function UmpireSearchSelect({
  label,
  value,
  blockedValue,
  onChange,
  selectedFallback,
}: {
  label: string;
  value: string;
  blockedValue: string;
  onChange: (value: string) => void;
  selectedFallback: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const { data: users = [], isFetching } = useUserSearchQuery(search);
  const trimmedSearch = search.trim();
  const showResults = trimmedSearch.length >= 2;
  const selectedLabel =
    selectedUser?.name || selectedFallback || (value ? "Selected user" : "");

  useEffect(() => {
    if (!value) {
      setSelectedUser(null);
    }
  }, [value]);

  function handleSelect(user: UserSearchResult) {
    if (blockedValue === user.id) {
      return;
    }

    setSelectedUser(user);
    onChange(user.id);
    setSearch("");
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-3 transition",
        value && "border-primary/50 bg-primary/10"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-muted-foreground">
          <ShieldCheck size={13} />
          {label}
        </span>
        {value ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-black uppercase text-primary-foreground">
            <UserCheck size={11} />
            Locked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">
            <Sparkles size={11} />
            Open
          </span>
        )}
      </div>

      {selectedLabel && (
        <div className="mb-2 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-primary/30 bg-background px-3 py-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
            {getInitials(selectedLabel)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{selectedLabel}</p>
            {selectedUser?.phone_number && (
              <p className="text-xs text-muted-foreground">
                {selectedUser.phone_number}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            onClick={() => {
              setSelectedUser(null);
              onChange("");
            }}
            aria-label={`Clear ${label} scorer`}
          >
            <X size={14} />
          </Button>
        </div>
      )}

      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 rounded-xl bg-background pl-9 text-sm font-semibold"
          placeholder="Search user name or phone"
        />
      </div>

      {isFetching && (
        <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Loader2 className="animate-spin text-primary" size={14} />
          Searching users
        </div>
      )}

      {showResults && users.length > 0 && (
        <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-border bg-background shadow-sm">
          {users.map((user) => {
            const isBlocked = blockedValue === user.id;

            return (
              <button
                key={user.id}
                type="button"
                disabled={isBlocked}
                className={cn(
                  "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                  value === user.id && "bg-primary/10 text-primary"
                )}
                onClick={() => handleSelect(user)}
              >
                <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-xs font-black text-primary">
                  {getInitials(user.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {user.name}
                  </span>
                  {user.phone_number && (
                    <span className="block text-xs text-muted-foreground">
                      {user.phone_number}
                    </span>
                  )}
                </span>
                {isBlocked ? (
                  <span className="text-[10px] font-black uppercase text-muted-foreground">
                    Used
                  </span>
                ) : value === user.id ? (
                  <span className="text-primary">
                    <ShieldCheck size={15} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {showResults && !isFetching && users.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">No users found</p>
      )}
    </div>
  );
}
