import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMatchQuery } from "@/hooks/useMatchQuery";
import { useUserSearchQuery } from "@/hooks/useUserSearchQuery";
import {
  addPlayersToTeams,
  type TeamPlayersBatchInput,
  type UserSearchResult,
} from "@/services/teams";
import {
  cn,
  getPhoneValidationMessage,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/utils";

type TeamSide = "a" | "b";

type LocalDraftPlayer = {
  localId: string;
  userId?: string;
  name: string;
  phone_number?: string;
};

type DraftPick = {
  pickNumber: number;
  side: TeamSide;
  player: LocalDraftPlayer;
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

const DRAFT_FIRST_PICK_STORAGE_KEY = (matchId: string) =>
  `cricket_match_draft_first_pick_${matchId}`;

function getFirstPickSide(
  firstPickTeamId: string | undefined,
  teamAId: string | undefined,
  teamBId: string | undefined
): TeamSide | null {
  if (!firstPickTeamId) return null;

  const norm = (s: string | undefined) =>
    typeof s === "string" ? s.trim().toLowerCase() : "";
  const fp = norm(firstPickTeamId);

  if (teamAId && norm(teamAId) === fp) return "a";
  if (teamBId && norm(teamBId) === fp) return "b";

  return null;
}

function safeRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  teamAPlayers: LocalDraftPlayer[],
  teamBPlayers: LocalDraftPlayer[]
): DraftPick[] {
  const firstTeamPlayers = firstPickSide === "a" ? teamAPlayers : teamBPlayers;
  const secondTeamPlayers = firstPickSide === "a" ? teamBPlayers : teamAPlayers;
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

function toPlayerLabel(player: LocalDraftPlayer) {
  return player.name || player.phone_number || "Unnamed player";
}

function normalizePlayerName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return (parts[0]?.slice(0, 2) || "P").toUpperCase();
}

function toApiPlayers(players: LocalDraftPlayer[]) {
  return players.map((player) =>
    player.userId
      ? { player_id: player.userId }
      : { name: player.name, phone_number: player.phone_number! }
  );
}

function buildBatchPayload(
  teamAId: string | undefined,
  teamBId: string | undefined,
  teamAPlayers: LocalDraftPlayer[],
  teamBPlayers: LocalDraftPlayer[]
): TeamPlayersBatchInput[] {
  const payload: TeamPlayersBatchInput[] = [];

  if (teamAId && teamAPlayers.length > 0) {
    payload.push({
      team_id: teamAId,
      players: toApiPlayers(teamAPlayers),
    });
  }

  if (teamBId && teamBPlayers.length > 0) {
    payload.push({
      team_id: teamBId,
      players: toApiPlayers(teamBPlayers),
    });
  }

  return payload;
}

export default function MatchPlayerDraft() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: match, isLoading: isLoadingMatch } = useMatchQuery(id);

  const [teamAPlayers, setTeamAPlayers] = useState<LocalDraftPlayer[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<LocalDraftPlayer[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualError, setManualError] = useState("");
  const manualPhoneError = getPhoneValidationMessage(manualPhone);

  const { data: userResultsRaw = [], isFetching: isSearching } = useUserSearchQuery(search);
  const userResults = userResultsRaw ?? [];
  const trimmedSearch = search.trim();
  const canSearch = trimmedSearch.length >= 2;
  const shouldShowManualAdd = canSearch && !isSearching && userResults.length === 0;

  useEffect(() => {
    if (!shouldShowManualAdd) return;

    const digitsOnly = trimmedSearch.replace(/\D/g, "");

    if (digitsOnly.length >= 6 && !manualPhone) {
      setManualPhone(digitsOnly.slice(0, 10));
    } else if (!manualName) {
      setManualName(trimmedSearch);
    }
  }, [manualName, manualPhone, shouldShowManualAdd, trimmedSearch]);

  useEffect(() => {
    if (isLoadingMatch || !match || !id) return;

    const hasPickOrder =
      Boolean(match.first_pick_team_id) ||
      Boolean(sessionStorage.getItem(DRAFT_FIRST_PICK_STORAGE_KEY(id)));

    if (!hasPickOrder) {
      navigate(`/matches/${id}/pick-toss`, { replace: true });
    }
  }, [id, isLoadingMatch, match, navigate]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const effectiveFirstPickTeamId =
    match?.first_pick_team_id ??
    (id ? sessionStorage.getItem(DRAFT_FIRST_PICK_STORAGE_KEY(id)) : null) ??
    undefined;

  const firstPickSide = useMemo(
    () =>
      getFirstPickSide(
        effectiveFirstPickTeamId,
        match?.team_a_id,
        match?.team_b_id
      ),
    [effectiveFirstPickTeamId, match?.team_a_id, match?.team_b_id]
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

  const activeTeamName =
    activeSide === "a" ? match?.teamOneName : activeSide === "b" ? match?.teamTwoName : "";
  const waitingTeamName =
    activeSide === "a" ? match?.teamTwoName : activeSide === "b" ? match?.teamOneName : "";

  const pickNumber = draftTimeline.length + 1;

  const takenPhones = useMemo(() => {
    const phones = new Set<string>();
    [...teamAPlayers, ...teamBPlayers].forEach((player) => {
      if (!player.phone_number) return;
      phones.add(normalizePhoneNumber(player.phone_number));
    });
    return phones;
  }, [teamAPlayers, teamBPlayers]);

  const takenUserIds = useMemo(() => {
    const ids = new Set<string>();
    [...teamAPlayers, ...teamBPlayers].forEach((player) => {
      if (!player.userId?.trim()) return;
      ids.add(player.userId.trim().toLowerCase());
    });
    return ids;
  }, [teamAPlayers, teamBPlayers]);

  const takenNames = useMemo(() => {
    const names = new Set<string>();
    [...teamAPlayers, ...teamBPlayers].forEach((player) => {
      const normalizedName = normalizePlayerName(player.name);
      if (!normalizedName) return;
      names.add(normalizedName);
    });
    return names;
  }, [teamAPlayers, teamBPlayers]);

  function addLocalPlayer(side: TeamSide, player: LocalDraftPlayer) {
    if (side === "a") {
      setTeamAPlayers((current) => [...current, player]);
    } else {
      setTeamBPlayers((current) => [...current, player]);
    }
  }

  function removeLocalPlayer(side: TeamSide, localId: string) {
    if (side === "a") {
      setTeamAPlayers((current) =>
        current.filter((player) => player.localId !== localId)
      );
    } else {
      setTeamBPlayers((current) =>
        current.filter((player) => player.localId !== localId)
      );
    }
    setError("");
    setNotice("Player removed. Draft turn order updated.");
  }

  function handleAddUser(user: UserSearchResult) {
    const phoneKey = normalizePhoneNumber(user.phone_number ?? "");
    const nameKey = normalizePlayerName(user.name);
    if (
      (phoneKey && takenPhones.has(phoneKey)) ||
      takenUserIds.has(user.id.trim().toLowerCase()) ||
      (nameKey && takenNames.has(nameKey))
    ) {
      setError("This player is already in one of the teams");
      return;
    }

    if (!firstPickSide) {
      setError(
        "Pick order is missing — go back and complete the pick toss step."
      );
      return;
    }

    if (!activeSide) {
      setError("Could not determine which team picks. Refresh and try again.");
      return;
    }

    setError("");
    addLocalPlayer(activeSide, {
      localId: safeRandomId(),
      userId: user.id,
      name: user.name,
      phone_number: user.phone_number,
    });
    setSearch("");
    setManualName("");
    setManualPhone("");
    setNotice(
      waitingTeamName
        ? `${activeTeamName} picked a player. ${waitingTeamName}'s turn next.`
        : `${activeTeamName} picked a player.`
    );
  }

  function handleAddManual() {
    const name = manualName.trim();
    const phoneNumber = normalizePhoneNumber(manualPhone);

    if (!name || !phoneNumber) {
      setManualError("Enter player name and phone number");
      return;
    }

    if (manualPhoneError || !isValidPhoneNumber(manualPhone)) {
      setManualError(manualPhoneError || "Enter a valid 10-digit phone number");
      return;
    }

    if (takenPhones.has(phoneNumber) || takenNames.has(normalizePlayerName(name))) {
      setManualError("This player is already in one of the teams");
      return;
    }

    if (!firstPickSide) {
      setManualError("Pick order is missing — go back to toss first.");
      return;
    }

    if (!activeSide) {
      setManualError("Could not determine which team picks.");
      return;
    }

    setManualError("");
    setError("");
    addLocalPlayer(activeSide, {
      localId: safeRandomId(),
      name,
      phone_number: phoneNumber,
    });
    setManualName("");
    setManualPhone("");
    setSearch("");
    setNotice(
      waitingTeamName
        ? `${activeTeamName} picked a player. ${waitingTeamName}'s turn next.`
        : `${activeTeamName} picked a player.`
    );
  }

  async function handleContinue() {
    if (!match?.team_a_id || !match?.team_b_id || !id) return;

    const totalPlayers = teamAPlayers.length + teamBPlayers.length;
    if (totalPlayers === 0) {
      setError("Add at least one player before continuing");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = buildBatchPayload(
        match.team_a_id,
        match.team_b_id,
        teamAPlayers,
        teamBPlayers
      );

      await addPlayersToTeams(payload);
      if (id) {
        sessionStorage.removeItem(`cricket_match_draft_first_pick_${id}`);
      }
      await queryClient.invalidateQueries({ queryKey: ["matches", id, "squad"] });
      navigate(`/matches/${id}/captains`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save squads. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingMatch) {
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

      <Card className="mb-4 overflow-hidden border-border bg-card">
        <div className="india-accent-strip h-1" />
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-wide">Pick Console</p>
              <p className="text-xs font-semibold text-muted-foreground">
                Add next player to {activeTeamName}
              </p>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
              Pick #{pickNumber}
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setManualName("");
                  setManualPhone("");
                  setManualError("");
                  setError("");
                }}
                className="h-12 rounded-xl bg-card pl-9 pr-10 text-sm font-bold"
                placeholder="Search player name or phone"
                disabled={!activeSide || isSubmitting}
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setSearch("");
                    setManualName("");
                    setManualPhone("");
                    setManualError("");
                    setError("");
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {isSearching && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground">
                <Loader2 className="animate-spin text-primary" size={14} />
                Scanning player grid
              </div>
            )}

            {!canSearch && !isSearching && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                <Sparkles size={14} className="text-primary" />
                Search first. Create option unlocks only if no player exists.
              </div>
            )}

            {canSearch && userResults.length > 0 && (
              <div className="space-y-2 mt-3">
                {userResults.map((user) => {
                  const phoneNorm = normalizePhoneNumber(user.phone_number ?? "");
                  const alreadyAdded =
                    (phoneNorm && takenPhones.has(phoneNorm)) ||
                    takenUserIds.has(user.id.trim().toLowerCase()) ||
                    takenNames.has(normalizePlayerName(user.name));

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
                        disabled={alreadyAdded || !activeSide || isSubmitting}
                        onClick={() => handleAddUser(user)}
                        className="h-9 rounded-full px-3"
                      >
                        {alreadyAdded ? (
                          <>
                            <Check size={14} />
                            Taken
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            Pick
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {shouldShowManualAdd && (
              <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/10 p-3">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Plus size={15} />
                  </span>
                  <div>
                    <p className="text-sm font-black">Create player card</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      No existing player found for this search
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    value={manualName}
                    onChange={(e) => {
                      setManualName(e.target.value);
                      setManualError("");
                    }}
                    className="h-11 rounded-xl bg-card text-sm font-bold"
                    placeholder="Player name"
                    disabled={!activeSide || isSubmitting}
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
                      className="h-11 rounded-xl bg-card pl-9 text-sm font-bold"
                      placeholder="9876543210"
                      disabled={!activeSide || isSubmitting}
                    />
                  </div>
                </div>

                {manualPhoneError && (
                  <p className="mt-2 text-xs font-bold text-destructive">
                    {manualPhoneError}
                  </p>
                )}
                {manualError && (
                  <p className="mt-2 text-xs font-bold text-destructive">
                    {manualError}
                  </p>
                )}
                <Button
                  type="button"
                  className="mt-3 w-full gap-2 rounded-xl"
                  disabled={!activeSide || isSubmitting}
                  onClick={handleAddManual}
                >
                  Pick for {activeTeamName}
                  <ArrowRight size={16} />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 space-y-3">
        <p className="text-sm font-semibold px-1">Squads</p>
        <SquadCard
          label={match.teamOneName}
          players={teamAPlayers}
          side="a"
          isActive={activeSide === "a"}
          pickNumbers={draftTimeline
            .filter((pick) => pick.side === "a")
            .map((pick) => pick.pickNumber)}
          onRemove={removeLocalPlayer}
        />
        <SquadCard
          label={match.teamTwoName}
          players={teamBPlayers}
          side="b"
          isActive={activeSide === "b"}
          pickNumbers={draftTimeline
            .filter((pick) => pick.side === "b")
            .map((pick) => pick.pickNumber)}
          onRemove={removeLocalPlayer}
        />
      </div>

      {error && <p className="text-sm font-medium text-destructive mb-4">{error}</p>}

      <Button
        type="button"
        className="w-full h-11"
        disabled={isSubmitting}
        onClick={handleContinue}
      >
        {isSubmitting && <Loader2 className="animate-spin" size={16} />}
        {isSubmitting ? "Saving squads..." : "Continue to Captains"}
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
  side,
  isActive,
  pickNumbers,
  onRemove,
}: {
  label: string;
  players: LocalDraftPlayer[];
  side: TeamSide;
  isActive: boolean;
  pickNumbers: number[];
  onRemove: (side: TeamSide, localId: string) => void;
}) {
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
            {players.length} player{players.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-2">
          {players.length > 0 ? (
            players.map((player, index) => (
              <div
                key={player.localId}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-muted/60 px-3 py-2"
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRemove(side, player.localId)}
                  aria-label={`Remove ${toPlayerLabel(player)}`}
                >
                  <Trash2 size={15} />
                </Button>
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
