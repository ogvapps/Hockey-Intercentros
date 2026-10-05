import { Team, ScheduleMatch, Category } from '../types';
import { TEAMS_MASCULINO, TEAMS_FEMENINO } from './teams';

/**
 * Generates a round-robin schedule for any group size (3-8 teams).
 * Uses the standard "circle method" rotation algorithm.
 */
const generateRoundRobin = (teams: Team[]): [number, number][][] => {
  const n = teams.length;
  // If odd number of teams, add a dummy "bye" slot
  const hasRest = n % 2 !== 0;
  const slots = hasRest ? n + 1 : n;
  const rounds: [number, number][][] = [];

  // Standard circle rotation: fix slot 0, rotate the rest
  const indices = Array.from({ length: slots }, (_, i) => i);
  
  for (let r = 0; r < slots - 1; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < slots / 2; i++) {
      const home = indices[i];
      const away = indices[slots - 1 - i];
      // Skip matches involving the dummy slot (= bye)
      if (home < n && away < n) {
        round.push([home, away]);
      }
    }
    rounds.push(round);
    // Rotate: keep first element fixed, rotate the rest
    const last = indices.pop()!;
    indices.splice(1, 0, last);
  }

  return rounds;
};

export interface ScheduleOptions {
  format?: string; // 'group-playoff' | 'league' | 'knockout'
  startTime?: string;
  matchDurationMins?: number;
  restDurationMins?: number;
  concurrentCourts?: number;
}

export const buildSchedule = (
  teamsList: Team[],
  category: Category,
  options: ScheduleOptions = {}
): ScheduleMatch[] => {
  const schedule: ScheduleMatch[] = [];
  
  // Default values for legacy compatibility
  const format = options.format || 'group-playoff';
  const startTime = options.startTime || '09:30';
  const duration = (options.matchDurationMins || 5) + (options.restDurationMins || 0);
  const courts = options.concurrentCourts || 2;

  // Helper to get formatted time
  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const startMins = parseTime(startTime);
  
  const getFormattedTime = (matchIndex: number) => {
    // Determine which time slot this match belongs to, given concurrent courts
    const slotIndex = Math.floor(matchIndex / courts);
    const totalMinutes = startMins + slotIndex * duration;
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  let matchCounter = 0;

  if (format === 'league') {
    const rounds = generateRoundRobin(teamsList);
    for (let rIndex = 0; rIndex < rounds.length; rIndex++) {
      const roundMatches = rounds[rIndex];
      for (let i = 0; i < roundMatches.length; i++) {
        const [a, b] = roundMatches[i];
        const t1 = teamsList[a];
        const t2 = teamsList[b];
        if (t1 && t2) {
          schedule.push({
            id: `${category}_match_L_${rIndex}_${i}`, group: 'A', round: rIndex + 1,
            time: getFormattedTime(matchCounter), team1: t1, team2: t2,
            isRestMatch: !!(t1?.isRest || t2?.isRest)
          });
          matchCounter++;
        }
      }
    }
  } else {
    // group-playoff or knockout initially have groups
    const groupA = teamsList.filter(t => t.group === 'A');
    const groupB = teamsList.filter(t => t.group === 'B');

    // Legacy compatibility override for groups of exactly 6
    const roundsA = groupA.length === 6 && !options.format
      ? [[[0,5],[1,4],[2,3]], [[5,3],[4,2],[0,1]], [[1,5],[2,0],[3,4]], [[5,4],[0,3],[1,2]], [[2,5],[3,1],[4,0]]] as [number,number][][]
      : generateRoundRobin(groupA);

    const roundsB = groupB.length === 6 && !options.format
      ? [[[0,5],[1,4],[2,3]], [[5,3],[4,2],[0,1]], [[1,5],[2,0],[3,4]], [[5,4],[0,3],[1,2]], [[2,5],[3,1],[4,0]]] as [number,number][][]
      : generateRoundRobin(groupB);

    const maxRounds = Math.max(roundsA.length, roundsB.length);

    for (let rIndex = 0; rIndex < maxRounds; rIndex++) {
      const roundAMatches = roundsA[rIndex] || [];
      const roundBMatches = roundsB[rIndex] || [];
      const maxMatches = Math.max(roundAMatches.length, roundBMatches.length);

      for (let i = 0; i < maxMatches; i++) {
        // Interleave matches to distribute courts evenly across groups if possible
        if (i < roundAMatches.length) {
          const [a, b] = roundAMatches[i];
          const t1A = groupA[a];
          const t2A = groupA[b];
          if (t1A && t2A) {
            schedule.push({
              id: `${category}_match_A_${rIndex}_${i}`, group: 'A', round: rIndex + 1,
              time: getFormattedTime(matchCounter), team1: t1A, team2: t2A,
              isRestMatch: !!(t1A?.isRest || t2A?.isRest)
            });
            matchCounter++;
          }
        }

        if (i < roundBMatches.length) {
          const [a, b] = roundBMatches[i];
          const t1B = groupB[a];
          const t2B = groupB[b];
          if (t1B && t2B) {
            schedule.push({
              id: `${category}_match_B_${rIndex}_${i}`, group: 'B', round: rIndex + 1,
              time: getFormattedTime(matchCounter), team1: t1B, team2: t2B,
              isRestMatch: !!(t1B?.isRest || t2B?.isRest)
            });
            matchCounter++;
          }
        }
      }
    }
  }

  return schedule;
};

export const SCHEDULES: Record<Category, ScheduleMatch[]> = {
  masculino: buildSchedule(TEAMS_MASCULINO, 'masculino'),
  femenino: buildSchedule(TEAMS_FEMENINO, 'femenino')
};
