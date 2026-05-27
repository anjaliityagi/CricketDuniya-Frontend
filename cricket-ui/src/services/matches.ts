import api from "@/lib/api";
import type { Match } from "@/data/mockMatches";

type ApiMatch = {
  id?: string;
  _id?: string;
  status?: string;
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
  total_runs: number;
  total_wickets: number;
  legal_balls: number;
  current_over: number;
  current_ball: number;
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
  ball_no: number;
  delivery_no: number;
  ball_type: string;
  total_runs: number;
  is_wicket: boolean;
  striker_id: string;
  non_striker_id: string;
  bowler_id: string;
  dismissal_type: string | null;
};

export type MatchScorecard = {
  innings: MatchInnings[];
  batting: ScorecardPlayer[];
  bowling: ScorecardPlayer[];
  recent_balls: RecentBall[];
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
  const batting = Array.isArray(data.data?.batting)
    ? (data.data.batting as ApiScorecardPlayer[]).map((player) => ({
        ...player,
        is_out: toBooleanFlag(player.is_out ?? player.isOut ?? player.out),
      }))
    : [];

  return {
    ...emptyScorecard,
    ...data.data,
    innings: Array.isArray(data.data?.innings) ? data.data.innings : [],
    batting,
    bowling: Array.isArray(data.data?.bowling) ? data.data.bowling : [],
    recent_balls: Array.isArray(data.data?.recent_balls)
      ? data.data.recent_balls
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
