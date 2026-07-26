import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { cameraSync } from '@/lib/cameraSync'

interface SyncedOrbitControlsProps {
  side: 'left' | 'right'
}

/**
 * Bidirectional camera sync between two viewports.
 *
 * Instead of relying on onStart/onEnd (which only fire for pointer events, not wheel),
 * we detect user interaction by measuring per-frame camera delta. Any movement above
 * a tiny threshold that wasn't caused by our own lerp is treated as user input.
 *
 * Per-frame delta approach:
 * 1. Compute how far camera.position and controls.target moved since last frame
 * 2. If we just applied a lerp, skip detection (the movement came from us)
 * 3. If delta > threshold → user is moving THIS camera → write to cameraSync (become leader)
 * 4. If other side is leader → lerp toward cameraSync
 */
export function SyncedOrbitControls({ side }: SyncedOrbitControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  // Tracks the camera state from the last frame where we weren't lerping.
  // Updated after each "own" frame or after a skip due to justLerped.
  const prevPos = useRef(new THREE.Vector3(5, 5, 5))
  const prevTarget = useRef(new THREE.Vector3(0, 0, 0))
  // Set to true when we apply a lerp; cleared next frame to avoid detecting
  // the lerp movement as user input (feedback loop).
  const justLerped = useRef(false)

  useFrame(({ camera }) => {
    if (!controlsRef.current) return

    // If we lerped last frame, skip detection and update tracking
    // to the current (post-lerp) position so next frame's delta is correct.
    if (justLerped.current) {
      prevPos.current.copy(camera.position)
      prevTarget.current.copy(controlsRef.current.target)
      justLerped.current = false
      return
    }

    // Per-frame delta since last "own" frame
    const posDelta = camera.position.distanceTo(prevPos.current)
    const targetDelta = controlsRef.current.target.distanceTo(prevTarget.current)

    // Save current state for next frame's delta computation
    prevPos.current.copy(camera.position)
    prevTarget.current.copy(controlsRef.current.target)

    // Threshold: any movement above this is treated as user interaction.
    // This catches drag, scroll wheel, pinch — all input types.
    const moved = posDelta > 0.00005 || targetDelta > 0.00005

    if (moved) {
      // User is actively moving THIS camera → become the leader
      cameraSync.position.copy(camera.position)
      cameraSync.target.copy(controlsRef.current.target)
      cameraSync.source = side
    } else if (cameraSync.source && cameraSync.source !== side) {
      // The OTHER side is the leader → follow via smooth lerp
      const dist = camera.position.distanceTo(cameraSync.position)
      const tDist = controlsRef.current.target.distanceTo(cameraSync.target)
      if (dist > 0.0005 || tDist > 0.0005) {
        camera.position.lerp(cameraSync.position, 0.25)
        controlsRef.current.target.lerp(cameraSync.target, 0.25)
        controlsRef.current.update()
        justLerped.current = true
      }
    }
    // If !moved and (!source or source === side), do nothing.
    // Camera is either at rest or this side was the leader and has stopped.
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.DOLLY,
      }}
      minDistance={0.5}
      maxDistance={50}
      target={[0, 0, 0]}
    />
  )
}
