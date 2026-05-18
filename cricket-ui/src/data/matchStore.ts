import type { BatsmanLive, BowlerLive, Match, MatchPlayer } from "./mockMatches";
import { mockMatches } from "./mockMatches";
import { mockPlayers } from "./mockPlayers";

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
  player: { id: string; name: string; isHost?: boolean; phone?: string }
) {
  const match = getMatchById(matchId);
  if (!match) return;

  const entry: MatchPlayer = {
    id: player.id,
    name: player.name,
    ...(player.phone ? { phone: player.phone } : {}),
    ...(player.isHost ? { isHost: true } : {}),
  };

  if (team === "one") {
    if (!match.teamOnePlayers) match.teamOnePlayers = [];
    const alreadyAdded = match.teamOnePlayers.some((p) => p.id === player.id);
    if (alreadyAdded) return;
    match.teamOnePlayers.push(entry);
  } else {
    if (!match.teamTwoPlayers) match.teamTwoPlayers = [];
    const alreadyAdded = match.teamTwoPlayers.some((p) => p.id === player.id);
    if (alreadyAdded) return;
    match.teamTwoPlayers.push(entry);
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

// --- Setup: draft order, alternating draft, roles (captain / keepers / officials) ---

export type PoolPlayerOption = {
  id: string;
  name: string;
  phone?: string;
  isCommon?: boolean;
};

function resolvePlayerForDraftPick(match: Match, playerId: string): MatchPlayer | null {
  const inTeam = [...(match.teamOnePlayers || []), ...(match.teamTwoPlayers || [])].some(
    (p) => p.id === playerId
  );
  if (inTeam) return null;

  const fromMock = mockPlayers.find((p) => p.id === playerId);
  if (fromMock) return { id: fromMock.id, name: fromMock.name };

  const extra = match.additionalPlayers?.find((p) => p.id === playerId);
  if (extra) {
    if (extra.isCommon) return null;
    return { id: extra.id, name: extra.name, ...(extra.phone ? { phone: extra.phone } : {}) };
  }

  return null;
}

/** Everyone not yet drafted (mock list + match-specific additions). Common players are excluded — they are not on either team. */
export function getAvailablePoolPlayers(match: Match): PoolPlayerOption[] {
  const taken = new Set(
    [...(match.teamOnePlayers || []), ...(match.teamTwoPlayers || [])].map((p) => p.id)
  );

  const fromMock: PoolPlayerOption[] = mockPlayers
    .filter((p) => !taken.has(p.id))
    .map((p) => ({ id: p.id, name: p.name }));

  const fromExtra: PoolPlayerOption[] = (match.additionalPlayers || [])
    .filter((p) => !taken.has(p.id) && !p.isCommon)
    .map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      isCommon: p.isCommon,
    }));

  return [...fromMock, ...fromExtra];
}

