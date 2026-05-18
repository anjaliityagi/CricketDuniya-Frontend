import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Goal,
  HardHat,
  Lock,
  Plus,
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
import TossCoin3D from "@/components/TossCoin3D";
import DraftPoolPicker from "@/components/DraftPoolPicker";
import { cn } from "@/lib/utils";
import type { MatchPlayer } from "@/data/mockMatches";

export default function MatchPlayerSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(() => getMatchById(id || ""));

  const [orderTossWinner, setOrderTossWinner] = useState<"" | "one" | "two">("");
  const [orderFlipping, setOrderFlipping] = useState(false);
  const [orderFlipNonce, setOrderFlipNonce] = useState(0);
  const [orderFlipTarget, setOrderFlipTarget] = useState<"one" | "two" | null>(null);

  const [rolesError, setRolesError] = useState("");
  const [poolError, setPoolError] = useState("");
  const [lockError, setLockError] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

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
    const w = Math.random() < 0.5 ? "one" : "two";
    setOrderFlipTarget(w);
    setOrderFlipNonce((n) => n + 1);
    setOrderFlipping(true);
    setOrderTossWinner("");
    setTimeout(() => {
      setOrderTossWinner(w);
      setOrderFlipping(false);
      setOrderFlipTarget(null);
    }, 1550);
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

  const orderAbbrOne = match.teamOneName.trim().slice(0, 2).toUpperCase() || "T1";
  const orderAbbrTwo = match.teamTwoName.trim().slice(0, 2).toUpperCase() || "T2";

  const setupStep: 0 | 1 | 2 | 3 =
    phases === "order_toss" ? 0 : phases === "draft" ? 1 : phases === "roles" ? 2 : 3;

  return (
    <div
      className={cn(
        "max-w-[430px] mx-auto pb-6",
        phases === "roles" && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
      )}
    >
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
          <CardContent className="space-y-2 px-3 py-2.5">
            <p className="text-sm font-semibold leading-tight">Who picks players first?</p>

            <div className="flex flex-col items-center py-0.5">
              <button
                type="button"
                onClick={handleFlipDraftOrder}
                disabled={orderFlipping}
                className="group touch-manipulation disabled:opacity-90"
                aria-label="Flip coin for draft order"
              >
                <TossCoin3D
                  abbrOne={orderAbbrOne}
                  abbrTwo={orderAbbrTwo}
                  flipNonce={orderFlipNonce}
                  isFlipping={orderFlipping}
                  flipTarget={orderFlipTarget}
                  landedWinner={orderTossWinner}
                />
                {!orderFlipping ? (
                  <p className="mt-1 text-center text-xs font-medium text-muted-foreground leading-tight">
                    Tap to flip
                  </p>
                ) : null}
              </button>
              <p className="mt-1.5 min-h-[1rem] text-center text-xs text-muted-foreground leading-tight">
                {orderFlipping
                  ? "Flipping…"
                  : orderTossWinner
                    ? "Result ready"
                    : "Tap the coin to flip"}
              </p>
              {orderTossWinner && !orderFlipping && (
                <p className="mt-1 text-sm font-bold leading-tight text-green-600">{winnerOrderLabel} picks first</p>
              )}
            </div>

            <div className="flex justify-center gap-6 pt-0.5">
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
          </CardContent>
        </Card>
      )}

      {phases === "draft" && (
        <>
          <div className="relative isolate mb-2 overflow-visible rounded-[1.35rem] border border-primary/25 bg-card/95 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_12px_40px_-8px_rgb(59_130_246/0.35)] backdrop-blur-md dark:border-cyan-500/20 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_16px_48px_-6px_rgb(0_0_0/0.55)]">
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
              aria-hidden
            >
              <div className="absolute left-5 right-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent" />
              <div className="absolute inset-y-12 -left-[45%] w-[55%] bg-gradient-to-r from-transparent via-sky-400/12 to-transparent blur-md motion-safe:animate-draft-shimmer-scan" />
            </div>

            <div className="relative z-[1] p-4">
              <div className="mb-4 flex flex-col items-center gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">
                  {draftTurn ? "Your turn rotates" : "Balanced"}
                </p>
                <p className="text-[11px] font-semibold leading-tight text-foreground">
                  Same headcount → <span className="text-primary">lock</span> to continue
                </p>
              </div>

              <div className="mb-6 flex items-start gap-2">
                <DraftTeamOrb
                  label={match.teamOneName}
                  shortLabel={teamAbbr(match.teamOneName, 3)}
                  side="one"
                  count={n1}
                  isTurn={draftTurn === "one"}
                />
                <div className="flex min-w-[52px] flex-col items-center justify-center px-1 pt-7 text-center">
                  <span className="rounded-md border border-primary/35 bg-muted/40 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                    vs
                  </span>
                  <span className="mt-2 text-xl font-black tabular-nums leading-none tracking-tighter text-foreground">
                    {n1}
                    <span className="mx-1 text-muted-foreground">∶</span>
                    {n2}
                  </span>
                </div>
                <DraftTeamOrb
                  label={match.teamTwoName}
                  shortLabel={teamAbbr(match.teamTwoName, 3)}
                  side="two"
                  count={n2}
                  isTurn={draftTurn === "two"}
                />
              </div>

              {pickFlash ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="animate-draft-pick-banner mb-4 rounded-xl border border-cyan-400/55 bg-gradient-to-br from-emerald-600/95 via-teal-600/90 to-blue-700/95 px-3 py-2.5 text-center text-[13px] font-black uppercase tracking-wide text-white shadow-[0_0_28px_-4px_rgb(34_211_238/0.65)] motion-safe:active:scale-[0.995]"
                >
                  {pickFlash}
                </div>
              ) : null}

              <section className="mb-6 space-y-2">
                <p className="flex items-center gap-2 border-l-2 border-primary/60 pl-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary/95">
                  Pick from pool
                </p>
                {availablePlayers.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 px-3 py-3 text-center text-xs font-medium leading-snug text-muted-foreground">
                    Pool is empty. Add someone new below — or lock if both squads match.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <DraftPoolPicker
                      players={availablePlayers}
                      value={selectedPlayerId}
                      onChange={setSelectedPlayerId}
                      disabled={!draftTurn}
                    />
                    <Button
                      type="button"
                      size="icon"
                      disabled={!draftTurn || !selectedPlayerId}
                      onClick={handleAddFromDropdown}
                      aria-label="Add selected player to current team"
                      className={cn(
                        "size-12 shrink-0 rounded-xl shadow-lg shadow-primary/20 transition-[transform] active:scale-95 touch-manipulation",
                        Boolean(selectedPlayerId && draftTurn) &&
                          "ring-2 ring-primary/55 ring-offset-2 ring-offset-background dark:ring-offset-[#151a29]",
                      )}
                    >
                      <Plus className="size-6" strokeWidth={2.5} />
                    </Button>
                  </div>
                )}
              </section>

              <section className="relative mb-6 overflow-hidden rounded-2xl border border-violet-500/15 bg-gradient-to-br from-muted/35 via-muted/15 to-transparent p-4 dark:from-muted/25">
                <p className="mb-3 flex items-center gap-2 border-l-2 border-violet-500/50 pl-2 text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">
                  New recruit
                </p>
                <form onSubmit={handleAddNewAndAssign} className="space-y-2.5">
                  <Input
                    placeholder="Full name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={!draftTurn}
                    className="h-11 rounded-xl border-blue-400/25 bg-background/90 text-sm font-medium"
                  />
                  <Input
                    type="tel"
                    inputMode="tel"
                    placeholder="Phone (10+ digits)"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    disabled={!draftTurn}
                    className="h-11 rounded-xl border-blue-400/25 bg-background/90 text-sm font-medium"
                  />
                  {poolError ? (
                    <p className="text-[11px] font-semibold leading-snug text-destructive">{poolError}</p>
                  ) : null}
                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      size="icon"
                      variant="secondary"
                      disabled={!draftTurn}
                      aria-label="Add new player and assign to drafting team"
                      className="size-11 rounded-full border border-primary/20 bg-secondary/90 shadow-inner transition-[transform] active:scale-95 disabled:opacity-40"
                    >
                      <Plus className="size-5" strokeWidth={2.5} />
                    </Button>
                  </div>
                </form>
              </section>

              <section>
                <p className="mb-2 border-l-2 border-emerald-500/45 pl-2 text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                  Squads · <span className="tabular-nums">{n1 + n2}</span> drafted
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <DraftSquadStrip variant="green" title={match.teamOneName} players={teamOnePlayers} />
                  <DraftSquadStrip variant="sky" title={match.teamTwoName} players={teamTwoPlayers} />
                </div>
              </section>

              <footer className="mt-5 border-t border-border/60 bg-muted/[0.12] pb-2 pt-4 dark:bg-muted/10">
                {lockError ? (
                  <p className="mb-3 px-1 text-center text-[11px] font-semibold leading-snug text-destructive">{lockError}</p>
                ) : (
                  <p className="mb-3 px-1 text-center text-[10px] leading-snug text-muted-foreground">
                    {n1 !== n2
                      ? `Counts ${Math.min(n1, n2)}∶${Math.max(n1, n2)} · keep alternating picks`
                      : n1 >= 2
                        ? "Both squads match — lock to assign roles."
                        : "Draft at least 2 per side, then lock when counts match."}
                  </p>
                )}
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-[32%] shrink-0 rounded-xl border-primary/25 bg-background/70 px-2 text-xs font-bold shadow-inner touch-manipulation active:scale-[0.98] transition-transform"
                    asChild
                  >
                    <Link to="/matches" aria-label="Back to matches">
                      <span className="flex w-full items-center justify-center gap-1.5">
                        <ArrowLeft className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.5} />
                        <span className="truncate">Back</span>
                      </span>
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    className="h-12 min-w-0 flex-1 rounded-xl gap-2 text-sm font-black shadow-[0_6px_20px_-6px_rgb(59_130_246/0.55)] motion-safe:active:scale-[0.985] transition-transform touch-manipulation"
                    onClick={handleLockDraft}
                  >
                    <Lock className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    <span className="truncate">Submit &amp; lock</span>
                  </Button>
                </div>
              </footer>
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

