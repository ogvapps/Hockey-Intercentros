import { MatchRecord, Category } from '../types';
import { TEAMS_MASCULINO, TEAMS_FEMENINO } from '../constants/teams';

export const isMatchPlayed = (
  matches: MatchRecord[],
  category: Category,
  t1: string,
  t2: string
): boolean => {
  return matches.some(m =>
    m.category === category &&
    ((m.team1 === t1 && m.team2 === t2) || (m.team1 === t2 && m.team2 === t1)) &&
    (m.played || m.isLive)
  );
};

export const getMatchResult = (
  matches: MatchRecord[],
  category: Category,
  t1: string,
  t2: string
): string | null => {
  const match = matches.find(m =>
    m.category === category &&
    ((m.team1 === t1 && m.team2 === t2) || (m.team1 === t2 && m.team2 === t1)) &&
    (m.played || m.isLive)
  );
  if (!match) return null;

  const isT1First = match.team1 === t1;
  const s1 = isT1First ? match.score1 : match.score2;
  const s2 = isT1First ? match.score2 : match.score1;
  
  let res = `${s1} - ${s2}`;
  if (match.penaltyScore1 !== undefined && match.penaltyScore2 !== undefined) {
    const p1 = isT1First ? match.penaltyScore1 : match.penaltyScore2;
    const p2 = isT1First ? match.penaltyScore2 : match.penaltyScore1;
    res += ` (P: ${p1}-${p2})`;
  }
  return res;
};

export const formatMatchScore = (match: MatchRecord): string => {
  let res = `${match.score1} - ${match.score2}`;
  if (match.penaltyScore1 !== undefined && match.penaltyScore2 !== undefined) {
    res += ` (P: ${match.penaltyScore1}-${match.penaltyScore2})`;
  }
  return res;
};

export const getMatchWinner = (match?: MatchRecord): string | null => {
  if (!match || !match.played) return null;
  if (match.score1 > match.score2) return match.team1;
  if (match.score2 > match.score1) return match.team2;
  if (match.penaltyScore1 !== undefined && match.penaltyScore2 !== undefined) {
    if (match.penaltyScore1 > match.penaltyScore2) return match.team1;
    if (match.penaltyScore2 > match.penaltyScore1) return match.team2;
  }
  return null;
};

export const getMatchLoser = (match?: MatchRecord): string | null => {
  if (!match || !match.played) return null;
  if (match.score1 < match.score2) return match.team1;
  if (match.score2 < match.score1) return match.team2;
  if (match.penaltyScore1 !== undefined && match.penaltyScore2 !== undefined) {
    if (match.penaltyScore1 < match.penaltyScore2) return match.team1;
    if (match.penaltyScore2 < match.penaltyScore1) return match.team2;
  }
  return null;
};

export const getMatchId = (
  matches: MatchRecord[],
  category: Category,
  t1: string,
  t2: string
): string | null => {
  const match = matches.find(m =>
    m.category === category &&
    ((m.team1 === t1 && m.team2 === t2) || (m.team1 === t2 && m.team2 === t1))
  );
  return match?.id || null;
};

/** Look up a team object by name from the static TEAMS_MASCULINO and TEAMS_FEMENINO list (used for color display). */
export const getTeamByName = (name: string) =>
  TEAMS_MASCULINO.find(t => t.name === name) || TEAMS_FEMENINO.find(t => t.name === name);
