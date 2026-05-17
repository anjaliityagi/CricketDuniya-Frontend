import type { Team } from "./mockTeams";
import { mockTeams } from "./mockTeams";

const STORAGE_KEY = "cricket_teams";

export function getTeams(): Team[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    return JSON.parse(saved);
  }

  return mockTeams;
}

export function saveTeams(teams: Team[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

export function getTeamById(id: string): Team | undefined {
  const teams = getTeams();
  return teams.find((team) => team.id === id);
}

export function addTeam(newTeam: Team) {
  const teams = getTeams();
  teams.unshift(newTeam);
  saveTeams(teams);
}
