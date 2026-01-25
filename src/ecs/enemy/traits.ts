import { trait } from 'koota'
import * as THREE from 'three'

/**
 * TRAITS - Building blocks of enemy data
 * Think of traits as "components" in traditional ECS terminology.
 * Each trait represents a slice of data that can be attached to entities.
 */

// ============================================
// IDENTITY TRAITS (Tags)
// ============================================

/** Tag to identify an entity as an enemy */
export const IsEnemy = trait()

/** Enemy type: melee (sword arm visible) */
export const IsMeleeEnemy = trait()

/** Enemy type: ranged (canon visible) */
export const IsRangeEnemy = trait()

// ============================================
// TRANSFORM TRAITS
// ============================================

/** 3D Position in world space */
export const Position = trait({ x: 0, y: 0, z: 0 })

/** Velocity for movement */
export const Velocity = trait({ x: 0, y: 0, z: 0 })

/** Rotation (euler angles) */
export const Rotation = trait({ x: 0, y: 0, z: 0 })

/** Scale */
export const Scale = trait({ x: 1, y: 1, z: 1 })

// ============================================
// GAMEPLAY TRAITS
// ============================================

/** Health component */
export const Health = trait({ current: 100, max: 100 })

/** Movement speed multiplier */
export const Speed = trait({ value: 1 })

/** Target position for AI movement */
export const TargetPosition = trait({ x: 0, y: 0, z: 0 })

/** Target velocity for smooth steering (velocity damps toward this) */
export const TargetVelocity = trait({ x: 0, y: 0, z: 0 })

export const isSpawned = trait({value: false})

// ============================================
// VISUAL TRAITS
// ============================================

/** Color for rendering */
export const Color = trait({ r: 1, g: 0, b: 0 }) // Default red

/** 
 * Reference to THREE.js mesh (use callback for non-serializable objects)
 * ⚠️ Must use callback syntax for class instances
 */
export const MeshRef = trait(() => ({ current: null as THREE.Mesh | null }))
