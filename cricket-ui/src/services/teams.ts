import api from "@/lib/api";
import type { Team } from "@/data/mockTeams";

export type ApiTeam = {
  id: string;
  name: string;
  logo_url?: string | null;
  captain_id?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  player_count?: number;
  players_count?: number;
  captain_name?: string;
  city?: string;
};

export type TeamPlayer = {
  id: string;
  team_id: string;
  player_id: string;
  name: string;
  phone_number?: string;
  is_captain?: boolean;
  is_wicket_keeper?: boolean;
  is_playing_xi?: boolean;
  is_substitute?: boolean;
  batting_order?: number | null;
  created_at?: string;
  removed_at?: string | null;
};

export type UserSearchResult = {
  id: string;
  name: string;
  phone_number: string;
  batting_style?: string | null;
  bowling_style?: string | null;
  created_at?: string;
  updated_at?: string;
};

type UsersResponse =
  | UserSearchResult[]
  | {
      data?: UserSearchResult[] | { users?: UserSearchResult[] };
      users?: UserSearchResult[];
      results?: UserSearchResult[];
    };

type CreateTeamPayload = {
  name: string;
};

export type AddTeamPlayerPayload =
  | { player_id: string }
  | { name: string; phone_number: string };

function normalizeTeam(team: ApiTeam): Team {
  return {
    id: team.id,
    name: team.name,
    captainName: team.captain_name,
    city: team.city,
    playerCount: Number(team.player_count ?? team.players_count ?? 0),
  };
}

export async function fetchTeams() {
  const { data } = await api.get<ApiTeam[]>("/teams");

  return data.map(normalizeTeam);
}

export async function fetchTeamById(id: string) {
  const { data } = await api.get<ApiTeam>(`/teams/${id}`);

  return normalizeTeam(data);
}

export async function createTeam(payload: CreateTeamPayload) {
  const { data } = await api.post<ApiTeam>("/teams", payload);

  return normalizeTeam(data);
}

export async function fetchTeamPlayers(teamId: string) {
  const { data } = await api.get<TeamPlayer[]>(`/teams/${teamId}/players`);

  return data;
}

export async function addPlayerToTeam(
  teamId: string,
  payload: AddTeamPlayerPayload | string
) {
  const body = typeof payload === "string" ? { player_id: payload } : payload;
  const { data } = await api.post(`/teams/${teamId}/players`, body);

  return data;
}

export async function removePlayerFromTeam(playerTeamLinkId: string) {
  const { data } = await api.delete(`/players/${playerTeamLinkId}`);

  return data;
}

export async function searchUsers(search: string) {
  const { data } = await api.get<UsersResponse>("/users", {
    params: search.trim() ? { search: search.trim() } : undefined,
  });

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data?.users)) return data.data.users;

  return [];
}