function DraftTeamOrb({
  label,
  shortLabel,
  side,
  count,
  isTurn,
}: {
  label: string;
  shortLabel: string;
  side: "one" | "two";
  count: number;
  isTurn: boolean;
}) {
  const emerald = side === "one";

  return (
    <div className="relative flex flex-1 min-w-0 flex-col items-center gap-3">
      <div
        className={cn(
          "relative grid size-[5.25rem] place-items-center rounded-full border-2 text-[0.78rem] font-black tracking-[0.12em] transition-all duration-500",
          emerald
            ? "border-emerald-400/60 bg-emerald-500/[0.1] text-emerald-950 dark:border-emerald-400/55 dark:bg-emerald-950/55 dark:text-emerald-50"
            : "border-violet-400/55 bg-violet-500/[0.1] text-violet-950 dark:border-violet-400/50 dark:bg-violet-950/55 dark:text-violet-50",
          isTurn && emerald && "scale-105 animate-draft-orbit-turn-one",
          isTurn && !emerald && "scale-105 animate-draft-orbit-turn-two",
          !isTurn && "scale-[0.96] opacity-70",
        )}
      >
        {isTurn ? (
          <span className="absolute -right-0.5 -top-0.5 flex">
            <span className="absolute inline-flex size-4 animate-ping rounded-full bg-primary opacity-35 motion-reduce:hidden" />
            <span className="relative inline-flex size-4 rounded-full border-2 border-background bg-primary shadow-md" />
          </span>
        ) : null}
        <span className="relative z-[1] px-2 text-center">{shortLabel}</span>
      </div>

      <div className="w-full space-y-1 text-center">
        <p className="truncate px-1 text-[11px] font-bold leading-snug">{label}</p>
        <p className="text-[10px] font-black tabular-nums uppercase tracking-[0.12em] text-muted-foreground">
          {count} picked
        </p>
      </div>
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
        "flex min-h-[108px] flex-col rounded-xl border p-2.5 shadow-inner backdrop-blur-[1px] transition-transform duration-300",
        variant === "green" &&
          "border-emerald-400/45 bg-emerald-500/[0.07] dark:border-emerald-500/35 dark:bg-emerald-950/35",
        variant === "sky" &&
          "border-violet-400/42 bg-violet-500/[0.07] dark:border-violet-500/32 dark:bg-violet-950/32",
      )}
    >
      <p className="mb-2 truncate text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <div className="scrollbar-hide flex max-h-[8.5rem] min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain">
        {players.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic py-1">Empty</p>
        ) : (
          players.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-[border-color]",
                variant === "green" &&
                  "border-emerald-500/22 bg-emerald-500/[0.04] dark:bg-background/65",
                variant === "sky" &&
                  "border-violet-500/22 bg-violet-500/[0.04] dark:bg-background/65",
              )}
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
