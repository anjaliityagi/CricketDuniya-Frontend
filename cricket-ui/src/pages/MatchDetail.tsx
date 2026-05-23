import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  const displayedRuns = liveState?.total_runs ?? innings?.total_runs ?? 0;
  const displayedWickets = liveState?.total_wickets ?? innings?.total_wickets ?? 0;
  const displayedOver =
    liveState && typeof liveState.current_over === "number"
      ? `${liveState.current_over}.${liveState.current_ball}`
      : null;
  const battingTeamName =
    innings?.batting_match_team_id === match.team_a_match_team_id
      ? match.teamOneName
      : match.teamTwoName;
  const bowlingTeamName =
    innings?.bowling_match_team_id === match.team_a_match_team_id
      ? match.teamOneName
      : match.teamTwoName;
  const recentBalls = scorecard.recent_balls.slice(-6);
  const battingPlayers = scorecard.batting.filter(
    (player) => player.match_team_id === innings?.batting_match_team_id
  );
  const bowlingPlayers = scorecard.bowling.filter(
    (player) => player.match_team_id === innings?.bowling_match_team_id
  );

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
    <div className={cn("space-y-2", isLive && "pb-[calc(min(42vh,340px)+0.75rem)]")}>
      <Card className="bg-card border-border py-0 gap-0">
        <CardContent className="p-3 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Batting</p>
            <p className="text-xl font-black">
              {battingTeamName}{" "}
              <span className="font-mono">
                {displayedRuns}/{displayedWickets}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {displayedOver ? `${displayedOver} ov · ` : ""}
              {match.overs_per_side} overs · {bowlingTeamName} bowling
            </p>
            {liveState?.needs_next_batter && (
              <p className="text-xs font-semibold text-destructive mt-1">
                Select next batter before continuing
              </p>
            )}
            {liveState?.needs_next_bowler && (
              <p className="text-xs font-semibold text-destructive mt-1">
                Select next bowler before continuing
              </p>
            )}
          </div>

          <div className="border-t border-border pt-2">
            <p className="text-xs font-bold mb-1">Batting</p>
            {battingPlayers.length > 0 ? (
              battingPlayers.slice(0, 4).map((player) => (
                <div
                  key={player.match_team_player_id}
                  className="flex items-center justify-between py-1 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-semibold text-sm">
                      {player.player_name}
                      {scorecard.current_striker_id === player.match_team_player_id && (
                        <span className="text-green-600 ml-1">*</span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      4s: {player.fours} · 6s: {player.sixes}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-bold">
                    {player.runs_scored} ({player.balls_faced})
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No batting stats yet</p>
            )}
          </div>

          <div className="border-t border-border pt-2">
            <p className="text-xs font-bold mb-1">Bowling</p>
            {bowlingPlayers.length > 0 ? (
              bowlingPlayers.slice(0, 3).map((player) => (
                <div
                  key={player.match_team_player_id}
                  className="flex items-center justify-between py-1 border-b border-border last:border-0"
                >
                  <p className="font-semibold text-sm">{player.player_name}</p>
                  <p className="font-mono text-xs font-bold">
                    {player.overs_bowled} - {player.runs_conceded} - {player.wickets_taken}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No bowling stats yet</p>
            )}
          </div>

          {recentBalls.length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="text-xs font-bold mb-1.5">Recent Balls</p>
              <div className="flex flex-wrap gap-1.5">
                {recentBalls.map((ball) => (
                  <span
                    key={ball.id}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border",
                      ball.is_wicket
                        ? "bg-foreground text-background border-foreground"
                        : "bg-muted border-border"
                    )}
                  >
                    {ball.is_wicket ? "W" : ball.total_runs}
                  </span>
                ))}
              </div>
            </div>
          )}
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
        <p className="text-center text-sm font-semibold text-muted-foreground">
          Match completed
        </p>
      )}
    </div>
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

  useEffect(() => {
    setStrikerId(currentStrikerId);
    setNonStrikerId(currentNonStrikerId);
    setBowlerId(currentBowlerId);
  }, [
    currentBowlerId,
    currentNonStrikerId,
    currentStrikerId,
  ]);

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

    if (options.isWicket && !nextBatterId && nextBatterOptions.length > 0) {
      setError("Select next batter for this wicket");
      return;
    }

    const payload: AddBallPayload = {
      innings_id: inningsId,
      match_id: match.id,
      ball_type: options.ballType ?? "normal",
      runs_off_bat: options.runsOffBat ?? options.runs,
      extras: options.extras ?? 0,
      is_wicket: Boolean(options.isWicket),
    };

    if (!hasBackendState) {
      payload.striker_id = strikerId;
      payload.non_striker_id = nonStrikerId;
      payload.bowler_id = bowlerId;
    }

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
      }
      queryClient.invalidateQueries({ queryKey: ["matches", match.id, "scorecard"] });
      setNextBatterId("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to process ball right now"));
    }
  }

  async function handleStateOverride() {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError("Select striker, non-striker and bowler first");
      return;
    }

    try {
      setError("");
      const response = await updateInningsState(inningsId, {
        striker_id: strikerId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
      });
      onStateChange(response.state);
      queryClient.invalidateQueries({ queryKey: ["matches", match.id, "scorecard"] });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update innings state"));
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
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 h-[42vh] max-h-[340px] border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
      <div className="shrink-0 px-3 pt-2 flex items-center justify-between gap-2 border-b border-border/60">
        <p className="font-bold text-xs">Live Scoring</p>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] px-2" onClick={handleUndo}>
            Undo
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-[10px] px-2" onClick={onEndMatch}>
            End
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-2 border-b border-border/60">
        <PlayerSelect label="Striker" value={strikerId} onChange={setStrikerId} players={battingOptions} />
        <PlayerSelect label="Non-striker" value={nonStrikerId} onChange={setNonStrikerId} players={battingOptions.filter((p) => p.match_team_player_id !== strikerId)} />
        <PlayerSelect label="Bowler" value={bowlerId} onChange={setBowlerId} players={bowlingOptions} />
      </div>
      <div className="px-2 pb-2 border-b border-border/60">
        <Button type="button" variant="secondary" size="sm" className="h-8 w-full text-[11px]" onClick={handleStateOverride}>
          Set striker / bowler
        </Button>
      </div>

      {error && <p className="px-3 pt-2 text-xs font-medium text-destructive">{error}</p>}
      {nextBatterOptions.length > 0 && (
        <div className="px-2 pt-2">
          <PlayerSelect
            label="Next batter"
            value={nextBatterId}
            onChange={setNextBatterId}
            players={nextBatterOptions}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2, 3, 4, 6].map((run) => (
            <KeyBtn key={run} onClick={() => submitBall({ runs: run })}>
              {String(run)}
            </KeyBtn>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <ExtraBtn label="Wide" onClick={() => submitBall({ runs: 0, ballType: "wide", extras: 1 })} />
          <ExtraBtn label="No ball" onClick={() => submitBall({ runs: 0, ballType: "no_ball", extras: 1 })} />
          <ExtraBtn label="Wicket" onClick={() => submitBall({ runs: 0, ballType: "wicket", isWicket: true })} />
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((run) => (
            <ExtraBtn key={`b${run}`} label={`B ${run}`} onClick={() => submitBall({ runs: 0, ballType: "bye", extras: run })} />
          ))}
        </div>
        {isSaving && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="animate-spin" size={14} />
            Saving ball
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerSelect({
  label,
  value,
  onChange,
  players,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  players: MatchSquadPlayer[];
}) {
  function getPlayerLabel(player: MatchSquadPlayer) {
    return player.player_name || player.name || player.phone_number || "Unnamed player";
  }

  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] font-bold text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11px]"
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
