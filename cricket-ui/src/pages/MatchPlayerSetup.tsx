import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Goal,
  HardHat,
  Lock,
  UserPlus,
  Users,
} from "lucide-react";

import {
  addMatchPlayerEntry,
  addPlayerDraftPick,
  canProceedToBatBowlToss,
  getAvailablePoolPlayers,
  getDraftTurnTeam,
  getMatchById,
  isDraftFinished,
  isRolesComplete,
  setDraftFirstPicker,
  setMatchRoles,
  tryLockDraft,
} from "@/data/matchStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MatchAdditionalPlayer, MatchPlayer } from "@/data/mockMatches";

export default function MatchPlayerSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(() => getMatchById(id || ""));

  const [orderTossWinner, setOrderTossWinner] = useState<"" | "one" | "two">("");
  const [orderFlipping, setOrderFlipping] = useState(false);

  const [rolesError, setRolesError] = useState("");
  const [poolError, setPoolError] = useState("");
  const [lockError, setLockError] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [commonName, setCommonName] = useState("");
  const [commonPhone, setCommonPhone] = useState("");
  const [commonError, setCommonError] = useState("");

  const [pickFlash, setPickFlash] = useState<string | null>(null);
  const pickFlashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [captainOneId, setCaptainOneId] = useState("");
  const [captainTwoId, setCaptainTwoId] = useState("");
  const [keeperOneId, setKeeperOneId] = useState("");
  const [keeperTwoId, setKeeperTwoId] = useState("");
  const [umpireName, setUmpireName] = useState("");
  const [umpirePhone, setUmpirePhone] = useState("");
  const [scorerName, setScorerName] = useState("");
  const [scorerPhone, setScorerPhone] = useState("");

  function refreshMatch() {
    setMatch(getMatchById(id || ""));
  }

  useEffect(() => {
    refreshMatch();
  }, [id]);

  useEffect(() => {
    return () => {
      if (pickFlashClearRef.current) clearTimeout(pickFlashClearRef.current);
    };
  }, []);

  function flashPickMessage(text: string) {
    if (pickFlashClearRef.current) clearTimeout(pickFlashClearRef.current);
    setPickFlash(text);
    pickFlashClearRef.current = setTimeout(() => {
      setPickFlash(null);
      pickFlashClearRef.current = null;
    }, 2400);
  }

  useEffect(() => {
    if (!match || !id) return;
    setCaptainOneId(match.captainOneId ?? "");
    setCaptainTwoId(match.captainTwoId ?? "");
    setKeeperOneId(match.wicketKeeperOneId ?? "");
    setKeeperTwoId(match.wicketKeeperTwoId ?? "");
    setUmpireName(match.umpireName ?? "");
    setUmpirePhone(match.umpirePhone ?? "");
    setScorerName(match.scorerName ?? "");
    setScorerPhone(match.scorerPhone ?? "");
  }, [
    match?.id,
    match?.captainOneId,
    match?.captainTwoId,
    match?.wicketKeeperOneId,
    match?.wicketKeeperTwoId,
    match?.umpireName,
    match?.umpirePhone,
    match?.scorerName,
    match?.scorerPhone,
  ]);

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

  const teamOnePlayers = match.teamOnePlayers || [];
  const teamTwoPlayers = match.teamTwoPlayers || [];
  const n1 = teamOnePlayers.length;
  const n2 = teamTwoPlayers.length;

  const availablePlayers = getAvailablePoolPlayers(match);
  const draftTurn = getDraftTurnTeam(match);
  const squadDone = isDraftFinished(match);
  const rolesDone = isRolesComplete(match);
  const readyForBatBowlToss = canProceedToBatBowlToss(match);

  const commonEntries =
    match.additionalPlayers?.filter((p) => p.isCommon) ?? ([] as MatchAdditionalPlayer[]);

  const phases:
    | "order_toss"
    | "draft"
    | "roles"
    | "done" = !match.draftFirstPicker
    ? "order_toss"
    : !squadDone
      ? "draft"
      : !rolesDone
        ? "roles"
        : "done";

  function handleFlipDraftOrder() {
    if (orderFlipping) return;
    setOrderFlipping(true);
    setOrderTossWinner("");
    setTimeout(() => {
      const w = Math.random() < 0.5 ? "one" : "two";
      setOrderTossWinner(w);
      setOrderFlipping(false);
    }, 900);
  }

  function handleConfirmDraftOrder() {
    if (!orderTossWinner || !id) return;
    setDraftFirstPicker(id, orderTossWinner);
    refreshMatch();
  }

  function handleAddFromDropdown() {
    if (!id || !draftTurn || !selectedPlayerId) return;
    setPoolError("");
    const picked = availablePlayers.find((p) => p.id === selectedPlayerId);
    addPlayerDraftPick(id, selectedPlayerId);
    setSelectedPlayerId("");
    refreshMatch();
    if (picked) {
      const squad =
        draftTurn === "one" ? match.teamOneName : draftTurn === "two" ? match.teamTwoName : "";
      const first = picked.name.trim().split(/\s+/)[0] ?? picked.name;
      flashPickMessage(`${first} → ${teamAbbr(squad)}`);
    }
  }

  function handleAddNewAndAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !draftTurn) return;
    setPoolError("");
    const r = addMatchPlayerEntry(id, {
      name: newName,
      phone: newPhone,
      isCommon: false,
    });
    if (!r.ok || !r.newId) {
      setPoolError(r.message ?? "Could not add");
      return;
    }
    refreshMatch();
    addPlayerDraftPick(id, r.newId);
    refreshMatch();
    const squad =
      draftTurn === "one" ? match.teamOneName : draftTurn === "two" ? match.teamTwoName : "";
    const first = newName.trim().split(/\s+/)[0] || newName.trim();
    if (first) flashPickMessage(`${first} → ${teamAbbr(squad)}`);
    setNewName("");
    setNewPhone("");
    setSelectedPlayerId("");
  }

  function handleAddCommonPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setCommonError("");
    const r = addMatchPlayerEntry(id, {
      name: commonName,
      phone: commonPhone,
      isCommon: true,
    });
    if (!r.ok) {
      setCommonError(r.message ?? "Could not add");
      return;
    }
    refreshMatch();
    setCommonName("");
    setCommonPhone("");
  }

  function handleLockDraft() {
    if (!id) return;
    setLockError("");
    const r = tryLockDraft(id);
    if (!r.ok) {
      setLockError(r.message ?? "Cannot lock");
      return;
    }
    refreshMatch();
  }

  function handleSaveRoles(e: React.FormEvent) {
    e.preventDefault();
    setRolesError("");
    if (!id) return;

    if (!captainOneId || !captainTwoId || !keeperOneId || !keeperTwoId) {
      setRolesError("Choose captain and wicket-keeper for both teams.");
      return;
    }
    if (captainOneId === captainTwoId) {
      setRolesError("Captains must be different players.");
      return;
    }
    if (!umpireName.trim() || !umpirePhone.trim() || !scorerName.trim() || !scorerPhone.trim()) {
      setRolesError("Enter umpire and scorer name and phone for each.");
      return;
    }

    setMatchRoles(id, {
      captainOneId,
      captainTwoId,
      wicketKeeperOneId: keeperOneId,
      wicketKeeperTwoId: keeperTwoId,
      umpireName,
      umpirePhone,
      scorerName,
      scorerPhone,
    });
    refreshMatch();
  }

  const winnerOrderLabel =
    orderTossWinner === "one" ? match.teamOneName : orderTossWinner === "two" ? match.teamTwoName : "";

  const setupStep: 0 | 1 | 2 | 3 =
    phases === "order_toss" ? 0 : phases === "draft" ? 1 : phases === "roles" ? 2 : 3;

  return (
    <div
      className={cn(
        "max-w-[430px] mx-auto pb-6",
        (phases === "draft" || phases === "roles") &&
          "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
      )}
    >
      {phases !== "draft" && phases !== "roles" && (
        <Link
          to="/matches"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-2"
        >
          <ArrowLeft size={18} />
          Back to matches
        </Link>
      )}

      {phases !== "draft" && phases !== "roles" && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
          Setup · {match.teamOneName} vs {match.teamTwoName}
        </p>
      )}
      <h1 className="text-xl font-bold mb-1">Build match</h1>
      {phases !== "draft" && phases !== "roles" ? (
        <p className="text-muted-foreground text-xs mb-2 leading-snug">
          Draft squads, assign roles, then bat/bowl toss.
        </p>
      ) : null}

      <SetupProgressBar step={setupStep} />

      {phases === "order_toss" && (
        <Card className="border-border mb-3">
          <CardContent className="p-3 space-y-3">
            <p className="text-sm font-semibold">Who picks players first?</p>
            <p className="text-xs text-muted-foreground">
              Tap the coin. The winner drafts first; teams then alternate. You decide how large each squad is —
              lock the draft when both sides have the same count.
            </p>

            <div className="flex flex-col items-center py-2">
              <button
                type="button"
                onClick={handleFlipDraftOrder}
                disabled={orderFlipping}
                className="disabled:opacity-70"
              >
                <div
                  className={cn(
                    "w-24 h-24 rounded-full border-4 border-yellow-500 bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg flex items-center justify-center",
                    orderFlipping && "animate-spin"
                  )}
                >
                  <span className="text-lg font-black text-yellow-900">CD</span>
                </div>
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                {orderFlipping ? "Flipping…" : orderTossWinner ? "Result ready" : "Tap coin to flip"}
              </p>
              {orderTossWinner && !orderFlipping && (
                <p className="text-sm font-bold text-green-600 mt-2">{winnerOrderLabel} picks first</p>
              )}
            </div>

            <div className="flex justify-center gap-8">
              <MiniTeam label={match.teamOneName} hot={orderTossWinner === "one" && !orderFlipping} />
              <MiniTeam label={match.teamTwoName} hot={orderTossWinner === "two" && !orderFlipping} />
            </div>

            <Button
              type="button"
              className="w-full h-11"
              disabled={!orderTossWinner || orderFlipping}
              onClick={handleConfirmDraftOrder}
            >
              Continue to draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleFlipDraftOrder}
              disabled={orderFlipping}
            >
              Flip again
            </Button>
          </CardContent>
        </Card>
      )}

      {phases === "draft" && (
        <>
          <div
            className={cn(
              "rounded-2xl border-2 p-3 mb-2 transition-colors duration-300 touch-manipulation",
              draftTurn === "one" &&
                "border-green-600/50 bg-gradient-to-br from-green-50/95 to-transparent dark:from-green-950/40",
              draftTurn === "two" &&
                "border-sky-600/50 bg-gradient-to-br from-sky-50/95 to-transparent dark:from-sky-950/35",
              !draftTurn && "border-border bg-muted/25"
            )}
          >
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {draftTurn ? (
                  <span
                    className={cn(
                      "inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full",
                      draftTurn === "one" ? "bg-green-500" : "bg-sky-500"
                    )}
                  />
                ) : null}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-base font-black leading-tight",
                      draftTurn === "one" && "text-green-900 dark:text-green-300",
                      draftTurn === "two" && "text-sky-950 dark:text-sky-200",
                      !draftTurn && "text-muted-foreground"
                    )}
                  >
                    {draftTurn === "one"
                      ? match.teamOneName
                      : draftTurn === "two"
                        ? match.teamTwoName
                        : "—"}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {draftTurn ? "Picks now" : "Same count — lock below"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 font-black tabular-nums">
                <span
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs",
                    draftTurn === "one"
                      ? "bg-green-600/15 text-green-900 dark:text-green-300"
                      : "text-muted-foreground"
                  )}
                >
                  {teamAbbr(match.teamOneName)} {n1}
                </span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs",
                    draftTurn === "two"
                      ? "bg-sky-600/15 text-sky-950 dark:text-sky-200"
                      : "text-muted-foreground"
                  )}
                >
                  {teamAbbr(match.teamTwoName)} {n2}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
            {pickFlash ? (
              <div
                role="status"
                aria-live="polite"
                className="mb-3 rounded-xl bg-green-600 px-3 py-2.5 text-center text-sm font-black text-white shadow-md motion-safe:transition-transform motion-safe:duration-300 motion-safe:active:scale-[0.99]"
              >
                {pickFlash}
              </div>
            ) : null}

            {availablePlayers.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4 leading-snug">
                No one left in the pool — open below or lock.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  disabled={!draftTurn}
                  className="min-h-12 w-full touch-manipulation rounded-xl border border-input bg-background px-3 text-base disabled:opacity-50"
                >
                  <option value="">Tap to choose…</option>
                  {availablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                      {player.phone ? ` · ${player.phone}` : ""}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  className={cn(
                    "h-12 w-full text-base font-black touch-manipulation transition-[transform,box-shadow] active:scale-[0.98]",
                    Boolean(selectedPlayerId && draftTurn) &&
                      "shadow-lg shadow-primary/25 ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                  )}
                  disabled={!draftTurn || !selectedPlayerId}
                  onClick={handleAddFromDropdown}
                >
                  Add to squad
                </Button>
              </div>
            )}
          </div>

          <div className="mb-2 rounded-xl border border-border bg-muted/15 p-2">
            <p className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Squads · {n1 + n2} picked
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <DraftSquadStrip variant="green" title={match.teamOneName} players={teamOnePlayers} />
              <DraftSquadStrip variant="sky" title={match.teamTwoName} players={teamTwoPlayers} />
            </div>
          </div>

          <div className="mb-2 rounded-xl border border-dashed border-border bg-muted/20 p-2.5">
            <p className="mb-2 text-xs font-bold">New player — not in list</p>
            <form onSubmit={handleAddNewAndAssign} className="space-y-1.5">
              <Input
                placeholder="Full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 rounded-lg bg-background text-sm"
              />
              <Input
                type="tel"
                inputMode="tel"
                placeholder="Phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-10 rounded-lg bg-background text-sm"
              />
              {poolError && <p className="text-[11px] text-destructive">{poolError}</p>}
              <Button type="submit" variant="secondary" className="w-full h-10 rounded-lg text-xs font-bold">
                Add &amp; draft to active team
              </Button>
            </form>
          </div>

          <div className="mb-2 rounded-xl border border-border bg-muted/20 p-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Common players
              {commonEntries.length > 0 ? (
                <span className="tabular-nums font-semibold text-muted-foreground">({commonEntries.length})</span>
              ) : null}
            </p>
            <p className="text-[10px] text-muted-foreground mb-2 leading-snug">Match contacts only — not on A/B.</p>

            {commonEntries.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {commonEntries.map((p) => (
                  <li
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold">
                      {playerInitials(p.name)}
                    </span>
                    <span className="truncate max-w-[140px]">
                      {p.name}
                      {p.phone ? <span className="text-muted-foreground"> · {p.phone}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddCommonPlayer} className="space-y-1.5">
              <Input
                placeholder="Name"
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
                className="h-10 rounded-lg bg-background text-sm"
              />
              <Input
                type="tel"
                inputMode="tel"
                placeholder="Phone"
                value={commonPhone}
                onChange={(e) => setCommonPhone(e.target.value)}
                className="h-10 rounded-lg bg-background text-sm"
              />
              {commonError && <p className="text-[11px] text-destructive">{commonError}</p>}
              <Button
                type="submit"
                variant="outline"
                className="w-full h-10 rounded-lg gap-1.5 text-xs font-semibold"
              >
                <UserPlus size={14} />
                Add common player
              </Button>
            </form>
          </div>

          <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50">
            <div className="pointer-events-auto mx-auto max-w-[430px] border-t border-border bg-background/95 px-3 pt-2 shadow-[0_-6px_28px_rgba(0,0,0,0.09)] backdrop-blur-md pb-[max(0.65rem,env(safe-area-inset-bottom))] dark:shadow-[0_-6px_28px_rgba(0,0,0,0.35)]">
              {lockError ? (
                <p className="text-[11px] text-destructive mb-2 px-0.5 text-center leading-snug">{lockError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-[30%] shrink-0 touch-manipulation px-2"
                  asChild
                >
                  <Link to="/matches" aria-label="Back to matches">
                    <span className="flex w-full items-center justify-center gap-1">
                      <ArrowLeft className="h-4 w-4 shrink-0" />
                      <span className="truncate text-xs font-bold">Back</span>
                    </span>
                  </Link>
                </Button>
                <Button
                  type="button"
                  className="h-12 min-w-0 flex-1 rounded-xl text-sm font-black gap-1.5 shadow-sm touch-manipulation active:scale-[0.99] transition-transform"
                  onClick={handleLockDraft}
                >
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Lock &amp; continue</span>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {phases === "roles" && (
        <>
          <Card className="border-border mb-3">
            <CardContent className="p-3.5">
              <form id="match-setup-roles-form" onSubmit={handleSaveRoles} className="space-y-3">
                <p className="text-sm font-semibold">Captains & wicket-keepers</p>

                <div className="grid gap-2.5">
                  <RolePickerCard
                    title="Captain"
                    teamLabel={match.teamOneName}
                    accent="green"
                    icon={<HardHat className="h-6 w-6 text-green-700 dark:text-green-400" strokeWidth={2} />}
                    value={captainOneId}
                    onChange={setCaptainOneId}
                    players={teamOnePlayers}
                  />
                  <RolePickerCard
                    title="Captain"
                    teamLabel={match.teamTwoName}
                    accent="sky"
                    icon={<HardHat className="h-6 w-6 text-sky-800 dark:text-sky-300" strokeWidth={2} />}
                    value={captainTwoId}
                    onChange={setCaptainTwoId}
                    players={teamTwoPlayers}
                  />
                  <RolePickerCard
                    title="Wicket-keeper"
                    teamLabel={match.teamOneName}
                    accent="green"
                    icon={<Goal className="h-6 w-6 text-green-700 dark:text-green-400" strokeWidth={2} />}
                    value={keeperOneId}
                    onChange={setKeeperOneId}
                    players={teamOnePlayers}
                  />
                  <RolePickerCard
                    title="Wicket-keeper"
                    teamLabel={match.teamTwoName}
                    accent="sky"
                    icon={<Goal className="h-6 w-6 text-sky-800 dark:text-sky-300" strokeWidth={2} />}
                    value={keeperTwoId}
                    onChange={setKeeperTwoId}
                    players={teamTwoPlayers}
                  />
                </div>

                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground">Umpire (contact)</p>
                  <Input
                    value={umpireName}
                    onChange={(e) => setUmpireName(e.target.value)}
                    placeholder="Full name"
                    className="h-11"
                  />
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={umpirePhone}
                    onChange={(e) => setUmpirePhone(e.target.value)}
                    placeholder="Phone number"
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Scorer (contact)</p>
                  <Input
                    value={scorerName}
                    onChange={(e) => setScorerName(e.target.value)}
                    placeholder="Full name"
                    className="h-11"
                  />
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={scorerPhone}
                    onChange={(e) => setScorerPhone(e.target.value)}
                    placeholder="Phone number"
                    className="h-11"
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50">
            <div className="pointer-events-auto mx-auto max-w-[430px] border-t border-border bg-background/95 px-3 pt-2 shadow-[0_-6px_28px_rgba(0,0,0,0.09)] backdrop-blur-md pb-[max(0.65rem,env(safe-area-inset-bottom))] dark:shadow-[0_-6px_28px_rgba(0,0,0,0.35)]">
              {rolesError ? (
                <p className="text-[11px] text-destructive mb-2 px-0.5 text-center leading-snug">{rolesError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-[30%] shrink-0 touch-manipulation px-2"
                  asChild
                >
                  <Link to="/matches" aria-label="Back to matches">
                    <span className="flex w-full items-center justify-center gap-1">
                      <ArrowLeft className="h-4 w-4 shrink-0" />
                      <span className="truncate text-xs font-bold">Back</span>
                    </span>
                  </Link>
                </Button>
                <Button
                  type="submit"
                  form="match-setup-roles-form"
                  className="h-12 min-w-0 flex-1 rounded-xl text-sm font-black gap-1.5 shadow-sm touch-manipulation active:scale-[0.99] transition-transform"
                >
                  Save roles
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {phases === "done" && readyForBatBowlToss && (
        <Card className="border-green-600/25 bg-green-50/50 dark:bg-green-950/20 border mb-2">
          <CardContent className="p-3.5 space-y-2 text-center">
            <p className="text-sm font-semibold">Setup complete</p>
            <p className="text-xs text-muted-foreground">
              Next: toss for bat or bowl, then the match goes live.
            </p>
            <Button className="w-full h-10 text-sm" onClick={() => navigate(`/matches/${id}/toss`)}>
              Continue to bat/bowl toss
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SetupProgressBar({ step }: { step: 0 | 1 | 2 | 3 }) {
  const labels = ["Draft order", "Draft squads", "Roles & officials", "Bat / bowl toss"];
  return (
    <div className="mb-4" role="navigation" aria-label="Setup progress">
      <div className="flex gap-1">
        {([0, 1, 2, 3] as const).map((i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                i < step && "w-full bg-green-600",
                i === step && "w-full bg-foreground",
                i > step && "w-0 bg-transparent"
              )}
            />
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[10px] font-semibold text-muted-foreground">
        Step {step + 1} of 4 · {labels[step]}
      </p>
    </div>
  );
}

function MiniTeam({ label, hot }: { label: string; hot: boolean }) {
  const short = label.slice(0, 2).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "w-14 h-14 rounded-full border-2 flex items-center justify-center text-xs font-bold",
          hot ? "border-green-600 bg-green-50 dark:bg-green-950/40 scale-105" : "border-border bg-muted"
        )}
      >
        {short}
      </div>
      <span className="text-[10px] font-medium max-w-[72px] truncate text-center">{label}</span>
    </div>
  );
}

function playerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function teamAbbr(name: string, maxLen = 4) {
  const t = name.trim();
  if (!t) return "?";
  if (t.length <= maxLen) return t.toUpperCase();
  return t.slice(0, maxLen).toUpperCase();
}

function DraftSquadStrip({
  variant,
  title,
  players,
}: {
  variant: "green" | "sky";
  title: string;
  players: MatchPlayer[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2 min-h-[96px] flex flex-col",
        variant === "green" && "border-green-600/20 bg-green-50/40 dark:bg-green-950/20",
        variant === "sky" && "border-sky-600/20 bg-sky-50/35 dark:bg-sky-950/20"
      )}
    >
      <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1 truncate leading-none">
        {title}
      </p>
      <div className="space-y-1 flex-1 min-h-0 max-h-24 overflow-y-auto scrollbar-hide">
        {players.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic py-1">Empty</p>
        ) : (
          players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 rounded-lg bg-background/90 border border-border/50 px-1.5 py-1"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold">
                {playerInitials(p.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold truncate leading-tight">{p.name}</p>
                {p.phone ? (
                  <p className="text-[9px] text-muted-foreground truncate leading-none">{p.phone}</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RolePickerCard({
  title,
  teamLabel,
  accent,
  icon,
  value,
  onChange,
  players,
}: {
  title: string;
  teamLabel: string;
  accent: "green" | "sky";
  icon: ReactNode;
  value: string;
  onChange: (id: string) => void;
  players: MatchPlayer[];
}) {
  const [open, setOpen] = useState(false);
  const selected = players.find((p) => p.id === value);

  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-card text-left shadow-sm transition-shadow",
        accent === "green" && "border-green-600/35 dark:border-green-600/45",
        accent === "sky" && "border-sky-600/35 dark:border-sky-500/45"
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 p-3.5 text-left touch-manipulation active:bg-muted/40"
      >
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2",
            accent === "green" &&
              "border-green-600/40 bg-green-500/10 dark:bg-green-950/50",
            accent === "sky" && "border-sky-600/40 bg-sky-500/10 dark:bg-sky-950/40"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
          <p className="truncate text-xs font-semibold text-muted-foreground/90">{teamLabel}</p>
          <p className="mt-1 truncate text-base font-bold leading-tight">
            {selected ? selected.name : <span className="text-muted-foreground">Choose player…</span>}
          </p>
        </div>
        <ChevronDown
          className={cn("mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-border/80 bg-muted/25 px-2 py-2">
          {players.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No players in squad yet.</p>
          ) : (
            <ul className="max-h-52 space-y-1 overflow-y-auto">
              {players.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors touch-manipulation",
                      value === p.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                      {playerInitials(p.name)}
                    </span>
                    <span className="min-w-0 truncate">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
