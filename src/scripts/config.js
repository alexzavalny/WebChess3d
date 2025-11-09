export const defaultFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const files = 'abcdefgh'.split('');
export const boardConfig = {
  squareSize: 1,
  baseThickness: 0.25,
  tileThickness: 0.08,
  edgePadding: 1.2,
};
export const pieceBaseY = boardConfig.baseThickness + boardConfig.tileThickness;
export const pieceHoverLift = 0.4;
export const tableSurfaceY = 0;
