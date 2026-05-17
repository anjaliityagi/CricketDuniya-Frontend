export type Team = {
  id: string;
  name: string;
  captainName?: string;
  city?: string;
  playerCount: number;
};

export const mockTeams: Team[] = [
  {
    id: "team-001",
    name: "Lucknow Strikers",
    captainName: "Rahul",
    city: "Lucknow",
    playerCount: 11,
  },
  {
    id: "team-002",
    name: "Noida Warriors",
    captainName: "Amit",
    city: "Noida",
    playerCount: 10,
  },
  {
    id: "team-003",
    name: "Pune Panthers",
    captainName: "Vikram",
    city: "Pune",
    playerCount: 12,
  },
];
