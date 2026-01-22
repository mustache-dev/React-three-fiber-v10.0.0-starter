// ============================================================================
// Collision Layers (bitmask)
// ============================================================================

export const CollisionLayer = {
  NONE: 0,
  PLAYER: 1 << 0,      // 1
  ENEMY: 1 << 1,       // 2
  PLAYER_ATTACK: 1 << 2, // 4
  ENEMY_ATTACK: 1 << 3,  // 8
  SOLID: 1 << 4,       // 16 - walls, obstacles
} as const

// ============================================================================
// Collider Types
// ============================================================================

export type CircleCollider = {
  x: number
  z: number
  radius: number
  layer: number
  mask: number
  solid: boolean      // If true, entities push each other apart
  entityId?: string   // Optional reference to entity
}

export type CollisionResult = {
  hit: boolean
  overlap: number
  normalX: number
  normalZ: number
}

// ============================================================================
// Collision Entity (for the global registry)
// ============================================================================

export type CollisionEntity = {
  id: string
  collider: CircleCollider
  position: { x: number; z: number }
  onHit?: (other: CollisionEntity, result: CollisionResult) => void
}
