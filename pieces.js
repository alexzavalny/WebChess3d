import * as THREE from 'three';
import { boardConfig, files, pieceBaseY } from './config.js';

export function createPieceManager(squareCenters) {
  const piecesGroup = new THREE.Group();
  const piecesBySquare = new Map();

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
      piecesGroup.remove(occupying);
    }
    const center = squareCenters.get(square);
    piece.position.set(center.x, piece.userData.baseY, center.z);
    piece.userData.square = square;
    piecesBySquare.set(square, piece);
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
    squareFromWorld,
    clear,
    loadPieces,
  };
}
