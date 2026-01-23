/**
 * Enemy ECS Module
 * 
 * Organized ECS pattern for enemy entities:
 * - traits.ts   → Data definitions (Position, Health, etc.)
 * - actions.ts  → Spawn/destroy/damage functions
 * - systems.ts  → Frame-by-frame update logic
 * - Enemy.tsx   → React components for rendering
 */

// Traits (data components)
export {
  // Identity
  IsEnemy,
  IsMeleeEnemy,
  IsRangeEnemy,
  // Transform
  Position,
  Velocity,
  TargetVelocity,
  Rotation,
  Scale,
  // Gameplay
  Health,
  Speed,
  TargetPosition,
  // Visual
  Color,
  MeshRef,
} from './traits'

// Actions (entity factories)
export { enemyActions } from './actions'
export type { SpawnEnemyOptions, EnemyType } from './actions'

// Systems (update logic)
export {
  movementSystem,
  syncMeshSystem,
  wanderSystem,
  velocityDampingSystem,
  boundsSystem,
  faceMovementSystem,
  updateEnemySystems,
} from './systems'

// React Components
export {
  EnemyMesh,
  EnemyManager,
  WaveSpawner,
  EnemySystem,
} from './Enemy'
