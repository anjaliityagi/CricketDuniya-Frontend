import api from "@/lib/api";

export type PlayerDirectoryItem = {
  id: string;
  name: string;
  phone_number: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  matches_played: number;
  points: number;
};

type PlayersResponse = {
  data: PlayerDirectoryItem[];
  message: string;
  success: boolean;
};

export async function fetchPlayers(search: string) {
  const trimmedSearch = search.trim();
  const query = trimmedSearch ? "?search=" + encodeURIComponent(trimmedSearch) + "&limit=10" : "?limit=10";
  const { data } = await api.get<PlayersResponse>("/players" + query);

  return data.data;
}

export async function assignTeamCaptain(playerId: string, teamId: string) {
  const { data } = await api.put<{ message: string }>(
    `/players/${playerId}/assign-captain`,
    {
      team_id: teamId,
    }
  );

  return data;
}

export async function assignTeamUmpire(playerId: string, teamId: string) {
  const { data } = await api.put<{ message: string }>(
    `/players/${playerId}/assign-umpire`,
    {
      team_id: teamId,
    }
  );

  return data;
}
