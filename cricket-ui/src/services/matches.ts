import api from "@/lib/api";
import type { Match } from "@/data/mockMatches";

type ApiMatch = {
  id?: string;
  _id?: string;
  status?: string;
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
  oversPerSide?: number;
  venue?: string;
  [key: string]: unknown;
};

type MatchesResponse = {
  data?: ApiMatch[] | { matches?: ApiMatch[]; data?: ApiMatch[] };
  matches?: ApiMatch[];
  message?: string;
  success?: boolean;
};

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
  return {
    id: String(match.id ?? match._id ?? crypto.randomUUID()),
    status: toMatchStatus(match.status),
    teamOneName:
      match.teamOneName ??
      match.team_one_name ??
      match.team1_name ??
      "Team One",
    teamTwoName:
      match.teamTwoName ??
      match.team_two_name ??
      match.team2_name ??
      "Team Two",
    teamOneScore: match.teamOneScore ?? match.team_one_score ?? "—",
    teamTwoScore: match.teamTwoScore ?? match.team_two_score ?? "—",
    matchNote: match.matchNote ?? match.match_note ?? undefined,
    overs_per_side: Number(match.overs_per_side ?? match.oversPerSide ?? 20),
    venue: match.venue,
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

export async function fetchMatches() {
  const { data } = await api.get<MatchesResponse | ApiMatch[]>("/v1/matches");

  return getMatchesArray(data).map(normalizeMatch);
}
