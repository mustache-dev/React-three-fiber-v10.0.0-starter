import { trait } from 'koota'
import * as THREE from 'three'

export const isOtherPlayer = trait()

export const Position = trait({ x: 0, y: 0, z: 0 })

/** Rotation (euler angles) */
export const Rotation = trait({ x: 0, y: 0, z: 0 })

export const Health = trait({ current: 100, max: 100 })

export const Color = trait({ r: 0, g: 1, b: 0 }) // Default red

export const MeshRef = trait(() => ({ current: null as THREE.Mesh | null }))
