/** Real 3D look for the hand-drawn pictures: the doodle's shape is extruded and rendered as glass or clay with WebGL. */
import React from "react";
import { interpolate, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DOODLES } from "./doodles";

export type Mat3D = "glass" | "clay";
const cache = new Map<string, THREE.BufferGeometry>();

/** The doodle's closed (filled) paths, extruded into a solid with rounded edges; centred and scaled to ~2 units. */
function shapeFor(name: string): THREE.BufferGeometry {
  const hit = cache.get(name);
  if (hit) return hit;
  const d = DOODLES[name] ?? DOODLES.star;
  const idx = d.f && d.f.length ? d.f : [0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${idx.map((i) => `<path d="${d.p[i]}"/>`).join("")}</svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  let geo: THREE.BufferGeometry;
  if (!shapes.length) geo = new THREE.TorusKnotGeometry(0.7, 0.26, 160, 24);
  else {
    geo = new THREE.ExtrudeGeometry(shapes, { depth: 14, bevelEnabled: true, bevelThickness: 5, bevelSize: 4.5, bevelSegments: 8, curveSegments: 28 });
    geo.scale(1, -1, 1); // svg y goes down
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const c = new THREE.Vector3(); bb.getCenter(c);
    geo.translate(-c.x, -c.y, -c.z);
    const k = 2.7 / Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
    geo.scale(k, k, k);
    geo.computeVertexNormals();
  }
  cache.set(name, geo);
  return geo;
}

let noiseTex: THREE.Texture | null = null;
/** Fine fingerprint-like grain for the clay surface. */
function clayBump() {
  if (noiseTex) return noiseTex;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const img = g.createImageData(256, 256);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 256 * 256; i++) { const v = 110 + rnd() * 90 + Math.sin((i % 256) * 0.35) * 14; img.data.set([v, v, v, 255], i * 4); }
  g.putImageData(img, 0, 0);
  noiseTex = new THREE.CanvasTexture(c); noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping; noiseTex.repeat.set(2, 2);
  return noiseTex;
}

function Env() {
  const gl = useThree((s) => s.gl), scene = useThree((s) => s.scene), invalidate = useThree((s) => s.invalidate);
  React.useLayoutEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = tex; invalidate();
    return () => { tex.dispose(); pm.dispose(); scene.environment = null; };
  }, [gl, scene, invalidate]);
  return null;
}

function Obj({ name, mat, f, start, accent }: { name: string; mat: Mat3D; f: number; start: number; accent: string }) {
  const geo = React.useMemo(() => shapeFor(name), [name]);
  const clay = mat === "clay";
  const grow = interpolate(f, [start, start + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.6)) });
  const hold = clay ? Math.floor(f / 3) * 3 : f; // claymation: a new pose every 3rd frame
  const t = hold / 30;
  const jx = clay ? Math.sin(hold * 12.9898) * 0.025 : 0, jy = clay ? Math.sin(hold * 78.233) * 0.025 : 0;
  const ry = clay ? Math.sin(t * 1.6) * 0.45 : Math.sin(t * 1.1) * 0.55 + 0.25;
  const rx = clay ? Math.sin(t * 1.3 + 1) * 0.12 : Math.sin(t * 0.8) * 0.18;
  const tint = React.useMemo(() => { const c = new THREE.Color(accent); if (clay) c.multiplyScalar(0.8); return c; }, [accent, clay]);
  const bump = React.useMemo(() => (clay ? clayBump() : null), [clay]);
  return (
    <mesh geometry={geo} scale={grow * (clay ? 1 + Math.sin(t * 5) * 0.012 : 1)} rotation={[rx, ry, clay ? Math.sin(t * 2) * 0.03 : 0]} position={[jx, jy + Math.sin(t * 1.8) * 0.04, 0]}>
      {clay
        ? <meshStandardMaterial color={tint} roughness={0.78} metalness={0} bumpMap={bump} bumpScale={2.2} envMapIntensity={0.28} />
        : <meshPhysicalMaterial color="#EAF6FF" transmission={1} thickness={3} roughness={0.03} ior={1.6} clearcoat={1} clearcoatRoughness={0.02} attenuationColor={tint} attenuationDistance={1.1} envMapIntensity={3} specularIntensity={1} />}
    </mesh>
  );
}

export function Doodle3D({ name, f, start, size, mat, accent }: { name: string; f: number; start: number; size: number; mat: Mat3D; accent: string }) {
  const px = Math.max(160, Math.round(size));
  const glass = mat === "glass";
  return (
    <div style={{ width: px, height: px, position: "relative" }}>
      <ThreeCanvas width={px} height={px} camera={{ position: [0, 0, 5.2], fov: 38 }} gl={{ alpha: true, antialias: true, toneMapping: THREE.NoToneMapping }} style={{ background: "transparent" }}>
        <Env />
        <ambientLight intensity={glass ? 0.5 : 0.35} />
        <directionalLight position={[3, 4, 5]} intensity={glass ? 2.4 : 1.7} />
        <directionalLight position={[-4, -1, 3]} intensity={glass ? 1.4 : 0.5} color={glass ? "#8FD8FF" : "#FFD9A8"} />
        {glass && (<>
          {/* colourful glow right behind the glass, so it has something to bend */}
          <mesh position={[-0.35, 0.35, -1.0]}><sphereGeometry args={[0.55, 32, 32]} /><meshBasicMaterial color="#FF5FA8" /></mesh>
          <mesh position={[0.4, -0.3, -1.0]}><sphereGeometry args={[0.6, 32, 32]} /><meshBasicMaterial color="#38C8FF" /></mesh>
          <mesh position={[0.05, 0.7, -1.2]}><sphereGeometry args={[0.4, 32, 32]} /><meshBasicMaterial color="#FFD23D" /></mesh>
        </>)}
        <Obj name={name} mat={mat} f={f} start={start} accent={accent} />
      </ThreeCanvas>
    </div>
  );
}
