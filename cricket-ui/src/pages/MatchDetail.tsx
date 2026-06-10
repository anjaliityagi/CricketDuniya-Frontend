import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Crosshair,
  Loader2,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
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
import { useWinProbabilityQuery } from "@/hooks/useWinProbabilityQuery";
import { useAuth } from "@/context/AuthContext";
import {
  completeMatch,
  type AddBallPayload,
  type BallResponse,
  type InningsState,
  type MatchScorecard,
  type ScorecardPlayer,
  type MatchSquadPlayer,
  type WinProbability,
  undoLastBall,
  updateInningsState,
} from "@/services/matches";
import type { AuthUser } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTeamName } from "@/lib/teamName";
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
  squad: MatchSquadPlayer[],
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
      [player.user_id, player.match_team_player_id]
        .map(getIdKey)
        .includes(userId),
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: profile } = useProfileQuery(isAuthenticated);
  const { data: apiMatch, isLoading, isError } = useMatchQuery(id);
  const isBackendMatch = Boolean(
    apiMatch?.team_a_id ||
    apiMatch?.team_b_id ||
    apiMatch?.team_a_match_team_id ||
    apiMatch?.team_b_match_team_id,
  );
  const {
    data: scorecard,
    isLoading: isScorecardLoading,
    isError: isScorecardError,
  } = useMatchScorecardQuery(
    id,
    Boolean(id && isBackendMatch && apiMatch?.status !== "scheduled"),
  );
  const { data: winProbability } = useWinProbabilityQuery(
    id,
    Boolean(id && isBackendMatch && apiMatch?.status === "live"),
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
  const title = `${formatTeamName(currentMatch.teamOneName)} vs ${formatTeamName(currentMatch.teamTwoName)}`;
  const isLive = currentMatch.status === "live";
  const isCompleted = currentMatch.status === "completed";
  const showScorecard = isLive || isCompleted;
  const currentUser = getCurrentUserId(user) ? user : (profile?.user ?? user);
  const canUpdateScore = canUserUpdateScore(currentUser, currentMatch, squad);

  const battingTeamName =
    currentMatch.battingTeam === "one"
      ? currentMatch.teamOneName
      : currentMatch.teamTwoName;
  const bowlingTeamName =
    currentMatch.battingTeam === "one"
      ? currentMatch.teamTwoName
      : currentMatch.teamOneName;

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
  const battingTeamInitial = getTeamInitial(battingTeamName);

  function handleStartMatch() {
    if (!id) return;
    const startDate = getScheduledStartDate(currentMatch.match_date);

    if (startDate && startDate.getTime() > Date.now()) {
      setScheduleError(
        `This match will start at ${formatScheduledStart(startDate)}.`,
      );
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
          ? (currentMatch.team_a_match_team_id ?? currentMatch.team_a_id)
          : (currentMatch.team_b_match_team_id ?? currentMatch.team_b_id);

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
        isLive &&
          showScorecard &&
          canUpdateScore &&
          "pb-[calc(min(40vh,380px)+1rem)]",
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
              isLive ? "text-green-600" : "text-muted-foreground",
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
          winProbability={winProbability}
          isLive={isLive}
          isCompleted={isCompleted}
          canUpdateScore={canUpdateScore}
          isSavingBall={ballMutation.isPending}
          onAddBall={(payload) => ballMutation.mutateAsync(payload)}
          onEndMatch={handleEndMatch}
        />
      ) : (
        showScorecard &&
        !isBackendMatch && (
          <div className="space-y-2">
            <Card className="bg-card border-border py-0 gap-0">
              <CardContent className="p-3 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Batting</p>
                  <p className="text-xl font-black">
                    {battingTeamInitial}{" "}
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
                  <p className="text-[10px] text-muted-foreground">
                    {formatTeamName(bowlingTeamName)}
                  </p>
                  <p className="font-mono font-bold text-sm">
                    {bowlingScore.runs === 0 &&
                    bowlingScore.wickets === 0 &&
                    isLive
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
                                  : "bg-muted border-border",
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
                    {match.tossWinner === "one"
                      ? formatTeamName(match.teamOneName)
                      : formatTeamName(match.teamTwoName)}{" "}
                    — {match.tossDecision}
                  </p>
                )}
              </CardContent>
            </Card>

            {isLive && canUpdateScore && id && match.battingTeam && (
              <FixedScoreKeyboard
                teamName={battingTeamName}
                battingSquadNames={getSquadPlayers(
                  match,
                  match.battingTeam,
                ).map((p) => p.name)}
                bowlingSquadNames={getSquadPlayers(
                  match,
                  match.battingTeam === "one" ? "two" : "one",
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
        )
      )}
    </div>
  );
}

function BackendLiveMatch({
  match,
  scorecard,
  squad,
  winProbability,
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
  winProbability?: WinProbability;
  isLive: boolean;
  isCompleted: boolean;
  canUpdateScore: boolean;
  isSavingBall: boolean;
  onAddBall: (payload: AddBallPayload) => Promise<BallResponse>;
  onEndMatch: () => void;
}) {
  const innings = getCurrentScorecardInnings(scorecard);
  const [liveState, setLiveState] = useState<InningsState | null>(null);
  const [localRecentBalls, setLocalRecentBalls] = useState<
    MatchScorecard["recent_balls"]
  >([]);
  const isScorecardCompleted = scorecard.match_phase === "completed";

  useEffect(() => {
    setLiveState(null);
    setLocalRecentBalls([]);
  }, [innings?.id]);

  useEffect(() => {
    if (!innings) return;

    setLiveState((current) => {
      if (!current || current.innings_id !== innings.id) return current;

      const bowlerChangedAfterOver =
        Boolean(current.needs_next_bowler) &&
        Boolean(scorecard.current_bowler_id) &&
        scorecard.current_bowler_id !== current.bowler_id;

      const shouldKeepLocalFreeHit = localRecentBalls.length > 0;

      return {
        ...current,
        striker_id: current.striker_id ?? scorecard.current_striker_id ?? null,
        non_striker_id:
          current.non_striker_id ?? scorecard.current_non_striker_id ?? null,
        bowler_id: bowlerChangedAfterOver
          ? scorecard.current_bowler_id
          : (current.bowler_id ?? scorecard.current_bowler_id ?? null),
        total_runs: innings.total_runs,
        total_wickets: innings.total_wickets,
        legal_balls: innings.legal_balls,
        current_over: innings.current_over,
        current_ball: innings.current_ball,
        is_free_hit: shouldKeepLocalFreeHit
          ? current.is_free_hit
          : innings.is_free_hit,
        needs_next_bowler: bowlerChangedAfterOver
          ? false
          : current.needs_next_bowler,
        over_completed: bowlerChangedAfterOver ? false : current.over_completed,
      };
    });
  }, [
    innings,
    localRecentBalls.length,
    scorecard.current_bowler_id,
    scorecard.current_non_striker_id,
    scorecard.current_striker_id,
  ]);

  if (!innings) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Match is live, but innings data is not available yet.
        </CardContent>
      </Card>
    );
  }

  const displayedRuns = liveState?.total_runs ?? innings?.total_runs ?? 0;
  const displayedWickets =
    liveState?.total_wickets ?? innings?.total_wickets ?? 0;
  const currentStrikerId =
    liveState?.striker_id ?? scorecard.current_striker_id ?? "";
  const currentNonStrikerId =
    liveState?.non_striker_id ?? scorecard.current_non_striker_id ?? "";
  const currentBowlerId =
    liveState?.bowler_id ?? scorecard.current_bowler_id ?? "";
  const legalBalls = liveState?.legal_balls ?? innings?.legal_balls ?? 0;
  const displayedOver = `${liveState?.current_over ?? innings?.current_over ?? 0}.${liveState?.current_ball ?? innings?.current_ball ?? 0}`;
  const isFreeHit = Boolean(liveState?.is_free_hit ?? innings?.is_free_hit);
  const liveRunRate = getRunRate(displayedRuns, legalBalls);
  const battingTeamName =
    innings?.batting_match_team_id === match.team_a_match_team_id
      ? match.teamOneName
      : innings?.batting_match_team_id === match.team_b_match_team_id
        ? match.teamTwoName
        : (innings?.batting_team ?? "Batting");
  const bowlingTeamName =
    innings?.bowling_match_team_id === match.team_a_match_team_id
      ? match.teamOneName
      : innings?.bowling_match_team_id === match.team_b_match_team_id
        ? match.teamTwoName
        : (innings?.bowling_team ?? "Bowling");
  const scorecardRecentBalls = getActiveOverBalls(
    scorecard.recent_balls.filter((ball) => ball.innings_id === innings.id),
    liveState?.current_over ?? innings.current_over,
    liveState?.current_ball ?? innings.current_ball,
  );
  const recentBalls =
    localRecentBalls.length > 0 ? localRecentBalls : scorecardRecentBalls;
  const scopedBattingPlayers = getInningsScopedPlayers(
    scorecard.batting,
    innings,
    innings.batting_match_team_id,
  );
  const scopedBowlingPlayers = getInningsScopedPlayers(
    scorecard.bowling,
    innings,
    innings.bowling_match_team_id,
  );
  const liveInningsBalls =
    localRecentBalls.length > 0
      ? localRecentBalls
      : getCompletedScorecardInningsDeliveries(scorecard, innings);
  const derivedLiveSuperOverStats =
    innings.is_super_over && liveInningsBalls.length > 0
      ? getDerivedInningsPlayerStats(innings, liveInningsBalls, squad)
      : null;
  const battingPlayers =
    innings.is_super_over && derivedLiveSuperOverStats
      ? derivedLiveSuperOverStats.battingPlayers
      : scopedBattingPlayers;
  const bowlingPlayers =
    innings.is_super_over && derivedLiveSuperOverStats
      ? derivedLiveSuperOverStats.bowlingPlayers
      : scopedBowlingPlayers;

  function createFallbackPlayer(playerId: string, teamId: string) {
    const squadPlayer = squad.find(
      (player) => player.match_team_player_id === playerId,
    );
    if (!squadPlayer) return null;

    return {
      match_team_player_id: squadPlayer.match_team_player_id,
      match_team_id: teamId,
      user_id: squadPlayer.user_id,
      player_name:
        squadPlayer.player_name ||
        squadPlayer.name ||
        squadPlayer.phone_number ||
        "Unnamed player",
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
    battingPlayers.find(
      (player) => player.match_team_player_id === currentStrikerId,
    ) ??
    (currentStrikerId
      ? createFallbackPlayer(currentStrikerId, innings.batting_match_team_id)
      : null);
  const currentNonStriker =
    battingPlayers.find(
      (player) => player.match_team_player_id === currentNonStrikerId,
    ) ??
    (currentNonStrikerId
      ? createFallbackPlayer(currentNonStrikerId, innings.batting_match_team_id)
      : null);
  const currentBowler =
    bowlingPlayers.find(
      (player) => player.match_team_player_id === currentBowlerId,
    ) ??
    (currentBowlerId
      ? createFallbackPlayer(currentBowlerId, innings.bowling_match_team_id)
      : null);
  const currentBatters = (
    [currentStriker, currentNonStriker].filter(Boolean) as ScorecardPlayer[]
  ).filter(
    (player, index, players) =>
      players.findIndex(
        (entry) => entry.match_team_player_id === player.match_team_player_id,
      ) === index,
  );
  const featuredBowlers = [
    ...(currentBowler ? [currentBowler] : []),
    ...bowlingPlayers.filter(
      (player) => player.match_team_player_id !== currentBowlerId,
    ),
  ]
    .filter(
      (player, index, players) =>
        players.findIndex(
          (entry) => entry.match_team_player_id === player.match_team_player_id,
        ) === index,
    )
    .slice(0, 2);
  const partnershipRuns = currentBatters.reduce(
    (sum, player) => sum + player.runs_scored,
    0,
  );
  const partnershipBalls = currentBatters.reduce(
    (sum, player) => sum + player.balls_faced,
    0,
  );
  const tossSummary =
    match.tossWinner && match.tossDecision
      ? `${match.tossWinner === "one" ? formatTeamName(match.teamOneName) : formatTeamName(match.teamTwoName)} (${match.tossDecision})`
      : "Not available";
  const completedPlayers = [...scorecard.batting].sort((a, b) => {
    if (b.fantasy_points !== a.fantasy_points)
      return b.fantasy_points - a.fantasy_points;
    return a.player_name.localeCompare(b.player_name);
  });
  const manOfTheMatch = completedPlayers[0] ?? null;
  const worstPlayer =
    completedPlayers.length > 0
      ? completedPlayers[completedPlayers.length - 1]
      : null;
  const firstInnings =
    scorecard.innings.find((entry) => entry.innings_no === 1) ??
    scorecard.innings[0];
  const secondInnings =
    scorecard.innings.find((entry) => entry.innings_no === 2) ??
    scorecard.innings[1];
  const regularMatchTied =
    Boolean(firstInnings && secondInnings) &&
    firstInnings.total_runs === secondInnings.total_runs;
  const hasSuperOvers = scorecard.innings.some((entry) => entry.is_super_over);
  const winnerMatchTeamId = match.winner_match_team_id;
  const winnerName = winnerMatchTeamId
    ? winnerMatchTeamId === match.team_a_match_team_id
      ? match.teamOneName
      : winnerMatchTeamId === match.team_b_match_team_id
        ? match.teamTwoName
        : null
    : null;
  const superOverResultText =
    winnerName && hasSuperOvers
      ? getSuperOverResultText(
          scorecard.innings,
          winnerName,
          winnerMatchTeamId,
          squad,
        )
      : null;
  const resultText = winnerName
    ? (superOverResultText ??
      (secondInnings && firstInnings
        ? secondInnings.total_runs > firstInnings.total_runs
          ? `${winnerName} won by ${getRemainingWickets(secondInnings, squad)} wickets`
          : `${winnerName} won by ${Math.max(firstInnings.total_runs - secondInnings.total_runs, 0)} runs`
        : `${winnerName} won the match`))
    : isScorecardCompleted && hasSuperOvers
      ? "Match tied after Super Overs. No winner declared."
      : isScorecardCompleted && regularMatchTied
        ? "Match tied. No winner declared."
        : "Match completed";
  const lastWicketBall = scorecard.recent_balls.find(
    (ball) => ball.innings_id === innings.id && Boolean(ball.dismissal_type),
  );
  const chaseLine =
    typeof liveState?.required_runs_to_win === "number" &&
    typeof liveState?.balls_remaining === "number"
      ? `${liveState.required_runs_to_win} needed from ${liveState.balls_remaining} balls`
      : null;
  const lastWicketText =
    displayedWickets > 0
      ? lastWicketBall
        ? `${displayedRuns}/${displayedWickets} · ${lastWicketBall.dismissal_type ?? "wicket"}`
        : `${displayedRuns}/${displayedWickets}`
      : "No wicket yet";
  const phaseMessage = getLivePhaseMessage({
    scorecard,
    innings,
    battingTeamName,
    regularMatchTied,
  });

  if (isCompleted || isScorecardCompleted) {
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
      <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
          {phaseMessage.title}
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {phaseMessage.body}
        </p>
      </div>

      <Card className="overflow-hidden border-border bg-card py-0 gap-0 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-3 p-4">
          <div className="rounded-[24px] border border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[32px] font-black tracking-tight text-foreground">
                  {formatTeamName(battingTeamName, 10)} {displayedRuns} -{" "}
                  {displayedWickets}
                </p>
                {chaseLine && (
                  <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
                    Need {liveState?.required_runs_to_win} more in{" "}
                    {liveState?.balls_remaining} balls
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-right shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Overs
                </p>
                <p className="mt-1 font-mono text-xl font-black text-foreground">
                  {displayedOver}
                </p>
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

          {isFreeHit && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-sm">
                  <Zap size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em]">
                    Free hit
                  </p>
                  <p className="truncate text-xs font-semibold">
                    Only run out can be recorded as a wicket.
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-amber-500/30 bg-background/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                Live
              </span>
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
                {currentBatters.length > 0 ? (
                  currentBatters.map((player) => {
                    const isStriker =
                      player.match_team_player_id === currentStrikerId;
                    const strikeRate =
                      player.balls_faced > 0
                        ? (
                            (player.runs_scored / player.balls_faced) *
                            100
                          ).toFixed(2)
                        : "0.00";
                    return (
                      <div
                        key={player.match_team_player_id}
                        className="grid grid-cols-[1.6fr_repeat(5,minmax(0,0.5fr))] gap-2 px-3 py-2.5 text-sm"
                      >
                        {player.user_id ? (
                          <Link
                            to={"/players/" + player.user_id}
                            className="truncate font-medium text-primary hover:underline"
                          >
                            {player.player_name}
                            {isStriker ? " *" : ""}
                          </Link>
                        ) : (
                          <span className="truncate font-medium text-primary">
                            {player.player_name}
                            {isStriker ? " *" : ""}
                          </span>
                        )}
                        <span className="text-center font-semibold">
                          {player.runs_scored}
                        </span>
                        <span className="text-center">
                          {player.balls_faced}
                        </span>
                        <span className="text-center">{player.fours}</span>
                        <span className="text-center">{player.sixes}</span>
                        <span className="text-center">{strikeRate}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    Batters not available yet.
                  </div>
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
                {currentBowler ? (
                  (() => {
                    const economy =
                      currentBowler.overs_bowled > 0
                        ? (
                            currentBowler.runs_conceded /
                            currentBowler.overs_bowled
                          ).toFixed(2)
                        : "0.00";
                    return (
                      <div className="grid grid-cols-[1.6fr_repeat(5,minmax(0,0.5fr))] gap-2 px-3 py-2.5 text-sm">
                        {currentBowler.user_id ? (
                          <Link
                            to={"/players/" + currentBowler.user_id}
                            className="truncate font-medium text-primary hover:underline"
                          >
                            {currentBowler.player_name} *
                          </Link>
                        ) : (
                          <span className="truncate font-medium text-primary">
                            {currentBowler.player_name} *
                          </span>
                        )}
                        <span className="text-center">
                          {currentBowler.overs_bowled}
                        </span>
                        <span className="text-center">0</span>
                        <span className="text-center">
                          {currentBowler.runs_conceded}
                        </span>
                        <span className="text-center font-semibold">
                          {currentBowler.wickets_taken}
                        </span>
                        <span className="text-center">{economy}</span>
                      </div>
                    );
                  })()
                ) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground">
                    Bowling stats not available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background p-3 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground">
                Recent balls
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentBalls.length > 0 ? (
                  recentBalls.map((ball) => (
                    <RecentBallChip key={ball.id} ball={ball} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No recent balls yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground">
                Key Stats
              </p>
              <div className="mt-3 space-y-3 text-sm leading-5">
                <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5">
                  <p className="font-semibold text-foreground">Partnership</p>
                  <p className="mt-1 text-muted-foreground">
                    {partnershipRuns}({partnershipBalls})
                  </p>
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

            {winProbability && (
              <WinProbabilityPanel
                probability={winProbability}
                battingTeamName={battingTeamName}
                bowlingTeamName={bowlingTeamName}
              />
            )}
          </div>
        </CardContent>
      </Card>
      {isLive &&
        !isScorecardCompleted &&
        canUpdateScore &&
        !liveState?.innings_completed && (
          <BackendScoreKeyboard
            match={match}
            scorecard={scorecard}
            squad={squad}
            inningsId={innings.id}
            battingMatchTeamId={innings.batting_match_team_id}
            bowlingMatchTeamId={innings.bowling_match_team_id}
            currentInningsIsFreeHit={isFreeHit}
            liveState={liveState}
            onStateChange={setLiveState}
            onBallRecorded={(payload, nextState, wasFreeHit) => {
              const isIllegalDelivery = [
                "wide",
                "no_ball",
                "dead_ball",
              ].includes(payload.ball_type);

              if (!isIllegalDelivery && nextState.current_ball === 0) {
                setLocalRecentBalls([]);
                return;
              }

              setLocalRecentBalls((current) => [
                ...(current.length > 0 ? current : scorecardRecentBalls),
                createRecentBallFromPayload(payload, innings.id, wasFreeHit),
              ]);
            }}
            onUndoBall={() => setLocalRecentBalls([])}
            isSaving={isSavingBall}
            onAddBall={onAddBall}
            onEndMatch={onEndMatch}
          />
        )}

      {isLive &&
        !isScorecardCompleted &&
        canUpdateScore &&
        liveState?.innings_completed && (
          <Card className="border-primary/20 bg-primary/10">
            <CardContent className="p-4 text-sm font-semibold text-primary">
              Innings complete. The next innings or result will appear after the
              scorecard refreshes.
            </CardContent>
          </Card>
        )}

      {(isCompleted || isScorecardCompleted) && (
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

function clampProbability(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatProbability(value: number) {
  return `${clampProbability(value).toFixed(1)}%`;
}

function WinProbabilityPanel({
  probability,
  battingTeamName,
  bowlingTeamName,
}: {
  probability: WinProbability;
  battingTeamName: string;
  bowlingTeamName: string;
}) {
  const battingProbability = clampProbability(
    probability.batting_team_probability,
  );
  const bowlingProbability = clampProbability(
    probability.bowling_team_probability,
  );
  const battingLabel = formatTeamName(battingTeamName, 16);
  const bowlingLabel = formatTeamName(bowlingTeamName, 16);
  const chartStyle = {
    background: `conic-gradient(hsl(var(--primary)) ${battingProbability}%, hsl(var(--muted)) 0)`,
  };

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">
            Win Probability
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-foreground">
            Innings {probability.innings}
          </p>
        </div>
        <div className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
          Live
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <div
          className="relative grid h-36 w-36 place-items-center rounded-full border border-border shadow-inner"
          style={chartStyle}
          aria-label={`${battingLabel} win probability ${formatProbability(
            battingProbability,
          )}`}
        >
          <div className="grid h-[104px] w-[104px] place-items-center rounded-full border border-border bg-background text-center shadow-sm">
            <div>
              <p className="font-mono text-2xl font-black text-foreground">
                {formatProbability(battingProbability)}
              </p>
              <p className="mx-auto mt-0.5 max-w-20 truncate text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {battingLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2">
          <p className="truncate font-semibold text-foreground">
            {battingLabel}
          </p>
          <p className="mt-1 font-mono text-lg font-black text-primary">
            {formatProbability(battingProbability)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-right">
          <p className="truncate font-semibold text-foreground">
            {bowlingLabel}
          </p>
          <p className="mt-1 font-mono text-lg font-black text-muted-foreground">
            {formatProbability(bowlingProbability)}
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl border border-border/70 bg-background/80 px-2 py-2">
          <p className="font-mono font-black text-foreground">
            {probability.calculated_from.runs_required}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            Required
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/80 px-2 py-2">
          <p className="font-mono font-black text-foreground">
            {probability.calculated_from.balls_remaining}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            Balls
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/80 px-2 py-2">
          <p className="font-mono font-black text-foreground">
            {probability.calculated_from.wickets_remaining}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            Wickets
          </p>
        </div>
      </div>
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
  const firstInnings = innings[0];
  const [selectedInningsId, setSelectedInningsId] = useState(
    firstInnings?.id ?? "",
  );

  useEffect(() => {
    if (!selectedInningsId) {
      setSelectedInningsId(firstInnings?.id ?? "");
      return;
    }
    if (!innings.some((entry) => entry.id === selectedInningsId)) {
      setSelectedInningsId(firstInnings?.id ?? "");
    }
  }, [firstInnings?.id, innings, selectedInningsId]);

  const selectedInnings =
    innings.find((entry) => entry.id === selectedInningsId) ?? firstInnings;

  function getTeamName(teamId?: string) {
    if (!teamId) return "Unknown";
    if (teamId === match.team_a_match_team_id) return match.teamOneName;
    if (teamId === match.team_b_match_team_id) return match.teamTwoName;
    return "Unknown";
  }

  function getInningsTeamName(innings: MatchScorecard["innings"][number]) {
    const teamName = getTeamName(innings.batting_match_team_id);
    return teamName === "Unknown"
      ? (innings.batting_team ?? teamName)
      : teamName;
  }

  function getBallsFromOvers(overs: number) {
    const wholeOvers = Math.floor(overs);
    const balls = Math.round((overs - wholeOvers) * 10);
    return wholeOvers * 6 + balls;
  }

  function getEconomy(player: MatchScorecard["bowling"][number]) {
    const balls = getBallsFromOvers(player.overs_bowled);
    if (balls === 0) return "0.00";
    return ((player.runs_conceded * 6) / balls).toFixed(2);
  }

  function getInningsScore(entry: MatchScorecard["innings"][number]) {
    return getInningsDisplayScore(
      entry,
      getCompletedScorecardInningsDeliveries(scorecard, entry),
    );
  }

  const regularInnings = innings.filter((entry) => !entry.is_super_over);
  const superOverGroups = groupSuperOvers(innings);
  const superOverEntries = Object.entries(superOverGroups).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  const inningsTabs = innings;
  const summaryMessage = getScorecardSummaryMessage({
    scorecard,
    regularInnings,
    superOverEntries,
    resultText,
  });

  if (!selectedInnings) {
    return null;
  }

  const battingOrderMap = new Map(
    squad
      .filter(
        (player) =>
          player.match_team_id === selectedInnings.batting_match_team_id,
      )
      .map((player) => [
        player.match_team_player_id,
        player.batting_order ?? Number.MAX_SAFE_INTEGER,
      ]),
  );

  const selectedBattingPlayers = getInningsScopedPlayers(
    scorecard.batting,
    selectedInnings,
    selectedInnings.batting_match_team_id,
    false,
  );
  const selectedBowlingPlayers = getInningsScopedPlayers(
    scorecard.bowling,
    selectedInnings,
    selectedInnings.bowling_match_team_id,
    false,
  );
  const selectedInningsBalls = getCompletedScorecardInningsDeliveries(
    scorecard,
    selectedInnings,
  );
  const selectedInningsScore = getInningsDisplayScore(
    selectedInnings,
    selectedInningsBalls,
  );
  const derivedInningsStats =
    selectedInningsBalls.length > 0
      ? getDerivedInningsPlayerStats(
          selectedInnings,
          selectedInningsBalls,
          squad,
        )
      : null;

  const battingPlayers = (
    derivedInningsStats
      ? derivedInningsStats.battingPlayers
      : selectedBattingPlayers.length > 0
        ? selectedBattingPlayers
        : []
  ).sort((a, b) => {
    const orderA =
      battingOrderMap.get(a.match_team_player_id) ?? Number.MAX_SAFE_INTEGER;
    const orderB =
      battingOrderMap.get(b.match_team_player_id) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return b.runs_scored - a.runs_scored;
  });

  const bowlingPlayers = (
    derivedInningsStats
      ? derivedInningsStats.bowlingPlayers
      : selectedBowlingPlayers.length > 0
        ? selectedBowlingPlayers
        : []
  ).sort((a, b) => {
    if (b.wickets_taken !== a.wickets_taken)
      return b.wickets_taken - a.wickets_taken;
    return (
      getBallsFromOvers(b.overs_bowled) - getBallsFromOvers(a.overs_bowled)
    );
  });

  const battingIds = new Set(
    battingPlayers.map((player) => player.match_team_player_id),
  );
  const didNotBat = squad
    .filter(
      (player) =>
        player.match_team_id === selectedInnings.batting_match_team_id &&
        player.is_playing_xi &&
        !battingIds.has(player.match_team_player_id),
    )
    .sort(
      (a, b) =>
        (a.batting_order ?? Number.MAX_SAFE_INTEGER) -
        (b.batting_order ?? Number.MAX_SAFE_INTEGER),
    );

  const extras = Math.max(
    selectedInningsScore.runs -
      battingPlayers.reduce((sum, player) => sum + player.runs_scored, 0),
    0,
  );

  return (
    <Card className="overflow-hidden border-border bg-card py-0 gap-0 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              {summaryMessage.title}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {summaryMessage.body}
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Regular Innings
              </p>
              <div className="mt-2 grid gap-2">
                {regularInnings.map((entry) => (
                  <InningsMiniScore
                    key={entry.id}
                    label={getInningsTeamName(entry)}
                    score={getInningsScore(entry)}
                  />
                ))}
              </div>
            </div>
            {superOverEntries.map(([superOverNo, entries]) => (
              <div key={superOverNo} className="border-t border-border pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Super Over #{superOverNo}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entries.length === 1
                    ? "First innings complete. Chase innings will appear automatically."
                    : "Both Super Over innings are shown below."}
                </p>
                <div className="mt-2 grid gap-2">
                  {entries.map((entry) => (
                    <InningsMiniScore
                      key={entry.id}
                      label={getInningsTeamName(entry)}
                      score={getInningsScore(entry)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                  onClick={() => setSelectedInningsId(entry.id)}
                >
                  {getInningsLabel(entry, getTeamName)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-border bg-background">
          <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2.5 text-primary-foreground">
            <p className="text-lg font-black tracking-tight">
              {getTeamName(selectedInnings.batting_match_team_id)}
            </p>
            <p className="font-mono text-lg font-black">
              {selectedInningsScore.runs}-{selectedInningsScore.wickets} (
              {selectedInningsScore.overs}.{selectedInningsScore.balls} Ov)
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
              const strikeRate =
                player.balls_faced > 0
                  ? ((player.runs_scored * 100) / player.balls_faced).toFixed(2)
                  : "0.00";
              return (
                <div
                  key={player.match_team_player_id}
                  className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px_40px_64px] items-center gap-2 border-b border-border/70 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    {player.user_id ? (
                      <Link
                        to={"/players/" + player.user_id}
                        className="text-sm font-semibold leading-5 text-primary break-words hover:underline"
                      >
                        {player.player_name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold leading-5 text-primary break-words">
                        {player.player_name}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {player.is_out ? "out" : "not out"}
                    </p>
                  </div>
                  <p className="text-right text-sm font-black text-foreground">
                    {player.runs_scored}
                  </p>
                  <p className="text-right text-sm font-semibold text-foreground">
                    {player.balls_faced}
                  </p>
                  <p className="text-right text-sm text-foreground">
                    {player.fours}
                  </p>
                  <p className="text-right text-sm text-foreground">
                    {player.sixes}
                  </p>
                  <p className="text-right text-sm text-foreground">
                    {strikeRate}
                  </p>
                </div>
              );
            })}

            <div className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2 border-b border-border/70 px-4 py-2.5">
              <div>
                <p className="text-sm font-black text-foreground">Extras</p>
              </div>
              <p className="text-right text-sm font-black text-foreground">
                {extras}
              </p>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_200px] items-center gap-2 border-b border-border/70 px-4 py-2.5">
              <p className="text-sm font-black text-foreground">Total</p>
              <p className="text-right text-sm font-black text-foreground">
                {selectedInningsScore.runs}-{selectedInningsScore.wickets} (
                {selectedInningsScore.overs}.{selectedInningsScore.balls} Overs)
              </p>
            </div>

            <div className="px-4 py-2.5">
              <p className="text-sm font-black text-foreground">Did not Bat</p>
              <p className="mt-1 text-xs leading-5 text-primary">
                {didNotBat.length > 0
                  ? didNotBat
                      .map(
                        (player) =>
                          player.player_name ||
                          player.name ||
                          player.phone_number ||
                          "Unnamed player",
                      )
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
              <div
                key={player.match_team_player_id}
                className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px_56px] items-center gap-2 border-b border-border/70 px-4 py-2.5 last:border-b-0"
              >
                {player.user_id ? (
                  <Link
                    to={"/players/" + player.user_id}
                    className="text-sm font-semibold leading-5 text-primary break-words hover:underline"
                  >
                    {player.player_name}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold leading-5 text-primary break-words">
                    {player.player_name}
                  </p>
                )}
                <p className="text-right text-sm font-semibold text-foreground">
                  {player.overs_bowled}
                </p>
                <p className="text-right text-sm font-semibold text-foreground">
                  {player.runs_conceded}
                </p>
                <p className="text-right font-black text-foreground">
                  {player.wickets_taken}
                </p>
                <p className="text-right text-sm text-foreground">
                  {getEconomy(player)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {selectedInningsBalls.length > 0 && (
          <div className="rounded-2xl border border-border bg-background p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-muted-foreground">
                Ball by ball
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {selectedInningsBalls.length} deliveries
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedInningsBalls.map((ball) => (
                <RecentBallChip key={ball.id} ball={ball} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Man of the Match
            </p>
            {manOfTheMatch?.user_id ? (
              <Link
                to={"/players/" + manOfTheMatch.user_id}
                className="mt-1.5 block text-base font-black text-foreground break-words hover:underline"
              >
                {manOfTheMatch.player_name}
              </Link>
            ) : (
              <p className="mt-1.5 text-base font-black text-foreground break-words">
                {manOfTheMatch?.player_name ?? "Not available"}
              </p>
            )}
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {manOfTheMatch ? `${manOfTheMatch.fantasy_points} pts` : ""}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Worst Player
            </p>
            {worstPlayer?.user_id ? (
              <Link
                to={"/players/" + worstPlayer.user_id}
                className="mt-1.5 block text-base font-black text-foreground break-words hover:underline"
              >
                {worstPlayer.player_name}
              </Link>
            ) : (
              <p className="mt-1.5 text-base font-black text-foreground break-words">
                {worstPlayer?.player_name ?? "Not available"}
              </p>
            )}
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {worstPlayer ? `${worstPlayer.fantasy_points} pts` : ""}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InningsMiniScore({
  label,
  score,
}: {
  label: string;
  score: {
    runs: number;
    wickets: number;
    overs: number;
    balls: number;
  };
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
        {label}
      </span>
      <span className="shrink-0 font-mono text-sm font-black text-foreground">
        {score.runs}/{score.wickets} ({score.overs}.{score.balls})
      </span>
    </div>
  );
}

function getInningsScopedPlayers<
  T extends {
    innings_id?: string;
    innings_no?: number;
    is_super_over?: boolean;
    super_over_no?: number;
    match_team_id: string;
  },
>(
  players: T[],
  innings: MatchScorecard["innings"][number],
  teamId: string,
  allowUnscopedFallback = true,
) {
  const inningsPlayers = players.filter((player) => {
    if (player.match_team_id !== teamId) return false;
    if (player.innings_id) return player.innings_id === innings.id;

    if (innings.is_super_over) {
      return (
        Boolean(player.is_super_over) &&
        (player.super_over_no ?? 1) === (innings.super_over_no ?? 1)
      );
    }

    return (
      !player.is_super_over &&
      typeof player.innings_no === "number" &&
      player.innings_no === innings.innings_no
    );
  });

  if (inningsPlayers.length > 0) {
    return inningsPlayers;
  }

  if (innings.is_super_over) {
    return [];
  }

  return allowUnscopedFallback
    ? players.filter(
        (player) => player.match_team_id === teamId && !player.innings_id,
      )
    : [];
}

function getCompletedScorecardInningsDeliveries(
  scorecard: MatchScorecard,
  innings: MatchScorecard["innings"][number],
) {
  const inningsDeliveries = scorecard.deliveries_by_innings.find((entry) => {
    if (entry.innings_id && entry.innings_id === innings.id) return true;

    if (innings.is_super_over !== entry.is_super_over) return false;

    return (
      entry.innings_no === innings.innings_no &&
      (innings.is_super_over
        ? (entry.super_over_no ?? 0) === (innings.super_over_no ?? 0)
        : true)
    );
  });

  if (inningsDeliveries?.deliveries.length) {
    return inningsDeliveries.deliveries;
  }

  return scorecard.recent_balls.filter(
    (ball) => ball.innings_id === innings.id,
  );
}

function getInningsDisplayScore(
  innings: MatchScorecard["innings"][number],
  balls: MatchScorecard["recent_balls"],
) {
  if (balls.length === 0) {
    return {
      runs: innings.total_runs,
      wickets: innings.total_wickets,
      overs: innings.current_over,
      balls: innings.current_ball,
    };
  }

  const legalBalls = balls.filter(isLegalRecentBall).length;

  return {
    runs: balls.reduce((sum, ball) => sum + ball.total_runs, 0),
    wickets: balls.filter(
      (ball) =>
        ball.is_wicket &&
        String(ball.dismissal_type ?? "") !== "retired_hurt",
    ).length,
    overs: Math.floor(legalBalls / 6),
    balls: legalBalls % 6,
  };
}

function createEmptyScorecardPlayer(
  playerId: string,
  teamId: string,
  inningsId: string,
  squad: MatchSquadPlayer[],
): ScorecardPlayer {
  const squadPlayer = squad.find(
    (player) => player.match_team_player_id === playerId,
  );

  return {
    innings_id: inningsId,
    match_team_player_id: playerId,
    match_team_id: teamId,
    user_id: squadPlayer?.user_id ?? "",
    player_name:
      squadPlayer?.player_name ||
      squadPlayer?.name ||
      squadPlayer?.phone_number ||
      "Unknown player",
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

function getBallBatRuns(ball: MatchScorecard["recent_balls"][number]) {
  if (ball.ball_type === "wide") return 0;
  if (ball.ball_type === "bye" || ball.ball_type === "leg_bye") return 0;
  if (ball.runs_off_bat > 0) return ball.runs_off_bat;
  return ball.ball_type === "no_ball"
    ? Math.max(ball.total_runs - ball.extras, 0)
    : ball.total_runs;
}

function getDerivedInningsPlayerStats(
  innings: MatchScorecard["innings"][number],
  balls: MatchScorecard["recent_balls"],
  squad: MatchSquadPlayer[],
) {
  const batting = new Map<string, ScorecardPlayer>();
  const bowling = new Map<string, ScorecardPlayer>();

  function getBatter(playerId: string) {
    if (!batting.has(playerId)) {
      batting.set(
        playerId,
        createEmptyScorecardPlayer(
          playerId,
          innings.batting_match_team_id,
          innings.id,
          squad,
        ),
      );
    }
    return batting.get(playerId)!;
  }

  function getBowler(playerId: string) {
    if (!bowling.has(playerId)) {
      bowling.set(
        playerId,
        createEmptyScorecardPlayer(
          playerId,
          innings.bowling_match_team_id,
          innings.id,
          squad,
        ),
      );
    }
    return bowling.get(playerId)!;
  }

  for (const ball of balls) {
    const batter = ball.striker_id ? getBatter(ball.striker_id) : null;
    const bowler = ball.bowler_id ? getBowler(ball.bowler_id) : null;
    const batRuns = getBallBatRuns(ball);
    const isLegal = isLegalRecentBall(ball);

    if (batter) {
      batter.runs_scored += batRuns;
      if (isLegal) batter.balls_faced += 1;
      if (batRuns === 4) batter.fours += 1;
      if (batRuns === 6) batter.sixes += 1;
    }

    if (bowler) {
      const bowlerRuns =
        ball.ball_type === "bye" || ball.ball_type === "leg_bye"
          ? 0
          : ball.total_runs;
      bowler.runs_conceded += bowlerRuns;
      if (isLegal) {
        const ballsBowled =
          Math.floor(bowler.overs_bowled) * 6 +
          Math.round((bowler.overs_bowled % 1) * 10) +
          1;
        bowler.overs_bowled =
          Math.floor(ballsBowled / 6) + (ballsBowled % 6) / 10;
      }
      if (
        ball.is_wicket &&
        !["run_out", "retired_hurt"].includes(String(ball.dismissal_type ?? ""))
      ) {
        bowler.wickets_taken += 1;
      }
    }

    const dismissedPlayerId =
      ball.dismissed_player_id || (ball.is_wicket ? ball.striker_id : "");
    if (dismissedPlayerId) {
      getBatter(dismissedPlayerId).is_out = true;
    }
  }

  return {
    battingPlayers: Array.from(batting.values()),
    bowlingPlayers: Array.from(bowling.values()),
  };
}

function BackendScoreKeyboard({
  match,
  scorecard,
  squad,
  inningsId,
  battingMatchTeamId,
  bowlingMatchTeamId,
  currentInningsIsFreeHit,
  liveState,
  onStateChange,
  onBallRecorded,
  onUndoBall,
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
  currentInningsIsFreeHit: boolean;
  liveState: InningsState | null;
  onStateChange: (state: InningsState) => void;
  onBallRecorded: (
    payload: AddBallPayload,
    nextState: InningsState,
    wasFreeHit: boolean,
  ) => void;
  onUndoBall: () => void;
  isSaving: boolean;
  onAddBall: (payload: AddBallPayload) => Promise<BallResponse>;
  onEndMatch: () => void;
}) {
  const queryClient = useQueryClient();
  const currentStrikerId =
    liveState?.striker_id ?? scorecard.current_striker_id ?? "";
  const currentNonStrikerId =
    liveState?.non_striker_id ?? scorecard.current_non_striker_id ?? "";
  const currentBowlerId =
    liveState?.bowler_id ?? scorecard.current_bowler_id ?? "";
  const [strikerId, setStrikerId] = useState(currentStrikerId);
  const [nonStrikerId, setNonStrikerId] = useState(currentNonStrikerId);
  const [bowlerId, setBowlerId] = useState(currentBowlerId);
  const [error, setError] = useState("");
  const [isUpdatingState, setIsUpdatingState] = useState(false);
  const [isWideDialogOpen, setIsWideDialogOpen] = useState(false);
  const [wideExtras, setWideExtras] = useState(1);
  const [wideIsWicket, setWideIsWicket] = useState(false);
  const [wideDismissedPlayerId, setWideDismissedPlayerId] = useState("");
  const [wideDismissalType, setWideDismissalType] = useState("run_out");
  const [wideFielderId, setWideFielderId] = useState("");
  const [wideNextBatterId, setWideNextBatterId] = useState("");
  const [isNoBallDialogOpen, setIsNoBallDialogOpen] = useState(false);
  const [noBallBatRuns, setNoBallBatRuns] = useState(0);
  const [noBallExtras, setNoBallExtras] = useState(1);
  const [noBallIsWicket, setNoBallIsWicket] = useState(false);
  const [noBallDismissedPlayerId, setNoBallDismissedPlayerId] = useState("");
  const [noBallFielderId, setNoBallFielderId] = useState("");
  const [noBallNextBatterId, setNoBallNextBatterId] = useState("");
  const [isWicketDialogOpen, setIsWicketDialogOpen] = useState(false);
  const [isRetiredDialogOpen, setIsRetiredDialogOpen] = useState(false);
  const [localDismissedIds, setLocalDismissedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [incidentDismissedPlayerId, setIncidentDismissedPlayerId] =
    useState("");
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
      setWideDismissedPlayerId(currentStrikerId);
      setNoBallDismissedPlayerId(currentStrikerId);
    }
  }, [currentStrikerId]);

  const battingPlayers = squad.filter(
    (player) =>
      player.match_team_id === battingMatchTeamId && player.is_playing_xi,
  );
  const bowlingPlayers = squad.filter(
    (player) =>
      player.match_team_id === bowlingMatchTeamId && player.is_playing_xi,
  );
  const battingOptions =
    battingPlayers.length > 0
      ? battingPlayers
      : squad.filter((player) => player.match_team_id === battingMatchTeamId);
  const bowlingOptions =
    bowlingPlayers.length > 0
      ? bowlingPlayers
      : squad.filter((player) => player.match_team_id === bowlingMatchTeamId);
  const currentInnings = scorecard.innings.find(
    (entry) => entry.id === inningsId,
  );
  const inningsBattingStats = currentInnings
    ? getInningsScopedPlayers(
        scorecard.batting,
        currentInnings,
        battingMatchTeamId,
      )
    : scorecard.batting.filter(
        (player) =>
          player.match_team_id === battingMatchTeamId &&
          player.innings_id === inningsId,
      );
  const dismissedIds = new Set(
    inningsBattingStats
      .filter((player) => player.is_out)
      .map((player) => player.match_team_player_id),
  );
  localDismissedIds.forEach((playerId) => dismissedIds.add(playerId));
  const availableBattingOptions = battingOptions.filter(
    (player) => !dismissedIds.has(player.match_team_player_id),
  );
  const nextBatterOptions = battingOptions.filter(
    (player) =>
      player.match_team_player_id !== strikerId &&
      player.match_team_player_id !== nonStrikerId &&
      !dismissedIds.has(player.match_team_player_id),
  );
  const dismissalPlayerOptions = battingOptions.filter(
    (player) =>
      player.match_team_player_id === strikerId ||
      player.match_team_player_id === nonStrikerId,
  );
  const fielderOptions = bowlingOptions;
  const hasBackendState = Boolean(
    currentStrikerId && currentNonStrikerId && currentBowlerId,
  );
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] =
    useState(!hasBackendState);
  const [isBowlerDialogOpen, setIsBowlerDialogOpen] = useState(false);
  const isFreeHit = Boolean(liveState?.is_free_hit ?? currentInningsIsFreeHit);

  useEffect(() => {
    if (isFreeHit && incidentDismissalType !== "run_out") {
      setIncidentDismissalType("run_out");
    }
  }, [incidentDismissalType, isFreeHit]);

  useEffect(() => {
    if (!hasBackendState) {
      setIsPlayerDialogOpen(true);
    }
  }, [hasBackendState]);

  useEffect(() => {
    if (liveState?.needs_next_batter) {
      setIsPlayerDialogOpen(true);
      setError("Choose the next batter before continuing");
    }
  }, [liveState?.needs_next_batter]);

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
    const player = players.find(
      (entry) => entry.match_team_player_id === playerId,
    );
    return (
      player?.player_name || player?.name || player?.phone_number || "Select"
    );
  }

  const eligibleNextBowlerOptions = bowlingOptions.filter(
    (player) => player.match_team_player_id !== currentBowlerId,
  );
  const isSingleBatterSetup = battingOptions.length === 1;
  const allowSameBatterSelection = isSingleBatterSetup;
  const isInningsComplete = Boolean(liveState?.innings_completed);
  const isScoringLocked =
    isUpdatingState ||
    isInningsComplete ||
    Boolean(liveState?.needs_next_batter) ||
    Boolean(liveState?.needs_next_bowler) ||
    isBowlerDialogOpen;

  useEffect(() => {
    if (!isSingleBatterSetup) return;

    const onlyBatterId = availableBattingOptions[0]?.match_team_player_id;
    if (!onlyBatterId) return;

    setStrikerId((current) => current || onlyBatterId);
    setNonStrikerId((current) => current || onlyBatterId);
  }, [isSingleBatterSetup, availableBattingOptions]);

  useEffect(() => {
    if (!strikerId || strikerId !== nonStrikerId || isSingleBatterSetup) return;

    setNonStrikerId("");
  }, [isSingleBatterSetup, nonStrikerId, strikerId]);

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

    const hasValidStriker = battingOptions.some(
      (player) => player.match_team_player_id === strikerId,
    );
    const hasValidNonStriker = battingOptions.some(
      (player) => player.match_team_player_id === nonStrikerId,
    );
    const hasValidBowler = bowlingOptions.some(
      (player) => player.match_team_player_id === bowlerId,
    );

    if (!hasValidStriker || !hasValidNonStriker || !hasValidBowler) {
      setIsWideDialogOpen(false);
      setIsPlayerDialogOpen(true);
      setError("Select valid batters and a bowler from the bowling team first");
      return;
    }

    if (
      payloadWouldUseOutBatter({
        strikerId,
        nonStrikerId,
        dismissedIds,
      })
    ) {
      setIsPlayerDialogOpen(true);
      setError("Choose an active batter before continuing");
      return;
    }

    const wasFreeHit = isFreeHit;

    if (isScoringLocked) {
      if (isInningsComplete) {
        setError("Innings completed by backend. Scoring is stopped.");
        return;
      }
      setIsBowlerDialogOpen(true);
      setError(
        isUpdatingState
          ? "Saving next bowler..."
          : "Choose a new bowler for the next over",
      );
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

    if (
      wasFreeHit &&
      payload.is_wicket &&
      options.dismissalType !== "run_out"
    ) {
      setError("Only run out can be recorded on a free hit");
      return;
    }

    if (options.isWicket || options.ballType === "retired_hurt") {
      payload.dismissal_type = options.dismissalType;
      payload.dismissed_player_id = options.dismissedPlayerId ?? strikerId;
      if (options.nextBatterId) {
        payload.next_batter_id = options.nextBatterId;
      }
      if (options.fielderId) {
        payload.fielder_id = options.fielderId;
        payload.fielder_match_team_player_id = options.fielderId;
        payload.fielding_match_team_player_id = options.fielderId;
      }
    }

    setError("");
    try {
      const response = await onAddBall(payload);
      if (response.state) {
        const isIllegalDelivery = ["wide", "no_ball", "dead_ball"].includes(
          payload.ball_type,
        );
        const nextIsFreeHit =
          payload.ball_type === "no_ball"
            ? true
            : Boolean(response.state.is_free_hit);
        const nextState = isIllegalDelivery
          ? {
              ...response.state,
              bowler_id: response.state.bowler_id ?? bowlerId,
              is_free_hit: nextIsFreeHit,
              needs_next_bowler: false,
              over_completed: false,
            }
          : {
              ...response.state,
              is_free_hit: nextIsFreeHit,
            };

        onStateChange(nextState);
        onBallRecorded(payload, nextState, wasFreeHit);
        if (payload.is_wicket && payload.dismissed_player_id) {
          setLocalDismissedIds((current) => {
            const next = new Set(current);
            next.add(payload.dismissed_player_id!);
            return next;
          });
        }
        if (response.state.innings_completed) {
          setError("Innings completed by backend. Scoring is stopped.");
        }
        if (nextState.needs_next_bowler) {
          setIsBowlerDialogOpen(true);
          setBowlerId("");
        }
      }
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["matches", match.id] }),
        queryClient.refetchQueries({
          queryKey: ["matches", match.id, "scorecard"],
        }),
        queryClient.refetchQueries({
          queryKey: ["matches", match.id, "win-probability"],
        }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["player-profile"] }),
      ]);
      setIsWicketDialogOpen(false);
      setIsWideDialogOpen(false);
      setIsNoBallDialogOpen(false);
      setIsRetiredDialogOpen(false);
      setIncidentNextBatterId("");
      setIncidentFielderId("");
      setWideNextBatterId("");
      setWideFielderId("");
      setNoBallNextBatterId("");
      setNoBallFielderId("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to process ball right now"));
    }
  }

  async function handleStateOverride(closeDialog = false) {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError("Select striker, non-striker and bowler first");
      return;
    }

    if (
      payloadWouldUseOutBatter({
        strikerId,
        nonStrikerId,
        dismissedIds,
      })
    ) {
      setError("Dismissed batters cannot continue batting");
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
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["matches", match.id] }),
        queryClient.refetchQueries({
          queryKey: ["matches", match.id, "scorecard"],
        }),
        queryClient.refetchQueries({
          queryKey: ["matches", match.id, "win-probability"],
        }),
      ]);
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
    setIncidentDismissalType(isFreeHit ? "run_out" : "bowled");
    setIncidentDismissedPlayerId(
      strikerId || dismissalPlayerOptions[0]?.match_team_player_id || "",
    );
    setIncidentNextBatterId("");
    setIncidentFielderId("");
    setError("");
    setIsWicketDialogOpen(true);
  }

  function openWideDialog() {
    setWideExtras(1);
    setWideIsWicket(false);
    setWideDismissalType("run_out");
    setWideDismissedPlayerId(
      strikerId || dismissalPlayerOptions[0]?.match_team_player_id || "",
    );
    setWideFielderId("");
    setWideNextBatterId("");
    setError("");
    setIsWideDialogOpen(true);
  }

  function openNoBallDialog() {
    setNoBallBatRuns(0);
    setNoBallExtras(1);
    setNoBallIsWicket(false);
    setNoBallDismissedPlayerId(
      strikerId || dismissalPlayerOptions[0]?.match_team_player_id || "",
    );
    setNoBallFielderId("");
    setNoBallNextBatterId("");
    setError("");
    setIsNoBallDialogOpen(true);
  }

  function openRetiredHurtDialog() {
    setIncidentDismissedPlayerId(
      strikerId || dismissalPlayerOptions[0]?.match_team_player_id || "",
    );
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
    if (isFreeHit && incidentDismissalType !== "run_out") {
      setError("Only run out can be recorded on a free hit");
      return;
    }
    if (
      ["caught", "run_out", "stumped"].includes(incidentDismissalType) &&
      !incidentFielderId
    ) {
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

  async function handleNoBallSubmit(options?: { simple?: boolean }) {
    const batRuns = options?.simple ? 0 : noBallBatRuns;
    const extras = options?.simple ? 1 : Math.max(noBallExtras, 1);
    const shouldRecordWicket = options?.simple ? false : noBallIsWicket;

    if (shouldRecordWicket && !noBallDismissedPlayerId) {
      setError("Choose the dismissed batter");
      return;
    }
    if (shouldRecordWicket && !noBallFielderId) {
      setError("Choose the fielder involved");
      return;
    }

    await submitBall({
      runs: batRuns,
      ballType: "no_ball",
      runsOffBat: batRuns,
      extras,
      isWicket: shouldRecordWicket,
      dismissalType: shouldRecordWicket ? "run_out" : undefined,
      dismissedPlayerId: shouldRecordWicket
        ? noBallDismissedPlayerId
        : undefined,
      nextBatterId: shouldRecordWicket ? noBallNextBatterId : undefined,
      fielderId: shouldRecordWicket ? noBallFielderId : undefined,
    });
  }

  async function handleWideSubmit(options?: { simple?: boolean }) {
    const extras = options?.simple ? 1 : wideExtras;
    const shouldRecordWicket = options?.simple ? false : wideIsWicket;

    if (shouldRecordWicket && !wideDismissedPlayerId) {
      setError("Choose the dismissed batter");
      return;
    }
    if (
      shouldRecordWicket &&
      ["run_out", "stumped"].includes(wideDismissalType) &&
      !wideFielderId
    ) {
      setError("Choose the fielder involved");
      return;
    }
    if (shouldRecordWicket && isFreeHit && wideDismissalType !== "run_out") {
      setError("Only run out can be recorded on a free hit");
      return;
    }

    await submitBall({
      runs: 0,
      ballType: "wide",
      runsOffBat: 0,
      extras,
      isWicket: shouldRecordWicket,
      dismissalType: shouldRecordWicket ? wideDismissalType : undefined,
      dismissedPlayerId: shouldRecordWicket ? wideDismissedPlayerId : undefined,
      nextBatterId: shouldRecordWicket ? wideNextBatterId : undefined,
      fielderId: shouldRecordWicket ? wideFielderId : undefined,
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
        striker_id: strikerId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
      });
      onStateChange({
        ...response.state,
        bowler_id: response.state?.bowler_id ?? bowlerId,
        needs_next_bowler: false,
        over_completed: false,
      });
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["matches", match.id] }),
        queryClient.refetchQueries({
          queryKey: ["matches", match.id, "scorecard"],
        }),
      ]);
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
      onUndoBall();
      setLocalDismissedIds(new Set());
      onStateChange(response.state);
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["matches", match.id] }),
        queryClient.refetchQueries({
          queryKey: ["matches", match.id, "scorecard"],
        }),
      ]);
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
        battingOptions={availableBattingOptions}
        bowlingOptions={bowlingOptions}
        allowSameBatterSelection={allowSameBatterSelection}
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
      <WideDialog
        open={isWideDialogOpen}
        isFreeHit={isFreeHit}
        extras={wideExtras}
        isWicket={wideIsWicket}
        dismissedPlayerId={wideDismissedPlayerId}
        dismissalType={wideDismissalType}
        fielderId={wideFielderId}
        nextBatterId={wideNextBatterId}
        batterOptions={dismissalPlayerOptions}
        fielderOptions={fielderOptions}
        nextBatterOptions={nextBatterOptions}
        error={error}
        isSaving={isSaving || isUpdatingState}
        onClose={() => setIsWideDialogOpen(false)}
        onExtrasChange={setWideExtras}
        onWicketChange={setWideIsWicket}
        onDismissedPlayerChange={setWideDismissedPlayerId}
        onDismissalTypeChange={setWideDismissalType}
        onFielderChange={setWideFielderId}
        onNextBatterChange={setWideNextBatterId}
        onSimpleWide={() => handleWideSubmit({ simple: true })}
        onSubmit={() => handleWideSubmit()}
      />
      <NoBallDialog
        open={isNoBallDialogOpen}
        batRuns={noBallBatRuns}
        extras={noBallExtras}
        isWicket={noBallIsWicket}
        dismissedPlayerId={noBallDismissedPlayerId}
        fielderId={noBallFielderId}
        nextBatterId={noBallNextBatterId}
        batterOptions={dismissalPlayerOptions}
        fielderOptions={fielderOptions}
        nextBatterOptions={nextBatterOptions}
        error={error}
        isSaving={isSaving || isUpdatingState}
        onClose={() => setIsNoBallDialogOpen(false)}
        onBatRunsChange={setNoBallBatRuns}
        onExtrasChange={setNoBallExtras}
        onWicketChange={setNoBallIsWicket}
        onDismissedPlayerChange={setNoBallDismissedPlayerId}
        onFielderChange={setNoBallFielderId}
        onNextBatterChange={setNoBallNextBatterId}
        onSimpleNoBall={() => handleNoBallSubmit({ simple: true })}
        onSubmit={() => handleNoBallSubmit()}
      />
      <WicketDialog
        open={isWicketDialogOpen}
        isFreeHit={isFreeHit}
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
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Scoring console
              </p>
              <p className="text-sm font-bold text-foreground">
                Tap a result to record the ball
              </p>
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
          {error && (
            <p className="mb-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          {isFreeHit && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em]">
                <Zap size={14} />
                Free hit
              </span>
              <span className="text-[11px] font-semibold">
                Wicket limited to run out
              </span>
            </div>
          )}

          <div className="space-y-2.5">
            <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Runs off the ball
                </p>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Most used
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2, 3, 4, 6].map((run) => (
                  <KeyBtn
                    key={run}
                    tone={
                      run >= 4 ? "primary" : run === 0 ? "muted" : "default"
                    }
                    disabled={isSaving || isScoringLocked}
                    onClick={() => submitBall({ runs: run })}
                  >
                    {String(run)}
                  </KeyBtn>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Match events
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <ExtraBtn
                  disabled={isSaving || isScoringLocked}
                  label="Wide"
                  tone="accent"
                  onClick={openWideDialog}
                />
                <ExtraBtn
                  disabled={isSaving || isScoringLocked}
                  label="No ball"
                  tone="accent"
                  onClick={openNoBallDialog}
                />
                <ExtraBtn
                  disabled={isSaving || isScoringLocked}
                  label={isFreeHit ? "Run out" : "Wicket"}
                  danger
                  onClick={openWicketDialog}
                />
                <ExtraBtn
                  disabled={isSaving || isScoringLocked}
                  label="Retired hurt"
                  onClick={openRetiredHurtDialog}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Match control
                </p>
                {isScoringLocked && (
                  <p className="text-[10px] font-medium text-amber-600">
                    {isUpdatingState
                      ? "Saving changes"
                      : "Complete bowler change"}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                <ExtraBtn
                  disabled={isUpdatingState}
                  label="Change players"
                  tone="soft"
                  onClick={() => setIsPlayerDialogOpen(true)}
                />
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
        accent === "primary"
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-muted/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 truncate text-base font-bold">
            {player?.player_name ?? "Waiting for selection"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subText}</p>
        </div>
        <p className="shrink-0 font-mono text-lg font-black">{statText}</p>
      </div>
    </div>
  );
}

function isLegalRecentBall(ball: MatchScorecard["recent_balls"][number]) {
  return !["wide", "no_ball", "dead_ball", "retired_hurt"].includes(
    ball.ball_type,
  );
}

function createRecentBallFromPayload(
  payload: AddBallPayload,
  inningsId: string,
  isFreeHit = false,
): MatchScorecard["recent_balls"][number] {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    innings_id: inningsId,
    ball_no: 0,
    delivery_no: 0,
    ball_type: payload.ball_type,
    runs_off_bat: payload.runs_off_bat,
    extras: payload.extras,
    total_runs: payload.total_runs,
    is_wicket: payload.is_wicket,
    striker_id: payload.striker_id ?? "",
    non_striker_id: payload.non_striker_id ?? "",
    bowler_id: payload.bowler_id ?? "",
    dismissed_player_id: payload.dismissed_player_id ?? null,
    fielder_id: payload.fielder_id ?? null,
    dismissal_type: payload.dismissal_type ?? null,
    is_free_hit: isFreeHit,
  };
}

function payloadWouldUseOutBatter({
  strikerId,
  nonStrikerId,
  dismissedIds,
}: {
  strikerId: string;
  nonStrikerId: string;
  dismissedIds: Set<string>;
}) {
  return (
    (Boolean(strikerId) && dismissedIds.has(strikerId)) ||
    (Boolean(nonStrikerId) && dismissedIds.has(nonStrikerId))
  );
}

function getActiveOverBalls(
  balls: MatchScorecard["recent_balls"],
  currentOver: number,
  currentBall: number,
) {
  const overNumberedBalls = balls.filter(
    (ball) => ball.over_no === currentOver,
  );

  if (overNumberedBalls.length > 0) {
    return overNumberedBalls;
  }

  const targetLegalBalls = Math.max(0, currentBall);
  if (targetLegalBalls === 0) {
    return [];
  }

  const oldestFirst = collectActiveOverBalls(
    balls,
    targetLegalBalls,
    "oldest-first",
  );
  const newestFirst = collectActiveOverBalls(
    balls,
    targetLegalBalls,
    "newest-first",
  );

  if (isBetterActiveOverCandidate(newestFirst, oldestFirst, targetLegalBalls)) {
    return newestFirst;
  }

  return oldestFirst;
}

function collectActiveOverBalls(
  balls: MatchScorecard["recent_balls"],
  targetLegalBalls: number,
  order: "oldest-first" | "newest-first",
) {
  const activeOverBalls: MatchScorecard["recent_balls"] = [];
  let legalBallsSeen = 0;
  const start = order === "oldest-first" ? balls.length - 1 : 0;
  const end = order === "oldest-first" ? -1 : balls.length;
  const step = order === "oldest-first" ? -1 : 1;

  for (let index = start; index !== end; index += step) {
    const ball = balls[index];
    const isLegal = isLegalRecentBall(ball);

    if (isLegal && legalBallsSeen >= targetLegalBalls) {
      break;
    }

    activeOverBalls.push(ball);

    if (isLegal) {
      legalBallsSeen += 1;
    }
  }

  return order === "oldest-first" ? activeOverBalls.reverse() : activeOverBalls;
}

function getLegalRecentBallCount(balls: MatchScorecard["recent_balls"]) {
  return balls.filter(isLegalRecentBall).length;
}

function isBetterActiveOverCandidate(
  candidate: MatchScorecard["recent_balls"],
  current: MatchScorecard["recent_balls"],
  targetLegalBalls: number,
) {
  const candidateLegalBalls = getLegalRecentBallCount(candidate);
  const currentLegalBalls = getLegalRecentBallCount(current);

  if (
    candidateLegalBalls === targetLegalBalls &&
    currentLegalBalls !== targetLegalBalls
  ) {
    return true;
  }

  if (targetLegalBalls === 0 && candidate.length > 0 && current.length === 0) {
    return true;
  }

  return false;
}

function RecentBallChip({
  ball,
}: {
  ball: MatchScorecard["recent_balls"][number];
}) {
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
        "relative inline-flex min-w-11 items-center justify-center rounded-full border px-3 py-2 text-xs font-bold",
        tone,
        ball.is_free_hit &&
          "ring-2 ring-amber-400/80 ring-offset-1 ring-offset-background",
      )}
      title={ball.is_free_hit ? "Free hit delivery" : undefined}
    >
      {label}
      {ball.is_free_hit && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-amber-950 shadow-sm">
          FH
        </span>
      )}
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
            <p className="mt-3 text-xl font-black tracking-tight">
              Choose the next bowler
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Strike has already rotated for the new over. Select a different
              bowler to continue scoring.
            </p>
            {currentBowlerId && (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Previous bowler: {currentBowlerId ? "Change required" : "—"}
              </p>
            )}
          </div>
          <div className="space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Shield size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                  Next over
                </p>
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
            <Button
              type="button"
              disabled={isSaving || !bowlerId}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              onClick={onSubmit}
            >
              {isSaving ? "Saving bowler..." : "Continue scoring"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WideDialog({
  open,
  isFreeHit,
  extras,
  isWicket,
  dismissedPlayerId,
  dismissalType,
  fielderId,
  nextBatterId,
  batterOptions,
  fielderOptions,
  nextBatterOptions,
  error,
  isSaving,
  onClose,
  onExtrasChange,
  onWicketChange,
  onDismissedPlayerChange,
  onDismissalTypeChange,
  onFielderChange,
  onNextBatterChange,
  onSimpleWide,
  onSubmit,
}: {
  open: boolean;
  isFreeHit: boolean;
  extras: number;
  isWicket: boolean;
  dismissedPlayerId: string;
  dismissalType: string;
  fielderId: string;
  nextBatterId: string;
  batterOptions: MatchSquadPlayer[];
  fielderOptions: MatchSquadPlayer[];
  nextBatterOptions: MatchSquadPlayer[];
  error: string;
  isSaving: boolean;
  onClose: () => void;
  onExtrasChange: (value: number) => void;
  onWicketChange: (value: boolean) => void;
  onDismissedPlayerChange: (value: string) => void;
  onDismissalTypeChange: (value: string) => void;
  onFielderChange: (value: string) => void;
  onNextBatterChange: (value: string) => void;
  onSimpleWide: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const wideRunOptions = [1, 2, 3, 4, 5] as const;
  const needsFielder =
    isWicket && ["run_out", "stumped"].includes(dismissalType);
  const dismissalOptions: [string, string][] = isFreeHit
    ? [["run_out", "Run out"]]
    : [
        ["run_out", "Run out"],
        ["stumped", "Stumped"],
        ["hit_wicket", "Hit wicket"],
      ];

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] items-center justify-center px-4 py-6">
        <div className="relative w-full overflow-hidden rounded-[28px] border border-border bg-background text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_42%),radial-gradient(circle_at_top_right,hsl(var(--accent-foreground)/0.10),transparent_34%)] opacity-70" />

          <div className="relative border-b border-border px-5 pb-5 pt-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  <Sparkles size={14} />
                  Wide Ball
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-foreground">
                    Score a wide
                  </p>
                  <p className="mt-1 max-w-[290px] text-xs leading-5 text-muted-foreground">
                    Save a simple wide, or add completed runs and wicket details
                    before submitting.
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

            <Button
              type="button"
              disabled={isSaving}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              onClick={onSimpleWide}
            >
              {isSaving ? "Saving wide..." : "Simple wide +1"}
            </Button>
          </div>

          <div className="relative space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <Crosshair size={15} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                    Total wide runs
                  </p>
                </div>
                <p className="text-[11px] font-bold text-muted-foreground">
                  Team +{extras}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {wideRunOptions.map((run) => (
                  <button
                    key={run}
                    type="button"
                    disabled={isSaving}
                    onClick={() => onExtrasChange(run)}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                      extras === run
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    +{run}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-destructive">
                  <Shield size={15} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                    {isFreeHit ? "Run out on wide" : "Wicket on wide"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => onWicketChange(!isWicket)}
                  className={cn(
                    "h-9 min-w-20 rounded-full border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
                    isWicket
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  {isWicket ? "Wicket" : "No wicket"}
                </button>
              </div>

              {isWicket && (
                <div className="space-y-3 pt-1">
                  <PlayerSelect
                    label="Out batter"
                    value={dismissedPlayerId}
                    onChange={onDismissedPlayerChange}
                    players={batterOptions}
                    disabled={isSaving}
                  />
                  <SimpleSelect
                    label="Dismissal type"
                    value={dismissalType}
                    onChange={onDismissalTypeChange}
                    disabled={isSaving}
                    options={dismissalOptions}
                  />
                  {needsFielder && (
                    <PlayerSelect
                      label="Fielder"
                      value={fielderId}
                      onChange={onFielderChange}
                      players={fielderOptions}
                      disabled={isSaving}
                    />
                  )}
                  <PlayerSelect
                    label="Next batter"
                    value={nextBatterId}
                    onChange={onNextBatterChange}
                    players={nextBatterOptions}
                    disabled={isSaving}
                  />
                </div>
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
                className={cn(
                  "h-11 flex-1 rounded-xl shadow-lg",
                  isWicket
                    ? "bg-destructive text-destructive-foreground shadow-destructive/20 hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90",
                )}
                onClick={onSubmit}
              >
                {isSaving ? "Saving wide..." : `Submit wide +${extras}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoBallDialog({
  open,
  batRuns,
  extras,
  isWicket,
  dismissedPlayerId,
  fielderId,
  nextBatterId,
  batterOptions,
  fielderOptions,
  nextBatterOptions,
  error,
  isSaving,
  onClose,
  onBatRunsChange,
  onExtrasChange,
  onWicketChange,
  onDismissedPlayerChange,
  onFielderChange,
  onNextBatterChange,
  onSimpleNoBall,
  onSubmit,
}: {
  open: boolean;
  batRuns: number;
  extras: number;
  isWicket: boolean;
  dismissedPlayerId: string;
  fielderId: string;
  nextBatterId: string;
  batterOptions: MatchSquadPlayer[];
  fielderOptions: MatchSquadPlayer[];
  nextBatterOptions: MatchSquadPlayer[];
  error: string;
  isSaving: boolean;
  onClose: () => void;
  onBatRunsChange: (value: number) => void;
  onExtrasChange: (value: number) => void;
  onWicketChange: (value: boolean) => void;
  onDismissedPlayerChange: (value: string) => void;
  onFielderChange: (value: string) => void;
  onNextBatterChange: (value: string) => void;
  onSimpleNoBall: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const batRunOptions = [0, 1, 2, 3, 4, 6] as const;
  const extraOptions = [1, 2, 3, 4, 5] as const;
  const totalRuns = batRuns + Math.max(extras, 1);

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] items-center justify-center px-4 py-6">
        <div className="relative w-full overflow-hidden rounded-[28px] border border-border bg-background text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.20),transparent_34%)] opacity-70" />

          <div className="relative border-b border-border px-5 pb-5 pt-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
                  <Zap size={14} />
                  No Ball
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-foreground">
                    Score a no-ball
                  </p>
                  <p className="mt-1 max-w-[290px] text-xs leading-5 text-muted-foreground">
                    Add bat runs now. The next delivery will be marked as a free
                    hit by the backend.
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

            <Button
              type="button"
              disabled={isSaving}
              className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              onClick={onSimpleNoBall}
            >
              {isSaving ? "Saving no-ball..." : "Simple no-ball +1"}
            </Button>
          </div>

          <div className="relative space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <Crosshair size={15} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                    Runs off bat
                  </p>
                </div>
                <p className="text-[11px] font-bold text-muted-foreground">
                  Batter +{batRuns}
                </p>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {batRunOptions.map((run) => (
                  <button
                    key={run}
                    type="button"
                    disabled={isSaving}
                    onClick={() => onBatRunsChange(run)}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                      batRuns === run
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    {run}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <Zap size={15} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                    No-ball extras
                  </p>
                </div>
                <p className="text-[11px] font-bold text-muted-foreground">
                  Team +{totalRuns}
                </p>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {extraOptions.map((run) => (
                  <button
                    key={run}
                    type="button"
                    disabled={isSaving}
                    onClick={() => onExtrasChange(run)}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                      extras === run
                        ? "border-amber-400 bg-amber-400 text-amber-950 shadow-sm"
                        : "border-border bg-background text-foreground hover:bg-accent",
                    )}
                  >
                    +{run}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-destructive">
                  <Shield size={15} />
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                    Run out on no-ball
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => onWicketChange(!isWicket)}
                  className={cn(
                    "h-9 min-w-20 rounded-full border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
                    isWicket
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-accent",
                  )}
                >
                  {isWicket ? "Run out" : "No wicket"}
                </button>
              </div>

              {isWicket && (
                <div className="space-y-3 pt-1">
                  <PlayerSelect
                    label="Out batter"
                    value={dismissedPlayerId}
                    onChange={onDismissedPlayerChange}
                    players={batterOptions}
                    disabled={isSaving}
                  />
                  <PlayerSelect
                    label="Fielder"
                    value={fielderId}
                    onChange={onFielderChange}
                    players={fielderOptions}
                    disabled={isSaving}
                  />
                  <PlayerSelect
                    label="Next batter"
                    value={nextBatterId}
                    onChange={onNextBatterChange}
                    players={nextBatterOptions}
                    disabled={isSaving}
                  />
                </div>
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
                className="h-11 flex-1 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                onClick={onSubmit}
              >
                {isSaving ? "Saving no-ball..." : `Submit NB +${totalRuns}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WicketDialog({
  open,
  isFreeHit,
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
  isFreeHit: boolean;
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
  const dismissalOptions: [string, string][] = isFreeHit
    ? [["run_out", "Run out"]]
    : [
        ["bowled", "Bowled"],
        ["caught", "Caught"],
        ["lbw", "LBW"],
        ["run_out", "Run out"],
        ["stumped", "Stumped"],
        ["hit_wicket", "Hit wicket"],
      ];

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
                  {isFreeHit ? "Free Hit" : "Wicket Event"}
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-foreground">
                    {isFreeHit ? "Record a run out" : "Record the wicket"}
                  </p>
                  <p className="mt-1 max-w-[290px] text-xs leading-5 text-muted-foreground">
                    {isFreeHit
                      ? "Free-hit wickets are restricted, so only a run out is available here."
                      : "Confirm who is out, how the wicket happened, and who comes in next before scoring continues."}
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
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-destructive">
                  Step 1
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Who is out
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Step 2
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Dismissal
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Step 3
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Replacement
                </p>
              </div>
            </div>
          </div>

          <div className="relative space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-destructive">
                <Crosshair size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                  Dismissed batter
                </p>
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
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                  Dismissal details
                </p>
              </div>
              <div className="space-y-3">
                <SimpleSelect
                  label="Dismissal type"
                  value={dismissalType}
                  onChange={onDismissalTypeChange}
                  disabled={isSaving}
                  options={dismissalOptions}
                />
                {needsFielder && (
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                      Fielding involvement
                    </p>
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
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                  Incoming batter
                </p>
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
                  No replacement batter is available from the remaining playing
                  XI.
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
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Replace the retired batter without adding a wicket.
            </p>
          </div>
          <div className="space-y-3 px-5 py-5">
            <PlayerSelect
              label="Retired batter"
              value={retiredPlayerId}
              onChange={onRetiredPlayerChange}
              players={batterOptions}
              disabled={isSaving}
            />
            <PlayerSelect
              label="Replacement batter"
              value={replacementBatterId}
              onChange={onReplacementChange}
              players={replacementOptions}
              disabled={isSaving}
            />
            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                className="h-11 flex-1 rounded-xl"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                className="h-11 flex-1 rounded-xl"
                onClick={onSubmit}
              >
                {isSaving ? "Saving..." : "Save change"}
              </Button>
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
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-[13px] font-medium text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
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
  allowSameBatterSelection,
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
  allowSameBatterSelection: boolean;
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
                  <p className="text-xl font-black tracking-tight text-foreground">
                    Set the opening matchup
                  </p>
                  <p className="mt-1 max-w-[280px] text-xs leading-5 text-muted-foreground">
                    Pick the two batters and current bowler first. Once this is
                    locked in, scoring can begin immediately.
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
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  Batting end
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Striker
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Runner end
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Non-striker
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Attack
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Bowler
                </p>
              </div>
            </div>
          </div>

          <div className="relative space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Crosshair size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                  Facing the ball
                </p>
              </div>
              <PlayerSelect
                label="Striker"
                value={strikerId}
                onChange={onStrikerChange}
                disabled={isSaving}
                players={
                  allowSameBatterSelection
                    ? battingOptions
                    : battingOptions.filter(
                        (player) =>
                          player.match_team_player_id !== nonStrikerId,
                      )
                }
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Shield size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                  Backing up the striker
                </p>
              </div>
              <PlayerSelect
                label="Non-striker"
                value={nonStrikerId}
                onChange={onNonStrikerChange}
                disabled={isSaving}
                players={
                  allowSameBatterSelection
                    ? battingOptions
                    : battingOptions.filter(
                        (player) => player.match_team_player_id !== strikerId,
                      )
                }
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Sparkles size={15} />
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
                  Starting the over
                </p>
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
    return (
      player.player_name ||
      player.name ||
      player.phone_number ||
      "Unnamed player"
    );
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
          <option
            key={player.match_team_player_id}
            value={player.match_team_player_id}
          >
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

function getTeamInitial(name?: string) {
  return name?.trim().charAt(0).toUpperCase() || "T";
}

function isLiveInnings(innings: MatchScorecard["innings"][number]) {
  return innings.status?.toLowerCase() === "live";
}

function getCurrentScorecardInnings(scorecard: MatchScorecard) {
  const sortedInnings = [...scorecard.innings].sort(
    (a, b) => a.innings_no - b.innings_no,
  );

  return (
    scorecard.innings.find(isLiveInnings) ??
    sortedInnings[sortedInnings.length - 1]
  );
}

function isSuperOverPhase(matchPhase?: string) {
  return Boolean(matchPhase?.toLowerCase().startsWith("super_over"));
}

function getSuperOverNoFromPhase(matchPhase?: string) {
  const match = /^super_over_(\d+)$/.exec(String(matchPhase ?? ""));
  return match ? Number(match[1]) : 0;
}

function getLivePhaseMessage({
  scorecard,
  innings,
  battingTeamName,
  regularMatchTied,
}: {
  scorecard: MatchScorecard;
  innings: MatchScorecard["innings"][number];
  battingTeamName: string;
  regularMatchTied: boolean;
}) {
  const superOverNo =
    innings.super_over_no || getSuperOverNoFromPhase(scorecard.match_phase);
  const superOverInnings = scorecard.innings
    .filter(
      (entry) => entry.is_super_over && entry.super_over_no === superOverNo,
    )
    .sort((a, b) => a.innings_no - b.innings_no);
  const inningsIndex = superOverInnings.findIndex(
    (entry) => entry.id === innings.id,
  );
  const isChase = inningsIndex > 0;
  const firstSuperOverInnings = superOverInnings[0];
  const superOverTarget =
    isChase && firstSuperOverInnings
      ? firstSuperOverInnings.total_runs + 1
      : null;

  if (superOverNo > 0) {
    return {
      title: isChase
        ? `Super Over #${superOverNo} Chase`
        : `Super Over #${superOverNo} First Innings`,
      body: isChase
        ? `${formatTeamName(battingTeamName)} need ${superOverTarget ?? "the target"} to win this Super Over.`
        : regularMatchTied
          ? `The match was tied, so ${formatTeamName(battingTeamName)} are batting first in the Super Over.`
          : `${formatTeamName(battingTeamName)} are batting first in Super Over #${superOverNo}.`,
    };
  }

  const regularInnings = scorecard.innings
    .filter((entry) => !entry.is_super_over)
    .sort((a, b) => a.innings_no - b.innings_no);
  const regularIndex = regularInnings.findIndex(
    (entry) => entry.id === innings.id,
  );
  const firstRegularInnings = regularInnings[0];
  const isSecondInnings = regularIndex > 0 || innings.innings_no === 2;
  const target =
    isSecondInnings && firstRegularInnings
      ? firstRegularInnings.total_runs + 1
      : null;

  return {
    title: isSecondInnings ? "Second Innings Chase" : "First Innings Live",
    body: isSecondInnings
      ? `${formatTeamName(battingTeamName)} need ${target ?? "the target"} to win.`
      : `${formatTeamName(battingTeamName)} are batting first.`,
  };
}

function getScorecardSummaryMessage({
  scorecard,
  regularInnings,
  superOverEntries,
  resultText,
}: {
  scorecard: MatchScorecard;
  regularInnings: MatchScorecard["innings"];
  superOverEntries: Array<[string, MatchScorecard["innings"]]>;
  resultText: string;
}) {
  const regularTie =
    regularInnings.length >= 2 &&
    regularInnings[0].total_runs === regularInnings[1].total_runs;

  if (scorecard.match_phase === "completed") {
    return {
      title: "Final Result",
      body: resultText,
    };
  }

  if (isSuperOverPhase(scorecard.match_phase)) {
    const superOverNo = getSuperOverNoFromPhase(scorecard.match_phase);
    const currentGroup = superOverEntries.find(
      ([number]) => Number(number) === superOverNo,
    );
    const hasChase = Boolean(currentGroup && currentGroup[1].length > 1);

    return {
      title: regularTie ? "Match Tied" : `Super Over #${superOverNo}`,
      body: hasChase
        ? `Super Over #${superOverNo} chase is underway. The winner will be decided from this mini-innings.`
        : `Super Over #${superOverNo} has started automatically. The chase innings will appear when this innings ends.`,
    };
  }

  return {
    title: "Scorecard",
    body: resultText,
  };
}

function getInningsLabel(
  innings: MatchScorecard["innings"][number],
  getTeamName: (teamId?: string) => string,
) {
  const resolvedTeamName = getTeamName(innings.batting_match_team_id);
  const teamName =
    resolvedTeamName === "Unknown"
      ? (innings.batting_team ?? resolvedTeamName)
      : resolvedTeamName;

  if (innings.is_super_over) {
    return `${teamName} SO${innings.super_over_no || ""}`;
  }

  const suffix =
    innings.innings_no === 1 ? "st" : innings.innings_no === 2 ? "nd" : "th";

  return `${teamName} (${innings.innings_no}${suffix} Inn)`;
}

function groupSuperOvers(innings: MatchScorecard["innings"]) {
  return innings
    .filter((entry) => entry.is_super_over)
    .reduce<Record<number, MatchScorecard["innings"]>>((groups, entry) => {
      const superOverNo = entry.super_over_no || 1;
      groups[superOverNo] = [...(groups[superOverNo] ?? []), entry];
      return groups;
    }, {});
}

function getRemainingWickets(
  innings: MatchScorecard["innings"][number],
  squad: MatchSquadPlayer[],
) {
  const playingCount = squad.filter(
    (player) =>
      player.match_team_id === innings.batting_match_team_id &&
      player.is_playing_xi,
  ).length;
  const maxPossibleWickets = playingCount > 0 ? playingCount - 1 : 10;

  return Math.max(maxPossibleWickets - innings.total_wickets, 0);
}

function getSuperOverResultText(
  innings: MatchScorecard["innings"],
  winnerName: string,
  winnerMatchTeamId: string | null | undefined,
  squad: MatchSquadPlayer[],
) {
  if (!winnerMatchTeamId) return `${winnerName} won in the Super Over`;

  const latestCompleteSuperOver = Object.values(groupSuperOvers(innings))
    .filter((entries) => entries.length >= 2)
    .sort((a, b) => (b[0]?.super_over_no ?? 0) - (a[0]?.super_over_no ?? 0))[0];

  if (!latestCompleteSuperOver) return `${winnerName} won in the Super Over`;

  const winnerInnings = latestCompleteSuperOver.find(
    (entry) => entry.batting_match_team_id === winnerMatchTeamId,
  );
  const opponentInnings = latestCompleteSuperOver.find(
    (entry) => entry.batting_match_team_id !== winnerMatchTeamId,
  );

  if (!winnerInnings || !opponentInnings)
    return `${winnerName} won in the Super Over`;

  if (winnerInnings.innings_no > opponentInnings.innings_no) {
    return `${winnerName} won the Super Over by ${getRemainingWickets(winnerInnings, squad)} wickets`;
  }

  return `${winnerName} won the Super Over by ${Math.max(
    winnerInnings.total_runs - opponentInnings.total_runs,
    0,
  )} runs`;
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
          <p className="text-xs text-muted-foreground">
            Overs: {match.overs_per_side}
          </p>

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
        {formatTeamName(name)}
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
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 h-[42vh] max-h-[340px] border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)] flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
      <div className="shrink-0 px-3 pt-2 flex items-center justify-between gap-2 border-b border-border/60">
        <p className="font-bold text-xs truncate">
          Score ·{" "}
          <span className="text-muted-foreground font-semibold">
            {teamName}
          </span>
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
                : "bg-muted/50 text-muted-foreground border-border",
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
                <ExtraBtn
                  key={`b${r}`}
                  label={`B ${r}`}
                  onClick={() => onBye(r)}
                />
              ))}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
              Leg bye
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {byeRunsOpts.map((r) => (
                <ExtraBtn
                  key={`lb${r}`}
                  label={`LB ${r}`}
                  onClick={() => onLegBye(r)}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "change" && (
          <div className="space-y-2 text-xs">
            <Button
              type="button"
              variant="secondary"
              className="w-full h-9 text-xs"
              onClick={onSwapStrike}
            >
              Swap strike (rotate ends)
            </Button>

            <div className="rounded-lg border border-border p-2 space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground">
                Replace striker *
              </p>
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
              <p className="text-[10px] font-bold text-muted-foreground">
                Replace non‑striker
              </p>
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
              <p className="text-[10px] font-bold text-muted-foreground">
                Replace bowler
              </p>
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
              : "border-border bg-card text-foreground",
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
              : "border-border bg-card text-foreground",
      )}
    >
      {children}
    </button>
  );
}
