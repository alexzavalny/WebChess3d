import * as THREE from 'three';
import { boardConfig, files, pieceBaseY } from './config.js';

export function createPieceManager(squareCenters) {
  const piecesGroup = new THREE.Group();
  const piecesBySquare = new Map();

  const buildPiece = (type, color) => {
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
