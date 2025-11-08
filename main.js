import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const defaultFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const files = 'abcdefgh'.split('');
const boardConfig = {
  squareSize: 1,
  baseThickness: 0.25,
  tileThickness: 0.08,
};
const pieceBaseY = boardConfig.baseThickness + boardConfig.tileThickness;

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
fenInput.value = defaultFEN;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050710);

const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(6.5, 8, 6.5);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, pieceBaseY, 0);
controls.saveState();
resizeRenderer();

addLights();

const boardGroup = buildBoard();
scene.add(boardGroup);

const piecesGroup = new THREE.Group();
scene.add(piecesGroup);

const squareCenters = buildSquareLookup();
const piecesBySquare = new Map();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -pieceBaseY);
const dragIntersection = new THREE.Vector3();
const dragOffset = new THREE.Vector3();
let activePiece = null;
let dragStartSquare = null;
let editorBoard = null;

loadPosition(defaultFEN);

loadBtn.addEventListener('click', () => loadPosition(fenInput.value));
resetBtn.addEventListener('click', () => {
  controls.reset();
  setStatus('Camera reset', false);
});
editBtn.addEventListener('click', openEditor);
modalCloseBtn.addEventListener('click', closeEditor);
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeEditor();
  }
});
editorClearBtn.addEventListener('click', () => {
  ensureEditorBoard();
  editorBoard?.clear(true);
});
editorStartBtn.addEventListener('click', () => {
  ensureEditorBoard();
  editorBoard?.start(true);
});
editorApplyBtn.addEventListener('click', applyEditorPosition);

canvas.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('resize', onResize);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
    closeEditor();
  }
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

function addLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xfafafa, 0x11172a, 0.6);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(6, 10, 4);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.near = 2;
  dir.shadow.camera.far = 30;
  dir.shadow.camera.left = -8;
  dir.shadow.camera.right = 8;
  dir.shadow.camera.top = 8;
  dir.shadow.camera.bottom = -8;
  scene.add(dir);
}

function buildBoard() {
  const group = new THREE.Group();
  const boardSize = boardConfig.squareSize * 8;

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1f2c,
    roughness: 0.6,
    metalness: 0.2,
  });
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(boardSize + 0.4, boardConfig.baseThickness, boardSize + 0.4),
    baseMaterial,
  );
  base.receiveShadow = true;
  base.position.y = boardConfig.baseThickness / 2;
  group.add(base);

  const lightMat = new THREE.MeshStandardMaterial({ color: 0xf0d9b5, roughness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0xb58863, roughness: 0.5 });

  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const tileGeo = new THREE.BoxGeometry(
        boardConfig.squareSize,
        boardConfig.tileThickness,
        boardConfig.squareSize,
      );
      const material = (file + rank) % 2 === 0 ? lightMat : darkMat;
      const tile = new THREE.Mesh(tileGeo, material);
      tile.receiveShadow = true;
      tile.position.set(
        (file - 3.5) * boardConfig.squareSize,
        boardConfig.baseThickness + boardConfig.tileThickness / 2,
        (7 - rank - 3.5) * boardConfig.squareSize,
      );
      group.add(tile);
    }
  }

  return group;
}

function buildSquareLookup() {
  const map = new Map();
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = `${files[file]}${rank + 1}`;
      const center = new THREE.Vector3(
        (file - 3.5) * boardConfig.squareSize,
        0,
        (7 - rank - 3.5) * boardConfig.squareSize,
      );
      map.set(square, center);
    }
  }
  return map;
}

function loadPosition(fen) {
  try {
    const parsed = parseFEN(fen);
    clearPieces();
    parsed.forEach((pieceData) => {
      const mesh = buildPiece(pieceData.type, pieceData.color);
      placePiece(mesh, pieceData.square);
    });
    setStatus('Position loaded', false);
  } catch (error) {
    setStatus(error.message || 'Invalid FEN', true);
  }
}

function clearPieces() {
  piecesGroup.clear();
  piecesBySquare.clear();
  activePiece = null;
  dragStartSquare = null;
  controls.enabled = true;
}

function parseFEN(fen) {
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

function setStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', Boolean(isError));
}

function openEditor() {
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
}

function closeEditor() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function ensureEditorBoard() {
  if (editorBoard) return true;
  if (typeof window === 'undefined' || !window.Chessboard) {
    setStatus('Editor failed to load. Check your connection.', true);
    return false;
  }
  editorBoard = window.Chessboard(editorBoardContainer || 'editor-board', {
    draggable: true,
    sparePieces: true,
    dropOffBoard: 'trash',
    appearSpeed: 150,
    moveSpeed: 100,
    snapSpeed: 80,
    snapbackSpeed: 60,
  });
  return true;
}

function extractPlacementFromFen(fen) {
  const placement = fen?.trim().split(/\s+/)[0];
  if (!placement || placement === 'start') {
    return 'start';
  }
  return placement;
}

function buildFenFromPlacement(placement) {
  const rest = fenInput.value.trim().split(/\s+/).slice(1);
  const defaults = ['w', '-', '-', '0', '1'];
  const merged = defaults.map((def, index) => rest[index] ?? def);
  return [placement || '8/8/8/8/8/8/8/8', ...merged].join(' ');
}

