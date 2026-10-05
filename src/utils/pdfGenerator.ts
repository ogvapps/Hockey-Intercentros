import jsPDF from 'jspdf';
import { MatchRecord, Category, StandingTeam, Team } from '../types';
import { getMatchWinner, getMatchLoser } from './match';
import { getComparisonName } from './standings';

const C = {
  dark: [15, 23, 42],
  primary: [37, 99, 235],
  muted: [100, 116, 139],
  light: [241, 245, 249],
  white: [255, 255, 255],
  gold: [234, 179, 8],
  silver: [148, 163, 184],
  bronze: [180, 83, 9],
  red: [239, 68, 68],
  green: [34, 197, 94],
  blueA: [59, 130, 246],
  redB: [220, 38, 38],
};

function findPlayoffMatch(matches: MatchRecord[], category: Category, t1?: string, t2?: string) {
  if (!t1 || !t2) return undefined;
  const c1 = getComparisonName(t1), c2 = getComparisonName(t2);
  return matches.find(m => {
    if (m.group !== 'PLAYOFF' || !m.played || m.category !== category) return false;
    const m1 = getComparisonName(m.team1), m2 = getComparisonName(m.team2);
    return (m1 === c1 && m2 === c2) || (m1 === c2 && m2 === c1);
  });
}

function scoreStr(m?: MatchRecord) {
  if (!m || !m.played) return '—';
  let s = `${m.score1} - ${m.score2}`;
  if (m.penaltyScore1 !== undefined && m.penaltyScore2 !== undefined)
    s += ` (P: ${m.penaltyScore1}-${m.penaltyScore2})`;
  return s;
}

