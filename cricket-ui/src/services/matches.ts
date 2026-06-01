import api from "@/lib/api";
import type { Match } from "@/data/mockMatches";

type ApiMatch = {
  id?: string;
  _id?: string;
  status?: string;
  match_phase?: string;
  team_a_id?: string;
  team_b_id?: string;
  team_a_name?: string;
  team_b_name?: string;
  team_a_match_team_id?: string;
  team_b_match_team_id?: string;
  teamOneName?: string;
  teamTwoName?: string;
  team_one_name?: string;
  team_two_name?: string;
  team1_name?: string;
  team2_name?: string;
  team_one_score?: string;
  team_two_score?: string;
  teamOneScore?: string;
  teamTwoScore?: string;
  match_note?: string;
  matchNote?: string;
  overs_per_side?: number;
  overs_per_innings?: number;
  oversPerSide?: number;
  venue?: string;
  location?: string;
  match_date?: string;
  toss_decision?: "bat" | "bowl" | null;
  toss_winner_team_id?: string | null;
  first_pick_team_id?: string | null;
  winner_match_team_id?: string | null;
  created_by?: string | number;
  createdBy?: string | number;
  host_user_id?: string | number;
  hostUserId?: string | number;
  [key: string]: unknown;
};

type MatchesResponse = {
  data?: ApiMatch[] | { matches?: ApiMatch[]; data?: ApiMatch[] };
  matches?: ApiMatch[];
  message?: string;
  success?: boolean;
};

type ApiScorecardPlayer = ScorecardPlayer & {
  isOut?: boolean;
  out?: boolean;
  inningsId?: string;
  inning_id?: string;
  inningId?: string;
  match_innings_id?: string;
  matchInningsId?: string;
  inningsNo?: number;
  inning_no?: number;
  inningNo?: number;
  isSuperOver?: boolean;
  superOverNo?: number;
};

type ApiMatchInnings = Partial<MatchInnings> & {
  id?: string;
  innings_id?: string;
  batting_team?: string;
  bowling_team?: string;
  runs?: number;
  wickets?: number;
  overs?: number;
  status?: string;
  is_super_over?: boolean;
  super_over_no?: number;
};

type ApiDeliveriesByInnings = {
  innings_id?: string;
  inningsId?: string;
  innings_no?: number;
  inningsNo?: number;
  is_super_over?: boolean;
  isSuperOver?: boolean;
  super_over_no?: number;
  superOverNo?: number;
  deliveries?: ApiRecentBall[];
};

type ApiRecentBall = Partial<RecentBall> & {
  _id?: string;
  inningsId?: string;
  overNo?: number;
  over?: number;
  current_over?: number;
  currentOver?: number;
  ballNo?: number;
  deliveryNo?: number;
  ballType?: string;
  type?: string;
  delivery_type?: string;
  deliveryType?: string;
  totalRuns?: number;
  runsOffBat?: number;
  runs?: number;
  extraRuns?: number;
  isWicket?: boolean | number | string;
  wicket?: boolean | number | string;
  dismissalType?: string | null;
  dismissedPlayerId?: string | null;
};

export type CreateMatchPayload = {
  team_a_name: string;
  team_b_name: string;
  location: string;
  match_date: string;
  overs_per_innings: number;
};

export type MatchInnings = {
  id: string;
  match_id: string;
  innings_no: number;
  batting_match_team_id: string;
  bowling_match_team_id: string;
  batting_team?: string;
  bowling_team?: string;
  total_runs: number;
  total_wickets: number;
  legal_balls: number;
  current_over: number;
  current_ball: number;
  status?: string;
  is_super_over?: boolean;
  super_over_no?: number;
};

export type MatchSquadPlayer = {
  match_team_player_id: string;
  match_team_id: string;
  user_id: string;
  player_name: string;
  name?: string;
  phone_number?: string;
  is_playing_xi: boolean;
  is_captain: boolean;
  is_umpire: boolean;
  batting_order: number | null;
  user?: {
    name?: string;
    phone_number?: string;
  };
  player?: {
    name?: string;
    phone_number?: string;
  };
};

