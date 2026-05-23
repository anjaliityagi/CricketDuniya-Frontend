import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMatchQuery } from "@/hooks/useMatchQuery";
import { useTeamPlayersQuery } from "@/hooks/useTeamQuery";
import { useUserSearchQuery } from "@/hooks/useUserSearchQuery";
import {
  addPlayerToTeam,
  type AddTeamPlayerPayload,
  type TeamPlayer,
  type UserSearchResult,
} from "@/services/teams";
import { cn, isValidPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

type TeamSide = "a" | "b";

type DraftPick = {
  pickNumber: number;
  side: TeamSide;
  player: TeamPlayer;
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

function getFirstPickSide(
  firstPickTeamId: string | undefined,
  teamAId: string | undefined
): TeamSide | null {
  if (!firstPickTeamId || !teamAId) return null;
  return firstPickTeamId === teamAId ? "a" : "b";
}

function getActiveTeamSide(
  firstPickSide: TeamSide | null,
  teamACount: number,
  teamBCount: number
): TeamSide | null {
  if (!firstPickSide) return null;

  const totalPicks = teamACount + teamBCount;
  const firstPickTurn = totalPicks % 2 === 0;

  if (firstPickSide === "a") {
    return firstPickTurn ? "a" : "b";
  }

  return firstPickTurn ? "b" : "a";
}

function buildDraftTimeline(
  firstPickSide: TeamSide,
  teamAPlayers: TeamPlayer[],
  teamBPlayers: TeamPlayer[]
): DraftPick[] {
  const safeTeamAPlayers = teamAPlayers ?? [];
  const safeTeamBPlayers = teamBPlayers ?? [];
  const firstTeamPlayers = firstPickSide === "a" ? safeTeamAPlayers : safeTeamBPlayers;
  const secondTeamPlayers = firstPickSide === "a" ? safeTeamBPlayers : safeTeamAPlayers;
  const secondPickSide: TeamSide = firstPickSide === "a" ? "b" : "a";
  const maxLen = Math.max(firstTeamPlayers.length, secondTeamPlayers.length);
  const timeline: DraftPick[] = [];

  for (let index = 0; index < maxLen; index += 1) {
    if (firstTeamPlayers[index]) {
      timeline.push({
        pickNumber: timeline.length + 1,
        side: firstPickSide,
        player: firstTeamPlayers[index],
      });
    }

    if (secondTeamPlayers[index]) {
      timeline.push({
        pickNumber: timeline.length + 1,
        side: secondPickSide,
        player: secondTeamPlayers[index],
      });
    }
  }

  return timeline;
}

function toPlayerLabel(player: TeamPlayer) {
  return player.name || player.phone_number || "Unnamed player";
}

export default function MatchPlayerDraft() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: match, isLoading: isLoadingMatch } = useMatchQuery(id);
  const { data: teamAPlayersRaw, isLoading: isLoadingTeamA } = useTeamPlayersQuery(
    match?.team_a_id
  );
  const { data: teamBPlayersRaw, isLoading: isLoadingTeamB } = useTeamPlayersQuery(
    match?.team_b_id
  );

  const teamAPlayers = teamAPlayersRaw ?? [];
  const teamBPlayers = teamBPlayersRaw ?? [];

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualError, setManualError] = useState("");

  const { data: userResultsRaw = [], isFetching: isSearching } = useUserSearchQuery(search);
  const userResults = userResultsRaw ?? [];

  useEffect(() => {
    if (!isLoadingMatch && match && !match.first_pick_team_id && id) {
      navigate(`/matches/${id}/pick-toss`, { replace: true });
    }
  }, [id, isLoadingMatch, match, navigate]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const firstPickSide = useMemo(
    () => getFirstPickSide(match?.first_pick_team_id, match?.team_a_id),
    [match?.first_pick_team_id, match?.team_a_id]
  );

  const activeSide = useMemo(
    () => getActiveTeamSide(firstPickSide, teamAPlayers.length, teamBPlayers.length),
    [firstPickSide, teamAPlayers.length, teamBPlayers.length]
  );

  const draftTimeline = useMemo(
    () =>
      firstPickSide
        ? buildDraftTimeline(firstPickSide, teamAPlayers, teamBPlayers)
        : [],
    [firstPickSide, teamAPlayers, teamBPlayers]
  );

  const firstPickTeamName = useMemo(() => {
    if (!firstPickSide || !match) return "";
    return firstPickSide === "a" ? match.teamOneName : match.teamTwoName;
  }, [firstPickSide, match]);

  const activeTeamId =
    activeSide === "a" ? match?.team_a_id : activeSide === "b" ? match?.team_b_id : undefined;
  const activeTeamName =
    activeSide === "a" ? match?.teamOneName : activeSide === "b" ? match?.teamTwoName : "";
  const waitingTeamName =
    activeSide === "a" ? match?.teamTwoName : activeSide === "b" ? match?.teamOneName : "";

  const pickNumber = draftTimeline.length + 1;

  const takenPhones = useMemo(() => {
    const phones = new Set<string>();
    [...teamAPlayers, ...teamBPlayers].forEach((player) => {
      if (player.phone_number) phones.add(player.phone_number);
    });
    return phones;
  }, [teamAPlayers, teamBPlayers]);

  async function refreshPlayers() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["teams", match?.team_a_id, "players"] }),
      queryClient.invalidateQueries({ queryKey: ["teams", match?.team_b_id, "players"] }),
    ]);
  }

  async function handleAddPlayer(payload: AddTeamPlayerPayload) {
    if (!activeTeamId || !activeTeamName) return;

    setError("");
    setIsAdding(true);

    try {
      await addPlayerToTeam(activeTeamId, payload);
      await refreshPlayers();
      setSearch("");
      setManualName("");
      setManualPhone("");
      setManualError("");
      setNotice(
        waitingTeamName
          ? `${activeTeamName} picked a player. ${waitingTeamName}'s turn next.`
          : `${activeTeamName} picked a player.`
      );
    } catch (err) {
      setError(getErrorMessage(err, "Could not add player"));
    } finally {
      setIsAdding(false);
    }
  }

  async function handleAddUser(user: UserSearchResult) {
    if (takenPhones.has(user.phone_number)) {
      setError("This player is already in one of the teams");
      return;
    }

    await handleAddPlayer({ player_id: user.id });
  }

  async function handleAddManual() {
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

    if (takenPhones.has(phoneNumber)) {
      setManualError("This player is already in one of the teams");
      return;
    }

    await handleAddPlayer({ name, phone_number: phoneNumber });
  }

  if (isLoadingMatch || isLoadingTeamA || isLoadingTeamB) {
    return (
      <div className="max-w-[430px] mx-auto flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Loading player draft</span>
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

  return (
    <div className="max-w-[430px] mx-auto pb-10">
      <Link
        to={`/matches/${id}/pick-toss`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
      >
        <ArrowLeft size={18} />
        Back to toss
      </Link>

      <h1 className="text-2xl font-bold mb-1">Player Draft</h1>
      <p className="text-muted-foreground text-sm mb-6">
        {firstPickTeamName} picks first. Teams alternate after every pick.
      </p>

      <DraftTurnCircles
        teamAName={match.teamOneName}
        teamBName={match.teamTwoName}
        activeSide={activeSide}
        firstPickSide={firstPickSide}
        pickNumber={pickNumber}
      />

      {notice && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300">
          {notice}
        </div>
      )}

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5 space-y-4">
          <div className="rounded-lg border border-border bg-muted/60 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Search size={15} className="text-muted-foreground" />
              <p className="text-sm font-semibold">Search and pick player</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Add a player to {activeTeamName}
            </p>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone"
              disabled={isAdding || !activeTeamId}
            />

            {isSearching && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                <Loader2 className="animate-spin" size={14} />
                Searching players
              </div>
            )}

            {search.trim().length >= 2 && userResults.length > 0 && (
              <div className="space-y-2 mt-3">
                {userResults.map((user) => {
                  const alreadyAdded = takenPhones.has(user.phone_number);

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
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
                        disabled={alreadyAdded || isAdding || !activeTeamId}
                        onClick={() => handleAddUser(user)}
                      >
                        {alreadyAdded ? "Taken" : `Pick #${pickNumber}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {search.trim().length >= 2 && !isSearching && userResults.length === 0 && (
              <p className="text-xs text-muted-foreground mt-3">No users found</p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/60 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Plus size={15} className="text-muted-foreground" />
              <p className="text-sm font-semibold">Add new player</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Create a guest player for {activeTeamName}
            </p>
            <div className="space-y-2">
              <Input
                value={manualName}
                onChange={(e) => {
                  setManualName(e.target.value);
                  setManualError("");
                }}
                placeholder="Player name"
                disabled={isAdding || !activeTeamId}
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
                  disabled={isAdding || !activeTeamId}
                />
              </div>
              {manualError && (
                <p className="text-xs font-medium text-destructive">{manualError}</p>
              )}
              <Button
                type="button"
                className="w-full gap-2"
                disabled={isAdding || !activeTeamId}
                onClick={handleAddManual}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Picking...
                  </>
                ) : (
                  <>
                    Pick for {activeTeamName}
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 space-y-3">
        <p className="text-sm font-semibold px-1">Squads</p>
        <SquadCard
          label={match.teamOneName}
          players={teamAPlayers}
          isActive={activeSide === "a"}
          pickNumbers={draftTimeline
            .filter((pick) => pick.side === "a")
            .map((pick) => pick.pickNumber)}
        />
        <SquadCard
          label={match.teamTwoName}
          players={teamBPlayers}
          isActive={activeSide === "b"}
          pickNumbers={draftTimeline
            .filter((pick) => pick.side === "b")
            .map((pick) => pick.pickNumber)}
        />
      </div>

      {error && <p className="text-sm font-medium text-destructive mb-4">{error}</p>}

      <Button
        type="button"
        className="w-full h-11"
        onClick={() => navigate(`/matches/${id}/toss`)}
      >
        Continue to Match Toss
      </Button>
    </div>
  );
}

function DraftTurnCircles({
  teamAName,
  teamBName,
  activeSide,
  firstPickSide,
  pickNumber,
}: {
  teamAName: string;
  teamBName: string;
  activeSide: TeamSide | null;
  firstPickSide: TeamSide | null;
  pickNumber: number;
}) {
  return (
    <Card className="bg-card border-border mb-4">
      <CardContent className="p-5">
        <p className="text-center text-xs uppercase tracking-wide text-muted-foreground mb-4">
          Pick #{pickNumber}
        </p>

        <div className="flex items-center justify-center gap-8">
          <DraftTeamCircle
            label={teamAName}
            isActive={activeSide === "a"}
            isFirstPick={firstPickSide === "a"}
          />
          <DraftTeamCircle
            label={teamBName}
            isActive={activeSide === "b"}
            isFirstPick={firstPickSide === "b"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DraftTeamCircle({
  label,
  isActive,
  isFirstPick,
}: {
  label: string;
  isActive: boolean;
  isFirstPick: boolean;
}) {
  const shortName = label.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-full border-2 text-lg font-bold transition-all duration-300",
          isActive
            ? "border-primary bg-primary/15 text-foreground scale-110 shadow-[0_0_0_4px] shadow-primary/20"
            : "border-border bg-card text-muted-foreground opacity-50 scale-100"
        )}
      >
        {isActive && (
          <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" />
        )}
        <span className="relative">{shortName}</span>
      </div>
      <p className="max-w-[100px] truncate text-sm font-semibold">{label}</p>
      {isActive ? (
        <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
          Picking now
        </span>
      ) : isFirstPick ? (
        <span className="text-[10px] font-medium text-muted-foreground">Picks 1st</span>
      ) : (
        <span className="text-[10px] font-medium text-muted-foreground">Waiting</span>
      )}
    </div>
  );
}

function SquadCard({
  label,
  players,
  isActive,
  pickNumbers,
}: {
  label: string;
  players: TeamPlayer[];
  isActive: boolean;
  pickNumbers: number[];
}) {
  const roster = players ?? [];

  return (
    <Card
      className={cn(
        "bg-card border-border transition-all",
        isActive ? "border-primary/30" : "opacity-90"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={16} className="shrink-0" />
            <p className="text-sm font-semibold truncate">{label}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {roster.length} player{roster.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-2">
          {roster.length > 0 ? (
            roster.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/60 px-3 py-2"
              >
                {pickNumbers[index] && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-bold">
                    {pickNumbers[index]}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{toPlayerLabel(player)}</p>
                  {player.phone_number && (
                    <p className="text-xs text-muted-foreground">{player.phone_number}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2 text-center">No players yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
