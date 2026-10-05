import jsPDF from 'jspdf';
import { Team, Category } from '../types';

/**
 * Generates landscape PDF templates for printing and filling by hand.
 * Content depends on the current teams/groups from Firestore (post-shuffle).
 */

const C = {
  dark: [15, 23, 42] as number[],
  muted: [100, 116, 139] as number[],
  light: [241, 245, 249] as number[],
  white: [255, 255, 255] as number[],
  primary: [37, 99, 235] as number[],
  blueA: [59, 130, 246] as number[],
  redB: [220, 38, 38] as number[],
  border: [203, 213, 225] as number[],
};

export function generatePrintableTemplates(category: Category, teams: Team[]) {
  const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
  const W = pdf.internal.pageSize.getWidth(); // ~297
  const H = pdf.internal.pageSize.getHeight(); // ~210
  const MG = 12;
  let y = MG;

  const sc = (c: number[]) => pdf.setTextColor(c[0], c[1], c[2]);
  const sf = (c: number[]) => pdf.setFillColor(c[0], c[1], c[2]);
  const sd = (c: number[]) => pdf.setDrawColor(c[0], c[1], c[2]);
  const tW = W - MG * 2;

  const groupA = teams.filter(t => t.group === 'A' && !t.isRest);
  const groupB = teams.filter(t => t.group === 'B' && !t.isRest);

  const catLabel = category === 'masculino' ? 'MASCULINA' : 'FEMENINA';

  // ── Helper: page header ──
  const drawPageHeader = (subtitle: string) => {
    sf(C.dark);
    pdf.rect(0, 0, W, 18, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    sc(C.white);
    pdf.text(`INTERCENTROS 2026 — ${catLabel}`, MG, 8);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    sc([148, 163, 184]);
    pdf.text(subtitle, MG, 14.5);
    sf(C.primary);
    pdf.rect(0, 18, W, 1.5, 'F');
    y = 26;
  };

  const drawPageFooter = () => {
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'italic');
    sc(C.muted);
    pdf.text('Hockey Intercentros 2026 — Plantilla para rellenar a mano', W / 2, H - 4, { align: 'center' });
  };

  // Build round-robin matchups (same logic as schedule.ts)
  const matchups = [
    [[0, 5], [1, 4], [2, 3]], // J1
    [[5, 3], [4, 2], [0, 1]], // J2
    [[1, 5], [2, 0], [3, 4]], // J3
    [[5, 4], [0, 3], [1, 2]], // J4
    [[2, 5], [3, 1], [4, 0]]  // J5
  ];

  // ═══════════════════════════════════════════════════════
  // PAGE 1 & 2: LIGUILLA — Partidos por jornada
  // ═══════════════════════════════════════════════════════
  const drawGroupMatches = (groupTeams: Team[], groupLabel: string, accent: number[]) => {
    drawPageHeader(`FASE DE GRUPOS — ${groupLabel} — Partidos`);

    const ROW_H = 8.5;
    const COL_TEAM = 70;
    const COL_SCORE = 30;

    matchups.forEach((round, rIdx) => {
      if (y + 8 + round.length * ROW_H > H - 10) {
        drawPageFooter();
        pdf.addPage();
        drawPageHeader(`FASE DE GRUPOS — ${groupLabel} — Partidos (cont.)`);
      }

      // Round header
      sf(accent);
      pdf.rect(MG, y, tW, 7, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      sc(C.white);
      pdf.text(`JORNADA ${rIdx + 1}`, MG + 4, y + 5);
      sc(C.white);
      pdf.text('EQUIPO LOCAL', MG + 30, y + 5);
      pdf.text('RESULTADO', MG + COL_TEAM + 12, y + 5);
      pdf.text('EQUIPO VISITANTE', MG + COL_TEAM + COL_SCORE + 20, y + 5);
      y += 7;

      round.forEach((pair, pIdx) => {
        const t1 = groupTeams[pair[0]];
        const t2 = groupTeams[pair[1]];
        if (!t1 || !t2) return;

        const isRest = t1.isRest || t2.isRest;
        sf(pIdx % 2 === 0 ? C.light : C.white);
        pdf.rect(MG, y, tW, ROW_H, 'F');

        pdf.setFontSize(9);
        pdf.setFont('helvetica', isRest ? 'italic' : 'bold');
        sc(isRest ? C.muted : C.dark);
        pdf.text(t1.name, MG + 30, y + 6);

        pdf.setFont('helvetica', isRest ? 'italic' : 'bold');
        pdf.text(t2.name, MG + COL_TEAM + COL_SCORE + 20, y + 6);

        // Score box (empty, for writing by hand)
        if (!isRest) {
          sd(C.border);
          pdf.setLineWidth(0.5);
          const boxX = MG + COL_TEAM + 8;
          const boxY = y + 1.5;
          const boxW = COL_SCORE;
          const boxH = ROW_H - 3;
          pdf.rect(boxX, boxY, boxW, boxH);
          // Dash in middle
          sc(C.muted);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text('-', boxX + boxW / 2, boxY + boxH / 2 + 1.2, { align: 'center' });
        }

        y += ROW_H;
      });

      y += 4;
    });

    drawPageFooter();
  };

  drawGroupMatches(groupA, 'GRUPO A', C.blueA);
  pdf.addPage();
  drawGroupMatches(groupB, 'GRUPO B', C.redB);

  // ═══════════════════════════════════════════════════════
  // PAGE 3 & 4: CLASIFICACIÓN — Tablas vacías por grupo
  // ═══════════════════════════════════════════════════════
  pdf.addPage();
  drawPageHeader('CLASIFICACIÓN — TABLAS DE GRUPO');

  const drawClassTable = (groupTeams: Team[], label: string, accent: number[], startX: number, tableW: number) => {
    const ROW_H = 9;
    const headers = ['POS', 'EQUIPO', 'PTS', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG'];
    const colWidths = [10, tableW - 90, 10, 10, 10, 10, 10, 10, 10, 10];

    // Title
    sf(accent);
    pdf.rect(startX, y, tableW, 7, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    sc(C.white);
    pdf.text(label, startX + 4, y + 5);

    let cy = y + 7;

    // Header row
    sf(C.dark);
    pdf.rect(startX, cy, tableW, 7, 'F');
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'bold');
    sc(C.white);
    let cx = startX;
    headers.forEach((h, i) => {
      const align = i <= 1 ? 'left' : 'center';
      const tx = i <= 1 ? cx + 2 : cx + colWidths[i] / 2;
      pdf.text(h, tx, cy + 5, { align: align as any });
      cx += colWidths[i];
    });
    cy += 7;

    // Team rows (empty)
    const nonRestTeams = groupTeams.filter(t => !t.isRest);
    nonRestTeams.forEach((t, idx) => {
      sf(idx % 2 === 0 ? C.light : C.white);
      pdf.rect(startX, cy, tableW, ROW_H, 'F');
      sd(C.border);
      pdf.setLineWidth(0.2);
      pdf.rect(startX, cy, tableW, ROW_H);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      sc(C.muted);
      pdf.text(`${idx + 1}`, startX + 4, cy + 6.5);

      sc(C.dark);
      pdf.text(t.name, startX + 12, cy + 6.5);

      // Empty cells with borders
      let cellX = startX + colWidths[0] + colWidths[1];
      for (let i = 2; i < headers.length; i++) {
        sd(C.border);
        pdf.rect(cellX, cy, colWidths[i], ROW_H);
        cellX += colWidths[i];
      }

      cy += ROW_H;
    });
  };

  const halfTableW = (tW - 10) / 2;
  const savedY = y;
  drawClassTable(groupA, 'GRUPO A', C.blueA, MG, halfTableW);
  y = savedY;
  drawClassTable(groupB, 'GRUPO B', C.redB, MG + halfTableW + 10, halfTableW);
  drawPageFooter();

  // ═══════════════════════════════════════════════════════
  // PAGE 5: BRACKET — Cuartos → Semis → Final
  // ═══════════════════════════════════════════════════════
  pdf.addPage();
  drawPageHeader('CUADRO DE ELIMINATORIAS');

  const drawBracketBox = (label: string, t1: string, t2: string, x: number, bY: number, w: number) => {
    const boxH = 20;
    // Label
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    sc(C.muted);
    pdf.text(label, x + 2, bY - 1);

    // Box
    sf(C.white);
    sd(C.dark);
    pdf.setLineWidth(0.5);
    pdf.rect(x, bY, w, boxH);

    // Team 1
    sf(C.light);
    pdf.rect(x, bY, w, boxH / 2, 'F');
    sd(C.dark);
    pdf.rect(x, bY, w, boxH / 2);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    sc(C.dark);
    pdf.text(t1, x + 3, bY + 6);
    // Score box
    sd(C.border);
    pdf.rect(x + w - 16, bY + 2, 13, 6);

    // Team 2
    pdf.rect(x, bY + boxH / 2, w, boxH / 2);
    pdf.text(t2, x + 3, bY + boxH / 2 + 6);
    pdf.rect(x + w - 16, bY + boxH / 2 + 2, 13, 6);
  };

  const bW = 54; // box width
  const colSpacing = 14;
  const startBY = 36;

  // Column positions
  const col1X = MG;
  const col2X = MG + bW + colSpacing;
  const col3X = MG + (bW + colSpacing) * 2;
  const col4X = MG + (bW + colSpacing) * 3;

  // Quarters (column 1)
  drawBracketBox('CUARTOS 1 — 1ºA vs 4ºB',
    `1ºA: _______________`, `4ºB: _______________`, col1X, startBY, bW);
  drawBracketBox('CUARTOS 2 — 2ºB vs 3ºA',
    `2ºB: _______________`, `3ºA: _______________`, col1X, startBY + 34, bW);
  drawBracketBox('CUARTOS 3 — 1ºB vs 4ºA',
    `1ºB: _______________`, `4ºA: _______________`, col1X, startBY + 68, bW);
  drawBracketBox('CUARTOS 4 — 2ºA vs 3ºB',
    `2ºA: _______________`, `3ºB: _______________`, col1X, startBY + 102, bW);

  // Connector lines
  sd(C.muted);
  pdf.setLineWidth(0.4);
  // Q1->S1
  pdf.line(col1X + bW, startBY + 10, col2X, startBY + 17 + 10);
  // Q2->S1
  pdf.line(col1X + bW, startBY + 34 + 10, col2X, startBY + 17 + 10);
  // Q3->S2
  pdf.line(col1X + bW, startBY + 68 + 10, col2X, startBY + 85 + 10);
  // Q4->S2
  pdf.line(col1X + bW, startBY + 102 + 10, col2X, startBY + 85 + 10);

  // Semis (column 2)
  drawBracketBox('SEMIFINAL 1',
    `Gan. C1: ____________`, `Gan. C2: ____________`, col2X, startBY + 17, bW);
  drawBracketBox('SEMIFINAL 2',
    `Gan. C3: ____________`, `Gan. C4: ____________`, col2X, startBY + 85, bW);

  // S1->F, S2->F
  pdf.line(col2X + bW, startBY + 17 + 10, col3X, startBY + 51 + 10);
  pdf.line(col2X + bW, startBY + 85 + 10, col3X, startBY + 51 + 10);

  // Final (column 3)
  drawBracketBox('🏆 FINAL',
    `Gan. S1: ____________`, `Gan. S2: ____________`, col3X, startBY + 51, bW);

  // 3rd place (column 4 or below)
  drawBracketBox('3º Y 4º PUESTO',
    `Perd. S1: ___________`, `Perd. S2: ___________`, col3X, startBY + 110, bW);

  // S losers -> 3rd place
  pdf.setLineDashPattern([2, 2], 0);
  pdf.line(col2X + bW, startBY + 17 + 10, col3X, startBY + 110 + 10);
  pdf.line(col2X + bW, startBY + 85 + 10, col3X, startBY + 110 + 10);
  pdf.setLineDashPattern([], 0);

  drawPageFooter();

  // ═══════════════════════════════════════════════════════
  // PAGE 6: RANKING FINAL (blank)
  // ═══════════════════════════════════════════════════════
  pdf.addPage();
  drawPageHeader('RANKING FINAL');

  const rankY = 32;
  const ROW = 11;
  const rW = 180;
  const startRX = (W - rW) / 2;

  // Header
  sf(C.dark);
  pdf.rect(startRX, rankY, rW, 8, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  sc(C.white);
  pdf.text('POSICIÓN', startRX + 4, rankY + 5.5);
  pdf.text('EQUIPO', startRX + 30, rankY + 5.5);
  pdf.text('PUNTOS TORNEO', startRX + rW - 30, rankY + 5.5);

  for (let i = 0; i < 12; i++) {
    const ry = rankY + 8 + i * ROW;
    sf(i % 2 === 0 ? C.light : C.white);
    pdf.rect(startRX, ry, rW, ROW, 'F');
    sd(C.border);
    pdf.setLineWidth(0.2);
    pdf.rect(startRX, ry, rW, ROW);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    const posColors = [C.primary, C.primary, C.primary, C.primary];
    sc(i < 4 ? posColors[i] : C.muted);
    pdf.text(`${i + 1}º`, startRX + 8, ry + 7.5);

    // Points
    sc(C.primary);
    pdf.setFontSize(12);
    pdf.text(`${12 - i}`, startRX + rW - 15, ry + 7.8);

    // Empty line for team name
    sd(C.border);
    pdf.setLineWidth(0.3);
    pdf.line(startRX + 30, ry + ROW - 2.5, startRX + rW - 40, ry + ROW - 2.5);
  }

  // Labels for top 4
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  const labels = ['CAMPEÓN', 'SUBCAMPEÓN', '3er PUESTO', '4º PUESTO'];
  labels.forEach((l, i) => {
    sc(C.primary);
    pdf.text(l, startRX + 20, rankY + 8 + i * ROW + 4);
  });

  drawPageFooter();

  pdf.save(`Plantilla_${catLabel}_Intercentros_2026.pdf`);
}
