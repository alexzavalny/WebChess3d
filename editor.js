import { buildFenFromPlacement, extractPlacementFromFen } from './fen.js';

export function createBoardEditor({
  modal,
  closeBtn,
  clearBtn,
  startBtn,
  applyBtn,
  boardContainer,
  fenInput,
  setStatus,
  loadPosition,
}) {
  let editorBoard = null;

  const ensureEditorBoard = () => {
    if (editorBoard) return true;
    if (typeof window === 'undefined' || !window.Chessboard) {
      setStatus?.('Editor failed to load. Check your connection.', true);
      return false;
    }
    editorBoard = window.Chessboard(boardContainer || 'editor-board', {
      draggable: true,
      sparePieces: true,
      dropOffBoard: 'trash',
      appearSpeed: 150,
      moveSpeed: 100,
      snapSpeed: 80,
      snapbackSpeed: 60,
    });
    return true;
  };

  const open = () => {
    if (!ensureEditorBoard()) {
      return;
    }
    const placement = extractPlacementFromFen(fenInput.value);
    if (placement === 'start') {
      editorBoard.start(false);
    } else {
      editorBoard.position(placement, false);
    }
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => editorBoard?.resize(), 50);
  };

  const close = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  const apply = () => {
    if (!ensureEditorBoard()) return;
    const placement = editorBoard.fen();
    const nextFen = buildFenFromPlacement(placement, fenInput.value);
    fenInput.value = nextFen;
    loadPosition(nextFen);
    close();
  };

  const handleClear = () => {
    if (!ensureEditorBoard()) return;
    editorBoard?.clear(true);
  };

  const handleStart = () => {
    if (!ensureEditorBoard()) return;
    editorBoard?.start(true);
  };

  const resize = () => {
    if (!editorBoard || modal.classList.contains('hidden')) return;
    editorBoard.resize();
  };

  closeBtn?.addEventListener('click', close);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
      close();
    }
  });
  clearBtn?.addEventListener('click', handleClear);
  startBtn?.addEventListener('click', handleStart);
  applyBtn?.addEventListener('click', apply);

  return {
    open,
    close,
    ensureEditorBoard,
    resize,
  };
}