export function addMatchPlayerEntry(
  matchId: string,
  opts: { name: string; phone: string; isCommon: boolean }
): { ok: boolean; message?: string; newId?: string } {
  const name = opts.name.trim();
  const phone = opts.phone.replace(/\D/g, "");
  if (name.length < 2) return { ok: false, message: "Enter a name (at least 2 characters)." };
  if (phone.length < 10) return { ok: false, message: "Enter a valid phone number (min 10 digits)." };

  const match = getMatchById(matchId);
  if (!match || match.status !== "scheduled") return { ok: false, message: "Match not found." };
  if (match.draftLocked) return { ok: false, message: "Draft is already locked." };

  if (!match.additionalPlayers) match.additionalPlayers = [];
  const id = `mp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  match.additionalPlayers.push({
    id,
    name,
    phone,
    isCommon: opts.isCommon,
  });
  updateMatch(match);
  return { ok: true, newId: id };
}

export function getDraftTurnTeam(match: Match): "one" | "two" | null {
  if (!match.draftFirstPicker) return null;
  if (match.draftLocked) return null;

  const n1 = match.teamOnePlayers?.length ?? 0;
  const n2 = match.teamTwoPlayers?.length ?? 0;
  const cap = match.squadSize;
  if (cap && cap > 0 && n1 >= cap && n2 >= cap) return null;

  const total = n1 + n2;
  const first = match.draftFirstPicker;
  return total % 2 === 0 ? first : first === "one" ? "two" : "one";
}

/** Draft phase done: explicit lock, or legacy fixed squad size filled. */
export function isDraftFinished(match: Match): boolean {
  if (match.draftLocked) return true;
  const cap = match.squadSize;
  if (cap && cap > 0) {
    const n1 = match.teamOnePlayers?.length ?? 0;
    const n2 = match.teamTwoPlayers?.length ?? 0;
    return n1 >= cap && n2 >= cap;
  }
  return false;
}

/** @deprecated use isDraftFinished */
export function isSquadComplete(match: Match): boolean {
  return isDraftFinished(match);
}

export function tryLockDraft(matchId: string): { ok: boolean; message?: string } {
  const match = getMatchById(matchId);
  if (!match || match.status !== "scheduled") return { ok: false, message: "Match not found." };

  const n1 = match.teamOnePlayers?.length ?? 0;
  const n2 = match.teamTwoPlayers?.length ?? 0;

  if (n1 < 2 || n2 < 2) {
    return { ok: false, message: "Need at least 2 players on each team before locking." };
  }
  if (n1 !== n2) {
    return { ok: false, message: "Both teams must have the same number of players. Keep drafting." };
  }

  match.draftLocked = true;
  match.matchNote = `${match.overs_per_side} ov — assign roles`;
  updateMatch(match);
  return { ok: true };
}

export function isRolesComplete(match: Match): boolean {
  return !!(
    match.captainOneId &&
    match.captainTwoId &&
    match.wicketKeeperOneId &&
    match.wicketKeeperTwoId &&
    match.umpireName?.trim() &&
    match.umpirePhone?.trim() &&
    match.scorerName?.trim() &&
    match.scorerPhone?.trim()
  );
}

export function canProceedToBatBowlToss(match: Match): boolean {
  return !!match.draftFirstPicker && isDraftFinished(match) && isRolesComplete(match);
}

export function setDraftFirstPicker(matchId: string, team: "one" | "two") {
  const match = getMatchById(matchId);
  if (!match || match.status !== "scheduled") return;

  match.draftFirstPicker = team;
  match.matchNote = `${match.overs_per_side} ov — pick squads (draft)`;
  updateMatch(match);
}

export function addPlayerDraftPick(matchId: string, playerId: string) {
  const match = getMatchById(matchId);
  if (!match || match.status !== "scheduled") return;
  if (match.draftLocked) return;

  const resolved = resolvePlayerForDraftPick(match, playerId);
  if (!resolved) return;

  const turn = getDraftTurnTeam(match);
  if (!turn) return;

  const cap = match.squadSize;
  const n1 = match.teamOnePlayers?.length ?? 0;
  const n2 = match.teamTwoPlayers?.length ?? 0;
  if (cap && cap > 0) {
    if (turn === "one" && n1 >= cap) return;
    if (turn === "two" && n2 >= cap) return;
  }

  addPlayerToTeam(matchId, turn, resolved);
}

export type MatchRolesPayload = {
  captainOneId: string;
  captainTwoId: string;
  wicketKeeperOneId: string;
  wicketKeeperTwoId: string;
  umpireName: string;
  umpirePhone: string;
  scorerName: string;
  scorerPhone: string;
};

export function setMatchRoles(matchId: string, roles: MatchRolesPayload) {
  const match = getMatchById(matchId);
  if (!match || match.status !== "scheduled") return;

  match.captainOneId = roles.captainOneId;
  match.captainTwoId = roles.captainTwoId;
  match.wicketKeeperOneId = roles.wicketKeeperOneId;
  match.wicketKeeperTwoId = roles.wicketKeeperTwoId;
  match.umpireName = roles.umpireName.trim();
  match.umpirePhone = roles.umpirePhone.trim();
  match.scorerName = roles.scorerName.trim();
  match.scorerPhone = roles.scorerPhone.trim();
  match.matchNote = `${match.overs_per_side} ov — bat/bowl toss`;
  updateMatch(match);
}
