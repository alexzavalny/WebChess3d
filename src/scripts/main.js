import * as THREE from 'three';
import { defaultFEN } from './config.js';
import { buildBoard, buildSquareLookup, addBoardNotation } from './board.js';
import { createBoardEditor } from './editor.js';
import { parseFEN } from './fen.js';
import { createDragController } from './drag.js';
import { createPieceManager } from './pieces.js';
import { addLights, createCamera, createControls, createRenderer, createScene, resizeRenderer } from './scene.js';
import { createEnvironment } from './environment.js';

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
const environmentToggle = document.getElementById('env-toggle');
const viewport = document.querySelector('.viewport');
const appShell = document.getElementById('app-shell');
const sidebar = document.querySelector('.controls');
const sidebarToggle = document.getElementById('sidebar-toggle');

const fenFromUrl = new URL(window.location.href).searchParams.get('fen');
const initialFen = fenFromUrl && fenFromUrl.trim() ? fenFromUrl.trim() : defaultFEN;
fenInput.value = initialFen;

const renderer = createRenderer(canvas);
const scene = createScene();
const defaultSceneBackground = scene.background;
const camera = createCamera(canvas);
const controls = createControls(camera, canvas);
resizeRenderer(renderer, camera, canvas);

addLights(scene);

const environment = createEnvironment();
scene.add(environment);
const updateEnvironmentVisibility = environment.userData?.updateVisibility;
applyEnvironmentVisibility();

if (environmentToggle) {
  environmentToggle.addEventListener('change', () => {
    applyEnvironmentVisibility();
    if (environment.visible && updateEnvironmentVisibility) {
      updateEnvironmentVisibility(camera);
    }
    setStatus(environment.visible ? 'Environment enabled' : 'Environment hidden', false);
  });
}

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
  dropPieceOffBoard: pieceManager.dropPieceOffBoard,
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
sidebarToggle?.addEventListener('click', () => {
  if (!appShell || !sidebar) return;
  const shouldCollapse = !appShell.classList.contains('sidebar-collapsed');
  appShell.classList.toggle('sidebar-collapsed', shouldCollapse);
  const expanded = !shouldCollapse;
  sidebar.setAttribute('aria-expanded', String(expanded));
  sidebarToggle.setAttribute('aria-expanded', String(expanded));
  onResize();
});

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

let lastTime = null;
function animate(time) {
  requestAnimationFrame(animate);
  const delta = lastTime === null ? 0 : (time - lastTime) / 1000;
  lastTime = time;
  controls.update();
  pieceManager.update(delta);
  if (updateEnvironmentVisibility && environment.visible) {
    updateEnvironmentVisibility(camera);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

function applyEnvironmentVisibility() {
  const visible = environmentToggle ? environmentToggle.checked : true;
  environment.visible = visible;
  if (visible) {
    if (defaultSceneBackground) {
      scene.background = defaultSceneBackground;
    }
    renderer.setClearAlpha(1);
    viewport?.classList.remove('gradient-bg');
  } else {
    scene.background = null;
    renderer.setClearAlpha(0);
    viewport?.classList.add('gradient-bg');
  }
}
