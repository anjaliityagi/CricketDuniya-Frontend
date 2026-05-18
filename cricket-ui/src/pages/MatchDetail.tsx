import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import {
  canProceedToBatBowlToss,
  endMatch,
  getMatchById,
  getOverDisplay,
  getRunRate,
  getSquadPlayers,
  parseScore,
  recordBall,
  recordBye,
  recordLegBye,
  recordNoBall,
  recordWide,
  recordWicket,
  replaceBowler,
  replaceNonStriker,
  replaceStriker,
  swapStrike,
} from "@/data/matchStore";
import type { BatsmanLive, BowlerLive } from "@/data/mockMatches";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(() => getMatchById(id || ""));

  function refreshMatch() {
    setMatch(getMatchById(id || ""));
  }

  if (!match) {
    return (
      <div className="max-w-[430px] mx-auto text-center py-12">
        <p className="font-semibold mb-2">Match not found</p>
        <Button asChild variant="outline">
          <Link to="/matches">Go back</Link>
        </Button>
      </div>
    );
  }

  const title = `${match.teamOneName} vs ${match.teamTwoName}`;
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const showScorecard = isLive || isCompleted;

  const battingTeamName =
    match.battingTeam === "one" ? match.teamOneName : match.teamTwoName;
  const bowlingTeamName =
    match.battingTeam === "one" ? match.teamTwoName : match.teamOneName;

  const battingScore =
    match.battingTeam === "one"
      ? parseScore(match.teamOneScore)
      : parseScore(match.teamTwoScore);

  const bowlingScore =
    match.battingTeam === "one"
      ? parseScore(match.teamTwoScore)
      : parseScore(match.teamOneScore);

  const overText = getOverDisplay(match.inningsBalls || 0);
  const runRate = getRunRate(battingScore.runs, match.inningsBalls || 0);

  function handleStartMatch() {
    if (!id) return;
    if (!canProceedToBatBowlToss(match)) {
      navigate(`/matches/${id}/setup`);
      return;
    }
    navigate(`/matches/${id}/toss`);
  }

  function handleEndMatch() {
    if (!id) return;
    endMatch(id);
    refreshMatch();
  }

  return (
    <div
      className={cn(
        "max-w-[430px] mx-auto pb-6",
        isLive && showScorecard && "pb-[calc(min(42vh,340px)+0.75rem)]"
      )}
    >
      <Link
        to="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-3"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="flex items-center gap-2 mb-1">
        {isLive && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-600 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
          </span>
        )}
        <p
          className={cn(
            "text-[10px] font-bold tracking-[0.14em] uppercase",
            isLive ? "text-green-600" : "text-muted-foreground"
          )}
        >
          {isLive ? "LIVE NOW" : isCompleted ? "COMPLETED" : "UPCOMING"}
        </p>
      </div>

      <h1 className="text-xl font-bold mb-3">{title}</h1>

      {match.status === "scheduled" && (
        <ScheduledView
          match={match}
          id={id!}
          onStart={handleStartMatch}
          setupComplete={canProceedToBatBowlToss(match)}
        />
      )}

      {showScorecard && (
        <div className="space-y-2">
          <Card className="bg-card border-border py-0 gap-0">
            <CardContent className="p-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Batting</p>
                <p className="text-xl font-black">
                  {battingTeamName}{" "}
                  <span className="font-mono">
                    {formatScore(battingScore.runs, battingScore.wickets)}
                  </span>
                </p>
                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{overText} ov</span>
                  <span>RR {runRate}</span>
                </div>
              </div>

              <div className="rounded-lg bg-background border border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{bowlingTeamName}</p>
                <p className="font-mono font-bold text-sm">
                  {bowlingScore.runs === 0 && bowlingScore.wickets === 0 && isLive
                    ? "Yet to bat"
                    : formatScore(bowlingScore.runs, bowlingScore.wickets)}
                </p>
              </div>

              {match.striker && match.nonStriker && (
                <div className="border-t border-border pt-2">
                  <p className="text-xs font-bold mb-1">Batsmen</p>
                  <BatsmanRow batsman={match.striker} />
                  <BatsmanRow batsman={match.nonStriker} />
                </div>
              )}

              {match.currentBowler && (
                <div className="border-t border-border pt-2">
                  <p className="text-xs font-bold mb-1">Bowler</p>
                  <BowlerRow bowler={match.currentBowler} />
                </div>
              )}

              {match.thisOverBalls && match.thisOverBalls.length > 0 && (
                <div className="border-t border-border pt-2">
                  <p className="text-xs font-bold mb-1.5">This Over</p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.thisOverBalls.map((ball, index) => (
                      <span
                        key={index}
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border",
                          ball === "W"
                            ? "bg-foreground text-background border-foreground"
                            : ball === "Wd" || ball === "Nb"
                              ? "bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-500/40"
                              : ball.startsWith("b") || ball.startsWith("lb")
                                ? "bg-sky-500/15 text-sky-900 dark:text-sky-100 border-sky-500/35"
                                : "bg-muted border-border"
                        )}
                      >
                        {ball}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {match.tossWinner && match.tossDecision && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2">
                  Toss:{" "}
                  {match.tossWinner === "one" ? match.teamOneName : match.teamTwoName} —{" "}
                  {match.tossDecision}
                </p>
              )}
            </CardContent>
          </Card>

          {isLive && id && match.battingTeam && (
            <FixedScoreKeyboard
              teamName={battingTeamName}
              battingSquadNames={getSquadPlayers(match, match.battingTeam).map(
                (p) => p.name
              )}
              bowlingSquadNames={getSquadPlayers(
                match,
                match.battingTeam === "one" ? "two" : "one"
              ).map((p) => p.name)}
              strikerName={match.striker?.name}
              nonStrikerName={match.nonStriker?.name}
              bowlerName={match.currentBowler?.name}
              onAddRuns={(runs) => {
                recordBall(id, runs);
                refreshMatch();
              }}
              onWicket={() => {
                recordWicket(id);
                refreshMatch();
              }}
              onWide={() => {
                recordWide(id);
                refreshMatch();
              }}
              onNoBall={() => {
                recordNoBall(id);
                refreshMatch();
              }}
              onBye={(runs) => {
                recordBye(id, runs);
                refreshMatch();
              }}
              onLegBye={(runs) => {
                recordLegBye(id, runs);
                refreshMatch();
              }}
              onSwapStrike={() => {
                swapStrike(id);
                refreshMatch();
              }}
              onReplaceStriker={(name) => {
                replaceStriker(id, name);
                refreshMatch();
              }}
              onReplaceNonStriker={(name) => {
                replaceNonStriker(id, name);
                refreshMatch();
              }}
              onReplaceBowler={(name) => {
                replaceBowler(id, name);
                refreshMatch();
              }}
              onEndMatch={handleEndMatch}
            />
          )}
        </div>
      )}
    </div>
  );
}

