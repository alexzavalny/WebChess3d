import * as THREE from 'three';
import { pieceBaseY, pieceHoverLift } from './config.js';

export function createDragController({ canvas, camera, controls, piecesGroup, squareFromWorld, movePieceToSquare }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -pieceBaseY);
  const dragIntersection = new THREE.Vector3();
  const dragOffset = new THREE.Vector3();

  let activePiece = null;
  let dragStartSquare = null;

  const getBaseHeight = (piece) => (piece?.userData?.baseY ?? pieceBaseY);

  const raisePiece = (piece) => {
    if (!piece) return;
    piece.position.y = getBaseHeight(piece) + pieceHoverLift;
  };

  const lowerPiece = (piece) => {
    if (!piece) return;
    piece.position.y = getBaseHeight(piece);
  };

  const updatePointer = (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  };

  const pickPiece = (event) => {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(piecesGroup.children, true);
    if (!intersects.length) return null;
    let { object } = intersects[0];
    while (object && object.parent !== piecesGroup) {
      object = object.parent;
    }
    return object;
  };

  const onPointerDown = (event) => {
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
    raisePiece(activePiece);
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!activePiece) return;
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    dragPlane.constant = -pieceBaseY;
    if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
      activePiece.position.x = dragIntersection.x - dragOffset.x;
      activePiece.position.z = dragIntersection.z - dragOffset.z;
    }
  };

  const onPointerUp = () => {
    if (!activePiece) return;
    const snappedSquare = squareFromWorld(activePiece.position);
    movePieceToSquare(activePiece, snappedSquare || dragStartSquare);
    cancelDrag();
  };

  const cancelDrag = () => {
    if (activePiece) {
      lowerPiece(activePiece);
    }
    activePiece = null;
    dragStartSquare = null;
    controls.enabled = true;
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    cancelDrag,
  };
}
