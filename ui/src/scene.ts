/** Imperative Three.js scene: a classic WebGLRenderer, OrbitControls, and a
 * responsive full-viewport canvas.
 *
 * The classic `WebGLRenderer` (not the node-based `WebGPURenderer`) is required:
 * the point cloud is a `THREE.Points` with a GLSL `ShaderMaterial` that sizes
 * round sprites via `gl_PointSize`. `WebGPURenderer` ignores `gl_PointSize` in
 * both its WebGPU and WebGL backends, so every point renders at one pixel
 * regardless of the GPU's point-size range; `WebGLRenderer` honours it, so the
 * sprites size correctly.
 *
 * The canvas is transparent, so the themed page background (driven by the
 * `data-theme` attribute) shows through an empty viewport — keeping brand
 * colour a CSS concern, never hard-coded here. GPU/render behaviour is verified
 * in a browser; the pure decisions it relies on are unit-tested in `renderer.ts`.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { computeRenderSize } from "./renderer";

/** A running scene; call `dispose` to stop the loop and release resources. */
export interface SceneHandle {
  /** The perspective camera (for raycasting). */
  readonly camera: THREE.PerspectiveCamera;
  /** The renderer's canvas (for pointer events). */
  readonly domElement: HTMLCanvasElement;
  /** Orbit controls (for camera fly-to). */
  readonly controls: OrbitControls;
  add(object: THREE.Object3D): void;
  /** Smoothly move the orbit pivot toward a world-space target. */
  flyTo(target: readonly [number, number, number]): void;
  /** Position the camera + orbit target so a bounding sphere fills the view. */
  frameSphere(center: readonly [number, number, number], radius: number): void;
  /** Set the fog colour (RGB 0–1) so distant points fade toward the page bg. */
  setFogColor(rgb: readonly [number, number, number]): void;
  dispose(): void;
}

/** Create and start a responsive, orbit-controlled scene on `canvas`. */
export async function createScene(canvas: HTMLCanvasElement): Promise<SceneHandle> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });

  const scene = new THREE.Scene();
  // Linear fog fades distant points toward the page background for a slight
  // volumetric read. Colour is themed via setFogColor; near/far are fitted to the
  // cloud in frameSphere. Initial wide range = effectively no fog until framed.
  scene.fog = new THREE.Fog(0x000000, 0.1, 1000);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // Gentle idle drift so the cloud reads as 3D; OrbitControls pauses it while the
  // user is actively dragging.
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;

  const applySize = (): void => {
    const { width, height, pixelRatio, aspect } = computeRenderSize(
      window.innerWidth,
      window.innerHeight,
      window.devicePixelRatio,
    );
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  let flyTarget: THREE.Vector3 | null = null;

  // Cursor parallax: a few-degree camera tilt toward the pointer, eased and
  // layered on the orbit each frame. Magnitude is fitted to the cloud in
  // frameSphere; the target is the pointer in NDC ([-1, 1], y up).
  let parallaxMag = 0;
  const parallaxTarget = { x: 0, y: 0 };
  const parallaxCurrent = { x: 0, y: 0 };
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const onPointerMove = (event: PointerEvent): void => {
    parallaxTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
    parallaxTarget.y = 1 - (event.clientY / window.innerHeight) * 2;
  };
  const onPointerLeave = (): void => {
    parallaxTarget.x = 0;
    parallaxTarget.y = 0;
  };
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);

  applySize();
  window.addEventListener("resize", applySize);
  renderer.setAnimationLoop(() => {
    if (flyTarget) {
      controls.target.lerp(flyTarget, 0.08);
      if (controls.target.distanceTo(flyTarget) < 1e-3) {
        flyTarget = null;
      }
    }
    controls.update();
    // Parallax shift along the camera's own right/up axes, then re-aim at the
    // target. Applied after update() and never read back, so OrbitControls'
    // internal state is untouched and it composes with the auto-rotate.
    parallaxCurrent.x += (parallaxTarget.x - parallaxCurrent.x) * 0.05;
    parallaxCurrent.y += (parallaxTarget.y - parallaxCurrent.y) * 0.05;
    if (parallaxMag > 0) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      camera.position
        .addScaledVector(right, parallaxCurrent.x * parallaxMag)
        .addScaledVector(up, parallaxCurrent.y * parallaxMag);
      camera.lookAt(controls.target);
    }
    renderer.render(scene, camera);
  });

  return {
    camera,
    domElement: renderer.domElement,
    controls,
    add(object: THREE.Object3D): void {
      scene.add(object);
    },
    flyTo(target: readonly [number, number, number]): void {
      flyTarget = new THREE.Vector3(target[0], target[1], target[2]);
    },
    frameSphere(center: readonly [number, number, number], radius: number): void {
      const c = new THREE.Vector3(center[0], center[1], center[2]);
      controls.target.copy(c);
      const safeRadius = Math.max(radius, 0.01);
      parallaxMag = safeRadius * 0.05;
      const dist = (safeRadius * 1.4) / Math.sin((camera.fov * Math.PI) / 360);
      camera.position.set(c.x, c.y, c.z + dist);
      camera.near = Math.max(0.01, dist - safeRadius * 2);
      camera.far = dist + safeRadius * 4;
      camera.updateProjectionMatrix();
      // Fit fog across the cloud's depth: front stays crisp, back fades to bg.
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.near = dist - safeRadius;
        scene.fog.far = dist + safeRadius * 2.5;
      }
      controls.update();
    },
    setFogColor(rgb: readonly [number, number, number]): void {
      scene.fog?.color.setRGB(rgb[0], rgb[1], rgb[2]);
    },
    dispose(): void {
      window.removeEventListener("resize", applySize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
    },
  };
}
