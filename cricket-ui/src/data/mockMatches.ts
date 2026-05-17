export type MatchPlayer = {
  id: string;
  name: string;
  isHost?: boolean;
};

export type Match = {
  id: string;
  status: "live" | "scheduled" | "completed";
  teamOneName: string;
  teamTwoName: string;
  teamOneScore?: string;
  teamTwoScore?: string;
  matchNote?: string;
  overs_per_side: number;
  venue?: string;
  teamOnePlayers?: MatchPlayer[];
  teamTwoPlayers?: MatchPlayer[];
  tossWinner?: "one" | "two";
  tossDecision?: "bat" | "bowl";
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
