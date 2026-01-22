import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

// ============================================================================
// Animation Constants
// ============================================================================

export const Animations = {
  ATTACK_01: 'attack01',
  ATTACK_02: 'attack02',
  DASH_ATTACK: 'dash-attack',
  PARRY_01: 'parry-01',
  PARRY_02: 'parry-02',
  PARRY_03: 'parry03',
  SPIN_ATTACK: 'spin-attack',
  STANCE: 'stance',
} as const

export const ParryAnimations = [
  Animations.PARRY_01,
  // Animations.PARRY_02,
  Animations.PARRY_03,
] as const

// ============================================================================
// Types
// ============================================================================

export type ActionName = typeof Animations[keyof typeof Animations]

export type GLTFResult = GLTF & {
  nodes: {
    Cylinder: THREE.SkinnedMesh
    Sphere001: THREE.SkinnedMesh
    Sphere001_1: THREE.SkinnedMesh
    body: THREE.Bone
  }
  materials: {
    ['Material.002']: THREE.MeshStandardMaterial
    ['Material.001']: THREE.MeshStandardMaterial
  }
  animations: THREE.AnimationClip[]
}

export type CapsHandle = {
  onMouseDown: () => void
  onMouseUp: () => void
  onRightClick: () => void
}

export type AnimationState = {
  currentAnimation: ActionName
  nextAttack: typeof Animations.ATTACK_01 | typeof Animations.ATTACK_02
  isAttacking: boolean
  isParrying: boolean
  isHolding: boolean
  holdStartTime: number
  chargeProgress: number
  isInChargeStance: boolean
  parryStartTime: number
  parryCooldownEnd: number
}

// ============================================================================
// Constants
// ============================================================================

export const ATTACK_SPEED = 3
export const SPIN_ATTACK_SPEED = 1.5
export const CHARGE_DELAY_MS = 200  // Time before stance/charging starts
export const CHARGE_TIME_MS = 600   // Time to fully charge after stance starts
export const PARRY_DURATION_MS = 500  // Time before returning to stance after parry
export const PARRY_COOLDOWN_MS = 2000 // Cooldown before parry can be used again
export const DASH_ATTACK_SPEED = 3
