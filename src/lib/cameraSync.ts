import * as THREE from 'three'

/**
 * Module-level camera sync state.
 * NOT a React state — avoids 60fps re-renders.
 * Written by the dragging viewport, read by the following viewport in useFrame.
 */
export const cameraSync = {
  position: new THREE.Vector3(5, 5, 5),
  target: new THREE.Vector3(0, 0, 0),
  source: null as 'left' | 'center' | 'right' | null,
  zoom: 1,
}
