import type { Match } from "./mockMatches";
import { mockMatches } from "./mockMatches";

const STORAGE_KEY = "cricket_matches";

export function getMatches(): Match[] {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    return JSON.parse(saved);
  }

  return mockMatches;
}

export function saveMatches(matches: Match[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
}

export function getMatchById(id: string): Match | undefined {
  const matches = getMatches();
  return matches.find((match) => match.id === id);
}

export function addMatch(newMatch: Match) {
  const matches = getMatches();
  matches.unshift(newMatch);
  saveMatches(matches);
}

export function updateMatch(updatedMatch: Match) {
  const matches = getMatches();
  const index = matches.findIndex((match) => match.id === updatedMatch.id);

  if (index === -1) {
    return;
  }

  matches[index] = updatedMatch;
  saveMatches(matches);
}

export function parseScore(score?: string) {
  if (!score || score === "—") {
    return { runs: 0, wickets: 0 };
  }

  const parts = score.split("/");
  return {
    runs: Number(parts[0]) || 0,
    wickets: Number(parts[1]) || 0,
  };
}

export function formatScore(runs: number, wickets: number) {
  return `${runs}/${wickets}`;
}

export function startMatchWithToss(
  id: string,
  tossWinner: "one" | "two",
  tossDecision: "bat" | "bowl"
) {
  const match = getMatchById(id);
  if (!match) return;

  const winnerName =
    tossWinner === "one" ? match.teamOneName : match.teamTwoName;

  match.status = "live";
  match.tossWinner = tossWinner;
  match.tossDecision = tossDecision;
  match.teamOneScore = "0/0";
  match.teamTwoScore = "0/0";
  match.matchNote = `${match.overs_per_side} ov - ${winnerName} won toss and chose to ${tossDecision}`;

  updateMatch(match);
}

export function addRuns(id: string, team: "one" | "two", runs: number) {
  const match = getMatchById(id);
  if (!match) return;

  if (team === "one") {
    const score = parseScore(match.teamOneScore);
    match.teamOneScore = formatScore(score.runs + runs, score.wickets);
  } else {
    const score = parseScore(match.teamTwoScore);
    match.teamTwoScore = formatScore(score.runs + runs, score.wickets);
  }

  updateMatch(match);
}

export function addWicket(id: string, team: "one" | "two") {
  const match = getMatchById(id);
  if (!match) return;

  if (team === "one") {
    const score = parseScore(match.teamOneScore);
    if (score.wickets >= 10) return;
    match.teamOneScore = formatScore(score.runs, score.wickets + 1);
  } else {
    const score = parseScore(match.teamTwoScore);
    if (score.wickets >= 10) return;
    match.teamTwoScore = formatScore(score.runs, score.wickets + 1);
  }

  updateMatch(match);
}

export function endMatch(id: string) {
  const match = getMatchById(id);
  if (!match) return;

  const teamOne = parseScore(match.teamOneScore);
  const teamTwo = parseScore(match.teamTwoScore);

  match.status = "completed";

  if (teamOne.runs > teamTwo.runs) {
    match.matchNote = `${match.overs_per_side} ov - ${match.teamOneName} won`;
  } else if (teamTwo.runs > teamOne.runs) {
    match.matchNote = `${match.overs_per_side} ov - ${match.teamTwoName} won`;
  } else {
    match.matchNote = `${match.overs_per_side} ov - Match tied`;
  }

  updateMatch(match);
}

export function addPlayerToTeam(
  matchId: string,
  team: "one" | "two",
  player: { id: string; name: string; isHost?: boolean }
) {
  const match = getMatchById(matchId);
  if (!match) return;

  if (team === "one") {
    if (!match.teamOnePlayers) match.teamOnePlayers = [];
    const alreadyAdded = match.teamOnePlayers.some((p) => p.id === player.id);
    if (alreadyAdded) return;
    match.teamOnePlayers.push(player);
  } else {
    if (!match.teamTwoPlayers) match.teamTwoPlayers = [];
    const alreadyAdded = match.teamTwoPlayers.some((p) => p.id === player.id);
    if (alreadyAdded) return;
    match.teamTwoPlayers.push(player);
  }

  updateMatch(match);
}

export function removePlayerFromTeam(
  matchId: string,
  team: "one" | "two",
  playerId: string
) {
  const match = getMatchById(matchId);
  if (!match) return;

  if (team === "one" && match.teamOnePlayers) {
    match.teamOnePlayers = match.teamOnePlayers.filter((p) => p.id !== playerId);
  }

  if (team === "two" && match.teamTwoPlayers) {
    match.teamTwoPlayers = match.teamTwoPlayers.filter((p) => p.id !== playerId);
  }

  updateMatch(match);
}