export type ScorecardPlayer = {
  innings_id?: string;
  innings_no?: number;
  is_super_over?: boolean;
  super_over_no?: number;
  match_team_player_id: string;
  match_team_id: string;
  user_id: string;
  player_name: string;
  runs_scored: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  is_out: boolean;
  runs_conceded: number;
  wickets_taken: number;
  overs_bowled: number;
  fantasy_points: number;
};

export type RecentBall = {
  id: string;
  innings_id: string;
  over_no?: number | null;
  ball_no: number;
  delivery_no: number;
  ball_type: string;
  runs_off_bat: number;
  extras: number;
  total_runs: number;
  is_wicket: boolean;
  striker_id: string;
  non_striker_id: string;
  bowler_id: string;
  dismissed_player_id?: string | null;
  dismissal_type: string | null;
};

export type MatchScorecard = {
  match_id?: string;
  match_phase?: "regular" | "completed" | `super_over_${number}` | string;
  winner_team_id?: string | null;
  innings: MatchInnings[];
  batting: ScorecardPlayer[];
  bowling: ScorecardPlayer[];
  recent_balls: RecentBall[];
  deliveries_by_innings: Array<{
    innings_id: string;
    innings_no: number;
    is_super_over: boolean;
    super_over_no: number;
    deliveries: RecentBall[];
  }>;
  current_striker_id?: string | null;
  current_non_striker_id?: string | null;
  current_bowler_id?: string | null;
};

export type InningsState = {
  innings_id: string;
  striker_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
  total_runs: number;
  total_wickets: number;
  legal_balls: number;
  current_over: number;
  current_ball: number;
  over_completed?: boolean;
  innings_completed?: boolean;
  needs_next_bowler?: boolean;
  needs_next_batter?: boolean;
  required_runs_to_win?: number | null;
  balls_remaining?: number | null;
};

const emptyScorecard: MatchScorecard = {
  innings: [],
  batting: [],
  bowling: [],
  recent_balls: [],
  deliveries_by_innings: [],
  current_striker_id: null,
  current_non_striker_id: null,
  current_bowler_id: null,
};

export type AddBallPayload = {
  innings_id: string;
  match_id: string;
  striker_id?: string;
  non_striker_id?: string;
  bowler_id?: string;
  ball_type: "normal" | "wide" | "no_ball" | "bye" | "leg_bye" | "wicket" | "dead_ball" | "retired_hurt";
  runs_off_bat: number;
  extras: number;
  total_runs: number;
  is_wicket: boolean;
  dismissal_type?: string;
  dismissed_player_id?: string | null;
  next_batter_id?: string;
  fielder_id?: string | null;
};

export type BallResponse = {
  message: string;
  state?: InningsState;
};

type CreateMatchResponse = {
  data?: ApiMatch;
  match?: ApiMatch;
  message?: string;
  success?: boolean;
} & ApiMatch;

function toMatchStatus(status: unknown): Match["status"] {
  if (status === "live" || status === "completed" || status === "scheduled") {
    return status;
  }

  if (typeof status === "string" && status.toLowerCase() === "upcoming") {
    return "scheduled";
  }

  return "scheduled";
}

