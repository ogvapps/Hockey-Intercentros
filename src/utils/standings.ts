import { Team, StandingTeam, MatchRecord, Category } from '../types';

export const normalizeTeamName = (name: string) => {
  if (!name) return '';
  return name.trim()
    .replace(/^IESO\s+/i, 'IES ')
    .replace(/^Colegio\s+/i, 'Col. ')
    .replace(/San Jose/i, 'San José')
    .replace(/Perez Comendador/i, 'Pérez Comendador')
    .replace(/Gabriel y Galan/i, 'Gabriel y Galán')
    .replace(/Monfrague/i, 'Monfragüe')
    .replace(/Santa Barbara/i, 'Santa Bárbara')
    .replace(/Santisima Trinidad/i, 'Santísima Trinidad');
};

export const getComparisonName = (name: string) => {
  return normalizeTeamName(name)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/^(ies|col\.)\s+/i, '') // Remove prefix for matching
    .trim();
};

/**
 * Calculates standings for a list of teams based on match records.
 * Supports filtering by category and optionally by group (A or B).
 */
export const calculateStandings = (
  teamsList: Team[],
  matches: MatchRecord[],
  category: Category,
  group?: string,
  sportId?: string
): StandingTeam[] => {
  // Filter teams by group if specified
  const filteredTeams = group ? teamsList.filter(t => t.group === group) : teamsList;
  
  const table: StandingTeam[] = filteredTeams.map(team => ({
    ...team,
    name: normalizeTeamName(team.name),
    p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: []
  }));

  // Only count group stage matches (not PLAYOFF) for the standings table
  const categoryMatches = matches.filter(m => 
    m.category === category && 
    (m.played || m.isLive) && 
    m.group !== 'PLAYOFF' &&
    m.id.startsWith(category)
  );

  categoryMatches.forEach(match => {
    const m1Name = getComparisonName(match.team1);
    const m2Name = getComparisonName(match.team2);
    
    const t1 = table.find(t => getComparisonName(t.name) === m1Name);
    const t2 = table.find(t => getComparisonName(t.name) === m2Name);
    
    if (t1 && t2) {
      t1.p++; t2.p++;
      t1.gf += (match.score1 || 0); t1.ga += (match.score2 || 0);
      t2.gf += (match.score2 || 0); t2.ga += (match.score1 || 0);
      
      const s1 = match.score1 || 0;
      const s2 = match.score2 || 0;

      if (sportId === 'basketball') {
        // Basketball: Win = 2, Loss = 1, Draw = 1 (rare but handled)
        if (s1 > s2) {
          t1.w++; t2.l++;
          t1.pts += 2; t2.pts += 1;
          t1.form.push('W'); t2.form.push('L');
        } else if (s1 < s2) {
          t2.w++; t1.l++;
          t2.pts += 2; t1.pts += 1;
          t1.form.push('L'); t2.form.push('W');
        } else {
          t1.d++; t2.d++;
          t1.pts += 1; t2.pts += 1;
          t1.form.push('D'); t2.form.push('D');
        }
      } else if (sportId === 'volleyball') {
        // Volleyball: FIVB 3-point system based on sets won/lost
        if (s1 > s2) {
          t1.w++; t2.l++;
          t1.form.push('W'); t2.form.push('L');
          const isTightWin = (s1 === 3 && s2 === 2) || (s1 === 2 && s2 === 1);
          if (isTightWin) {
            t1.pts += 2;
            t2.pts += 1;
          } else {
            t1.pts += 3;
            t2.pts += 0;
          }
        } else if (s1 < s2) {
          t2.w++; t1.l++;
          t1.form.push('L'); t2.form.push('W');
          const isTightWin = (s2 === 3 && s1 === 2) || (s2 === 2 && s1 === 1);
          if (isTightWin) {
            t2.pts += 2;
            t1.pts += 1;
          } else {
            t2.pts += 3;
            t1.pts += 0;
          }
        } else {
          t1.d++; t2.d++;
          t1.pts += 1; t2.pts += 1;
          t1.form.push('D'); t2.form.push('D');
        }
      } else {
        // Standard sports (Hockey, Handball, Futsal, etc.): Win = 3, Draw = 1, Loss = 0
        if (s1 > s2) { 
          t1.w++; t2.l++; t1.pts += 3; 
          t1.form.push('W'); t2.form.push('L');
        } else if (s1 < s2) { 
          t2.w++; t1.l++; t2.pts += 3; 
          t1.form.push('L'); t2.form.push('W');
        } else { 
          t1.d++; t2.d++; t1.pts += 1; t2.pts += 1; 
          t1.form.push('D'); t2.form.push('D');
        }
      }
    }
  });

  table.forEach(t => t.gd = t.gf - t.ga);
  
  return table.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
};

/**
 * Generates WhatsApp-formatted text for final standings export.
 */
export const formatExportText = (matches: MatchRecord[]): string => {
  let text = `🏆 *RESULTADOS HOCKEY INTERCENTROS* 🏆\n\n`;
  
  const categories: Category[] = ['masculino', 'femenino'];
  categories.forEach(cat => {
    text += `*Categoría ${cat.toUpperCase()}*\n`;
    const catMatches = matches.filter(m => m.category === cat && m.played);
    if (catMatches.length === 0) {
      text += `_Sin partidos jugados_\n`;
    } else {
      catMatches.forEach(m => {
        text += `• ${m.team1} ${m.score1} - ${m.score2} ${m.team2}\n`;
      });
    }
    text += `\n`;
  });
  
  text += `Generado automáticamente por Hockey Intercentros App.`;
  return text;
};