function formatScore(runs: number, wickets: number) {
  return `${runs}/${wickets}`;
}

function ScheduledView({
  match,
  id,
  onStart,
  setupComplete,
}: {
  match: ReturnType<typeof getMatchById>;
  id: string;
  onStart: () => void;
  setupComplete: boolean;
}) {
  if (!match) return null;

  return (
    <div className="space-y-2">
      <Card className="bg-card border-border py-0 gap-0">
        <CardContent className="p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Overs: {match.overs_per_side}</p>

          <div className="rounded-lg bg-background border border-border overflow-hidden">
            <div className="flex items-stretch">
              <TeamScore name={match.teamOneName} score={match.teamOneScore} />
              <div className="w-px bg-border self-stretch my-2" />
              <TeamScore name={match.teamTwoName} score={match.teamTwoScore} />
            </div>
          </div>

          <p className="text-muted-foreground text-xs">{match.matchNote}</p>
        </CardContent>
      </Card>

      {!setupComplete && (
        <p className="text-xs text-muted-foreground px-0.5">
          Complete squad draft, captains, and officials, then bat/bowl toss.
        </p>
      )}

      <Button asChild variant="outline" className="w-full h-10">
        <Link to={`/matches/${id}/setup`}>Open setup</Link>
      </Button>

      <Button className="w-full h-10" onClick={onStart}>
        {setupComplete ? "Bat / bowl toss" : "Continue setup"}
      </Button>
    </div>
  );
}