function normalizeMatch(match: ApiMatch): Match {
  const teamOneName =
    match.team_a_name ??
    match.teamOneName ??
    match.team_one_name ??
    match.team1_name ??
    "Team One";
  const teamTwoName =
    match.team_b_name ??
    match.teamTwoName ??
    match.team_two_name ??
    match.team2_name ??
    "Team Two";
  const overs = Number(
    match.overs_per_innings ?? match.overs_per_side ?? match.oversPerSide ?? 20
  );
  const dateNote =
    typeof match.match_date === "string"
      ? new Date(match.match_date).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : undefined;

  return {
    id: String(match.id ?? match._id ?? crypto.randomUUID()),
    status: toMatchStatus(match.status),
    match_phase: match.match_phase,
    teamOneName,
    teamTwoName,
    teamOneScore: match.teamOneScore ?? match.team_one_score ?? "—",
    teamTwoScore: match.teamTwoScore ?? match.team_two_score ?? "—",
    match_date: match.match_date,
    matchNote:
      match.matchNote ??
      match.match_note ??
      (dateNote ? `${overs} ov - ${dateNote}` : undefined),
    overs_per_side: overs,
    venue: match.venue ?? match.location,
    team_a_id: match.team_a_id,
    team_b_id: match.team_b_id,
    team_a_match_team_id: match.team_a_match_team_id,
    team_b_match_team_id: match.team_b_match_team_id,
    winner_match_team_id: match.winner_match_team_id ?? undefined,
    created_by: match.created_by,
    createdBy: match.createdBy,
    host_user_id: match.host_user_id,
    hostUserId: match.hostUserId,
    first_pick_team_id: match.first_pick_team_id ?? undefined,
    tossDecision: match.toss_decision ?? undefined,
    tossWinner:
      match.toss_winner_team_id && match.toss_winner_team_id === match.team_a_id
        ? "one"
        : match.toss_winner_team_id && match.toss_winner_team_id === match.team_b_id
          ? "two"
          : undefined,
  };
}

function getMatchesArray(response: MatchesResponse | ApiMatch[]) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.matches)) return response.matches;
  if (Array.isArray(response.data?.matches)) return response.data.matches;
  if (Array.isArray(response.data?.data)) return response.data.data;

  return [];
}

function toBooleanFlag(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "out";
  }

  return false;
}

function normalizeInnings(entry: ApiMatchInnings): MatchInnings {
  const currentOver = Number(entry.current_over ?? entry.overs ?? 0);
  const currentBall = Number(entry.current_ball ?? 0);
  const legalBalls = Number(entry.legal_balls ?? Math.floor(currentOver) * 6 + currentBall);

  return {
    id: String(entry.id ?? entry.innings_id ?? ""),
    match_id: String(entry.match_id ?? ""),
    innings_no: Number(entry.innings_no ?? 0),
    batting_match_team_id: String(entry.batting_match_team_id ?? ""),
    bowling_match_team_id: String(entry.bowling_match_team_id ?? ""),
    batting_team: entry.batting_team,
    bowling_team: entry.bowling_team,
    total_runs: Number(entry.total_runs ?? entry.runs ?? 0),
    total_wickets: Number(entry.total_wickets ?? entry.wickets ?? 0),
    legal_balls: legalBalls,
    current_over: currentOver,
    current_ball: currentBall,
    status: entry.status,
    is_super_over: toBooleanFlag(entry.is_super_over),
    super_over_no: Number(entry.super_over_no ?? 0),
  };
}

function normalizeBallType(value: unknown) {
  if (typeof value !== "string") return "normal";

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (["noball", "nb"].includes(normalized)) return "no_ball";
  if (["wide_ball", "wd"].includes(normalized)) return "wide";
  if (["legbye", "legbyes", "lb"].includes(normalized)) return "leg_bye";
  if (["byes"].includes(normalized)) return "bye";
  if (["deadball"].includes(normalized)) return "dead_ball";
  if (["retiredhurt", "retired"].includes(normalized)) return "retired_hurt";

  return normalized || "normal";
}

