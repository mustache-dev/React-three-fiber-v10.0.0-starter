import type { CircleCollider, CollisionResult } from './types'

// ============================================================================
// Circle vs Circle Collision
// ============================================================================

export const circleVsCircle = (a: CircleCollider, b: CircleCollider): CollisionResult => {
  // Skip if layers don't interact
  if ((a.layer & b.mask) === 0 && (b.layer & a.mask) === 0) {
    return { hit: false, overlap: 0, normalX: 0, normalZ: 0 }
  }

  const dx = b.x - a.x
  const dz = b.z - a.z
  const distSq = dx * dx + dz * dz
  const radiiSum = a.radius + b.radius

  if (distSq >= radiiSum * radiiSum) {
    return { hit: false, overlap: 0, normalX: 0, normalZ: 0 }
  }

  const dist = Math.sqrt(distSq)
  const overlap = radiiSum - dist

  // Normalize direction (avoid division by zero)
  if (dist < 0.0001) {
    // Entities are at same position, push in random direction
    return { hit: true, overlap, normalX: 1, normalZ: 0 }
  }

  const invDist = 1 / dist
  return {
    hit: true,
    overlap,
    normalX: dx * invDist,
    normalZ: dz * invDist
  }
}

// ============================================================================
// Resolve solid collision (push apart)
// ============================================================================

export const resolveSolidCollision = (
  position: { x: number; z: number },
  myCollider: CircleCollider,
  otherCollider: CircleCollider,
  result: CollisionResult
): { x: number; z: number } => {
  if (!result.hit || !otherCollider.solid) return position

  // Push the position out by the overlap amount
  // normalX/Z points from 'a' to 'b', so we push in opposite direction
  return {
    x: position.x - result.normalX * result.overlap,
    z: position.z - result.normalZ * result.overlap
  }
}

// ============================================================================
// Check if point is inside circle
// ============================================================================

export const pointInCircle = (
  px: number,
  pz: number,
  cx: number,
  cz: number,
  radius: number
): boolean => {
  const dx = px - cx
  const dz = pz - cz
  return dx * dx + dz * dz <= radius * radius
}
