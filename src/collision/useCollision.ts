import { useRef, useCallback, useEffect } from 'react'
import { Vector3 } from 'three'
import { collisionGrid } from './spatial-grid'
import { circleVsCircle, resolveSolidCollision } from './collision'
import { CollisionLayer } from './types'
import type { CollisionEntity, CircleCollider, CollisionResult } from './types'

// ============================================================================
// useCollision Hook
// Registers an entity and provides collision checking utilities
// ============================================================================

type UseCollisionOptions = {
  id: string
  radius: number
  layer: number
  mask: number
  solid?: boolean
  onHit?: (other: CollisionEntity, result: CollisionResult) => void
}

export const useCollision = (options: UseCollisionOptions) => {
  const { id, radius, layer, mask, solid = false, onHit } = options
  const positionRef = useRef({ x: 0, z: 0 })

  // Update position and re-register in grid
  const updatePosition = useCallback((x: number, z: number) => {
    positionRef.current.x = x
    positionRef.current.z = z
  }, [])

  // Register entity in the collision grid (call this each frame before checks)
  const register = useCallback(() => {
    const entity: CollisionEntity = {
      id,
      position: { ...positionRef.current },
      collider: {
        x: positionRef.current.x,
        z: positionRef.current.z,
        radius,
        layer,
        mask,
        solid,
        entityId: id
      },
      onHit
    }
    collisionGrid.insert(entity)
  }, [id, radius, layer, mask, solid, onHit])

  // Check and resolve solid collisions, returns corrected position
  const resolveCollisions = useCallback((
    currentX: number,
    currentZ: number,
    targetX: number,
    targetZ: number
  ): { x: number; z: number } => {
    // Query nearby entities at target position
    const nearby = collisionGrid.queryExcluding(targetX, targetZ, radius + 2, id)
    
    let resolvedX = targetX
    let resolvedZ = targetZ

    const myCollider: CircleCollider = {
      x: targetX,
      z: targetZ,
      radius,
      layer,
      mask,
      solid
    }

    for (const other of nearby) {
      if (!other.collider.solid) continue

      const result = circleVsCircle(myCollider, other.collider)
      
      if (result.hit) {
        // Resolve by pushing our position out
        const resolved = resolveSolidCollision(
          { x: resolvedX, z: resolvedZ },
          myCollider,
          other.collider,
          result
        )
        resolvedX = resolved.x
        resolvedZ = resolved.z

        // Update collider position for subsequent checks
        myCollider.x = resolvedX
        myCollider.z = resolvedZ

        // Trigger hit callback if provided
        other.onHit?.(
          { id, position: { x: resolvedX, z: resolvedZ }, collider: myCollider },
          result
        )
      }
    }

    return { x: resolvedX, z: resolvedZ }
  }, [id, radius, layer, mask, solid])

  // Check for overlapping entities (for attack hitboxes, triggers, etc)
  const checkOverlaps = useCallback((
    x: number,
    z: number,
    checkRadius: number,
    checkMask: number
  ): CollisionEntity[] => {
    const nearby = collisionGrid.queryExcluding(x, z, checkRadius + 2, id)
    const hits: CollisionEntity[] = []

    const checkCollider: CircleCollider = {
      x,
      z,
      radius: checkRadius,
      layer,
      mask: checkMask,
      solid: false
    }

    for (const other of nearby) {
      // Check if layers match
      if ((checkCollider.mask & other.collider.layer) === 0) continue

      const result = circleVsCircle(checkCollider, other.collider)
      if (result.hit) {
        hits.push(other)
        other.onHit?.({ id, position: { x, z }, collider: checkCollider }, result)
      }
    }

    return hits
  }, [id, layer])

  return {
    updatePosition,
    register,
    resolveCollisions,
    checkOverlaps,
    positionRef
  }
}

// ============================================================================
// Helper to create a static collision entity (obstacles, walls)
// ============================================================================

export const createStaticCollider = (
  id: string,
  x: number,
  z: number,
  radius: number,
  layer = CollisionLayer.SOLID
): CollisionEntity => ({
  id,
  position: { x, z },
  collider: {
    x,
    z,
    radius,
    layer,
    mask: CollisionLayer.PLAYER | CollisionLayer.ENEMY,
    solid: true,
    entityId: id
  }
})
