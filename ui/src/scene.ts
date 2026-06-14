/** Imperative Three.js scene: a WebGPU renderer (with WebGL2 fallback),
 * OrbitControls, and a responsive full-viewport canvas.
 *
 * The canvas is transparent, so the themed page background (driven by the
 * `data-theme` attribute) shows through an empty viewport — keeping brand
 * colour a CSS concern, never hard-coded here. GPU/render behaviour is verified
 * in a browser; the pure decisions it relies on are unit-tested in `renderer.ts`.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { WebGPURenderer } from "three/webgpu";

import { computeRenderSize, detectBackend } from "./renderer";

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
  dispose(): void;
}

/** Create and start a responsive, orbit-controlled scene on `canvas`. */
export async function createScene(canvas: HTMLCanvasElement): Promise<SceneHandle> {
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
    forceWebGL: detectBackend(navigator) === "webgl2",
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

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
  await renderer.init();
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
      const dist = (safeRadius * 1.4) / Math.sin((camera.fov * Math.PI) / 360);
      camera.position.set(c.x, c.y, c.z + dist);
      camera.near = Math.max(0.01, dist - safeRadius * 2);
      camera.far = dist + safeRadius * 4;
      camera.updateProjectionMatrix();
      controls.update();
    },
    dispose(): void {
      window.removeEventListener("resize", applySize);
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
    },
  };
}
