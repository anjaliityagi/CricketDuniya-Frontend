import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crosshair, Loader2, Shield, Sparkles } from "lucide-react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";

import {
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
import { useBallMutation } from "@/hooks/useBallMutation";
import { useMatchQuery } from "@/hooks/useMatchQuery";
import { useMatchScorecardQuery } from "@/hooks/useMatchScorecardQuery";
import { useMatchSquadQuery } from "@/hooks/useMatchSquadQuery";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useAuth } from "@/context/AuthContext";
import {
  completeMatch,
  type AddBallPayload,
  type BallResponse,
  type InningsState,
  type MatchScorecard,
  type ScorecardPlayer,
  type MatchSquadPlayer,
  undoLastBall,
  updateInningsState,
} from "@/services/matches";
import type { AuthUser } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getApiErrorMessage(error: unknown, fallback: string) {
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

function getIdKey(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function getCurrentUserId(user: AuthUser | null) {
  return (
    getIdKey(user?.id) ||
    getIdKey(user?.user_id) ||
    getIdKey(user?.userId) ||
    getIdKey(user?._id)
  );
}

function canUserUpdateScore(
  user: AuthUser | null,
  match: NonNullable<ReturnType<typeof getMatchById>>,
  squad: MatchSquadPlayer[]
) {
  const userId = getCurrentUserId(user);

  if (!userId) return false;

  const hostIds = [
    match.created_by,
    match.createdBy,
    match.host_user_id,
    match.hostUserId,
  ].map(getIdKey);

  if (hostIds.includes(userId)) return true;

  return squad.some(
    (player) =>
      player.is_umpire &&
      [player.user_id, player.match_team_player_id].map(getIdKey).includes(userId)
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: profile } = useProfileQuery(isAuthenticated);
  const {
    data: apiMatch,
    isLoading,
    isError,
  } = useMatchQuery(id);
  const isBackendMatch = Boolean(
    apiMatch?.team_a_id ||
      apiMatch?.team_b_id ||
      apiMatch?.team_a_match_team_id ||
      apiMatch?.team_b_match_team_id
  );
  const {
    data: scorecard,
    isLoading: isScorecardLoading,
    isError: isScorecardError,
  } = useMatchScorecardQuery(
    id,
    Boolean(id && isBackendMatch && apiMatch?.status !== "scheduled")
  );
  const { data: squad = [] } = useMatchSquadQuery(id);
  const ballMutation = useBallMutation(id);
  const [match, setMatch] = useState(() => getMatchById(id || ""));
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    if (apiMatch) {
      setMatch(apiMatch);
    }
  }, [apiMatch]);

  function refreshMatch() {
    setMatch(getMatchById(id || "") ?? apiMatch);
  }

  if (isLoading && !match) {
    return (
      <div className="max-w-[430px] mx-auto flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm font-medium">Loading match</span>
      </div>
    );
  }

  if ((!match && isError) || !match) {
    return (
      <div className="max-w-[430px] mx-auto text-center py-12">
        <p className="font-semibold mb-2">Match not found</p>
        <Button asChild variant="outline">
          <Link to="/matches">Go back</Link>
        </Button>
      </div>
    );
  }

  const currentMatch = match;
  const title = `${currentMatch.teamOneName} vs ${currentMatch.teamTwoName}`;
  const isLive = currentMatch.status === "live";
  const isCompleted = currentMatch.status === "completed";
  const showScorecard = isLive || isCompleted;
  const currentUser = getCurrentUserId(user) ? user : profile?.user ?? user;
  const canUpdateScore = canUserUpdateScore(currentUser, currentMatch, squad);

  const battingTeamName =
    currentMatch.battingTeam === "one" ? currentMatch.teamOneName : currentMatch.teamTwoName;
  const bowlingTeamName =
    currentMatch.battingTeam === "one" ? currentMatch.teamTwoName : currentMatch.teamOneName;

  const battingScore =
    currentMatch.battingTeam === "one"
      ? parseScore(currentMatch.teamOneScore)
      : parseScore(currentMatch.teamTwoScore);

  const bowlingScore =
    currentMatch.battingTeam === "one"
      ? parseScore(currentMatch.teamTwoScore)
      : parseScore(currentMatch.teamOneScore);

  const overText = getOverDisplay(currentMatch.inningsBalls || 0);
  const runRate = getRunRate(battingScore.runs, currentMatch.inningsBalls || 0);

  function handleStartMatch() {
    if (!id) return;
    const startDate = getScheduledStartDate(currentMatch.match_date);

    if (startDate && startDate.getTime() > Date.now()) {
      setScheduleError(`This match will start at ${formatScheduledStart(startDate)}.`);
      return;
    }

    setScheduleError("");
    navigate(`/matches/${id}/toss`);
  }

  async function handleEndMatch() {
    if (!id) return;
    if (currentMatch.team_a_id || currentMatch.team_b_id) {
      const teamOneScore = parseScore(currentMatch.teamOneScore);
      const teamTwoScore = parseScore(currentMatch.teamTwoScore);
      const winnerId =
        teamOneScore.runs >= teamTwoScore.runs
          ? currentMatch.team_a_match_team_id ?? currentMatch.team_a_id
          : currentMatch.team_b_match_team_id ?? currentMatch.team_b_id;

      if (winnerId) {
        await completeMatch(id, winnerId);
        setMatch({ ...currentMatch, status: "completed" });
        return;
      }
    }

    endMatch(id);
    refreshMatch();
  }

  return (
    <div
      className={cn(
        "max-w-[430px] mx-auto min-h-dvh pb-6",
        isLive && showScorecard && canUpdateScore && "pb-[calc(min(40vh,380px)+1rem)]"
      )}
    >
      <Link
        to="/matches"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-3"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-xl font-bold">{title}</h1>
        <div className="flex shrink-0 items-center gap-2">
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
      </div>

      {match.status === "scheduled" && (
        <ScheduledView
          match={match}
          id={id!}
          scheduleError={scheduleError}
          onStart={handleStartMatch}
        />
      )}

      {showScorecard && isBackendMatch && isScorecardLoading && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
            Loading live scorecard
          </CardContent>
        </Card>
      )}

      {showScorecard && isBackendMatch && isScorecardError && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Match is live, but the scorecard could not be loaded yet.
          </CardContent>
        </Card>
      )}

      {showScorecard && isBackendMatch && scorecard ? (
        <BackendLiveMatch
          match={match}
          scorecard={scorecard}
          squad={squad}
          isLive={isLive}
          isCompleted={isCompleted}
          canUpdateScore={canUpdateScore}
          isSavingBall={ballMutation.isPending}
          onAddBall={(payload) => ballMutation.mutateAsync(payload)}
          onEndMatch={handleEndMatch}
        />
      ) : showScorecard && !isBackendMatch && (
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

          {isLive && canUpdateScore && id && match.battingTeam && (
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

function BackendLiveMatch({
  match,
  scorecard,
  squad,
  isLive,
  isCompleted,
  canUpdateScore,
  isSavingBall,
  onAddBall,
  onEndMatch,
}: {
  match: NonNullable<ReturnType<typeof getMatchById>>;
  scorecard: MatchScorecard;
  squad: MatchSquadPlayer[];
  isLive: boolean;
  isCompleted: boolean;
  canUpdateScore: boolean;
  isSavingBall: boolean;
  onAddBall: (payload: AddBallPayload) => Promise<BallResponse>;
  onEndMatch: () => void;
}) {
  const innings = scorecard.innings[scorecard.innings.length - 1];
  const [liveState, setLiveState] = useState<InningsState | null>(null);

  useEffect(() => {
    setLiveState(null);
  }, [innings?.id]);

  const displayedRuns = liveState?.total_runs ?? innings?.total_runs ?? 0;
  const displayedWickets = liveState?.total_wickets ?? innings?.total_wickets ?? 0;
  const currentStrikerId = liveState?.striker_id ?? scorecard.current_striker_id ?? "";
  const currentNonStrikerId =
    liveState?.non_striker_id ?? scorecard.current_non_striker_id ?? "";
  const currentBowlerId = liveState?.bowler_id ?? scorecard.current_bowler_id ?? "";
  const legalBalls = liveState?.legal_balls ?? innings?.legal_balls ?? 0;
  const displayedOver = `${liveState?.current_over ?? innings?.current_over ?? 0}.${liveState?.current_ball ?? innings?.current_ball ?? 0}`;
  const liveRunRate = getRunRate(displayedRuns, legalBalls);
  const battingTeamName =
    innings?.batting_match_team_id === match.team_a_match_team_id
      ? match.teamOneName
      : match.teamTwoName;
  const bowlingTeamName =
    innings?.bowling_match_team_id === match.team_a_match_team_id
      ? match.teamOneName
      : match.teamTwoName;
  const recentBalls = scorecard.recent_balls.slice(-6).reverse();
  const battingPlayers = scorecard.batting.filter(
    (player) => player.match_team_id === innings?.batting_match_team_id
  );
  const bowlingPlayers = scorecard.bowling.filter(
    (player) => player.match_team_id === innings?.bowling_match_team_id
  );

  function createFallbackPlayer(playerId: string, teamId: string) {
    const squadPlayer = squad.find((player) => player.match_team_player_id === playerId);
    if (!squadPlayer) return null;

    return {
      match_team_player_id: squadPlayer.match_team_player_id,
      match_team_id: teamId,
      user_id: squadPlayer.user_id,
      player_name: squadPlayer.player_name || squadPlayer.name || squadPlayer.phone_number || "Unnamed player",
      runs_scored: 0,
      balls_faced: 0,
      fours: 0,
      sixes: 0,
      is_out: false,
      runs_conceded: 0,
      wickets_taken: 0,
      overs_bowled: 0,
      fantasy_points: 0,
    };
  }

  const currentStriker =
    battingPlayers.find((player) => player.match_team_player_id === currentStrikerId) ??
    (currentStrikerId ? createFallbackPlayer(currentStrikerId, innings.batting_match_team_id) : null);
  const currentNonStriker =
    battingPlayers.find((player) => player.match_team_player_id === currentNonStrikerId) ??
    (currentNonStrikerId
      ? createFallbackPlayer(currentNonStrikerId, innings.batting_match_team_id)
      : null);
  const currentBowler =
    bowlingPlayers.find((player) => player.match_team_player_id === currentBowlerId) ??
    (currentBowlerId ? createFallbackPlayer(currentBowlerId, innings.bowling_match_team_id) : null);
  const currentBatters = [currentStriker, currentNonStriker].filter(Boolean) as ScorecardPlayer[];
  const featuredBowlers = [
    ...(currentBowler ? [currentBowler] : []),
    ...bowlingPlayers.filter((player) => player.match_team_player_id !== currentBowlerId),
  ].filter(
    (player, index, players) =>
      players.findIndex((entry) => entry.match_team_player_id === player.match_team_player_id) === index
  ).slice(0, 2);
  const partnershipRuns = currentBatters.reduce((sum, player) => sum + player.runs_scored, 0);
  const partnershipBalls = currentBatters.reduce((sum, player) => sum + player.balls_faced, 0);
  const tossSummary = match.tossWinner && match.tossDecision
    ? `${match.tossWinner === "one" ? match.teamOneName : match.teamTwoName} (${match.tossDecision})`
    : "Not available";
  const completedPlayers = [...scorecard.batting].sort((a, b) => {
    if (b.fantasy_points !== a.fantasy_points) return b.fantasy_points - a.fantasy_points;
    return a.player_name.localeCompare(b.player_name);
  });
  const manOfTheMatch = completedPlayers[0] ?? null;
  const worstPlayer = completedPlayers.length > 0 ? completedPlayers[completedPlayers.length - 1] : null;
  const firstInnings = scorecard.innings.find((entry) => entry.innings_no === 1) ?? scorecard.innings[0];
  const secondInnings = scorecard.innings.find((entry) => entry.innings_no === 2) ?? scorecard.innings[1];
  const winnerMatchTeamId = match.winner_match_team_id;
  const winnerName = winnerMatchTeamId
    ? winnerMatchTeamId === match.team_a_match_team_id
      ? match.teamOneName
      : winnerMatchTeamId === match.team_b_match_team_id
        ? match.teamTwoName
        : null
    : null;
  const resultText = winnerName
    ? secondInnings && firstInnings
      ? secondInnings.total_runs > firstInnings.total_runs
        ? `${winnerName} won by ${getRemainingWickets(secondInnings, squad)} wickets`
        : `${winnerName} won by ${Math.max(firstInnings.total_runs - secondInnings.total_runs, 0)} runs`
      : `${winnerName} won the match`
    : "Match completed";
  const lastWicketBall = scorecard.recent_balls.find((ball) => Boolean(ball.dismissal_type));
  const chaseLine =
    typeof liveState?.required_runs_to_win === "number" &&
    typeof liveState?.balls_remaining === "number"
      ? `${liveState.required_runs_to_win} needed from ${liveState.balls_remaining} balls`
      : null;
  const lastWicketText = displayedWickets > 0
    ? lastWicketBall
      ? `${displayedRuns}/${displayedWickets} · ${lastWicketBall.dismissal_type ?? "wicket"}`
      : `${displayedRuns}/${displayedWickets}`
    : "No wicket yet";

  if (!innings) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Match is live, but innings data is not available yet.
        </CardContent>
      </Card>
    );
  }

  if (isCompleted) {
    return (
      <CompletedMatchSummary
        match={match}
        scorecard={scorecard}
        squad={squad}
        players={completedPlayers}
        manOfTheMatch={manOfTheMatch}
        worstPlayer={worstPlayer}
        resultText={resultText}
        winnerName={winnerName}
      />
    );
  }

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden border-border bg-card py-0 gap-0 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-3 p-4">
          <div className="rounded-[24px] border border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[32px] font-black tracking-tight text-foreground">
                  {battingTeamName} {displayedRuns} - {displayedWickets}
                </p>
                {chaseLine && (
                  <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
                    Need {liveState?.required_runs_to_win} more in {liveState?.balls_remaining} balls
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-right shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Overs</p>
                <p className="mt-1 font-mono text-xl font-black text-foreground">{displayedOver}</p>
              </div>
            </div>
          </div>

          {(liveState?.needs_next_batter || liveState?.needs_next_bowler) && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {liveState?.needs_next_batter
                ? "Select next batter before continuing."
                : "Select next bowler before continuing."}
            </div>
          )}

          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="grid grid-cols-[1.6fr_repeat(5,minmax(0,0.5fr))] gap-2 bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                <span>Batter</span>
                <span className="text-center">R</span>
                <span className="text-center">B</span>
                <span className="text-center">4s</span>
                <span className="text-center">6s</span>
                <span className="text-center">SR</span>
              </div>
              <div className="divide-y divide-border">
                {currentBatters.length > 0 ? currentBatters.map((player) => {
                  const isStriker = player.match_team_player_id === currentStrikerId;
                  const strikeRate = player.balls_faced > 0 ? ((player.runs_scored / player.balls_faced) * 100).toFixed(2) : "0.00";
                  return (
                    <div
                      key={player.match_team_player_id}
                      className="grid grid-cols-[1.6fr_repeat(5,minmax(0,0.5fr))] gap-2 px-3 py-2.5 text-sm"
                    >
                      {player.user_id ? (
                        <Link to={"/players/" + player.user_id} className="truncate font-medium text-primary hover:underline">
                          {player.player_name}{isStriker ? " *" : ""}
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-primary">
                          {player.player_name}{isStriker ? " *" : ""}
                        </span>
                      )}
                      <span className="text-center font-semibold">{player.runs_scored}</span>
                      <span className="text-center">{player.balls_faced}</span>
                      <span className="text-center">{player.fours}</span>
                      <span className="text-center">{player.sixes}</span>
                      <span className="text-center">{strikeRate}</span>
                    </div>
                  );
                }) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground">Batters not available yet.</div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="grid grid-cols-[1.6fr_repeat(5,minmax(0,0.5fr))] gap-2 bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                <span>Bowler</span>
                <span className="text-center">O</span>
                <span className="text-center">M</span>
                <span className="text-center">R</span>
                <span className="text-center">W</span>
                <span className="text-center">ECO</span>
              </div>
              <div className="divide-y divide-border">
                {currentBowler ? (() => {
                  const economy = currentBowler.overs_bowled > 0 ? (currentBowler.runs_conceded / currentBowler.overs_bowled).toFixed(2) : "0.00";
                  return (
                    <div className="grid grid-cols-[1.6fr_repeat(5,minmax(0,0.5fr))] gap-2 px-3 py-2.5 text-sm">
                      {currentBowler.user_id ? (
                        <Link to={"/players/" + currentBowler.user_id} className="truncate font-medium text-primary hover:underline">
                          {currentBowler.player_name} *
                        </Link>
                      ) : (
                        <span className="truncate font-medium text-primary">{currentBowler.player_name} *</span>
                      )}
                      <span className="text-center">{currentBowler.overs_bowled}</span>
                      <span className="text-center">0</span>
                      <span className="text-center">{currentBowler.runs_conceded}</span>
                      <span className="text-center font-semibold">{currentBowler.wickets_taken}</span>
                      <span className="text-center">{economy}</span>
                    </div>
                  );
                })() : (
                  <div className="px-3 py-4 text-sm text-muted-foreground">Bowling stats not available yet.</div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background p-3 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground">Recent balls</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentBalls.length > 0 ? recentBalls.map((ball) => (
                  <RecentBallChip key={ball.id} ball={ball} />
                )) : (
                  <p className="text-sm text-muted-foreground">No recent balls yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground">Key Stats</p>
              <div className="mt-3 space-y-3 text-sm leading-5">
                <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5">
                  <p className="font-semibold text-foreground">Partnership</p>
                  <p className="mt-1 text-muted-foreground">{partnershipRuns}({partnershipBalls})</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5">
                  <p className="font-semibold text-foreground">Last Wkt</p>
                  <p className="mt-1 text-muted-foreground">{lastWicketText}</p>
                </div>
                {chaseLine && (
                  <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
                    <p className="font-semibold text-foreground">Equation</p>
                    <p className="mt-1 text-muted-foreground">{chaseLine}</p>
                  </div>
                )}
                <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5">
                  <p className="font-semibold text-foreground">Toss</p>
                  <p className="mt-1 text-muted-foreground">{tossSummary}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {isLive && canUpdateScore && !liveState?.innings_completed && (
        <BackendScoreKeyboard
          match={match}
          scorecard={scorecard}
          squad={squad}
          inningsId={innings.id}
          battingMatchTeamId={innings.batting_match_team_id}
          bowlingMatchTeamId={innings.bowling_match_team_id}
          liveState={liveState}
          onStateChange={setLiveState}
          isSaving={isSavingBall}
          onAddBall={onAddBall}
          onEndMatch={onEndMatch}
        />
      )}

      {isLive && canUpdateScore && liveState?.innings_completed && (
        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="p-4 text-sm font-semibold text-primary">
            Innings complete. Waiting for the match state to refresh.
          </CardContent>
        </Card>
      )}

      {isCompleted && (
        <CompletedMatchSummary
          match={match}
          scorecard={scorecard}
          squad={squad}
          players={completedPlayers}
          manOfTheMatch={manOfTheMatch}
          worstPlayer={worstPlayer}
          resultText={resultText}
          winnerName={winnerName}
        />
      )}
    </div>
  );
}

function CompletedMatchSummary({
  match,
  scorecard,
  squad,
  players: _players,
  manOfTheMatch,
  worstPlayer,
  resultText,
  winnerName: _winnerName,
}: {
  match: NonNullable<ReturnType<typeof getMatchById>>;
  scorecard: MatchScorecard;
  squad: MatchSquadPlayer[];
  players: MatchScorecard["batting"];
  manOfTheMatch: MatchScorecard["batting"][number] | null;
  worstPlayer: MatchScorecard["batting"][number] | null;
  resultText: string;
  winnerName: string | null;
}) {
  const innings = scorecard.innings;
  const firstInnings = innings.find((entry) => entry.innings_no === 1) ?? innings[0];
  const secondInnings = innings.find((entry) => entry.innings_no === 2) ?? innings[1];
  const [selectedInningsId, setSelectedInningsId] = useState(firstInnings?.id ?? secondInnings?.id ?? "");

  useEffect(() => {
    if (!selectedInningsId) {
      setSelectedInningsId(firstInnings?.id ?? secondInnings?.id ?? "");
      return;
    }
    if (!innings.some((entry) => entry.id === selectedInningsId)) {
      setSelectedInningsId(firstInnings?.id ?? secondInnings?.id ?? "");
    }
  }, [firstInnings?.id, innings, secondInnings?.id, selectedInningsId]);

  const selectedInnings = innings.find((entry) => entry.id === selectedInningsId) ?? firstInnings ?? secondInnings;

  function getTeamName(teamId?: string) {
    if (!teamId) return "Unknown";
    if (teamId === match.team_a_match_team_id) return match.teamOneName;
    if (teamId === match.team_b_match_team_id) return match.teamTwoName;
    return "Unknown";
  }

  function getBallsFromOvers(overs: number) {
    const wholeOvers = Math.floor(overs);
    const balls = Math.round((overs - wholeOvers) * 10);
    return wholeOvers * 6 + balls;
  }

  function getEconomy(player: MatchScorecard["bowling"][number]) {
    const balls = getBallsFromOvers(player.overs_bowled);
    if (balls === 0) return "0.00";
    return (player.runs_conceded * 6 / balls).toFixed(2);
  }

  if (!selectedInnings) {
    return null;
  }

  const battingOrderMap = new Map(
    squad
      .filter((player) => player.match_team_id === selectedInnings.batting_match_team_id)
      .map((player) => [player.match_team_player_id, player.batting_order ?? Number.MAX_SAFE_INTEGER])
  );

  const battingPlayers = scorecard.batting
    .filter((player) => player.match_team_id === selectedInnings.batting_match_team_id)
    .sort((a, b) => {
      const orderA = battingOrderMap.get(a.match_team_player_id) ?? Number.MAX_SAFE_INTEGER;
      const orderB = battingOrderMap.get(b.match_team_player_id) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return b.runs_scored - a.runs_scored;
    });

  const bowlingPlayers = scorecard.bowling
    .filter((player) => player.match_team_id === selectedInnings.bowling_match_team_id)
    .sort((a, b) => {
      if (b.wickets_taken !== a.wickets_taken) return b.wickets_taken - a.wickets_taken;
      return getBallsFromOvers(b.overs_bowled) - getBallsFromOvers(a.overs_bowled);
    });

  const battingIds = new Set(battingPlayers.map((player) => player.match_team_player_id));
  const didNotBat = squad
    .filter(
      (player) =>
        player.match_team_id === selectedInnings.batting_match_team_id &&
        player.is_playing_xi &&
        !battingIds.has(player.match_team_player_id)
    )
    .sort((a, b) => (a.batting_order ?? Number.MAX_SAFE_INTEGER) - (b.batting_order ?? Number.MAX_SAFE_INTEGER));

  const extras = Math.max(
    selectedInnings.total_runs - battingPlayers.reduce((sum, player) => sum + player.runs_scored, 0),
    0
  );

  const inningsTabs = [firstInnings, secondInnings].filter(Boolean) as MatchScorecard["innings"];

  return (
    <Card className="overflow-hidden border-border bg-card py-0 gap-0 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-primary">{resultText}</p>
          <div className="flex flex-wrap gap-2">
            {inningsTabs.map((entry) => {
              const active = entry.id === selectedInnings.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  onClick={() => setSelectedInningsId(entry.id)}
                >
                  {getTeamName(entry.batting_match_team_id)} ({entry.innings_no}
                  {entry.innings_no === 1 ? "st" : entry.innings_no === 2 ? "nd" : "th"} Inn)
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-border bg-background">
          <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2.5 text-primary-foreground">
            <p className="text-lg font-black tracking-tight">{getTeamName(selectedInnings.batting_match_team_id)}</p>
            <p className="font-mono text-lg font-black">
              {selectedInnings.total_runs}-{selectedInnings.total_wickets} ({selectedInnings.current_over}.{selectedInnings.current_ball} Ov)
            </p>
          </div>

          <div className="border-b border-border bg-muted/40 px-4 py-2">
            <div className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px_40px_64px] items-center gap-2 text-xs font-bold text-foreground">
              <p>Batter</p>
              <p className="text-right">R</p>
              <p className="text-right">B</p>
              <p className="text-right">4s</p>
              <p className="text-right">6s</p>
              <p className="text-right">SR</p>
            </div>
          </div>

          <div>
            {battingPlayers.map((player) => {
              const strikeRate = player.balls_faced > 0 ? ((player.runs_scored * 100) / player.balls_faced).toFixed(2) : "0.00";
              return (
                <div key={player.match_team_player_id} className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px_40px_64px] items-center gap-2 border-b border-border/70 px-4 py-2.5">
                  <div className="min-w-0">
                    {player.user_id ? (
                      <Link to={"/players/" + player.user_id} className="text-sm font-semibold leading-5 text-primary break-words hover:underline">
                        {player.player_name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold leading-5 text-primary break-words">{player.player_name}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">{player.is_out ? "out" : "not out"}</p>
                  </div>
                  <p className="text-right text-sm font-black text-foreground">{player.runs_scored}</p>
                  <p className="text-right text-sm font-semibold text-foreground">{player.balls_faced}</p>
                  <p className="text-right text-sm text-foreground">{player.fours}</p>
                  <p className="text-right text-sm text-foreground">{player.sixes}</p>
                  <p className="text-right text-sm text-foreground">{strikeRate}</p>
                </div>
              );
            })}

            <div className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2 border-b border-border/70 px-4 py-2.5">
              <div>
                <p className="text-sm font-black text-foreground">Extras</p>
              </div>
              <p className="text-right text-sm font-black text-foreground">{extras}</p>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_200px] items-center gap-2 border-b border-border/70 px-4 py-2.5">
              <p className="text-sm font-black text-foreground">Total</p>
              <p className="text-right text-sm font-black text-foreground">
                {selectedInnings.total_runs}-{selectedInnings.total_wickets} ({selectedInnings.current_over}.{selectedInnings.current_ball} Overs)
              </p>
            </div>

            <div className="px-4 py-2.5">
              <p className="text-sm font-black text-foreground">Did not Bat</p>
              <p className="mt-1 text-xs leading-5 text-primary">
                {didNotBat.length > 0
                  ? didNotBat
                      .map((player) => player.player_name || player.name || player.phone_number || "Unnamed player")
                      .join(", ")
                  : "None"}
              </p>
            </div>
          </div>

          <div className="border-t border-border bg-muted/40 px-4 py-2">
            <div className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px_56px] items-center gap-2 text-xs font-bold text-foreground">
              <p>Bowler</p>
              <p className="text-right">O</p>
              <p className="text-right">R</p>
              <p className="text-right">W</p>
              <p className="text-right">ECO</p>
            </div>
          </div>

          <div>
            {bowlingPlayers.map((player) => (
              <div key={player.match_team_player_id} className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px_56px] items-center gap-2 border-b border-border/70 px-4 py-2.5 last:border-b-0">
                {player.user_id ? (
                  <Link to={"/players/" + player.user_id} className="text-sm font-semibold leading-5 text-primary break-words hover:underline">
                    {player.player_name}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold leading-5 text-primary break-words">{player.player_name}</p>
                )}
                <p className="text-right text-sm font-semibold text-foreground">{player.overs_bowled}</p>
                <p className="text-right text-sm font-semibold text-foreground">{player.runs_conceded}</p>
                <p className="text-right font-black text-foreground">{player.wickets_taken}</p>
                <p className="text-right text-sm text-foreground">{getEconomy(player)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Man of the Match</p>
            {manOfTheMatch?.user_id ? (
              <Link to={"/players/" + manOfTheMatch.user_id} className="mt-1.5 block text-base font-black text-foreground break-words hover:underline">
                {manOfTheMatch.player_name}
              </Link>
            ) : (
              <p className="mt-1.5 text-base font-black text-foreground break-words">{manOfTheMatch?.player_name ?? "Not available"}</p>
            )}
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{manOfTheMatch ? `${manOfTheMatch.fantasy_points} pts` : ""}</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Worst Player</p>
            {worstPlayer?.user_id ? (
              <Link to={"/players/" + worstPlayer.user_id} className="mt-1.5 block text-base font-black text-foreground break-words hover:underline">
                {worstPlayer.player_name}
              </Link>
            ) : (
              <p className="mt-1.5 text-base font-black text-foreground break-words">{worstPlayer?.player_name ?? "Not available"}</p>
            )}
            <p className="mt-1 text-xs font-semibold text-muted-foreground">{worstPlayer ? `${worstPlayer.fantasy_points} pts` : ""}</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

function BackendScoreKeyboard({
  match,
  scorecard,
  squad,
  inningsId,
  battingMatchTeamId,
  bowlingMatchTeamId,
  liveState,
  onStateChange,
  isSaving,
  onAddBall,
  onEndMatch,
}: {
  match: NonNullable<ReturnType<typeof getMatchById>>;
  scorecard: MatchScorecard;
  squad: MatchSquadPlayer[];
  inningsId: string;
  battingMatchTeamId: string;
  bowlingMatchTeamId: string;
  liveState: InningsState | null;
  onStateChange: (state: InningsState) => void;
  isSaving: boolean;
  onAddBall: (payload: AddBallPayload) => Promise<BallResponse>;
  onEndMatch: () => void;
}) {
  const queryClient = useQueryClient();
  const currentStrikerId = liveState?.striker_id ?? scorecard.current_striker_id ?? "";
  const currentNonStrikerId =
    liveState?.non_striker_id ?? scorecard.current_non_striker_id ?? "";
  const currentBowlerId = liveState?.bowler_id ?? scorecard.current_bowler_id ?? "";
  const [strikerId, setStrikerId] = useState(currentStrikerId);
  const [nonStrikerId, setNonStrikerId] = useState(currentNonStrikerId);
  const [bowlerId, setBowlerId] = useState(currentBowlerId);
  const [error, setError] = useState("");
  const [isUpdatingState, setIsUpdatingState] = useState(false);
  const [isWicketDialogOpen, setIsWicketDialogOpen] = useState(false);
  const [isRetiredDialogOpen, setIsRetiredDialogOpen] = useState(false);
  const [incidentDismissedPlayerId, setIncidentDismissedPlayerId] = useState("");
  const [incidentDismissalType, setIncidentDismissalType] = useState("bowled");
  const [incidentNextBatterId, setIncidentNextBatterId] = useState("");
  const [incidentFielderId, setIncidentFielderId] = useState("");

  useEffect(() => {
    setStrikerId(currentStrikerId);
    setNonStrikerId(currentNonStrikerId);
    setBowlerId(currentBowlerId);
  }, [currentBowlerId, currentNonStrikerId, currentStrikerId]);

  useEffect(() => {
    if (currentStrikerId) {
      setIncidentDismissedPlayerId(currentStrikerId);
    }
  }, [currentStrikerId]);

  const battingPlayers = squad.filter(
    (player) => player.match_team_id === battingMatchTeamId && player.is_playing_xi
  );
  const bowlingPlayers = squad.filter(
    (player) => player.match_team_id === bowlingMatchTeamId && player.is_playing_xi
  );
  const battingOptions =
    battingPlayers.length > 0
      ? battingPlayers
      : squad.filter((player) => player.match_team_id === battingMatchTeamId);
  const bowlingOptions =
    bowlingPlayers.length > 0
      ? bowlingPlayers
      : squad.filter((player) => player.match_team_id === bowlingMatchTeamId);
  const dismissedIds = new Set(
    scorecard.batting
      .filter((player) => player.is_out)
      .map((player) => player.match_team_player_id)
  );
  const nextBatterOptions = battingOptions.filter(
    (player) =>
      player.match_team_player_id !== strikerId &&
      player.match_team_player_id !== nonStrikerId &&
      !dismissedIds.has(player.match_team_player_id)
  );
  const dismissalPlayerOptions = battingOptions.filter(
    (player) =>
      player.match_team_player_id === strikerId || player.match_team_player_id === nonStrikerId
  );
  const fielderOptions = bowlingOptions;
  const hasBackendState = Boolean(currentStrikerId && currentNonStrikerId && currentBowlerId);
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(!hasBackendState);
  const [isBowlerDialogOpen, setIsBowlerDialogOpen] = useState(false);

  useEffect(() => {
    if (!hasBackendState) {
      setIsPlayerDialogOpen(true);
    }
  }, [hasBackendState]);

  useEffect(() => {
    if (liveState?.needs_next_bowler) {
      setIsBowlerDialogOpen(true);
      setBowlerId("");
      setError("Choose a new bowler for the next over");
      return;
    }
    setIsBowlerDialogOpen(false);
  }, [liveState?.needs_next_bowler]);

  function getPlayerLabel(playerId: string, players: MatchSquadPlayer[]) {
    const player = players.find((entry) => entry.match_team_player_id === playerId);
    return player?.player_name || player?.name || player?.phone_number || "Select";
  }

  const eligibleNextBowlerOptions = bowlingOptions.filter(
    (player) => player.match_team_player_id !== currentBowlerId
  );
  const allowSingleBatterSetup = battingOptions.length >= 1;
  const isInningsComplete = Boolean(liveState?.innings_completed);
  const isScoringLocked =
    isUpdatingState ||
    isInningsComplete ||
    Boolean(liveState?.needs_next_bowler) ||
    isBowlerDialogOpen;

  useEffect(() => {
    if (!allowSingleBatterSetup) return;

    const onlyBatterId = battingOptions[0]?.match_team_player_id;
    if (!onlyBatterId) return;

    setStrikerId((current) => current || onlyBatterId);
    setNonStrikerId((current) => current || onlyBatterId);
  }, [allowSingleBatterSetup, battingOptions]);

  async function submitBall(options: {
    runs: number;
    runsOffBat?: number;
    ballType?: AddBallPayload["ball_type"];
    isWicket?: boolean;
    extras?: number;
    dismissalType?: string;
    dismissedPlayerId?: string;
    nextBatterId?: string;
    fielderId?: string;
  }) {
    if (!hasBackendState && (!strikerId || !nonStrikerId || !bowlerId)) {
      setError("Select striker, non-striker and bowler first");
      return;
    }

    if (isScoringLocked) {
      if (isInningsComplete) {
        setError("Innings completed by backend. Scoring is stopped.");
        return;
      }
      setIsBowlerDialogOpen(true);
      setError(isUpdatingState ? "Saving next bowler..." : "Choose a new bowler for the next over");
      return;
    }


    const payload: AddBallPayload = {
      innings_id: inningsId,
      match_id: match.id,
      striker_id: strikerId,
      non_striker_id: nonStrikerId,
      bowler_id: bowlerId,
      ball_type: options.ballType ?? "normal",
      runs_off_bat: options.runsOffBat ?? options.runs,
      extras: options.extras ?? 0,
      total_runs: (options.runsOffBat ?? options.runs) + (options.extras ?? 0),
      is_wicket: Boolean(options.isWicket),
    };

    if (options.isWicket || options.ballType === "retired_hurt") {
      payload.dismissal_type = options.dismissalType;
      payload.dismissed_player_id = options.dismissedPlayerId ?? strikerId;
      if (options.nextBatterId) {
        payload.next_batter_id = options.nextBatterId;
      }
      if (options.fielderId) {
        payload.fielder_id = options.fielderId;
      }
    }

    setError("");
    try {
      const response = await onAddBall(payload);
      if (response.state) {
        onStateChange(response.state);
        if (response.state.innings_completed) {
          setError("Innings completed by backend. Scoring is stopped.");
        }
        if (response.state.needs_next_bowler) {
          setIsBowlerDialogOpen(true);
          setBowlerId("");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["matches", match.id, "scorecard"] });
      setIsWicketDialogOpen(false);
      setIsRetiredDialogOpen(false);
      setIncidentNextBatterId("");
      setIncidentFielderId("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to process ball right now"));
    }
  }

  async function handleStateOverride(closeDialog = false) {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError("Select striker, non-striker and bowler first");
      return;
    }

    try {
      setIsUpdatingState(true);
      setError("");
      const response = await updateInningsState(inningsId, {
        striker_id: strikerId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
      });
      onStateChange(response.state);
      queryClient.invalidateQueries({ queryKey: ["matches", match.id, "scorecard"] });
      if (closeDialog) {
        setIsPlayerDialogOpen(false);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update innings state"));
    } finally {
      setIsUpdatingState(false);
    }
  }

  function openWicketDialog() {
    setIncidentDismissalType("bowled");
    setIncidentDismissedPlayerId(strikerId || dismissalPlayerOptions[0]?.match_team_player_id || "");
    setIncidentNextBatterId("");
    setIncidentFielderId("");
    setError("");
    setIsWicketDialogOpen(true);
  }

  function openRetiredHurtDialog() {
    setIncidentDismissedPlayerId(strikerId || dismissalPlayerOptions[0]?.match_team_player_id || "");
    setIncidentNextBatterId("");
    setIncidentFielderId("");
    setError("");
    setIsRetiredDialogOpen(true);
  }

  async function handleWicketConfirm() {
    if (!incidentDismissedPlayerId) {
      setError("Choose the dismissed batter");
      return;
    }
    if (["caught", "run_out", "stumped"].includes(incidentDismissalType) && !incidentFielderId) {
      setError("Choose the fielder involved");
      return;
    }
    await submitBall({
      runs: 0,
      ballType: "normal",
      isWicket: true,
      dismissalType: incidentDismissalType,
      dismissedPlayerId: incidentDismissedPlayerId,
      nextBatterId: incidentNextBatterId,
      fielderId: incidentFielderId,
    });
  }

  async function handleRetiredHurtConfirm() {
    if (!incidentDismissedPlayerId) {
      setError("Choose the retired batter");
      return;
    }
    if (!incidentNextBatterId) {
      setError("Choose the replacement batter");
      return;
    }
    await submitBall({
      runs: 0,
      ballType: "retired_hurt",
      isWicket: false,
      dismissalType: "retired_hurt",
      dismissedPlayerId: incidentDismissedPlayerId,
      nextBatterId: incidentNextBatterId,
    });
  }

  async function handleNextBowlerConfirm() {
    if (!bowlerId) {
      setError("Choose the next bowler");
      return;
    }

    if (bowlerId === currentBowlerId) {
      setError("Same bowler cannot bowl consecutive overs");
      return;
    }

    try {
      setIsUpdatingState(true);
      setError("");
      const response = await updateInningsState(inningsId, {
        bowler_id: bowlerId,
      });
      onStateChange(response.state);
      queryClient.invalidateQueries({ queryKey: ["matches", match.id, "scorecard"] });
      setIsBowlerDialogOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update bowler"));
    } finally {
      setIsUpdatingState(false);
    }
  }

  async function handleUndo() {
    if (!window.confirm("Undo last ball?")) return;

    try {
      setError("");
      const response = await undoLastBall(inningsId);
      onStateChange(response.state);
      queryClient.invalidateQueries({ queryKey: ["matches", match.id, "scorecard"] });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not undo last ball"));
    }
  }

  return (
    <>
      <PlayerSetupDialog
        open={isPlayerDialogOpen}
        canClose={hasBackendState}
        strikerId={strikerId}
        nonStrikerId={nonStrikerId}
        bowlerId={bowlerId}
        battingOptions={battingOptions}
        bowlingOptions={bowlingOptions}
        allowSingleBatterSetup={allowSingleBatterSetup}
        error={error}
        isSaving={isUpdatingState}
        onClose={() => setIsPlayerDialogOpen(false)}
        onStrikerChange={setStrikerId}
        onNonStrikerChange={setNonStrikerId}
        onBowlerChange={setBowlerId}
        onSubmit={() => handleStateOverride(true)}
      />
      <NextBowlerDialog
        open={isBowlerDialogOpen}
        bowlerId={bowlerId}
        currentBowlerId={currentBowlerId}
        bowlingOptions={eligibleNextBowlerOptions}
        error={error}
        onBowlerChange={setBowlerId}
        isSaving={isUpdatingState}
        onSubmit={handleNextBowlerConfirm}
      />
      <WicketDialog
        open={isWicketDialogOpen}
        dismissedPlayerId={incidentDismissedPlayerId}
        dismissalType={incidentDismissalType}
        nextBatterId={incidentNextBatterId}
        fielderId={incidentFielderId}
        batterOptions={dismissalPlayerOptions}
        nextBatterOptions={nextBatterOptions}
        fielderOptions={fielderOptions}
        error={error}
        isSaving={isSaving || isUpdatingState}
        onClose={() => setIsWicketDialogOpen(false)}
        onDismissedPlayerChange={setIncidentDismissedPlayerId}
        onDismissalTypeChange={setIncidentDismissalType}
        onNextBatterChange={setIncidentNextBatterId}
        onFielderChange={setIncidentFielderId}
        onSubmit={handleWicketConfirm}
      />
      <RetiredHurtDialog
        open={isRetiredDialogOpen}
        retiredPlayerId={incidentDismissedPlayerId}
        replacementBatterId={incidentNextBatterId}
        batterOptions={dismissalPlayerOptions}
        replacementOptions={nextBatterOptions}
        error={error}
        isSaving={isSaving || isUpdatingState}
        onClose={() => setIsRetiredDialogOpen(false)}
        onRetiredPlayerChange={setIncidentDismissedPlayerId}
        onReplacementChange={setIncidentNextBatterId}
        onSubmit={handleRetiredHurtConfirm}
      />

      <div className="fixed bottom-0 left-1/2 z-40 flex h-[40vh] max-h-[380px] w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden border-t border-border bg-background/95 shadow-[0_-20px_45px_rgba(0,0,0,0.16)] backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
        <div className="shrink-0 border-b border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_45%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Scoring console</p>
              <p className="text-sm font-bold text-foreground">Tap a result to record the ball</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving || isUpdatingState}
                className="h-8 rounded-full border-border bg-background/80 px-3 text-[11px] font-semibold"
                onClick={handleUndo}
              >
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUpdatingState}
                className="h-8 rounded-full border-border bg-background/80 px-3 text-[11px] font-semibold"
                onClick={onEndMatch}
              >
                End match
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between overflow-hidden px-3 pb-3 pt-2">
          {error && <p className="mb-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

          <div className="space-y-2.5">
            <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Runs off the ball</p>
                <p className="text-[10px] font-medium text-muted-foreground">Most used</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2, 3, 4, 6].map((run) => (
                  <KeyBtn key={run} tone={run >= 4 ? "primary" : run === 0 ? "muted" : "default"} disabled={isSaving || isScoringLocked} onClick={() => submitBall({ runs: run })}>
                    {String(run)}
                  </KeyBtn>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Match events</p>
              <div className="grid grid-cols-2 gap-1.5">
                <ExtraBtn disabled={isSaving || isScoringLocked} label="Wide +1" tone="accent" onClick={() => submitBall({ runs: 0, ballType: "wide", extras: 1 })} />
                <ExtraBtn disabled={isSaving || isScoringLocked} label="No ball +1" tone="accent" onClick={() => submitBall({ runs: 0, ballType: "no_ball", extras: 1 })} />
                <ExtraBtn disabled={isSaving || isScoringLocked} label="Wicket" danger onClick={openWicketDialog} />
                <ExtraBtn disabled={isSaving || isScoringLocked} label="Retired hurt" onClick={openRetiredHurtDialog} />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Match control</p>
                {isScoringLocked && (
                  <p className="text-[10px] font-medium text-amber-600">
                    {isUpdatingState ? "Saving changes" : "Complete bowler change"}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <ExtraBtn disabled={isUpdatingState} label="Change players" tone="soft" onClick={() => setIsPlayerDialogOpen(true)} />
              </div>
            </div>

            {(isSaving || isUpdatingState) && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="animate-spin" size={14} />
                {isUpdatingState ? "Saving player change" : "Saving ball"}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function LivePlayerCard({
  title,
  player,
  accent,
  statText,
  subText,
}: {
  title: string;
  player?: MatchScorecard["batting"][number];
  accent: "primary" | "muted";
  statText: string;
  subText: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3",
        accent === "primary" ? "border-primary/20 bg-primary/5" : "border-border bg-muted/25"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          <p className="mt-1 truncate text-base font-bold">{player?.player_name ?? "Waiting for selection"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{subText}</p>
        </div>
        <p className="shrink-0 font-mono text-lg font-black">{statText}</p>
      </div>
    </div>
  );
}

function RecentBallChip({ ball }: { ball: MatchScorecard["recent_balls"][number] }) {
  let label = String(ball.total_runs);
  let tone = "bg-muted text-foreground border-border";

  if (ball.is_wicket) {
    label = "W";
    tone = "bg-destructive text-destructive-foreground border-destructive/50";
  } else if (ball.ball_type === "wide") {
    label = `Wd${ball.total_runs}`;
    tone = "bg-primary/10 text-primary border-primary/25";
  } else if (ball.ball_type === "no_ball") {
    label = `Nb${ball.total_runs}`;
    tone = "bg-primary/10 text-primary border-primary/25";
  } else if (ball.ball_type === "dead_ball") {
    label = "DB";
    tone = "bg-muted text-muted-foreground border-border";
  } else if (ball.ball_type === "retired_hurt") {
    label = "RH";
    tone = "bg-secondary text-secondary-foreground border-border";
  } else if (ball.ball_type === "bye") {
    label = `B${ball.total_runs}`;
    tone = "bg-secondary text-secondary-foreground border-border";
  } else if (ball.ball_type === "leg_bye") {
    label = `LB${ball.total_runs}`;
    tone = "bg-secondary text-secondary-foreground border-border";
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-11 items-center justify-center rounded-full border px-3 py-2 text-xs font-bold",
        tone
      )}
    >
      {label}
    </span>
  );
}

function NextBowlerDialog({
  open,
  bowlerId,
  currentBowlerId,
  bowlingOptions,
  error,
  isSaving,
  onBowlerChange,
  onSubmit,
}: {
  open: boolean;
  bowlerId: string;
  currentBowlerId: string;
  bowlingOptions: MatchSquadPlayer[];
  error: string;
  isSaving: boolean;
  onBowlerChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] items-center justify-center px-4 py-6">
        <div className="w-full overflow-hidden rounded-[28px] border border-border bg-background text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="border-b border-border px-5 pb-4 pt-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <Sparkles size={14} />
              Over complete
            </div>
            <p className="mt-3 text-xl font-black tracking-tight">Choose the next bowler</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Strike has already rotated for the new over. Select a different bowler to continue scoring.
            </p>
            {currentBowlerId && (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Previous bowler: {currentBowlerId ? 'Change required' : '—'}
              </p>
            )}
          </div>
          <div className="space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Shield size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">Next over</p>
              </div>
              <PlayerSelect
                label="Bowler"
                value={bowlerId}
                onChange={onBowlerChange}
                players={bowlingOptions}
                disabled={isSaving}
              />
            </div>
            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
            <Button type="button" disabled={isSaving || !bowlerId} className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90" onClick={onSubmit}>
              {isSaving ? "Saving bowler..." : "Continue scoring"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WicketDialog({
  open,
  dismissedPlayerId,
  dismissalType,
  nextBatterId,
  fielderId,
  batterOptions,
  nextBatterOptions,
  fielderOptions,
  error,
  isSaving,
  onClose,
  onDismissedPlayerChange,
  onDismissalTypeChange,
  onNextBatterChange,
  onFielderChange,
  onSubmit,
}: {
  open: boolean;
  dismissedPlayerId: string;
  dismissalType: string;
  nextBatterId: string;
  fielderId: string;
  batterOptions: MatchSquadPlayer[];
  nextBatterOptions: MatchSquadPlayer[];
  fielderOptions: MatchSquadPlayer[];
  error: string;
  isSaving: boolean;
  onClose: () => void;
  onDismissedPlayerChange: (value: string) => void;
  onDismissalTypeChange: (value: string) => void;
  onNextBatterChange: (value: string) => void;
  onFielderChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const needsFielder = ["caught", "run_out", "stumped"].includes(dismissalType);

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] items-center justify-center px-4 py-6">
        <div className="relative w-full overflow-hidden rounded-[28px] border border-border bg-background text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,hsl(var(--destructive)/0.18),transparent_42%),radial-gradient(circle_at_top_right,hsl(var(--primary)/0.10),transparent_34%)] opacity-70" />

          <div className="relative border-b border-border px-5 pb-5 pt-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-destructive">
                  <Sparkles size={14} />
                  Wicket Event
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-foreground">Record the wicket</p>
                  <p className="mt-1 max-w-[290px] text-xs leading-5 text-muted-foreground">
                    Confirm who is out, how the wicket happened, and who comes in next before scoring continues.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 rounded-full border border-border bg-background/80 px-3 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                disabled={isSaving}
                onClick={onClose}
              >
                Close
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-destructive/15 bg-destructive/10 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-destructive">Step 1</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Who is out</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Step 2</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Dismissal</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Step 3</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Replacement</p>
              </div>
            </div>
          </div>

          <div className="relative space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-destructive">
                <Crosshair size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">Dismissed batter</p>
              </div>
              <PlayerSelect
                label="Out batter"
                value={dismissedPlayerId}
                onChange={onDismissedPlayerChange}
                players={batterOptions}
                disabled={isSaving}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Shield size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">Dismissal details</p>
              </div>
              <div className="space-y-3">
                <SimpleSelect
                  label="Dismissal type"
                  value={dismissalType}
                  onChange={onDismissalTypeChange}
                  disabled={isSaving}
                  options={[["bowled", "Bowled"], ["caught", "Caught"], ["lbw", "LBW"], ["run_out", "Run out"], ["stumped", "Stumped"], ["hit_wicket", "Hit wicket"]]}
                />
                {needsFielder && (
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Fielding involvement</p>
                    <PlayerSelect
                      label="Fielder"
                      value={fielderId}
                      onChange={onFielderChange}
                      players={fielderOptions}
                      disabled={isSaving}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Sparkles size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">Incoming batter</p>
              </div>
              <PlayerSelect
                label="Next batter"
                value={nextBatterId}
                onChange={onNextBatterChange}
                players={nextBatterOptions}
                disabled={isSaving}
              />
              {nextBatterOptions.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No replacement batter is available from the remaining playing XI.
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                disabled={isSaving}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                className="h-11 flex-1 rounded-xl bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive/90"
                onClick={onSubmit}
              >
                {isSaving ? "Saving wicket..." : "Confirm wicket"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RetiredHurtDialog({
  open,
  retiredPlayerId,
  replacementBatterId,
  batterOptions,
  replacementOptions,
  error,
  isSaving,
  onClose,
  onRetiredPlayerChange,
  onReplacementChange,
  onSubmit,
}: {
  open: boolean;
  retiredPlayerId: string;
  replacementBatterId: string;
  batterOptions: MatchSquadPlayer[];
  replacementOptions: MatchSquadPlayer[];
  error: string;
  isSaving: boolean;
  onClose: () => void;
  onRetiredPlayerChange: (value: string) => void;
  onReplacementChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] items-center justify-center px-4 py-6">
        <div className="w-full overflow-hidden rounded-[28px] border border-border bg-background text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="border-b border-border px-5 pb-4 pt-5">
            <p className="text-xl font-black tracking-tight">Retired hurt</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Replace the retired batter without adding a wicket.</p>
          </div>
          <div className="space-y-3 px-5 py-5">
            <PlayerSelect label="Retired batter" value={retiredPlayerId} onChange={onRetiredPlayerChange} players={batterOptions} disabled={isSaving} />
            <PlayerSelect label="Replacement batter" value={replacementBatterId} onChange={onReplacementChange} players={replacementOptions} disabled={isSaving} />
            {error && <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</div>}
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={isSaving} className="h-11 flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
              <Button type="button" disabled={isSaving} className="h-11 flex-1 rounded-xl" onClick={onSubmit}>{isSaving ? 'Saving...' : 'Save change'}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  disabled?: boolean;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] font-medium text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function PlayerSetupDialog({
  open,
  canClose,
  strikerId,
  nonStrikerId,
  bowlerId,
  battingOptions,
  bowlingOptions,
  allowSingleBatterSetup,
  error,
  isSaving,
  onClose,
  onStrikerChange,
  onNonStrikerChange,
  onBowlerChange,
  onSubmit,
}: {
  open: boolean;
  canClose: boolean;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  battingOptions: MatchSquadPlayer[];
  bowlingOptions: MatchSquadPlayer[];
  allowSingleBatterSetup: boolean;
  error: string;
  isSaving: boolean;
  onClose: () => void;
  onStrikerChange: (value: string) => void;
  onNonStrikerChange: (value: string) => void;
  onBowlerChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] items-center justify-center px-4 py-6">
        <div className="relative w-full overflow-hidden rounded-[28px] border border-border bg-background text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.22),transparent_42%),radial-gradient(circle_at_top_right,hsl(var(--accent-foreground)/0.10),transparent_34%)] opacity-60" />

          <div className="relative border-b border-border px-5 pb-5 pt-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <Sparkles size={14} />
                  Match Setup
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-foreground">Set the opening matchup</p>
                  <p className="mt-1 max-w-[280px] text-xs leading-5 text-muted-foreground">
                    Pick the two batters and current bowler first. Once this is locked in, scoring can begin immediately.
                  </p>
                </div>
              </div>
              {canClose && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-full border border-border bg-background/80 px-3 text-[11px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  disabled={isSaving}
                  onClick={onClose}
                >
                  Close
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-primary/15 bg-primary/10 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Batting end</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Striker</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Runner end</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Non-striker</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Attack</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Bowler</p>
              </div>
            </div>
          </div>

          <div className="relative space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Crosshair size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">Facing the ball</p>
              </div>
              <PlayerSelect
                label="Striker"
                value={strikerId}
                onChange={onStrikerChange}
                disabled={isSaving}
                players={
                  allowSingleBatterSetup
                    ? battingOptions
                    : battingOptions.filter(
                        (player) => player.match_team_player_id !== nonStrikerId
                      )
                }
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Shield size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">Backing up the striker</p>
              </div>
              <PlayerSelect
                label="Non-striker"
                value={nonStrikerId}
                onChange={onNonStrikerChange}
                disabled={isSaving}
                players={
                  allowSingleBatterSetup
                    ? battingOptions
                    : battingOptions.filter(
                        (player) => player.match_team_player_id !== strikerId
                      )
                }
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Sparkles size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">Starting the over</p>
              </div>
              <PlayerSelect
                label="Bowler"
                value={bowlerId}
                onChange={onBowlerChange}
                players={bowlingOptions}
                disabled={isSaving}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {canClose && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                disabled={isSaving}
                className="h-11 flex-1 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                onClick={onSubmit}
              >
                {isSaving ? "Saving setup..." : "Start scoring"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function PlayerSelect({
  label,
  value,
  onChange,
  players,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  players: MatchSquadPlayer[];
  disabled?: boolean;
}) {
  function getPlayerLabel(player: MatchSquadPlayer) {
    return player.player_name || player.name || player.phone_number || "Unnamed player";
  }

  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] font-medium text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">Select</option>
        {players.map((player) => (
          <option key={player.match_team_player_id} value={player.match_team_player_id}>
            {getPlayerLabel(player)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatScore(runs: number, wickets: number) {
  return `${runs}/${wickets}`;
}

function getRemainingWickets(
  innings: MatchScorecard["innings"][number],
  squad: MatchSquadPlayer[]
) {
  const playingCount = squad.filter(
    (player) =>
      player.match_team_id === innings.batting_match_team_id &&
      player.is_playing_xi
  ).length;
  const maxPossibleWickets = playingCount > 0 ? playingCount - 1 : 10;

  return Math.max(maxPossibleWickets - innings.total_wickets, 0);
}

function getScheduledStartDate(value?: string) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatScheduledStart(date: Date) {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ScheduledView({
  match,
  id,
  scheduleError,
  onStart,
}: {
  match: ReturnType<typeof getMatchById>;
  id: string;
  scheduleError: string;
  onStart: () => void;
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

      {scheduleError && (
        <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          {scheduleError}
        </p>
      )}

      <Button asChild variant="outline" className="w-full h-10">
        <Link to={`/matches/${id}/players`}>Edit Players</Link>
      </Button>

      <Button className="w-full h-10" onClick={onStart}>
        Do Match Toss
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

function ExtraBtn({
  label,
  onClick,
  danger,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  tone?: "default" | "accent" | "soft";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-2 py-2.5 text-[10px] font-bold active:scale-[0.98] transition-transform shadow-sm disabled:pointer-events-none disabled:opacity-50",
        danger
          ? "border-destructive/40 bg-destructive text-destructive-foreground"
          : tone === "accent"
            ? "border-primary/20 bg-primary/8 text-primary"
            : tone === "soft"
              ? "border-border bg-muted/40 text-foreground"
              : "border-border bg-card text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function KeyBtn({
  children,
  onClick,
  danger,
  disabled,
  tone = "default",
}: {
  children: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  tone?: "default" | "primary" | "muted";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] items-center justify-center rounded-2xl border text-lg font-black shadow-sm active:scale-[0.97] transition-transform disabled:pointer-events-none disabled:opacity-50",
        danger
          ? "border-destructive/40 bg-destructive text-destructive-foreground"
          : tone === "primary"
            ? "border-primary/20 bg-primary text-primary-foreground shadow-primary/20"
            : tone === "muted"
              ? "border-border bg-muted/40 text-foreground"
              : "border-border bg-card text-foreground"
      )}
    >
      {children}
    </button>
  );
}
