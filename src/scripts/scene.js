import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { pieceBaseY } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearAlpha(1);
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050710);
  return scene;
}

export function createCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(6.5, 8, 6.5);
  return camera;
}

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, pieceBaseY, 0);
  controls.saveState();
  return controls;
}

export function addLights(scene) {
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

export function resizeRenderer(renderer, camera, canvas) {
  const width = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
  const height = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
