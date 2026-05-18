import type { BatsmanLive, BowlerLive, Match, MatchPlayer } from "./mockMatches";
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

function getBattingAndBowlingTeam(
  tossWinner: "one" | "two",
  tossDecision: "bat" | "bowl"
) {
  if (tossDecision === "bat") {
    return {
      batting: tossWinner,
      bowling: tossWinner === "one" ? "two" : "one",
    };
  }

  return {
    batting: tossWinner === "one" ? "two" : "one",
    bowling: tossWinner,
  };
}

function getTeamPlayers(match: Match, team: "one" | "two"): MatchPlayer[] {
  const players = team === "one" ? match.teamOnePlayers : match.teamTwoPlayers;

  if (players && players.length > 0) {
    return players;
  }

  return [
    { id: "p1", name: "Batsman 1" },
    { id: "p2", name: "Batsman 2" },
    { id: "p3", name: "Batsman 3" },
  ];
}

/** Squad names for batting/bowling team (falls back to mock names if unset). */
export function getSquadPlayers(match: Match, team: "one" | "two"): MatchPlayer[] {
  return getTeamPlayers(match, team);
}

function makeBatsman(name: string, isStriker: boolean): BatsmanLive {
  return {
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isStriker,
  };
}

function setupLiveMatch(match: Match, tossWinner: "one" | "two", tossDecision: "bat" | "bowl") {
  const teams = getBattingAndBowlingTeam(tossWinner, tossDecision);
  const battingPlayers = getTeamPlayers(match, teams.batting);
  const bowlingPlayers = getTeamPlayers(match, teams.bowling);

  match.battingTeam = teams.batting;
  match.inningsBalls = 0;
  match.thisOverBalls = [];
  match.striker = makeBatsman(battingPlayers[0].name, true);
  match.nonStriker = makeBatsman(battingPlayers[1]?.name || "Batsman 2", false);
  match.currentBowler = {
    name: bowlingPlayers[0]?.name || "Bowler 1",
    overs: 0,
    balls: 0,
    runs: 0,
    wickets: 0,
  };
}

function getBattingScore(match: Match) {
  if (match.battingTeam === "one") {
    return parseScore(match.teamOneScore);
  }
  return parseScore(match.teamTwoScore);
}

function setBattingScore(match: Match, runs: number, wickets: number) {
  const scoreText = formatScore(runs, wickets);

  if (match.battingTeam === "one") {
    match.teamOneScore = scoreText;
  } else {
    match.teamTwoScore = scoreText;
  }
}

function swapBatsmen(match: Match) {
  if (!match.striker || !match.nonStriker) return;

  const strikerCopy = { ...match.striker };
  match.striker = { ...match.nonStriker, isStriker: true };
  match.nonStriker = { ...strikerCopy, isStriker: false };
}

function bringNewBatsman(match: Match) {
  if (!match.striker || !match.battingTeam) return;

  const players = getTeamPlayers(match, match.battingTeam);
  const score = getBattingScore(match);
  const nextPlayer = players[score.wickets + 1];

  match.striker = makeBatsman(nextPlayer?.name || `Batsman ${score.wickets + 2}`, true);
}

function addBallToBowler(match: Match, runs: number) {
  if (!match.currentBowler) return;

  match.currentBowler.runs += runs;
  match.currentBowler.balls += 1;

  if (match.currentBowler.balls === 6) {
    match.currentBowler.overs += 1;
    match.currentBowler.balls = 0;
  }
}

export function getOverDisplay(balls: number) {
  const overs = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return `${overs}.${remainingBalls}`;
}

export function getRunRate(runs: number, balls: number) {
  if (balls === 0) return "0.00";
  const rate = runs / (balls / 6);
  return rate.toFixed(2);
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

  setupLiveMatch(match, tossWinner, tossDecision);
  updateMatch(match);
}

export function recordBall(id: string, runs: number) {
  const match = getMatchById(id);
  if (!match || match.status !== "live") return;
  if (!match.striker || !match.nonStriker || !match.currentBowler) return;

  const teamScore = getBattingScore(match);
  const newRuns = teamScore.runs + runs;
  setBattingScore(match, newRuns, teamScore.wickets);

  match.striker.runs += runs;
  match.striker.balls += 1;

  if (runs === 4) match.striker.fours += 1;
  if (runs === 6) match.striker.sixes += 1;

  addBallToBowler(match, runs);

  if (!match.thisOverBalls) match.thisOverBalls = [];
  match.thisOverBalls.push(String(runs));

  match.inningsBalls = (match.inningsBalls || 0) + 1;

  if (match.inningsBalls % 6 === 0) {
    match.thisOverBalls = [];
    swapBatsmen(match);
  }

  updateMatch(match);
}

