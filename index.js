import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import getStarfield from "./src/getStarfield.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5.5);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const orbitCtrl = new OrbitControls(camera, renderer.domElement);
orbitCtrl.enableDamping = true;

const textureLoader = new THREE.TextureLoader();
const starSprite = textureLoader.load("./src/circle.png");
const colorMap = textureLoader.load("./src/0.jpg");
const elevMap = textureLoader.load("./src/1.jpg");
const alphaMap = textureLoader.load("./src/2.jpg");
const backgroundEnv = textureLoader.load("./src/env.jpg");


const globeGroup = new THREE.Group();
scene.add(globeGroup);

const geo = new THREE.IcosahedronGeometry(1, 10);
const mat = new THREE.MeshBasicMaterial({ 
  color: 0x00000f,
  wireframe: true,
 });
const cube = new THREE.Mesh(geo, mat);
globeGroup.add(cube);

const detail = 80;
const pointsGeo = new THREE.IcosahedronGeometry(1, detail);

const vertexShader = `
  uniform float size;
  uniform sampler2D elevTexture;

  varying vec2 vUv;
  varying float vVisible;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    float elv = texture2D(elevTexture, vUv).r;
    vec3 vNormal = normalMatrix * normal;
    vVisible = step(0.0, dot( -normalize(mvPosition.xyz), normalize(vNormal)));
    mvPosition.z += 0.35 * elv;
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const fragmentShader = `
  uniform sampler2D colorTexture;
  uniform sampler2D alphaTexture;

  varying vec2 vUv;
  varying float vVisible;

  void main() {
    if (floor(vVisible + 0.1) == 0.0) discard;
    float alpha = 1.03 - texture2D(alphaTexture, vUv).r;
    vec3 color = texture2D(colorTexture, vUv).rgb;
    gl_FragColor = vec4(color, alpha);
  }
`;
const uniforms = {
  size: { type: "f", value: 4 },
  colorTexture: { type: "t", value: colorMap },
  elevTexture: { type: "t", value: elevMap },
  alphaTexture: { type: "t", value: alphaMap }
};
const pointsMat = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader,
  fragmentShader,
  transparent: true
});

const points = new THREE.Points(pointsGeo, pointsMat);
globeGroup.add(points);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 3);
scene.add(hemiLight);

const stars = getStarfield({ numStars:2500, sprite: starSprite });
scene.add(stars);

scene.environment = backgroundEnv;
backgroundEnv.needsUpdate = true;

function animate() {
  renderer.render(scene, camera);
  globeGroup.rotation.y += 0.002;
  globeGroup.rotation.x += 0.0003;

  requestAnimationFrame(animate);
  orbitCtrl.update();
};
animate();

window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

// https://discourse.threejs.org/t/earth-point-vertex-elevation/62689