export function generateTournamentPDF(
  category: Category,
  teams: Team[],
  matches: MatchRecord[],
  standings: StandingTeam[]
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const MG = 15;
  let y = MG;

  const setColor = (c: number[]) => pdf.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: number[]) => pdf.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: number[]) => pdf.setDrawColor(c[0], c[1], c[2]);
  const tW = W - MG * 2; // usable table width

  const addFooter = () => {
    setFill([226, 232, 240]);
    pdf.rect(0, H - 10, W, 10, 'F');
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'italic');
    setColor(C.muted);
    pdf.text('Hockey Intercentros 2026 — ogonzalezv01@educarex.es', W / 2, H - 4, { align: 'center' });
  };

  const checkPage = (needed: number) => {
    if (y + needed > H - 14) {
      addFooter();
      pdf.addPage();
      y = MG;
    }
  };

  const drawSectionTitle = (title: string, accent: number[]) => {
    checkPage(14);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    setColor(C.dark);
    pdf.text(title, MG, y);
    y += 3;
    setFill(accent);
    pdf.rect(MG, y, 36, 1.2, 'F');
    y += 7;
  };

  // ════════════════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════════════════
  setFill(C.dark);
  pdf.rect(0, 0, W, 36, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  setColor(C.white);
  pdf.text('INTERCENTROS 2026', MG, 16);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  setColor(C.silver);
  pdf.text(`Informe Oficial — Categoría ${category === 'masculino' ? 'Masculina' : 'Femenina'}`, MG, 26);
  setFill(C.primary);
  pdf.rect(0, 36, W, 2, 'F');
  y = 48;

  // Precompute data
  const groupA = standings.filter(t => t.group === 'A' && !t.isRest);
  const groupB = standings.filter(t => t.group === 'B' && !t.isRest);
  const groupMatches = matches.filter(m =>
    m.category === category && m.played && m.group !== 'PLAYOFF' && m.id.startsWith(category)
  );
  const groupAMatches = groupMatches.filter(m => m.group === 'A');
  const groupBMatches = groupMatches.filter(m => m.group === 'B');

  // ════════════════════════════════════════════════════
  // 1. LIGUILLA — Resultados de partidos
  // ════════════════════════════════════════════════════
  drawSectionTitle('FASE DE GRUPOS — RESULTADOS', C.primary);

  const drawMatchList = (title: string, matchList: MatchRecord[], accent: number[]) => {
    checkPage(12);
    // Sub-header
    setFill(accent);
    pdf.rect(MG, y, tW, 7, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    setColor(C.white);
    pdf.text(title, MG + 4, y + 5);
    pdf.text('RESULTADO', MG + tW - 4, y + 5, { align: 'right' });
    y += 7;

    // Sort by round then by id
    const sorted = [...matchList].sort((a, b) => (a.round || 0) - (b.round || 0) || a.id.localeCompare(b.id));

    let lastRound = -1;
    sorted.forEach((m, idx) => {
      checkPage(8);
      if (m.round && m.round !== lastRound) {
        lastRound = m.round;
        setFill([226, 232, 240]);
        pdf.rect(MG, y, tW, 5.5, 'F');
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        setColor(C.muted);
        pdf.text(`JORNADA ${m.round}`, MG + 4, y + 4);
        y += 5.5;
      }

      const isEven = idx % 2 === 0;
      setFill(isEven ? C.light : C.white);
      pdf.rect(MG, y, tW, 6.5, 'F');

      const winner = getMatchWinner(m);
      pdf.setFontSize(7.5);

      // Team 1
      pdf.setFont('helvetica', m.team1 === winner ? 'bold' : 'normal');
      setColor(m.team1 === winner ? C.dark : C.muted);
      pdf.text(m.team1 || '?', MG + 4, y + 4.5);

      // "vs"
      pdf.setFont('helvetica', 'normal');
      setColor(C.muted);
      pdf.text('vs', MG + tW / 2, y + 4.5, { align: 'center' });

      // Team 2
      pdf.setFont('helvetica', m.team2 === winner ? 'bold' : 'normal');
      setColor(m.team2 === winner ? C.dark : C.muted);
      const t2x = MG + tW / 2 + 8;
      pdf.text(m.team2 || '?', t2x, y + 4.5);

      // Score
      pdf.setFont('helvetica', 'bold');
      setColor(C.primary);
      pdf.text(scoreStr(m), MG + tW - 4, y + 4.5, { align: 'right' });

      y += 6.5;
    });

    // Border
    setDraw(accent);
    pdf.setLineWidth(0.4);
    y += 4;
  };

  drawMatchList('GRUPO A', groupAMatches, C.blueA);
  drawMatchList('GRUPO B', groupBMatches, C.redB);

  // ════════════════════════════════════════════════════
  // 2. CLASIFICACIÓN — Tablas de grupo
  // ════════════════════════════════════════════════════
  drawSectionTitle('CLASIFICACIÓN POR GRUPOS', C.green);

  const drawGroupTable = (title: string, group: StandingTeam[], accent: number[]) => {
    checkPage(14 + group.length * 7);
    // Sub-title
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    setColor(C.dark);
    pdf.text(title, MG, y);
    y += 2;
    setFill(accent);
    pdf.rect(MG, y, 20, 1, 'F');
    y += 4;

    // Header
    setFill(C.dark);
    pdf.rect(MG, y, tW, 7, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    setColor(C.white);
    const cols = [MG + 4, MG + 14, MG + 82, MG + 97, MG + 110, MG + 123, MG + 136, MG + 150];
    ['POS', 'EQUIPO', 'PTS', 'PJ', 'PG', 'PE', 'GF', 'GC'].forEach((h, i) => pdf.text(h, cols[i], y + 5));
    y += 7;

    group.forEach((t, idx) => {
      setFill(idx % 2 === 0 ? C.light : C.white);
      pdf.rect(MG, y, tW, 7, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      setColor(C.muted);
      pdf.text(`${idx + 1}`, cols[0], y + 5);
      setColor(C.dark);
      pdf.setFont('helvetica', idx < 4 ? 'bold' : 'normal');
      pdf.text(t.name, cols[1], y + 5);
      pdf.setFont('helvetica', 'bold');
      setColor(C.primary);
      pdf.text(`${t.pts}`, cols[2], y + 5);
      setColor(C.dark);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${t.p}`, cols[3], y + 5);
      pdf.text(`${t.w}`, cols[4], y + 5);
      pdf.text(`${t.d}`, cols[5], y + 5);
      pdf.text(`${t.gf}`, cols[6], y + 5);
      pdf.text(`${t.ga}`, cols[7], y + 5);
      y += 7;
    });

    setDraw(C.dark);
    pdf.setLineWidth(0.4);
    pdf.rect(MG, y - group.length * 7 - 7, tW, group.length * 7 + 7);
    y += 8;
  };

  drawGroupTable('GRUPO A', groupA, C.blueA);
  drawGroupTable('GRUPO B', groupB, C.redB);

  // ════════════════════════════════════════════════════
  // 3. FINALES — Eliminatorias
  // ════════════════════════════════════════════════════
  drawSectionTitle('ELIMINATORIAS', C.red);

  const q1 = findPlayoffMatch(matches, category, groupA[0]?.name, groupB[3]?.name);
  const q2 = findPlayoffMatch(matches, category, groupB[1]?.name, groupA[2]?.name);
  const q3 = findPlayoffMatch(matches, category, groupB[0]?.name, groupA[3]?.name);
  const q4 = findPlayoffMatch(matches, category, groupA[1]?.name, groupB[2]?.name);
  const s1 = findPlayoffMatch(matches, category, getMatchWinner(q1)!, getMatchWinner(q2)!);
  const s2 = findPlayoffMatch(matches, category, getMatchWinner(q3)!, getMatchWinner(q4)!);
  const fin = findPlayoffMatch(matches, category, getMatchWinner(s1)!, getMatchWinner(s2)!);
  const t3p = findPlayoffMatch(matches, category, getMatchLoser(s1)!, getMatchLoser(s2)!);

  const drawMatchBox = (label: string, match: MatchRecord | undefined, x: number, w: number) => {
    checkPage(22);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    setColor(C.muted);
    pdf.text(label, x + 2, y + 4);

    setFill(C.light);
    setDraw([203, 213, 225]);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y + 5, w, 14, 2, 2, 'FD');

    if (match && match.played) {
      const winner = getMatchWinner(match);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', match.team1 === winner ? 'bold' : 'normal');
      setColor(match.team1 === winner ? C.dark : C.muted);
      pdf.text(match.team1 || 'TBD', x + 3, y + 11);
      pdf.setFont('helvetica', match.team2 === winner ? 'bold' : 'normal');
      setColor(match.team2 === winner ? C.dark : C.muted);
      pdf.text(match.team2 || 'TBD', x + 3, y + 17);
      pdf.setFont('helvetica', 'bold');
      setColor(C.primary);
      pdf.text(scoreStr(match), x + w - 3, y + 14, { align: 'right' });
    } else {
      pdf.setFontSize(8);
      setColor(C.muted);
      pdf.text('No jugado', x + w / 2, y + 14, { align: 'center' });
    }
  };

  const halfW = (tW - 6) / 2;

  // Cuartos
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); setColor(C.muted);
  pdf.text('CUARTOS DE FINAL', MG, y); y += 2;
  drawMatchBox('C1: 1ºA vs 4ºB', q1, MG, halfW);
  drawMatchBox('C2: 2ºB vs 3ºA', q2, MG + halfW + 6, halfW);
  y += 24;
  drawMatchBox('C3: 1ºB vs 4ºA', q3, MG, halfW);
  drawMatchBox('C4: 2ºA vs 3ºB', q4, MG + halfW + 6, halfW);
  y += 26;

  // Semis
  checkPage(28);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); setColor(C.muted);
  pdf.text('SEMIFINALES', MG, y); y += 2;
  drawMatchBox('SEMIFINAL 1', s1, MG, halfW);
  drawMatchBox('SEMIFINAL 2', s2, MG + halfW + 6, halfW);
  y += 26;

  // Final & 3rd
  checkPage(28);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); setColor(C.muted);
  pdf.text('FINAL Y 3º/4º PUESTO', MG, y); y += 2;
  drawMatchBox('🏆 FINAL', fin, MG, halfW);
  drawMatchBox('3º Y 4º PUESTO', t3p, MG + halfW + 6, halfW);
  y += 28;

  // ════════════════════════════════════════════════════
  // 4. RANKING FINAL
  // ════════════════════════════════════════════════════
  drawSectionTitle('RANKING FINAL', C.gold);

  const top4Names = [getMatchWinner(fin), getMatchLoser(fin), getMatchWinner(t3p), getMatchLoser(t3p)];
  const top4Ids = top4Names.filter(Boolean).map(n => {
    const t = teams.find(team => getComparisonName(team.name) === getComparisonName(n!));
    return t?.id;
  }).filter(Boolean);

  const remaining = standings
    .filter(t => !top4Ids.includes(t.id) && !t.isRest)
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

  const top4Teams = top4Names.map(n => {
    if (!n) return null;
    return standings.find(s => getComparisonName(s.name) === getComparisonName(n)) || null;
  });

  const finalRanking = [...top4Teams, ...remaining].filter(Boolean).slice(0, 12) as StandingTeam[];

  // Table header
  checkPage(10 + finalRanking.length * 8);
  setFill(C.dark);
  pdf.rect(MG, y, tW, 8, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  setColor(C.white);
  pdf.text('POS', MG + 4, y + 5.5);
  pdf.text('EQUIPO', MG + 20, y + 5.5);
  pdf.text('PTS TORNEO', MG + tW - 22, y + 5.5);
  y += 8;

  finalRanking.forEach((team, idx) => {
    checkPage(9);
    setFill(idx % 2 === 0 ? C.light : C.white);
    pdf.rect(MG, y, tW, 8, 'F');

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const posColor = idx === 0 ? C.gold : idx === 1 ? C.silver : idx === 2 ? C.bronze : C.muted;
    setColor(posColor);
    pdf.text(`${idx + 1}º`, MG + 4, y + 5.5);

    setColor(C.dark);
    pdf.setFont('helvetica', idx < 4 ? 'bold' : 'normal');
    pdf.text(team.name || 'TBD', MG + 20, y + 5.5);

    pdf.setFont('helvetica', 'bold');
    setColor(C.primary);
    pdf.setFontSize(12);
    pdf.text(`${12 - idx}`, MG + tW - 12, y + 5.8);
    y += 8;
  });

  setDraw(C.dark);
  pdf.setLineWidth(0.5);
  pdf.rect(MG, y - finalRanking.length * 8 - 8, tW, finalRanking.length * 8 + 8);

  // Footer on last page
  addFooter();

  pdf.save(`Intercentros_2026_${category}.pdf`);
}
