export type MatchPlayer = {
  id: string;
  name: string;
  phone?: string;
  isHost?: boolean;
};

export type BatsmanLive = {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isStriker: boolean;
};

export type BowlerLive = {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
};

export type Match = {
  id: string;
  status: "live" | "scheduled" | "completed";
  teamOneName: string;
  teamTwoName: string;
  teamOneScore?: string;
  teamTwoScore?: string;
  team_a_id?: string;
  team_b_id?: string;
  team_a_match_team_id?: string;
  team_b_match_team_id?: string;
  winner_match_team_id?: string;
  created_by?: string | number;
  createdBy?: string | number;
  host_user_id?: string | number;
  hostUserId?: string | number;
  matchNote?: string;
  match_date?: string;
  overs_per_side: number;
  venue?: string;
  teamOnePlayers?: MatchPlayer[];
  teamTwoPlayers?: MatchPlayer[];
  tossWinner?: "one" | "two";
  tossDecision?: "bat" | "bowl";
  first_pick_team_id?: string;
  battingTeam?: "one" | "two";
  inningsBalls?: number;
  striker?: BatsmanLive;
  nonStriker?: BatsmanLive;
  currentBowler?: BowlerLive;
  thisOverBalls?: string[];
};

export const mockMatches: Match[] = [
  {
    id: "match-001",
    status: "live",
    teamOneName: "LSG",
    teamTwoName: "SRH",
    teamOneScore: "201/6",
    teamTwoScore: "198/8",
    matchNote: "20 ov - Super Over next",
    overs_per_side: 20,
    venue: "Green Park, Lucknow",
    battingTeam: "one",
    inningsBalls: 112,
    striker: {
      name: "Rahul",
      runs: 68,
      balls: 42,
      fours: 6,
      sixes: 3,
      isStriker: true,
    },
    nonStriker: {
      name: "Amit",
      runs: 45,
      balls: 38,
      fours: 4,
      sixes: 1,
      isStriker: false,
    },
    currentBowler: {
      name: "Vikram",
      overs: 3,
      balls: 4,
      runs: 28,
      wickets: 1,
    },
    thisOverBalls: ["1", "4", "0", "2"],
  },
  {
    id: "match-002",
    status: "scheduled",
    teamOneName: "MI",
    teamTwoName: "CSK",
    teamOneScore: "—",
    teamTwoScore: "—",
    matchNote: "10 ov - Starts today 3:30 PM",
    overs_per_side: 10,
    venue: "Wankhede Stadium",
  },
  {
    id: "match-003",
    status: "completed",
    teamOneName: "RCB",
    teamTwoName: "KKR",
    teamOneScore: "178/9",
    teamTwoScore: "179/5",
    matchNote: "20 ov - KKR won by 5 wickets",
    overs_per_side: 20,
    venue: "Chinnaswamy Stadium",
  },
  {
    id: "match-004",
    status: "scheduled",
    teamOneName: "GT",
    teamTwoName: "PBKS",
    teamOneScore: "—",
    teamTwoScore: "—",
    matchNote: "15 ov - Tomorrow 6:00 PM",
    overs_per_side: 15,
    venue: "Narendra Modi Stadium",
  },
];
