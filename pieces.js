import * as THREE from 'three';
import { boardConfig, files, pieceBaseY, tableSurfaceY } from './config.js';

export function createPieceManager(squareCenters) {
  const piecesGroup = new THREE.Group();
  const piecesBySquare = new Map();
  const boardSpan = boardConfig.squareSize * 8;
  const boardHalf = boardSpan / 2;
  const boardBaseHalf = boardHalf + boardConfig.edgePadding;
  const tableLength = boardSpan + boardConfig.edgePadding * 8;
  const tableHalfX = tableLength / 2;
  const tableHalfZ = (tableLength * 0.8) / 2; // matches environment table width
  const tableMargin = 0.35;
  const activeAnimations = new Set();
  const tempPosition = new THREE.Vector3();

  const easeOutCubic = (t) => 1 - (1 - t) ** 3;

  const stopAnimationsForPiece = (piece) => {
    const toRemove = [];
    activeAnimations.forEach((animation) => {
      if (animation.piece === piece) {
        toRemove.push(animation);
      }
    });
    toRemove.forEach((animation) => activeAnimations.delete(animation));
  };

  const startPieceAnimation = (piece, targetPosition, duration = 0.8) => {
    if (!piece || !targetPosition) return;
    stopAnimationsForPiece(piece);
    activeAnimations.add({
      piece,
      from: piece.position.clone(),
      to: targetPosition.clone(),
      elapsed: 0,
      duration,
      arcHeight: 0.25,
    });
  };

  const updateAnimations = (delta = 0) => {
    if (!activeAnimations.size) return;
    const completed = [];
    activeAnimations.forEach((animation) => {
      animation.elapsed += delta;
      const progress = animation.duration > 0 ? Math.min(animation.elapsed / animation.duration, 1) : 1;
      const eased = easeOutCubic(progress);
      tempPosition.copy(animation.from).lerp(animation.to, eased);
      tempPosition.y += Math.sin(Math.PI * eased) * animation.arcHeight;
      animation.piece.position.copy(tempPosition);
      if (progress >= 1) {
        animation.piece.position.copy(animation.to);
        animation.piece.userData.baseY = tableSurfaceY;
        completed.push(animation);
      }
    });
    completed.forEach((animation) => activeAnimations.delete(animation));
  };

  const clampToTable = (position) => {
    position.x = THREE.MathUtils.clamp(position.x, -tableHalfX + tableMargin, tableHalfX - tableMargin);
    position.z = THREE.MathUtils.clamp(position.z, -tableHalfZ + tableMargin, tableHalfZ - tableMargin);
    return position;
  };

  const keepOffBoardBase = (position) => {
    if (Math.abs(position.x) <= boardBaseHalf && Math.abs(position.z) <= boardBaseHalf) {
      if (Math.abs(position.x) > Math.abs(position.z)) {
        position.x = Math.sign(position.x || 1) * (boardBaseHalf + tableMargin);
      } else {
        position.z = Math.sign(position.z || 1) * (boardBaseHalf + tableMargin);
      }
    }
    return position;
  };

  const snapToTableSurface = (position) => keepOffBoardBase(clampToTable(position));

  const getRandomTablePosition = () => {
    for (let i = 0; i < 20; i += 1) {
      const x = THREE.MathUtils.randFloatSpread(tableHalfX * 2);
      const z = THREE.MathUtils.randFloatSpread(tableHalfZ * 2);
      if (Math.abs(x) > boardBaseHalf || Math.abs(z) > boardBaseHalf) {
        return snapToTableSurface(new THREE.Vector3(x, tableSurfaceY, z));
      }
    }
    const fallback = new THREE.Vector3(boardBaseHalf + tableMargin, tableSurfaceY, 0);
    return snapToTableSurface(fallback);
  };

  const buildPiece = (type, color) => {
    const material = new THREE.MeshStandardMaterial({
      color: color === 'w' ? 0xd9c19d : 0x5c3b1e,
      roughness: 0.5,
      metalness: 0.1,
    });

    const group = new THREE.Group();
    group.userData = { type, color, square: null, baseY: pieceBaseY };

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.12, 32), material);
    base.castShadow = true;
    base.receiveShadow = true;
    base.position.y = 0.06;
    group.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.38, 32), material);
    stem.castShadow = true;
    stem.position.y = 0.27;
    group.add(stem);

    switch (type) {
      case 'p': {
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), material);
        head.castShadow = true;
        head.position.y = 0.52;
        group.add(head);
        break;
      }
      case 'r': {
        const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 24), material);
        turretBase.castShadow = true;
        turretBase.position.y = 0.55;
        group.add(turretBase);

        const crenellationGeo = new THREE.BoxGeometry(0.08, 0.16, 0.14);
        for (let i = 0; i < 4; i += 1) {
          const angle = (i / 4) * Math.PI * 2;
          const block = new THREE.Mesh(crenellationGeo, material);
          block.position.set(Math.cos(angle) * 0.135, 0.66, Math.sin(angle) * 0.135);
          block.rotation.y = angle;
          block.castShadow = true;
          group.add(block);
        }
        break;
      }
      case 'n': {
        const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.32, 8, 16), material);
        head.position.set(0, 0.55, 0.1);
        head.rotation.z = Math.PI / 2.3;
        head.castShadow = true;
        group.add(head);
        break;
      }
      case 'b': {
        const top = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.52, 24), material);
        top.position.y = 0.7;
        top.castShadow = true;
        group.add(top);
        break;
      }
      case 'q': {
        const lowerCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.38, 32), material);
        lowerCrown.position.y = 0.7;
        lowerCrown.castShadow = true;
        group.add(lowerCrown);

        const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 12, 32), material);
        crownBand.rotation.x = Math.PI / 2;
        crownBand.position.y = 0.9;
        crownBand.castShadow = true;
        group.add(crownBand);

        const spikeGeo = new THREE.ConeGeometry(0.05, 0.26, 12);
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2;
          const spike = new THREE.Mesh(spikeGeo, material);
          spike.position.set(Math.cos(angle) * 0.13, 1.02, Math.sin(angle) * 0.13);
          spike.castShadow = true;
          group.add(spike);
        }

        break;
      }
      case 'k':
      default: {
        const neck = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.48, 24), material);
        neck.position.y = 0.75;
        neck.castShadow = true;
        group.add(neck);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.045), material);
        cross.position.y = 1;
        cross.castShadow = true;
        group.add(cross);
        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.08, 0.045), material);
        crossBar.position.y = 1.05;
        crossBar.castShadow = true;
        group.add(crossBar);
        break;
      }
    }

    return group;
  };

  const placePiece = (mesh, square) => {
    const occupant = piecesBySquare.get(square);
    if (occupant) {
      piecesBySquare.delete(square);
      piecesGroup.remove(occupant);
    }
    const center = squareCenters.get(square);
    if (!center) {
      throw new Error(`Square ${square} outside board`);
    }
    mesh.userData.baseY = pieceBaseY;
    mesh.position.set(center.x, mesh.userData.baseY, center.z);
    mesh.userData.square = square;
    piecesBySquare.set(square, mesh);
    piecesGroup.add(mesh);
  };

  const movePieceToSquare = (piece, square) => {
    if (!square) return;
    if (piece.userData.square) {
      piecesBySquare.delete(piece.userData.square);
    }
    const occupying = piecesBySquare.get(square);
    if (occupying && occupying !== piece) {
      piecesBySquare.delete(square);
      dropPieceOffBoard(occupying, getRandomTablePosition(), { animate: true });
    }
    const center = squareCenters.get(square);
    piece.userData.baseY = pieceBaseY;
    piece.position.set(center.x, piece.userData.baseY, center.z);
    piece.userData.square = square;
    piecesBySquare.set(square, piece);
  };

  const dropPieceOffBoard = (piece, position, options = {}) => {
    const { animate = false, duration = 0.8 } = options;
    if (!piece || !position) return;
    if (piece.userData.square) {
      piecesBySquare.delete(piece.userData.square);
      piece.userData.square = null;
    }
    const destination = position.clone ? position.clone() : new THREE.Vector3(position.x, position.y, position.z);
    destination.y = tableSurfaceY;
    snapToTableSurface(destination);
    if (animate) {
      startPieceAnimation(piece, destination, duration);
    } else {
      stopAnimationsForPiece(piece);
      piece.userData.baseY = tableSurfaceY;
      piece.position.copy(destination);
    }
  };

  const squareFromWorld = (position) => {
    const file = Math.round(position.x / boardConfig.squareSize + 3.5);
    const rank = Math.round(3.5 - position.z / boardConfig.squareSize);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return `${files[file]}${rank + 1}`;
  };

  const clear = () => {
    piecesGroup.clear();
    piecesBySquare.clear();
    activeAnimations.clear();
  };

  const loadPieces = (pieces) => {
    clear();
    pieces.forEach((pieceData) => {
      const mesh = buildPiece(pieceData.type, pieceData.color);
      placePiece(mesh, pieceData.square);
    });
  };

  return {
    group: piecesGroup,
    piecesBySquare,
    buildPiece,
    placePiece,
    movePieceToSquare,
    dropPieceOffBoard,
    squareFromWorld,
    clear,
    loadPieces,
    update: updateAnimations,
  };
}
