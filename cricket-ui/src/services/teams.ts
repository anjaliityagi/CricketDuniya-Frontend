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

export type TeamPlayersBatchInput = {
  team_id: string;
  players: Array<
    | { player_id: string }
    | { name: string; phone_number: string }
  >;
};

export async function addPlayersToTeams(payload: TeamPlayersBatchInput[]) {
  const { data } = await api.post<{ message: string }>("/team-players", payload);

  return data;
}

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
  const { data } = await api.get<TeamPlayer[] | null>(`/teams/${teamId}/players`);

  return Array.isArray(data) ? data : [];
}

export async function addPlayerToTeam(
  teamId: string,
  payload: AddTeamPlayerPayload | string
) {
  const body = typeof payload === "string" ? { player_id: payload } : payload;
  const player =
    "player_id" in body
      ? { player_id: body.player_id }
      : { name: body.name, phone_number: body.phone_number };

  return addPlayersToTeams([{ team_id: teamId, players: [player] }]);
}

export async function removePlayerFromTeam(playerTeamLinkId: string) {
  const { data } = await api.delete(`/players/${playerTeamLinkId}`);

  return data;
}

export async function searchUsers(search: string) {
  const { data } = await api.get<UsersResponse>("/users", {
    params: search.trim() ? { search: search.trim() } : undefined,
  });

  let rows: Record<string, unknown>[] = [];

  if (Array.isArray(data)) rows = data as Record<string, unknown>[];
  else if (Array.isArray(data.data)) rows = data.data as Record<string, unknown>[];
  else if (Array.isArray(data.users)) rows = data.users as Record<string, unknown>[];
  else if (Array.isArray(data.results)) rows = data.results as Record<string, unknown>[];
  else if (Array.isArray(data.data?.users))
    rows = data.data.users as Record<string, unknown>[];

  return rows
    .map((u) => {
      const rawId = u.id ?? u.user_id ?? u.userId;
      const id = typeof rawId === "string" ? rawId : String(rawId ?? "");
      const name = typeof u.name === "string" ? u.name : "";
      const phone =
        typeof u.phone_number === "string"
          ? u.phone_number
          : typeof u.phoneNumber === "string"
            ? u.phoneNumber
            : "";

      if (!id.trim() || !name.trim()) return null;

      return {
        id: id.trim(),
        name: name.trim(),
        phone_number: phone.trim(),
        batting_style:
          typeof u.batting_style === "string" ? u.batting_style : null,
        bowling_style:
          typeof u.bowling_style === "string" ? u.bowling_style : null,
      } satisfies UserSearchResult;
    })
    .filter(Boolean) as UserSearchResult[];
}
