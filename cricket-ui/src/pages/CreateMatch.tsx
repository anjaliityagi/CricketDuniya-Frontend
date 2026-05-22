import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

import { createMatch } from "@/services/matches";
import {
  addPlayerToTeam,
  createTeam,
  type AddTeamPlayerPayload,
  type UserSearchResult,
} from "@/services/teams";
import { useUserSearchQuery } from "@/hooks/useUserSearchQuery";
import { useTeamsQuery } from "@/hooks/useTeamsQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn, isValidPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

type TeamKey = "a" | "b";

type PlayerDraft = {
  key: string;
  userId?: string;
  name: string;
  phone_number: string;
};

type TeamDraft = {
  name: string;
  players: PlayerDraft[];
};

type CreatedPlayerResponse = {
  data?: {
    player_id?: string;
    user_id?: string;
    player?: { id?: string };
  };
  player_id?: string;
  user_id?: string;
};

const initialTeams: Record<TeamKey, TeamDraft> = {
  a: { name: "", players: [] },
  b: { name: "", players: [] },
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

function toPlayerDraft(user: UserSearchResult): PlayerDraft {
  return {
    key: user.id,
    userId: user.id,
    name: user.name,
    phone_number: user.phone_number,
  };
}

function manualPlayerKey(phoneNumber: string) {
  return `manual:${phoneNumber.trim()}`;
}

function getCreatedPlayerId(response: CreatedPlayerResponse) {
  return (
    response.data?.player_id ??
    response.data?.user_id ??
    response.data?.player?.id ??
    response.player_id ??
    response.user_id
  );
}

function getCommonPlayerPhones(teams: Record<TeamKey, TeamDraft>) {
  const teamBPhones = new Set(teams.b.players.map((player) => player.phone_number));

  return teams.a.players
    .filter((player) => teamBPhones.has(player.phone_number))
    .map((player) => player.phone_number);
}

function getTotalPlayerSlots(teams: Record<TeamKey, TeamDraft>) {
  return teams.a.players.length + teams.b.players.length;
}

export default function CreateMatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: existingTeams = [] } = useTeamsQuery();

  const [teams, setTeams] = useState<Record<TeamKey, TeamDraft>>(initialTeams);
  const [location, setLocation] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [overs, setOvers] = useState("20");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateTeamName(teamKey: TeamKey, name: string) {
    setTeams((current) => ({
      ...current,
      [teamKey]: { ...current[teamKey], name },
    }));
    setError("");
  }

  function addPlayer(teamKey: TeamKey, player: PlayerDraft, addToBoth = false) {
    setTeams((current) => {
      const commonPlayers = getCommonPlayerPhones(current);
      const playerIsAlreadyCommon = commonPlayers.includes(player.phone_number);
      const playerInOtherTeam = current[teamKey === "a" ? "b" : "a"].players.some(
        (item) => item.phone_number === player.phone_number
      );

      if (!addToBoth && playerInOtherTeam) {
        setError("This player is already in the other team");
        return current;
      }

      if (addToBoth && commonPlayers.length >= 1 && !playerIsAlreadyCommon) {
        setError("Only one common player is allowed");
        return current;
      }

      if (addToBoth && getTotalPlayerSlots(current) % 2 === 0 && !playerIsAlreadyCommon) {
        setError("Common player can be added only when total players are odd");
        return current;
      }

      const next = { ...current };
      const targetKeys: TeamKey[] = addToBoth ? ["a", "b"] : [teamKey];

      targetKeys.forEach((targetKey) => {
        const existing = next[targetKey].players.some(
          (item) => item.phone_number === player.phone_number
        );

        if (!existing) {
          next[targetKey] = {
            ...next[targetKey],
            players: [...next[targetKey].players, player],
          };
        }
      });

      return next;
    });
    setError("");
  }

  function removePlayer(teamKey: TeamKey, playerKey: string) {
    setTeams((current) => ({
      ...current,
      [teamKey]: {
        ...current[teamKey],
        players: current[teamKey].players.filter((player) => player.key !== playerKey),
      },
    }));
  }

  function validateForm() {
    if (!teams.a.name.trim() || !teams.b.name.trim()) {
      return "Please enter both team names";
    }

    if (teams.a.name.trim().toLowerCase() === teams.b.name.trim().toLowerCase()) {
      return "Please use two different team names";
    }

    const existingNames = new Set(
      existingTeams.map((team) => team.name.trim().toLowerCase())
    );

    if (
      existingNames.has(teams.a.name.trim().toLowerCase()) ||
      existingNames.has(teams.b.name.trim().toLowerCase())
    ) {
      return "Team names must be unique";
    }

    if (!location.trim()) {
      return "Please enter match location";
    }

    if (!matchDate) {
      return "Please select match date";
    }

    const oversNumber = Number(overs);
    if (!oversNumber || oversNumber < 1) {
      return "Overs must be at least 1";
    }

    if (getCommonPlayerPhones(teams).length > 1) {
      return "Only one common player is allowed";
    }

    return "";
  }

  async function addRosterToTeam(
    teamId: string,
    roster: PlayerDraft[],
    createdPlayerIdsByPhone: Map<string, string>
  ) {
    for (const player of roster) {
      let payload: AddTeamPlayerPayload;
      const createdPlayerId = createdPlayerIdsByPhone.get(player.phone_number);

      if (player.userId || createdPlayerId) {
        payload = { player_id: player.userId ?? createdPlayerId! };
      } else {
        payload = {
          name: player.name,
          phone_number: player.phone_number,
        };
      }

      const response = await addPlayerToTeam(teamId, payload);
      const newPlayerId = getCreatedPlayerId(response);

      if (newPlayerId) {
        createdPlayerIdsByPhone.set(player.phone_number, newPlayerId);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const [teamA, teamB] = await Promise.all([
        createTeam({ name: teams.a.name.trim() }),
        createTeam({ name: teams.b.name.trim() }),
      ]);

      const createdPlayerIdsByPhone = new Map<string, string>();

      await addRosterToTeam(teamA.id, teams.a.players, createdPlayerIdsByPhone);
      await addRosterToTeam(teamB.id, teams.b.players, createdPlayerIdsByPhone);

      const newMatch = await createMatch({
        team_a_id: teamA.id,
        team_b_id: teamB.id,
        location: location.trim(),
        match_date: new Date(matchDate).toISOString(),
        overs_per_innings: Number(overs),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["matches"] }),
        queryClient.invalidateQueries({ queryKey: ["teams"] }),
      ]);

      navigate(`/matches/${newMatch.id}/setup`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create match"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to="/matches"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back to matches
      </Link>

      <h1 className="text-2xl font-bold mb-1">Create Match</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Create teams, add players, then schedule the match
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TeamDraftPanel
          label="Team A"
          teamKey="a"
          team={teams.a}
          otherTeam={teams.b}
          onNameChange={updateTeamName}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          commonPlayerCount={getCommonPlayerPhones(teams).length}
          totalPlayerSlots={getTotalPlayerSlots(teams)}
        />

        <TeamDraftPanel
          label="Team B"
          teamKey="b"
          team={teams.b}
          otherTeam={teams.a}
          onNameChange={updateTeamName}
          onAddPlayer={addPlayer}
          onRemovePlayer={removePlayer}
          commonPlayerCount={getCommonPlayerPhones(teams).length}
          totalPlayerSlots={getTotalPlayerSlots(teams)}
        />

        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Location</label>
              <Input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Delhi"
              />
            </div>

            <div className="grid grid-cols-[1fr_96px] gap-3">
              <div>
                <label className="block text-sm font-semibold mb-2">Match Date</label>
                <Input
                  type="datetime-local"
                  value={matchDate}
                  onChange={(e) => {
                    setMatchDate(e.target.value);
                    setError("");
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Overs</label>
                <Input
                  type="number"
                  value={overs}
                  onChange={(e) => {
                    setOvers(e.target.value);
                    setError("");
                  }}
                  min={1}
                />
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" size={16} />}
              {isSubmitting ? "Creating..." : "Create Match"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function TeamDraftPanel({
  label,
  teamKey,
  team,
  otherTeam,
  onNameChange,
  onAddPlayer,
  onRemovePlayer,
  commonPlayerCount,
  totalPlayerSlots,
}: {
  label: string;
  teamKey: TeamKey;
  team: TeamDraft;
  otherTeam: TeamDraft;
  onNameChange: (teamKey: TeamKey, name: string) => void;
  onAddPlayer: (teamKey: TeamKey, player: PlayerDraft, addToBoth?: boolean) => void;
  onRemovePlayer: (teamKey: TeamKey, playerKey: string) => void;
  commonPlayerCount: number;
  totalPlayerSlots: number;
}) {
  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualError, setManualError] = useState("");
  const { data: userResults = [], isFetching } = useUserSearchQuery(search);

  function canAddCommonPlayer(phoneNumber: string) {
    const inBothTeams =
      team.players.some((player) => player.phone_number === phoneNumber) &&
      otherTeam.players.some((player) => player.phone_number === phoneNumber);

    return inBothTeams || (commonPlayerCount === 0 && totalPlayerSlots % 2 === 1);
  }

  function addManual(addToBoth = false) {
    const name = manualName.trim();
    const phoneNumber = normalizePhoneNumber(manualPhone);

    if (!name || !phoneNumber) {
      setManualError("Enter player name and phone number");
      return;
    }

    if (!isValidPhoneNumber(manualPhone)) {
      setManualError("Enter a valid 10-digit phone number");
      return;
    }

    if (addToBoth && !canAddCommonPlayer(phoneNumber)) {
      setManualError(
        commonPlayerCount > 0
          ? "Only one common player is allowed"
          : "Common player can be added only when total players are odd"
      );
      return;
    }

    onAddPlayer(
      teamKey,
      {
        key: manualPlayerKey(phoneNumber),
        name,
        phone_number: phoneNumber,
      },
      addToBoth
    );
    setManualName("");
    setManualPhone("");
    setManualError("");
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">{label} Name</label>
          <Input
            value={team.name}
            onChange={(e) => onNameChange(teamKey, e.target.value)}
            placeholder={teamKey === "a" ? "e.g. Warriors" : "e.g. Strikers"}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/60 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Search size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold">Search Users</p>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
          />

          {isFetching && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
              <Loader2 className="animate-spin" size={14} />
              Searching players
            </div>
          )}

          {search.trim().length >= 2 && userResults.length > 0 && (
            <div className="space-y-2 mt-3">
              {userResults
                .filter(
                  (user) =>
                    !otherTeam.players.some(
                      (item) => item.phone_number === user.phone_number
                    )
                )
                .map((user) => {
                const player = toPlayerDraft(user);
                const inCurrentTeam = team.players.some(
                  (item) => item.phone_number === player.phone_number
                );
                const inOtherTeam = otherTeam.players.some(
                  (item) => item.phone_number === player.phone_number
                );
                const canAddBoth = canAddCommonPlayer(player.phone_number);

                return (
                  <PlayerSearchRow
                    key={user.id}
                    name={user.name}
                    phoneNumber={user.phone_number}
                    isAdded={inCurrentTeam}
                    isCommon={inCurrentTeam && inOtherTeam}
                    canAddBoth={canAddBoth}
                    onAdd={() => onAddPlayer(teamKey, player)}
                    onAddBoth={() => onAddPlayer(teamKey, player, true)}
                  />
                );
              })}
            </div>
          )}

          {search.trim().length >= 2 && !isFetching && userResults.length === 0 && (
            <p className="text-xs text-muted-foreground mt-3">No users found</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/60 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Plus size={15} className="text-muted-foreground" />
            <p className="text-sm font-semibold">New Player</p>
          </div>
          <div className="space-y-2">
            <Input
              value={manualName}
              onChange={(e) => {
                setManualName(e.target.value);
                setManualError("");
              }}
              placeholder="Player name"
            />
            <div className="relative">
              <Phone
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={manualPhone}
                onChange={(e) => {
                  setManualPhone(e.target.value);
                  setManualError("");
                }}
                inputMode="numeric"
                className="pl-9"
                placeholder="9876543210"
              />
            </div>
            {manualError && (
              <p className="text-xs font-medium text-destructive">{manualError}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => addManual()}>
                Add
              </Button>
              <Button
                type="button"
                onClick={() => addManual(true)}
                disabled={
                  Boolean(normalizePhoneNumber(manualPhone)) &&
                  !canAddCommonPlayer(normalizePhoneNumber(manualPhone))
                }
              >
                {Boolean(normalizePhoneNumber(manualPhone)) &&
                !canAddCommonPlayer(normalizePhoneNumber(manualPhone))
                  ? "Limit"
                  : "Add Both"}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} />
            <p className="text-sm font-semibold">{team.players.length} Players</p>
          </div>

          {team.players.length > 0 ? (
            <div className="space-y-2">
              {team.players.map((player) => (
                <div
                  key={player.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{player.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {player.phone_number}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${player.name}`}
                    onClick={() => onRemovePlayer(teamKey, player.key)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No players added yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerSearchRow({
  name,
  phoneNumber,
  isAdded,
  isCommon,
  canAddBoth,
  onAdd,
  onAddBoth,
}: {
  name: string;
  phoneNumber: string;
  isAdded: boolean;
  isCommon: boolean;
  canAddBoth: boolean;
  onAdd: () => void;
  onAddBoth: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{phoneNumber}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Button
          type="button"
          size="sm"
          variant={isAdded ? "outline" : "default"}
          disabled={isAdded}
          onClick={onAdd}
        >
          {isAdded ? "Added" : "Add"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isCommon ? "outline" : "secondary"}
          disabled={isCommon || !canAddBoth}
          onClick={onAddBoth}
          className={cn(!isCommon && "border border-border")}
        >
          {isCommon ? "Both" : canAddBoth ? "Add Both" : "Limit"}
        </Button>
      </div>
    </div>
  );
}
