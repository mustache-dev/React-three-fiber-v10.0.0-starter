// Simple store-based collision (recommended)
export { 
  useCollisionStore, 
  checkCircleCollision, 
  resolvePosition,
  checkHitbox,
  dealDamageInArea,
  Layer
} from './collision-store'
export type { Collider, LayerType, HitResult, HitPosition } from './collision-store'
export { CollisionBody, Obstacle, Enemy } from './CollisionBody'

// Legacy exports (spatial grid approach - kept for reference)
export { CollisionLayer } from './types'
export type { CircleCollider, CollisionResult, CollisionEntity } from './types'
export { circleVsCircle, resolveSolidCollision, pointInCircle } from './collision'
export { SpatialGrid, collisionGrid } from './spatial-grid'
export { useCollision, createStaticCollider } from './useCollision'
export { CollisionObstacle, CollisionEnemy } from './CollisionObstacle'
