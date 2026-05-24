import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAssignCaptainMutation } from "@/hooks/useAssignCaptainMutation";
import { useAssignWicketkeeperMutation } from "@/hooks/useAssignWicketkeeperMutation";
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
  const assignWicketkeeperMutation = useAssignWicketkeeperMutation(id);
  const [teamACaptainId, setTeamACaptainId] = useState("");
  const [teamBCaptainId, setTeamBCaptainId] = useState("");
  const [scorerWicketkeeperId, setScorerWicketkeeperId] = useState("");
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
    if ((!teamA && !teamB) || scorerWicketkeeperId) return;
    const wicketkeeper = [...(teamA?.players ?? []), ...(teamB?.players ?? [])].find(
      (player) => player.is_wicket_keeper
    );
    if (wicketkeeper) {
      setScorerWicketkeeperId(getRolePlayerId(wicketkeeper));
    }
  }, [teamA, teamB, scorerWicketkeeperId]);

  useEffect(() => {
    if (!match || !id) return;

    if (!match.first_pick_team_id) {
      navigate(`/matches/${id}/pick-toss`, { replace: true });
    }
  }, [id, match, navigate]);

  async function handleContinue() {
    if (!id || !teamA || !teamB) return;

    if (!teamACaptainId || !teamBCaptainId || !scorerWicketkeeperId) {
      setError("Select captains and scorer/wicketkeeper");
      return;
    }

    const selectedWicketkeeperSquadPlayer = [
      ...teamA.players,
      ...teamB.players,
    ].find((player) => getRolePlayerId(player) === scorerWicketkeeperId);
    const wicketkeeperTeamId =
      selectedWicketkeeperSquadPlayer?.match_team_id === teamB.matchTeamId ||
      selectedWicketkeeperSquadPlayer?.match_team_id === teamB.teamId
        ? teamB.teamId
        : teamA.teamId;

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
      await assignWicketkeeperMutation.mutateAsync({
        playerId: scorerWicketkeeperId,
        teamId: wicketkeeperTeamId,
      });
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
      <Link
        to={`/matches/${id}/players`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back to players
      </Link>

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
          <div className="mb-4 rounded-xl border border-border bg-muted/70 p-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              <p className="text-sm font-bold">Choose captains and scorer/wicketkeeper</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Captains come from selected squads. Scorer/wicketkeeper can be any user.
            </p>
          </div>

          <div className="space-y-4">
            {teamA && (
              <TeamRoleSelectCard
                team={teamA}
                captainValue={teamACaptainId}
                onCaptainChange={(value) => {
                  setTeamACaptainId(value);
                  setError("");
                }}
              />
            )}
            {teamB && (
              <TeamRoleSelectCard
                team={teamB}
                captainValue={teamBCaptainId}
                onCaptainChange={(value) => {
                  setTeamBCaptainId(value);
                  setError("");
                }}
              />
            )}
            <ScorerWicketkeeperCard
              value={scorerWicketkeeperId}
              onChange={(value) => {
                setScorerWicketkeeperId(value);
                setError("");
              }}
              selectedFallback={
                [...(teamA?.players ?? []), ...(teamB?.players ?? [])].find(
                  (player) => getRolePlayerId(player) === scorerWicketkeeperId
                )
                  ? getPlayerLabel(
                      [...(teamA?.players ?? []), ...(teamB?.players ?? [])].find(
                        (player) => getRolePlayerId(player) === scorerWicketkeeperId
                      )!
                    )
                  : ""
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
          assignWicketkeeperMutation.isPending
        }
        onClick={handleContinue}
      >
        {assignCaptainMutation.isPending || assignWicketkeeperMutation.isPending ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <ArrowRight size={16} />
        )}
        {assignCaptainMutation.isPending || assignWicketkeeperMutation.isPending
          ? "Saving roles..."
          : "Continue to Toss"}
      </Button>
    </div>
  );
}

function TeamRoleSelectCard({
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
        "rounded-xl border border-border bg-background p-4 transition",
        captainValue && "border-primary/50 bg-primary/10"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black">{team.teamName}</p>
          <p className="text-xs font-medium text-muted-foreground">
            {team.players.length} selected players
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Crown size={18} />
        </span>
      </div>

      <div className="space-y-3">
        <PlayerRoleSelect
          icon={Crown}
          label="Captain"
          placeholder="Select captain"
          players={team.players}
          value={captainValue}
          onChange={onCaptainChange}
        />
      </div>

      {selectedCaptain && (
        <div className="mt-3 grid grid-cols-1 gap-2">
          <SelectedRole label="Captain" player={selectedCaptain} />
        </div>
      )}
    </div>
  );
}

function ScorerWicketkeeperCard({
  value,
  onChange,
  selectedFallback,
}: {
  value: string;
  onChange: (value: string) => void;
  selectedFallback: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background p-4 transition",
        value && "border-primary/50 bg-primary/10"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black">Scorer/Wicketkeeper</p>
          <p className="text-xs font-medium text-muted-foreground">
            Search and select one user for this match
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <ShieldCheck size={18} />
        </span>
      </div>

      <WicketkeeperSearchSelect
        icon={ShieldCheck}
        label="Scorer/Wicketkeeper"
        placeholder="Search all users by name or phone"
        value={value}
        onChange={onChange}
        selectedFallback={selectedFallback}
      />
    </div>
  );
}

function PlayerRoleSelect({
  icon: Icon,
  label,
  placeholder,
  players,
  value,
  onChange,
}: {
  icon: typeof Crown;
  label: string;
  placeholder: string;
  players: MatchSquadPlayer[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Icon size={13} />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm font-semibold shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={players.length === 0}
      >
        <option value="">{placeholder}</option>
        {players.map((player) => {
          const playerId = getRolePlayerId(player);

          return (
            <option key={player.match_team_player_id} value={playerId}>
              {getPlayerLabel(player)}
              {player.phone_number ? ` - ${player.phone_number}` : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function WicketkeeperSearchSelect({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  selectedFallback,
}: {
  icon: typeof Crown;
  label: string;
  placeholder: string;
  value: string;
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
    setSelectedUser(user);
    onChange(user.id);
    setSearch("");
  }

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Icon size={13} />
        {label}
      </span>

      {selectedLabel && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-card px-3 py-2">
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
            size="sm"
            className="shrink-0"
            onClick={() => {
              setSelectedUser(null);
              onChange("");
            }}
          >
            Change
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
          className="h-11 bg-card pl-9 text-sm"
          placeholder={placeholder}
        />
      </div>

      {isFetching && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="animate-spin" size={14} />
          Searching users
        </div>
      )}

      {showResults && users.length > 0 && (
        <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-border bg-card shadow-sm">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-muted",
                value === user.id && "bg-primary/10 text-primary"
              )}
              onClick={() => handleSelect(user)}
            >
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
              {value === user.id && (
                <span className="text-xs font-bold uppercase tracking-wide">
                  Selected
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {showResults && !isFetching && users.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">No users found</p>
      )}
    </div>
  );
}

function SelectedRole({
  label,
  player,
}: {
  label: string;
  player: MatchSquadPlayer;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-card px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black">{getPlayerLabel(player)}</p>
    </div>
  );
}