function normalizeRecentBall(ball: ApiRecentBall): RecentBall {
  const ballType = normalizeBallType(
    ball.ball_type ?? ball.ballType ?? ball.type ?? ball.delivery_type ?? ball.deliveryType
  );
  const dismissalType = ball.dismissal_type ?? ball.dismissalType ?? null;
  const isWicket =
    toBooleanFlag(ball.is_wicket ?? ball.isWicket ?? ball.wicket) ||
    ballType === "wicket" ||
    Boolean(dismissalType);

  return {
    id: String(ball.id ?? ball._id ?? crypto.randomUUID()),
    innings_id: String(ball.innings_id ?? ball.inningsId ?? ""),
    over_no:
      ball.over_no ??
      ball.overNo ??
      ball.over ??
      ball.current_over ??
      ball.currentOver ??
      null,
    ball_no: Number(ball.ball_no ?? ball.ballNo ?? 0),
    delivery_no: Number(ball.delivery_no ?? ball.deliveryNo ?? 0),
    ball_type: ballType,
    runs_off_bat: Number(ball.runs_off_bat ?? ball.runsOffBat ?? 0),
    extras: Number(ball.extras ?? ball.extraRuns ?? 0),
    total_runs: Number(ball.total_runs ?? ball.totalRuns ?? ball.runs ?? 0),
    is_wicket: isWicket,
    striker_id: String(ball.striker_id ?? ""),
    non_striker_id: String(ball.non_striker_id ?? ""),
    bowler_id: String(ball.bowler_id ?? ""),
    dismissed_player_id: ball.dismissed_player_id ?? ball.dismissedPlayerId ?? null,
    dismissal_type: dismissalType,
  };
}

function normalizeDeliveriesByInnings(entry: ApiDeliveriesByInnings) {
  const inningsId = String(entry.innings_id ?? entry.inningsId ?? "");

  return {
    innings_id: inningsId,
    innings_no: Number(entry.innings_no ?? entry.inningsNo ?? 0),
    is_super_over: toBooleanFlag(entry.is_super_over ?? entry.isSuperOver),
    super_over_no: Number(entry.super_over_no ?? entry.superOverNo ?? 0),
    deliveries: Array.isArray(entry.deliveries)
      ? entry.deliveries.map((ball) =>
          normalizeRecentBall({
            ...ball,
            innings_id: ball.innings_id ?? inningsId,
          })
        )
      : [],
  };
}

export async function fetchMatches() {
  const { data } = await api.get<MatchesResponse | ApiMatch[]>("/matches");

  return getMatchesArray(data).map(normalizeMatch);
}

function unwrapMatch(response: CreateMatchResponse) {
  return response.data ?? response.match ?? response;
}

export async function fetchMatchById(id: string) {
  const { data } = await api.get<CreateMatchResponse>(`/matches/${id}`);

  return normalizeMatch(unwrapMatch(data));
}

export async function createMatch(payload: CreateMatchPayload) {
  const { data } = await api.post<CreateMatchResponse>("/matches", payload);

  return normalizeMatch(unwrapMatch(data));
}

export type TossPayload = {
  match_id: string;
  toss_winner_team_id: string;
  decision: "bat" | "bowl";
};

export type TossResponse = {
  success: boolean;
  message: string;
  innings: MatchInnings[];
};

export async function submitFirstPick(matchId: string, firstPickTeamId: string) {
  const { data } = await api.patch<{
    success: boolean;
    message: string;
    data: ApiMatch;
  }>(`/matches/${matchId}/first-pick`, {
    first_pick_team_id: firstPickTeamId,
  });

  return normalizeMatch(data.data);
}

export async function submitToss(payload: TossPayload) {
  const { data } = await api.post<TossResponse>("/toss", payload);

  return data;
}

export async function completeMatch(
  matchId: string,
  winnerId: string
) {
  const { data } = await api.patch(`/matches/${matchId}/complete`, {
    winner_match_team_id: winnerId,
  });

  return data;
}

export async function startMatch(matchId: string) {
  const { data } = await api.patch<{
    success: boolean;
    message: string;
    innings: MatchInnings[];
  }>(`/matches/${matchId}/start`);

  return data;
}

export async function fetchMatchInnings(matchId: string) {
  const { data } = await api.get<{ success: boolean; innings: MatchInnings[] }>(
    `/matches/${matchId}/innings`
  );

  return data.innings;
}

