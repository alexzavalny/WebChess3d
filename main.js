import * as THREE from 'three';
import { defaultFEN } from './config.js';
import { buildBoard, buildSquareLookup, addBoardNotation } from './board.js';
import { createBoardEditor } from './editor.js';
import { parseFEN } from './fen.js';
import { createDragController } from './drag.js';
import { createPieceManager } from './pieces.js';
import { addLights, createCamera, createControls, createRenderer, createScene, resizeRenderer } from './scene.js';

const canvas = document.getElementById('scene');
const fenInput = document.getElementById('fen-input');
const loadBtn = document.getElementById('load-btn');
const resetBtn = document.getElementById('reset-btn');
const editBtn = document.getElementById('edit-btn');
const statusEl = document.getElementById('status');
const modal = document.getElementById('editor-modal');
const modalCloseBtn = document.getElementById('editor-close');
const editorClearBtn = document.getElementById('editor-clear');
const editorStartBtn = document.getElementById('editor-start');
const editorApplyBtn = document.getElementById('editor-apply');
const editorBoardContainer = document.getElementById('editor-board');

const fenFromUrl = new URL(window.location.href).searchParams.get('fen');
const initialFen = fenFromUrl && fenFromUrl.trim() ? fenFromUrl.trim() : defaultFEN;
fenInput.value = initialFen;

const renderer = createRenderer(canvas);
const scene = createScene();
const camera = createCamera(canvas);
const controls = createControls(camera, canvas);
resizeRenderer(renderer, camera, canvas);

addLights(scene);

const boardGroup = buildBoard();
scene.add(boardGroup);

const notationGroup = new THREE.Group();
scene.add(notationGroup);

const squareCenters = buildSquareLookup();
const pieceManager = createPieceManager(squareCenters);
scene.add(pieceManager.group);

const dragController = createDragController({
  canvas,
  camera,
  controls,
  piecesGroup: pieceManager.group,
  squareFromWorld: pieceManager.squareFromWorld,
  movePieceToSquare: pieceManager.movePieceToSquare,
});

addBoardNotation(notationGroup);
loadPosition(initialFen);

const boardEditor = createBoardEditor({
  modal,
  closeBtn: modalCloseBtn,
  clearBtn: editorClearBtn,
  startBtn: editorStartBtn,
  applyBtn: editorApplyBtn,
  boardContainer: editorBoardContainer,
  fenInput,
  setStatus,
  loadPosition,
});

loadBtn.addEventListener('click', () => loadPosition(fenInput.value));
resetBtn.addEventListener('click', () => {
  controls.reset();
  setStatus('Camera reset', false);
});
editBtn.addEventListener('click', boardEditor.open);

canvas.addEventListener('pointerdown', dragController.onPointerDown);
window.addEventListener('pointermove', dragController.onPointerMove);
window.addEventListener('pointerup', dragController.onPointerUp);
window.addEventListener('resize', onResize);
window.addEventListener('keydown', onKeyDown);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

function loadPosition(fen) {
  const fenString = fen && fen.trim() ? fen.trim() : defaultFEN;
  try {
    const parsed = parseFEN(fenString);
    dragController.cancelDrag();
    pieceManager.loadPieces(parsed);
    fenInput.value = fenString;
    updateFenQueryParam(fenString);
    setStatus('Position loaded', false);
  } catch (error) {
    setStatus(error.message || 'Invalid FEN', true);
  }
}

function updateFenQueryParam(fen) {
  if (!fen) return;
  const url = new URL(window.location.href);
  url.searchParams.set('fen', fen);
  window.history.replaceState(null, '', url);
}

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', Boolean(isError));
}

function onResize() {
  resizeRenderer(renderer, camera, canvas);
  boardEditor.resize();
}

function onKeyDown(event) {
  if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
    boardEditor.close();
  }
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
