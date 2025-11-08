import * as THREE from 'three';
import { boardConfig } from './config.js';

export function createEnvironment() {
  const group = new THREE.Group();
  group.add(createTable());
  const roomShell = createRoomShell();
  group.add(roomShell);

  const walls = roomShell.userData?.walls || [];
  const cameraPosition = new THREE.Vector3();
  const wallPosition = new THREE.Vector3();

  group.userData.updateVisibility = (camera) => {
    if (!camera || walls.length === 0) return;
    camera.getWorldPosition(cameraPosition);
    let closestWall = null;
    let minDistance = Infinity;
    walls.forEach((wall) => {
      wall.getWorldPosition(wallPosition);
      const distance = cameraPosition.distanceTo(wallPosition);
      if (distance < minDistance) {
        minDistance = distance;
        closestWall = wall;
      }
    });
    walls.forEach((wall) => setWallVisibility(wall, wall === closestWall));
  };

  return group;
}

function createTable() {
  const boardSpan = boardConfig.squareSize * 8;
  const tableLength = boardSpan + boardConfig.edgePadding * 8;
  const tableWidth = tableLength * 0.8;
  const tableThickness = 0.2;
  const legHeight = 2.3;
  const legSize = 0.35;

  const tabletopTexture = new THREE.TextureLoader().load('img/texture.png');
  tabletopTexture.colorSpace = THREE.SRGBColorSpace;
  tabletopTexture.wrapS = THREE.RepeatWrapping;
  tabletopTexture.wrapT = THREE.RepeatWrapping;
  tabletopTexture.repeat.set(tableLength / 4, tableWidth / 4);

  const tabletopMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.05,
    map: tabletopTexture,
  });

  const legMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d3a23,
    roughness: 0.8,
    metalness: 0.04,
  });

  const group = new THREE.Group();

  const top = new THREE.Mesh(new THREE.BoxGeometry(tableLength, tableThickness, tableWidth), tabletopMaterial);
  top.position.y = -tableThickness / 2;
  top.receiveShadow = true;
  top.castShadow = true;
  group.add(top);

  const legGeometry = new THREE.BoxGeometry(legSize, legHeight, legSize);
  const offsetX = (tableLength / 2) - legSize;
  const offsetZ = (tableWidth / 2) - legSize;
  const legY = -tableThickness - legHeight / 2;
  const legPositions = [
    [offsetX, legY, offsetZ],
    [-offsetX, legY, offsetZ],
    [offsetX, legY, -offsetZ],
    [-offsetX, legY, -offsetZ],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  });

  return group;
}

function createRoomShell() {
  const roomWidth = 25;
  const roomDepth = 25;
  const roomHeight = 12;
  const floorHeight = -2.5;
  const wallThickness = 0.4;

  const group = new THREE.Group();
  const walls = [];

  const textureLoader = new THREE.TextureLoader();

  const wallTexture = textureLoader.load('img/wall.jpg');
  wallTexture.colorSpace = THREE.SRGBColorSpace;
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(3, 1.5);

  const floorTexture = textureLoader.load('img/floor.jpg');
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(roomWidth / 4, roomDepth / 4);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.02,
    map: floorTexture,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomDepth), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorHeight;
  floor.receiveShadow = true;
  group.add(floor);

  const wallHeightCenter = floorHeight + roomHeight / 2;
  const sideWallGeometry = new THREE.BoxGeometry(wallThickness, roomHeight, roomDepth);
  const backWallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, wallThickness);

  const leftWall = new THREE.Mesh(sideWallGeometry, createWallMaterial(wallTexture));
  leftWall.position.set(-(roomWidth / 2), wallHeightCenter, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);
  walls.push(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeometry, createWallMaterial(wallTexture));
  rightWall.position.set(roomWidth / 2, wallHeightCenter, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);
  walls.push(rightWall);

  const backWall = new THREE.Mesh(backWallGeometry, createWallMaterial(wallTexture));
  backWall.position.set(0, wallHeightCenter, -(roomDepth / 2));
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);
  walls.push(backWall);

  const frontWall = new THREE.Mesh(backWallGeometry, createWallMaterial(wallTexture));
  frontWall.position.set(0, wallHeightCenter, roomDepth / 2);
  frontWall.castShadow = false;
  frontWall.receiveShadow = false;
  group.add(frontWall);
  walls.push(frontWall);
  setWallVisibility(frontWall, true);

  group.userData.walls = walls;

  return group;
}

function createWallMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    color: 0xe3d5bf,
    roughness: 0.85,
    metalness: 0.02,
    transparent: true,
    opacity: 0.95,
    map: texture || null,
  });
}

function setWallVisibility(wall, makeTransparent) {
  const material = wall.material;
  if (!material) return;
  if (makeTransparent) {
    material.opacity = 0.05;
    material.depthWrite = false;
  } else {
    material.opacity = 0.95;
    material.depthWrite = true;
  }
}
