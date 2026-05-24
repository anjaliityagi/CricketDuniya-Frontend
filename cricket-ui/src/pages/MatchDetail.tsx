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
import {
  completeMatch,
  type AddBallPayload,
  type BallResponse,
  type InningsState,
  type MatchScorecard,
  type MatchSquadPlayer,
  undoLastBall,
  updateInningsState,
} from "@/services/matches";
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

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    navigate(`/matches/${id}/toss`);
  }

  async function handleEndMatch() {
    if (!id) return;
    if (match.team_a_id || match.team_b_id) {
      const teamOneScore = parseScore(match.teamOneScore);
      const teamTwoScore = parseScore(match.teamTwoScore);
      const winnerId =
        teamOneScore.runs >= teamTwoScore.runs
          ? match.team_a_match_team_id ?? match.team_a_id
          : match.team_b_match_team_id ?? match.team_b_id;

      if (winnerId) {
        await completeMatch(id, winnerId);
        setMatch({ ...match, status: "completed" });
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
        isLive && showScorecard && "pb-[calc(min(40vh,380px)+1rem)]"
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
        <ScheduledView match={match} id={id!} onStart={handleStartMatch} />
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

function BackendLiveMatch({
  match,
  scorecard,
  squad,
  isLive,
  isCompleted,
  isSavingBall,
  onAddBall,
  onEndMatch,
}: {
  match: NonNullable<ReturnType<typeof getMatchById>>;
  scorecard: MatchScorecard;
  squad: MatchSquadPlayer[];
  isLive: boolean;
  isCompleted: boolean;
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
  const legalBalls = liveState?.legal_balls ?? 0;
  const displayedOver = `${liveState?.current_over ?? 0}.${liveState?.current_ball ?? 0}`;
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
        ? `${winnerName} won by ${Math.max(10 - secondInnings.total_wickets, 0)} wickets`
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

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden border-border bg-card py-0 gap-0 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <p className="truncate font-mono text-[30px] font-black tracking-tight text-foreground">
                  {battingTeamName} {displayedRuns} - {displayedWickets} ({displayedOver})
                </p>
                <p className="shrink-0 text-xs font-semibold text-muted-foreground">CRR: {liveRunRate}</p>
              </div>
            </div>
            <p className="mt-1 text-sm text-primary">{bowlingTeamName} bowling</p>
          </div>

          {(liveState?.needs_next_batter || liveState?.needs_next_bowler) && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {liveState?.needs_next_batter
                ? "Select next batter before continuing."
                : "Select next bowler before continuing."}
            </div>
          )}

          <div className="grid grid-cols-[1.7fr_1fr] gap-3">
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
                        <span className="truncate font-medium text-primary">
                          {player.player_name}{isStriker ? " *" : ""}
                        </span>
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
                  {featuredBowlers.length > 0 ? featuredBowlers.map((player) => {
                    const economy = player.overs_bowled > 0 ? (player.runs_conceded / player.overs_bowled).toFixed(2) : "0.00";
                    const isCurrent = player.match_team_player_id === currentBowlerId;
                    return (
                      <div
                        key={player.match_team_player_id}
                        className="grid grid-cols-[1.6fr_repeat(5,minmax(0,0.5fr))] gap-2 px-3 py-2.5 text-sm"
                      >
                        <span className="truncate font-medium text-primary">
                          {player.player_name}{isCurrent ? " *" : ""}
                        </span>
                        <span className="text-center">{player.overs_bowled}</span>
                        <span className="text-center">0</span>
                        <span className="text-center">{player.runs_conceded}</span>
                        <span className="text-center font-semibold">{player.wickets_taken}</span>
                        <span className="text-center">{economy}</span>
                      </div>
                    );
                  }) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground">Bowling stats not available yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-3">
              <p className="text-sm font-semibold text-muted-foreground">Key Stats</p>
              <div className="mt-3 space-y-4 text-sm leading-5">
                <div>
                  <p className="font-semibold text-foreground">Partnership: <span className="font-normal text-muted-foreground">{partnershipRuns}({partnershipBalls})</span></p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Last Wkt: <span className="font-normal text-muted-foreground">{lastWicketText}</span></p>
                </div>
                {chaseLine && (
                  <div>
                    <p className="font-semibold text-foreground">Equation: <span className="font-normal text-muted-foreground">{chaseLine}</span></p>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">Last {recentBalls.length} balls: <span className="font-normal text-muted-foreground">{recentBalls.reduce((sum, ball) => sum + ball.total_runs, 0)} runs</span></p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Toss: <span className="font-normal text-muted-foreground">{tossSummary}</span></p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {isLive && (
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

      {isCompleted && (
        <CompletedMatchSummary
          match={match}
          innings={scorecard.innings}
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
  innings,
  players,
  manOfTheMatch,
  worstPlayer,
  resultText,
  winnerName,
}: {
  match: NonNullable<ReturnType<typeof getMatchById>>;
  innings: MatchScorecard["innings"];
  players: MatchScorecard["batting"];
  manOfTheMatch: MatchScorecard["batting"][number] | null;
  worstPlayer: MatchScorecard["batting"][number] | null;
  resultText: string;
  winnerName: string | null;
}) {
  const firstInnings = innings.find((entry) => entry.innings_no === 1) ?? innings[0];
  const secondInnings = innings.find((entry) => entry.innings_no === 2) ?? innings[1];

  function getTeamName(teamId?: string) {
    if (!teamId) return "Unknown";
    if (teamId === match.team_a_match_team_id) return match.teamOneName;
    if (teamId === match.team_b_match_team_id) return match.teamTwoName;
    return "Unknown";
  }

  return (
    <Card className="overflow-hidden border-border bg-card py-0 gap-0 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_55%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] p-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Match Result</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{winnerName ?? "Result ready"}</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{resultText}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {firstInnings && (
            <div className="rounded-2xl border border-border bg-background p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">1st innings</p>
              <p className="mt-2 text-base font-bold text-foreground">{getTeamName(firstInnings.batting_match_team_id)}</p>
              <p className="mt-1 font-mono text-lg font-black text-foreground">{firstInnings.total_runs}/{firstInnings.total_wickets}</p>
            </div>
          )}
          {secondInnings && (
            <div className="rounded-2xl border border-border bg-background p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">2nd innings</p>
              <p className="mt-2 text-base font-bold text-foreground">{getTeamName(secondInnings.batting_match_team_id)}</p>
              <p className="mt-1 font-mono text-lg font-black text-foreground">{secondInnings.total_runs}/{secondInnings.total_wickets}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Man of the Match</p>
            <p className="mt-2 text-lg font-black text-foreground">{manOfTheMatch?.player_name ?? "Not available"}</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">{manOfTheMatch ? `${manOfTheMatch.fantasy_points} pts` : ""}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">Worst Player</p>
            <p className="mt-2 text-lg font-black text-foreground">{worstPlayer?.player_name ?? "Not available"}</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">{worstPlayer ? `${worstPlayer.fantasy_points} pts` : ""}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Top fantasy scores</p>
            <p className="text-xs text-muted-foreground">This match</p>
          </div>
          <div className="mt-3 space-y-2">
            {players.slice(0, 5).map((player, index) => (
              <div key={player.match_team_player_id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{index + 1}. {player.player_name}</p>
                  <p className="text-xs text-muted-foreground">{player.runs_scored} runs · {player.wickets_taken} wkts</p>
                </div>
                <p className="shrink-0 font-mono text-sm font-black text-foreground">{player.fantasy_points} pts</p>
              </div>
            ))}
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
  const [nextBatterId, setNextBatterId] = useState("");
  const [error, setError] = useState("");
  const [isUpdatingState, setIsUpdatingState] = useState(false);

  useEffect(() => {
    setStrikerId(currentStrikerId);
    setNonStrikerId(currentNonStrikerId);
    setBowlerId(currentBowlerId);
  }, [currentBowlerId, currentNonStrikerId, currentStrikerId]);

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
  const isScoringLocked = isUpdatingState || Boolean(liveState?.needs_next_bowler) || isBowlerDialogOpen;

  async function submitBall(options: {
    runs: number;
    runsOffBat?: number;
    ballType?: AddBallPayload["ball_type"];
    isWicket?: boolean;
    extras?: number;
  }) {
    if (!hasBackendState && (!strikerId || !nonStrikerId || !bowlerId)) {
      setError("Select striker, non-striker and bowler first");
      return;
    }

    if (isScoringLocked) {
      setIsBowlerDialogOpen(true);
      setError(isUpdatingState ? "Saving next bowler..." : "Choose a new bowler for the next over");
      return;
    }

    if (options.isWicket && !nextBatterId && nextBatterOptions.length > 0) {
      setError("Select next batter for this wicket");
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
      is_wicket: Boolean(options.isWicket),
    };

    if (options.isWicket) {
      payload.dismissal_type = "bowled";
      payload.dismissed_player_id = strikerId;
      if (nextBatterId) {
        payload.next_batter_id = nextBatterId;
      }
    }

    setError("");
    try {
      const response = await onAddBall(payload);
      if (response.state) {
        onStateChange(response.state);
        if (response.state.needs_next_bowler) {
          setIsBowlerDialogOpen(true);
          setBowlerId("");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["matches", match.id, "scorecard"] });
      setNextBatterId("");
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

      <div className="fixed bottom-0 left-1/2 z-40 flex h-[40vh] max-h-[380px] w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden border-t border-border bg-background/95 shadow-[0_-20px_45px_rgba(0,0,0,0.16)] backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
        <div className="shrink-0 border-b border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_45%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Scoring console</p>
              <p className="text-sm font-bold text-foreground">Update every ball live</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 rounded-full px-3 text-[10px]"
                disabled={isUpdatingState}
                onClick={() => setIsPlayerDialogOpen(true)}
              >
                Players
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-[10px]" disabled={isSaving || isUpdatingState} onClick={handleUndo}>
                Undo
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-[10px]" onClick={onEndMatch}>
                End
              </Button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
            <PlayerSummary label="Striker" value={getPlayerLabel(strikerId, battingOptions)} />
            <PlayerSummary label="Non-striker" value={getPlayerLabel(nonStrikerId, battingOptions)} />
            <PlayerSummary label="Bowler" value={getPlayerLabel(bowlerId, bowlingOptions)} />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between overflow-hidden px-3 pb-3 pt-2">
          {error && <p className="mb-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

          {nextBatterOptions.length > 0 && (
            <div className="mb-2 rounded-2xl border border-border bg-card p-2.5">
              <PlayerSelect
                label="Next batter"
                value={nextBatterId}
                onChange={setNextBatterId}
                players={nextBatterOptions}
              />
            </div>
          )}

          <div className="space-y-2">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Runs off the ball</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2, 3, 4, 6].map((run) => (
                  <KeyBtn key={run} disabled={isSaving || isScoringLocked} onClick={() => submitBall({ runs: run })}>
                    {String(run)}
                  </KeyBtn>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Events</p>
              <div className="grid grid-cols-3 gap-1.5">
                <ExtraBtn disabled={isSaving || isScoringLocked} label="Wide +1" onClick={() => submitBall({ runs: 0, ballType: "wide", extras: 1 })} />
                <ExtraBtn disabled={isSaving || isScoringLocked} label="No ball +1" onClick={() => submitBall({ runs: 0, ballType: "no_ball", extras: 1 })} />
                <ExtraBtn disabled={isSaving || isScoringLocked} label="Wicket" danger onClick={() => submitBall({ runs: 0, ballType: "wicket", isWicket: true })} />
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

function PlayerSetupDialog({
  open,
  canClose,
  strikerId,
  nonStrikerId,
  bowlerId,
  battingOptions,
  bowlingOptions,
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
                players={battingOptions.filter(
                  (player) => player.match_team_player_id !== nonStrikerId
                )}
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
                players={battingOptions.filter(
                  (player) => player.match_team_player_id !== strikerId
                )}
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

function PlayerSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 bg-muted/40 px-2 py-1.5">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-[11px] font-semibold">{value}</p>
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

function ScheduledView({
  match,
  id,
  onStart,
}: {
  match: ReturnType<typeof getMatchById>;
  id: string;
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
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
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
}: {
  children: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[50px] items-center justify-center rounded-2xl border border-border bg-card text-lg font-black shadow-sm active:scale-[0.97] transition-transform disabled:pointer-events-none disabled:opacity-50",
        danger && "border-destructive/40 bg-destructive text-destructive-foreground"
      )}
    >
      {children}
    </button>
  );
}