export async function fetchMatchSquad(matchId: string) {
  const { data } = await api.get<{ success: boolean; squad: MatchSquadPlayer[] }>(
    `/matches/${matchId}/squad`
  );

  if (!Array.isArray(data.squad)) return [];

  return data.squad.map((player) => ({
    ...player,
    player_name:
      player.player_name ||
      player.name ||
      player.user?.name ||
      player.player?.name ||
      player.phone_number ||
      player.user?.phone_number ||
      player.player?.phone_number ||
      "Unnamed player",
    phone_number:
      player.phone_number ?? player.user?.phone_number ?? player.player?.phone_number,
  }));
}

export async function updateMatchLineup(
  matchId: string,
  players: Array<{
    match_team_player_id: string;
    is_playing_xi: boolean;
    is_captain: boolean;
    is_umpire: boolean;
    batting_order: number | null;
  }>
) {
  const { data } = await api.patch(`/matches/${matchId}/lineup`, { players });

  return data;
}

export async function fetchMatchScorecard(matchId: string) {
  const { data } = await api.get<{ success: boolean; data: MatchScorecard }>(
    `/matches/${matchId}/scorecard`
  );
  const scorecard = data.data ?? (data as unknown as MatchScorecard);
  const batting = Array.isArray(scorecard?.batting)
    ? (scorecard.batting as ApiScorecardPlayer[]).map((player) => ({
        ...player,
        innings_id:
          player.innings_id ??
          player.inningsId ??
          player.inning_id ??
          player.inningId ??
          player.match_innings_id ??
          player.matchInningsId,
        innings_no:
          player.innings_no ?? player.inningsNo ?? player.inning_no ?? player.inningNo,
        is_super_over: toBooleanFlag(player.is_super_over ?? player.isSuperOver),
        super_over_no: player.super_over_no ?? player.superOverNo,
        is_out: toBooleanFlag(player.is_out ?? player.isOut ?? player.out),
      }))
    : [];
  const bowling = Array.isArray(scorecard?.bowling)
    ? (scorecard.bowling as ApiScorecardPlayer[]).map((player) => ({
        ...player,
        innings_id:
          player.innings_id ??
          player.inningsId ??
          player.inning_id ??
          player.inningId ??
          player.match_innings_id ??
          player.matchInningsId,
        innings_no:
          player.innings_no ?? player.inningsNo ?? player.inning_no ?? player.inningNo,
        is_super_over: toBooleanFlag(player.is_super_over ?? player.isSuperOver),
        super_over_no: player.super_over_no ?? player.superOverNo,
      }))
    : [];

  return {
    ...emptyScorecard,
    ...scorecard,
    innings: Array.isArray(scorecard?.innings)
      ? (scorecard.innings as ApiMatchInnings[])
          .map(normalizeInnings)
          .filter((entry) => entry.id)
          .sort((a, b) => a.innings_no - b.innings_no)
      : [],
    batting,
    bowling,
    recent_balls: Array.isArray(scorecard?.recent_balls)
      ? (scorecard.recent_balls as ApiRecentBall[]).map(normalizeRecentBall)
      : [],
    deliveries_by_innings: Array.isArray(scorecard?.deliveries_by_innings)
      ? (scorecard.deliveries_by_innings as ApiDeliveriesByInnings[]).map(
          normalizeDeliveriesByInnings
        )
      : [],
  };
}

export async function addBall(payload: AddBallPayload) {
  const { data } = await api.post<BallResponse>("/ball", payload);

  return data;
}

export async function updateInningsState(
  inningsId: string,
  payload: {
    striker_id?: string;
    non_striker_id?: string;
    bowler_id?: string;
  }
) {
  const { data } = await api.patch<{ message: string; state: InningsState }>(
    `/innings/${inningsId}/state`,
    payload
  );

  return data;
}

export async function undoLastBall(inningsId: string) {
  const { data } = await api.post<{ message: string; state: InningsState }>(
    `/innings/${inningsId}/undo-ball`
  );

  return data;
}