function TeamScore({ name, score }: { name: string; score?: string }) {
  return (
    <div className="flex-1 py-2 px-2 text-center">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">
        {name}
      </p>
      <p className="font-mono text-base font-bold">{score || "—"}</p>
    </div>
  );
}

function BatsmanRow({ batsman }: { batsman: BatsmanLive }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border last:border-0">
      <div>
        <p className="font-semibold text-sm">
          {batsman.name}
          {batsman.isStriker && <span className="text-green-600 ml-1">*</span>}
        </p>
        <p className="text-[10px] text-muted-foreground">
          4s: {batsman.fours} · 6s: {batsman.sixes}
        </p>
      </div>
      <p className="font-mono text-sm font-bold">
        {batsman.runs} ({batsman.balls})
      </p>
    </div>
  );
}

function BowlerRow({ bowler }: { bowler: BowlerLive }) {
  const overDisplay = `${bowler.overs}.${bowler.balls}`;

  return (
    <div className="flex items-center justify-between">
      <p className="font-semibold text-sm">{bowler.name}</p>
      <p className="font-mono text-xs font-bold">
        {overDisplay} - {bowler.runs} - {bowler.wickets}
      </p>
    </div>
  );
}

type KeyboardTab = "runs" | "extras" | "change";

function FixedScoreKeyboard({
  teamName,
  battingSquadNames,
  bowlingSquadNames,
  strikerName,
  nonStrikerName,
  bowlerName,
  onAddRuns,
  onWicket,
  onWide,
  onNoBall,
  onBye,
  onLegBye,
  onSwapStrike,
  onReplaceStriker,
  onReplaceNonStriker,
  onReplaceBowler,
  onEndMatch,
}: {
  teamName: string;
  battingSquadNames: string[];
  bowlingSquadNames: string[];
  strikerName?: string;
  nonStrikerName?: string;
  bowlerName?: string;
  onAddRuns: (runs: number) => void;
  onWicket: () => void;
  onWide: () => void;
  onNoBall: () => void;
  onBye: (runs: number) => void;
  onLegBye: (runs: number) => void;
  onSwapStrike: () => void;
  onReplaceStriker: (name: string) => void;
  onReplaceNonStriker: (name: string) => void;
  onReplaceBowler: (name: string) => void;
  onEndMatch: () => void;
}) {
  const [tab, setTab] = useState<KeyboardTab>("runs");
  const [newStriker, setNewStriker] = useState("");
  const [newNon, setNewNon] = useState("");
  const [newBowler, setNewBowler] = useState("");

  const strikerChoices = battingSquadNames.filter((n) => n !== nonStrikerName);
  const nonChoices = battingSquadNames.filter((n) => n !== strikerName);
  const byeRunsOpts = [0, 1, 2, 4] as const;

  return (
    <div
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 h-[42vh] max-h-[340px] border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)] flex flex-col pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="shrink-0 px-3 pt-2 flex items-center justify-between gap-2 border-b border-border/60">
        <p className="font-bold text-xs truncate">
          Score · <span className="text-muted-foreground font-semibold">{teamName}</span>
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[10px] px-2"
            onClick={onEndMatch}
          >
            End match
          </Button>
        </div>
      </div>

      <div className="shrink-0 flex gap-1 px-2 pt-2">
        {(
          [
            ["runs", "Runs"],
            ["extras", "Extras"],
            ["change", "Change"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-[11px] font-bold border transition-colors",
              tab === key
                ? "bg-foreground text-background border-foreground"
                : "bg-muted/50 text-muted-foreground border-border"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {tab === "runs" && (
          <div className="flex flex-col gap-1.5 h-full min-h-[140px]">
            <div className="grid grid-cols-3 flex-1 gap-1.5 min-h-0">
              <KeyBtn onClick={() => onAddRuns(0)}>0</KeyBtn>
              <KeyBtn onClick={() => onAddRuns(1)}>1</KeyBtn>
              <KeyBtn onClick={() => onAddRuns(2)}>2</KeyBtn>
              <KeyBtn onClick={() => onAddRuns(3)}>3</KeyBtn>
              <KeyBtn onClick={() => onAddRuns(4)}>4</KeyBtn>
              <KeyBtn onClick={() => onAddRuns(6)}>6</KeyBtn>
            </div>
            <KeyBtn onClick={onWicket} danger>
              Wicket
            </KeyBtn>
          </div>
        )}

        {tab === "extras" && (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-1.5">
              <ExtraBtn label="Wide +1" onClick={onWide} />
              <ExtraBtn label="No ball +1" onClick={onNoBall} />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Bye (legal ball)
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {byeRunsOpts.map((r) => (
                <ExtraBtn key={`b${r}`} label={`B ${r}`} onClick={() => onBye(r)} />
              ))}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Leg bye
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {byeRunsOpts.map((r) => (
                <ExtraBtn key={`lb${r}`} label={`LB ${r}`} onClick={() => onLegBye(r)} />
              ))}
            </div>
          </div>
        )}

        {tab === "change" && (
          <div className="space-y-2 text-xs">
            <Button type="button" variant="secondary" className="w-full h-9 text-xs" onClick={onSwapStrike}>
              Swap strike (rotate ends)
            </Button>

            <div className="rounded-lg border border-border p-2 space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground">Replace striker *</p>
              <p className="text-[10px] text-muted-foreground truncate">
                Now: {strikerName ?? "—"}
              </p>
              <div className="flex gap-1.5">
                <select
                  className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-2 text-xs h-9"
                  value={newStriker}
                  onChange={(e) => setNewStriker(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {strikerChoices.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 text-xs"
                  disabled={!newStriker}
                  onClick={() => {
                    onReplaceStriker(newStriker);
                    setNewStriker("");
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border p-2 space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground">Replace non‑striker</p>
              <p className="text-[10px] text-muted-foreground truncate">
                Now: {nonStrikerName ?? "—"}
              </p>
              <div className="flex gap-1.5">
                <select
                  className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-2 text-xs h-9"
                  value={newNon}
                  onChange={(e) => setNewNon(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {nonChoices.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 text-xs"
                  disabled={!newNon}
                  onClick={() => {
                    onReplaceNonStriker(newNon);
                    setNewNon("");
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border p-2 space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground">Replace bowler</p>
              <p className="text-[10px] text-muted-foreground truncate">
                Now: {bowlerName ?? "—"}
              </p>
              <div className="flex gap-1.5">
                <select
                  className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-2 text-xs h-9"
                  value={newBowler}
                  onChange={(e) => setNewBowler(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {bowlingSquadNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 text-xs"
                  disabled={!newBowler}
                  onClick={() => {
                    onReplaceBowler(newBowler);
                    setNewBowler("");
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExtraBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border bg-muted/70 py-2.5 text-[11px] font-bold active:scale-[0.98] transition-transform"
    >
      {label}
    </button>
  );
}

function KeyBtn({
  children,
  onClick,
  danger,
}: {
  children: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-muted/80 text-lg font-black active:scale-[0.97] transition-transform min-h-[44px] flex items-center justify-center",
        danger && "bg-foreground text-background border-foreground"
      )}
    >
      {children}
    </button>
  );
}
