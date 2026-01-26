import { trait } from 'koota'
import * as THREE from 'three'
import type { PlayerState } from 'playroomkit'

export const isOtherPlayer = trait()

export const PlayerId = trait({ id: '' })

export const Animation = trait(() => ({
  name: null as string | null,
  speed: 1,
  clamp: false,
  loop: false, // false = LoopOnce, true = LoopRepeat
}))
export const PlayroomStateTrait = trait(() => ({ state: null as PlayerState | null }))

export const Position = trait({ x: 0, y: 0, z: 0 })

/** Rotation (euler angles) */
export const Rotation = trait({ x: 0, y: 0, z: 0 })

/** Quaternion rotation */
export const QuaternionTrait = trait({ x: 0, y: 0, z: 0, w: 1 })

export const Health = trait({ current: 100, max: 100 })

export const Color = trait({ r: 0, g: 1, b: 0 }) // Default red

export const MeshRef = trait(() => ({ current: null as THREE.Group | null }))