function applyEditorPosition() {
  if (!ensureEditorBoard()) return;
  const placement = editorBoard.fen();
  const nextFen = buildFenFromPlacement(placement);
  fenInput.value = nextFen;
  loadPosition(nextFen);
  closeEditor();
}

function buildPiece(type, color) {
  const material = new THREE.MeshStandardMaterial({
    color: color === 'w' ? 0xf8f8ff : 0x101318,
    roughness: 0.35,
    metalness: 0.15,
  });

  const group = new THREE.Group();
  group.userData = { type, color, square: null, baseY: pieceBaseY };

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 24), material);
  base.castShadow = true;
  base.receiveShadow = true;
  base.position.y = 0.06;
  group.add(base);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.3, 24), material);
  stem.castShadow = true;
  stem.position.y = 0.27;
  group.add(stem);

  switch (type) {
    case 'p': {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), material);
      head.castShadow = true;
      head.position.y = 0.52;
      group.add(head);
      break;
    }
    case 'r': {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 6), material);
      top.castShadow = true;
      top.position.y = 0.55;
      group.add(top);
      break;
    }
    case 'n': {
      const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.3, 8, 16), material);
      head.position.set(0, 0.55, 0.1);
      head.rotation.z = Math.PI / 2.3;
      head.castShadow = true;
      group.add(head);
      break;
    }
    case 'b': {
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 24), material);
      top.position.y = 0.7;
      top.castShadow = true;
      group.add(top);
      break;
    }
    case 'q': {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.35, 24), material);
      crown.position.y = 0.7;
      crown.castShadow = true;
      group.add(crown);
      const gems = new THREE.Mesh(new THREE.TetrahedronGeometry(0.15), material);
      gems.position.y = 0.95;
      gems.castShadow = true;
      group.add(gems);
      break;
    }
    case 'k':
    default: {
      const neck = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 24), material);
      neck.position.y = 0.75;
      neck.castShadow = true;
      group.add(neck);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.08), material);
      cross.position.y = 1;
      cross.castShadow = true;
      group.add(cross);
      const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), material);
      crossBar.position.y = 1.05;
      crossBar.castShadow = true;
      group.add(crossBar);
      break;
    }
  }

  return group;
}

function placePiece(mesh, square) {
  const occupant = piecesBySquare.get(square);
  if (occupant) {
    piecesBySquare.delete(square);
    piecesGroup.remove(occupant);
  }
  const center = squareCenters.get(square);
  if (!center) {
    throw new Error(`Square ${square} outside board`);
  }
  mesh.position.set(center.x, mesh.userData.baseY, center.z);
  mesh.userData.square = square;
  piecesBySquare.set(square, mesh);
  piecesGroup.add(mesh);
}

function onPointerDown(event) {
  const picked = pickPiece(event);
  if (!picked) return;
  activePiece = picked;
  controls.enabled = false;
  dragStartSquare = picked.userData.square;

  raycaster.setFromCamera(pointer, camera);
  dragPlane.constant = -pieceBaseY;
  if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
    dragOffset.copy(dragIntersection).sub(activePiece.position);
  } else {
    dragOffset.set(0, 0, 0);
  }
  event.preventDefault();
}

function pickPiece(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(piecesGroup.children, true);
  if (!intersects.length) return null;
  let { object } = intersects[0];
  while (object && object.parent !== piecesGroup) {
    object = object.parent;
  }
  return object;
}

function onPointerMove(event) {
  if (!activePiece) return;
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  dragPlane.constant = -pieceBaseY;
  if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
    activePiece.position.x = dragIntersection.x - dragOffset.x;
    activePiece.position.z = dragIntersection.z - dragOffset.z;
  }
}

function onPointerUp() {
  if (!activePiece) return;
  const snappedSquare = worldToSquare(activePiece.position);
  if (snappedSquare) {
    movePieceToSquare(activePiece, snappedSquare);
  } else {
    movePieceToSquare(activePiece, dragStartSquare);
  }
  activePiece = null;
  dragStartSquare = null;
  controls.enabled = true;
}

function movePieceToSquare(piece, square) {
  if (!square) return;
  if (piece.userData.square) {
    piecesBySquare.delete(piece.userData.square);
  }
  const occupying = piecesBySquare.get(square);
  if (occupying && occupying !== piece) {
    piecesBySquare.delete(square);
    piecesGroup.remove(occupying);
  }
  const center = squareCenters.get(square);
  piece.position.set(center.x, piece.userData.baseY, center.z);
  piece.userData.square = square;
  piecesBySquare.set(square, piece);
}

function worldToSquare(position) {
  const file = Math.round(position.x / boardConfig.squareSize + 3.5);
  const rank = Math.round(3.5 - position.z / boardConfig.squareSize);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${files[file]}${rank + 1}`;
}

function updatePointer(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
}

function onResize() {
  resizeRenderer();
  if (editorBoard && !modal.classList.contains('hidden')) {
    editorBoard.resize();
  }
}

function resizeRenderer() {
  const width = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
  const height = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
