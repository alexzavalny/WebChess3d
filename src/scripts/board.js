import * as THREE from 'three';
import { boardConfig, files } from './config.js';

export function buildBoard() {
  const group = new THREE.Group();
  const boardSize = boardConfig.squareSize * 8;
  const baseSize = boardSize + boardConfig.edgePadding * 2;

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1f2c,
    roughness: 0.6,
    metalness: 0.2,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize, boardConfig.baseThickness, baseSize), baseMaterial);
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
      const material = (file + rank) % 2 === 0 ? darkMat : lightMat;
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

export function buildSquareLookup() {
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

export function addBoardNotation(notationGroup) {
  notationGroup.clear();
  const half = (boardConfig.squareSize * 8) / 2;
  const offset = half + boardConfig.edgePadding / 2;
  const labelHeight = boardConfig.baseThickness + 0.005;

  files.forEach((file, index) => {
    const x = (index - 3.5) * boardConfig.squareSize;
    const bottom = createLabelMesh(file, 0.5, Math.PI);
    bottom.position.set(x, labelHeight, -offset);
    notationGroup.add(bottom);

    const top = createLabelMesh(file, 0.5, 0);
    top.position.set(x, labelHeight, offset);
    notationGroup.add(top);
  });

  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  ranks.forEach((rank, index) => {
    const z = (index - 3.5) * boardConfig.squareSize;
    const left = createLabelMesh(rank, 0.5, -Math.PI / 2);
    left.position.set(-offset, labelHeight, z);
    notationGroup.add(left);

    const right = createLabelMesh(rank, 0.5, Math.PI / 2);
    right.position.set(offset, labelHeight, z);
    notationGroup.add(right);
  });
}

function createLabelMesh(text, size = 0.45, textRotation = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f6f7ff';
  ctx.font = 'bold 140px "Source Sans Pro", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(textRotation);
  ctx.fillText(text.toUpperCase(), 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const geometry = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y += 0.001;
  return mesh;
}
