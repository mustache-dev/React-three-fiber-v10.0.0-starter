import { create } from 'zustand'

// ============================================================================
// Collision Layers
// ============================================================================

export const Layer = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  OBSTACLE: 'obstacle',
} as const

export type LayerType = typeof Layer[keyof typeof Layer]

// ============================================================================
// Simple Collider Registry
// ============================================================================

export type HitPosition = { x: number; y: number; z: number }

export type Collider = {
  id: string
  x: number
  z: number
  radius: number
  solid: boolean
  layer: LayerType
  onHit?: (attackerId: string, damage: number, hitPosition: HitPosition) => void
}

interface CollisionStore {
  colliders: Map<string, Collider>
  registerCollider: (collider: Collider) => void
  unregisterCollider: (id: string) => void
  updateCollider: (id: string, x: number, z: number) => void
  getColliders: () => Collider[]
  getCollider: (id: string) => Collider | undefined
}

export const useCollisionStore = create<CollisionStore>((set, get) => ({
  colliders: new Map(),
  
  registerCollider: (collider) => {
    set((state) => {
      const newMap = new Map(state.colliders)
      newMap.set(collider.id, collider)
      return { colliders: newMap }
    })
  },
  
  unregisterCollider: (id) => {
    set((state) => {
      const newMap = new Map(state.colliders)
      newMap.delete(id)
      return { colliders: newMap }
    })
  },
  
  updateCollider: (id, x, z) => {
    const collider = get().colliders.get(id)
    if (collider) {
      collider.x = x
      collider.z = z
    }
  },
  
  getColliders: () => Array.from(get().colliders.values()),
  
  getCollider: (id) => get().colliders.get(id)
}))

// ============================================================================
// Collision Check Functions
// ============================================================================

// Check what layers a given layer should collide with (for solid collision)
const shouldCollide = (myLayer: LayerType, otherLayer: LayerType): boolean => {
  // Player collides with enemies and obstacles
  if (myLayer === Layer.PLAYER) {
    return otherLayer === Layer.ENEMY || otherLayer === Layer.OBSTACLE
  }
  // Enemies only collide with player and obstacles, NOT each other
  if (myLayer === Layer.ENEMY) {
    return otherLayer === Layer.PLAYER || otherLayer === Layer.OBSTACLE
  }
  // Obstacles collide with everyone
  if (myLayer === Layer.OBSTACLE) {
    return true
  }
  return false
}

export const checkCircleCollision = (
  x: number,
  z: number,
  radius: number,
  myId: string,
  myLayer: LayerType
): { hit: boolean; pushX: number; pushZ: number } => {
  const colliders = useCollisionStore.getState().getColliders()
  
  let totalPushX = 0
  let totalPushZ = 0
  let hasHit = false
  
  for (const other of colliders) {
    if (other.id === myId) continue
    if (!other.solid) continue
    if (!shouldCollide(myLayer, other.layer)) continue
    
    const dx = x - other.x
    const dz = z - other.z
    const distSq = dx * dx + dz * dz
    const minDist = radius + other.radius
    
    if (distSq < minDist * minDist && distSq > 0.0001) {
      hasHit = true
      const dist = Math.sqrt(distSq)
      const overlap = minDist - dist
      
      // Push direction (normalized)
      const nx = dx / dist
      const nz = dz / dist
      
      totalPushX += nx * overlap
      totalPushZ += nz * overlap
    }
  }
  
  return { hit: hasHit, pushX: totalPushX, pushZ: totalPushZ }
}

// Resolve position to not overlap with any colliders
export const resolvePosition = (
  currentX: number,
  currentZ: number,
  targetX: number,
  targetZ: number,
  radius: number,
  myId: string,
  myLayer: LayerType = Layer.PLAYER
): { x: number; z: number } => {
  const result = checkCircleCollision(targetX, targetZ, radius, myId, myLayer)
  
  if (result.hit) {
    return {
      x: targetX + result.pushX,
      z: targetZ + result.pushZ
    }
  }
  
  return { x: targetX, z: targetZ }
}

// ============================================================================
// Attack Hitbox Detection (non-solid overlap check)
// ============================================================================

export type HitResult = {
  id: string
  collider: Collider
  distance: number
}

/**
 * Check what entities a hitbox overlaps with.
 * Returns all colliders of the specified layer that overlap.
 */
export const checkHitbox = (
  x: number,
  z: number,
  radius: number,
  targetLayer: LayerType,
  excludeId?: string
): HitResult[] => {
  const colliders = useCollisionStore.getState().getColliders()
  const hits: HitResult[] = []
  
  for (const other of colliders) {
    if (other.id === excludeId) continue
    if (other.layer !== targetLayer) continue
    
    const dx = x - other.x
    const dz = z - other.z
    const distSq = dx * dx + dz * dz
    const minDist = radius + other.radius
    
    if (distSq < minDist * minDist) {
      hits.push({
        id: other.id,
        collider: other,
        distance: Math.sqrt(distSq)
      })
    }
  }
  
  // Sort by distance (closest first)
  return hits.sort((a, b) => a.distance - b.distance)
}

/**
 * Deal damage to all enemies in a hitbox area.
 * Calls the onHit callback on each enemy collider.
 * @param hitY - Y position of the hit (for VFX)
 * @param alreadyHit - Set of entity IDs to exclude (for multi-hit prevention)
 */
export const dealDamageInArea = (
  x: number,
  z: number,
  radius: number,
  damage: number,
  attackerId: string,
  hitY: number = 0.5,
  alreadyHit?: Set<string>
): string[] => {
  const hits = checkHitbox(x, z, radius, Layer.ENEMY, attackerId)
  const newHitIds: string[] = []
  
  for (const hit of hits) {
    // Skip if already hit in this attack
    if (alreadyHit?.has(hit.id)) continue
    
    // Calculate hit position (at the enemy's position, sword height)
    const hitPosition: HitPosition = {
      x: hit.collider.x,
      y: hitY,
      z: hit.collider.z
    }
    
    hit.collider.onHit?.(attackerId, damage, hitPosition)
    newHitIds.push(hit.id)
  }
  
  return newHitIds
}
