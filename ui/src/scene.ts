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

  await renderer.init();
  applySize();
  window.addEventListener("resize", applySize);
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    dispose(): void {
      window.removeEventListener("resize", applySize);
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
    },
  };
}
