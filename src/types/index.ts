export interface Team {
  id: string;
  name: string;
  color: string;
  group: string;
  category: 'masculino' | 'femenino';
  isRest?: boolean;
}

export interface StandingTeam extends Team {
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  form: ('W' | 'D' | 'L')[];
}

export interface ScheduleMatch {
  id: string;
  group: string;
  round: number;
  time: string;
  team1: Team;
  team2: Team;
  isRestMatch: boolean;
}

export interface MatchEvent {
  teamIndex: number;
  time: number;
  score: string;
  type?: 'goal' | 'yellow' | 'red';
  /** Points this entry is worth (basketball 2/3-pointers); 1 when absent. */
  value?: number;
}

/** The match currently being refereed. Can be a new match or a stored MatchRecord. */
export interface LiveMatchData {
  id: string | null;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  category: 'masculino' | 'femenino';
  time?: string;
  round?: number;
  group?: string;
  yellowCards1?: number;
  yellowCards2?: number;
  redCards1?: number;
  redCards2?: number;
  goalHistory?: MatchEvent[];
  currentTime?: number;
  timerRunning?: boolean;
  isLive?: boolean;
  played?: boolean;
}

export interface MatchRecord {
  id: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  penaltyScore1?: number;
  penaltyScore2?: number;
  category: 'masculino' | 'femenino';
  time?: string;
  round?: number;
  group?: string;
  played: boolean;
  isLive?: boolean;
  currentTime?: number;
  timerRunning?: boolean;
  goalHistory?: MatchEvent[];
  yellowCards1?: number;
  yellowCards2?: number;
  redCards1?: number;
  redCards2?: number;
  updatedAt?: any;
}

export interface AppSettings {
  title: string;
  matchDuration?: number;      // seconds
  /** @deprecated PINs now live in /secrets; only read to remove it from old documents. */
  adminPin?: string;
  sportId?: string;          // from SPORTS
  tournamentName?: string;   // e.g. "Intercentros 2026"
  categories?: string[];     // e.g. ["masculino", "femenino"]
  teamsPerGroup?: number;    // e.g. 6
  playoffFormat?: 'quarters' | 'semis' | 'direct_final'; // auto-determined
  format?: 'group-playoff' | 'league' | 'knockout';
  isArchived?: boolean;
  startTime?: string;        // "HH:MM"
  endTime?: string;          // "HH:MM"
  restDuration?: number;     // minutes between matches
  concurrentCourts?: number;
  createdAt?: string;
}

export type Category = 'masculino' | 'femenino';

export type TabType = 'schedule' | 'standings' | 'playoffs' | 'ranking' | 'team' | 'live';
