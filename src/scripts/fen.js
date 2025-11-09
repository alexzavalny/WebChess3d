import { files } from './config.js';

export function parseFEN(fen) {
  if (!fen || typeof fen !== 'string') {
    throw new Error('FEN string required');
  }
  const [placement] = fen.trim().split(/\s+/);
  if (!placement) {
    throw new Error('Missing piece placement data');
  }
  const rows = placement.split('/');
  if (rows.length !== 8) {
    throw new Error('FEN must contain 8 ranks');
  }

  const result = [];
  rows.forEach((row, rowIndex) => {
    let fileIndex = 0;
    for (const char of row) {
      if (/[1-8]/.test(char)) {
        fileIndex += Number(char);
      } else {
        if (!/[prnbqkPRNBQK]/.test(char)) {
          throw new Error(`Unexpected symbol "${char}"`);
        }
        if (fileIndex > 7) {
          throw new Error('Too many files in rank');
        }
        const color = char === char.toUpperCase() ? 'w' : 'b';
        const type = char.toLowerCase();
        const rankIndex = 7 - rowIndex;
        const square = `${files[fileIndex]}${rankIndex + 1}`;
        result.push({ square, type, color });
        fileIndex += 1;
      }
    }
    if (fileIndex !== 8) {
      throw new Error(`Rank ${8 - rowIndex} does not have 8 files`);
    }
  });
  return result;
}

export function extractPlacementFromFen(fen) {
  const placement = fen?.trim().split(/\s+/)[0];
  if (!placement || placement === 'start') {
    return 'start';
  }
  return placement;
}

export function buildFenFromPlacement(placement, currentFen) {
  const rest = currentFen?.trim().split(/\s+/).slice(1);
  const defaults = ['w', '-', '-', '0', '1'];
  const merged = defaults.map((def, index) => rest?.[index] ?? def);
  return [placement || '8/8/8/8/8/8/8/8', ...merged].join(' ');
}