export function recordWicket(id: string) {
  const match = getMatchById(id);
  if (!match || match.status !== "live") return;
  if (!match.striker || !match.currentBowler) return;

  const teamScore = getBattingScore(match);
  if (teamScore.wickets >= 10) return;

  setBattingScore(match, teamScore.runs, teamScore.wickets + 1);

  match.striker.balls += 1;
  match.currentBowler.wickets += 1;
  addBallToBowler(match, 0);

  if (!match.thisOverBalls) match.thisOverBalls = [];
  match.thisOverBalls.push("W");

  match.inningsBalls = (match.inningsBalls || 0) + 1;

  bringNewBatsman(match);

  if (match.inningsBalls % 6 === 0) {
    match.thisOverBalls = [];
    swapBatsmen(match);
  }

  updateMatch(match);
}

function recordByeOrLegBye(match: Match, runs: number, prefix: "b" | "lb") {
  const teamScore = getBattingScore(match);
  setBattingScore(match, teamScore.runs + runs, teamScore.wickets);
  match.striker!.balls += 1;
  addBallToBowler(match, runs);
  if (!match.thisOverBalls) match.thisOverBalls = [];
  match.thisOverBalls.push(runs === 0 ? `${prefix}0` : `${prefix}${runs}`);
  match.inningsBalls = (match.inningsBalls || 0) + 1;
  if (runs % 2 === 1) swapBatsmen(match);
  if (match.inningsBalls % 6 === 0) {
    match.thisOverBalls = [];
    swapBatsmen(match);
  }
}

export function recordWide(id: string) {
  const match = getMatchById(id);
  if (!match || match.status !== "live" || !match.currentBowler) return;

  const teamScore = getBattingScore(match);
  setBattingScore(match, teamScore.runs + 1, teamScore.wickets);
  match.currentBowler.runs += 1;

  if (!match.thisOverBalls) match.thisOverBalls = [];
  match.thisOverBalls.push("Wd");

  updateMatch(match);
}

export function recordNoBall(id: string) {
  const match = getMatchById(id);
  if (!match || match.status !== "live" || !match.currentBowler) return;

  const teamScore = getBattingScore(match);
  setBattingScore(match, teamScore.runs + 1, teamScore.wickets);
  match.currentBowler.runs += 1;

  if (!match.thisOverBalls) match.thisOverBalls = [];
  match.thisOverBalls.push("Nb");

  updateMatch(match);
}

export function recordBye(id: string, runs: number) {
  const match = getMatchById(id);
  if (!match || match.status !== "live") return;
  if (!match.striker || !match.nonStriker || !match.currentBowler) return;
  if (runs < 0) return;

  recordByeOrLegBye(match, runs, "b");
  updateMatch(match);
}

export function recordLegBye(id: string, runs: number) {
  const match = getMatchById(id);
  if (!match || match.status !== "live") return;
  if (!match.striker || !match.nonStriker || !match.currentBowler) return;
  if (runs < 0) return;

  recordByeOrLegBye(match, runs, "lb");
  updateMatch(match);
}

export function swapStrike(id: string) {
  const match = getMatchById(id);
  if (!match || match.status !== "live") return;
  if (!match.striker || !match.nonStriker) return;

  swapBatsmen(match);
  updateMatch(match);
}

export function replaceStriker(id: string, newPlayerName: string) {
  const match = getMatchById(id);
  if (!match || match.status !== "live" || !match.battingTeam) return;
  if (!match.nonStriker) return;
  if (newPlayerName === match.nonStriker.name) return;
  if (match.striker?.name === newPlayerName) return;

  const squad = getTeamPlayers(match, match.battingTeam);
  if (!squad.some((p) => p.name === newPlayerName)) return;

  match.striker = makeBatsman(newPlayerName, true);
  match.nonStriker = { ...match.nonStriker, isStriker: false };
  updateMatch(match);
}

export function replaceNonStriker(id: string, newPlayerName: string) {
  const match = getMatchById(id);
  if (!match || match.status !== "live" || !match.battingTeam) return;
  if (!match.striker) return;
  if (newPlayerName === match.striker.name) return;
  if (match.nonStriker?.name === newPlayerName) return;

  const squad = getTeamPlayers(match, match.battingTeam);
  if (!squad.some((p) => p.name === newPlayerName)) return;

  match.nonStriker = makeBatsman(newPlayerName, false);
  match.striker = { ...match.striker, isStriker: true };
  updateMatch(match);
}

export function replaceBowler(id: string, newBowlerName: string) {
  const match = getMatchById(id);
  if (!match || match.status !== "live" || !match.battingTeam) return;

  const bowling = match.battingTeam === "one" ? "two" : "one";
  const squad = getTeamPlayers(match, bowling);
  if (!squad.some((p) => p.name === newBowlerName)) return;
  if (match.currentBowler?.name === newBowlerName) return;

  match.currentBowler = {
    name: newBowlerName,
    overs: 0,
    balls: 0,
    runs: 0,
    wickets: 0,
  };
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
  player: MatchPlayer
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
