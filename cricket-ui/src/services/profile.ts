import api from "@/lib/api";

export type ProfileUser = {
  id: string;
  name: string;
  phone_number: string;
  profile_image: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileSummary = {
  matches_played: number;
  won: number;
  lost: number;
  mvps: number;
  win_percentage: number;
  points: number;
};

export type BattingStats = {
  average: number;
  strike_rate: number;
  high_score: number;
  runs: number;
  innings: number;
  fours: number;
  sixes: number;
};

export type BowlingStats = {
  overs_bowled: number;
  wickets: number;
  runs_conceded: number;
  maidens: number;
  economy: number;
};

export type FieldingStats = {
  catches: number;
  stumping: number;
  run_outs: number;
};

export type ProfileData = {
  user: ProfileUser;
  summary: ProfileSummary;
  batting: BattingStats;
  bowling: BowlingStats;
  fielding: FieldingStats;
};

type ProfileResponse = {
  data: ProfileData;
  message: string;
  success: boolean;
};

export type UpdateProfilePayload = {
  name?: string;
  profile_image?: string | null;
  batting_style?: string | null;
  bowling_style?: string | null;
};

export async function fetchProfile() {
  const { data } = await api.get<ProfileResponse>("/profile");

  return data.data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const { data } = await api.patch<ProfileResponse>("/profile", payload);

  return data.data;
}
