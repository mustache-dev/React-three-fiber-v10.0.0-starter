import { createActions } from 'koota'
import {
  IsEnemy,
  IsBasicEnemy,
  Position,
  Velocity,
  TargetVelocity,
  Rotation,
  Scale,
  Health,
  Speed,
  Color,
  MeshRef,
} from './traits'

/**
 * ACTIONS - Factory functions for creating/destroying enemies
 * 
 * Actions are bound to the world and provide a clean API
 * for spawning and managing entities.
 */

export type SpawnEnemyOptions = {
  position?: { x: number; y: number; z: number }
  velocity?: { x: number; y: number; z: number }
  health?: number
  speed?: number
  color?: { r: number; g: number; b: number }
  scale?: number
}

export const enemyActions = createActions((world) => ({
  /**
   * Spawn a basic enemy with configurable options
   */
  spawnEnemy: (options: SpawnEnemyOptions = {}) => {
    const {
      position = { x: 0, y: 0, z: 0 },
      velocity = { x: 0, y: 0, z: 0 },
      health = 100,
      speed = 1,
      color = { r: 1, g: 0.2, b: 0.2 },
      scale = 1,
    } = options

    const entity = world.spawn(
      // Tags
      IsEnemy,
      IsBasicEnemy,
      // Transform
      Position(position),
      Velocity(velocity),
      TargetVelocity(velocity), // Smooth steering target
      Rotation({ x: 0, y: 0, z: 0 }),
      Scale({ x: scale, y: scale, z: scale }),
      // Gameplay
      Health({ current: health, max: health }),
      Speed({ value: speed }),
      // Visuals
      Color(color),
      MeshRef,
    )

    return entity
  },

  /**
   * Spawn multiple enemies in a pattern
   */
  spawnEnemyWave: (count: number, radius: number = 5) => {
    const entities = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const entity = world.spawn(
        IsEnemy,
        IsBasicEnemy,
        Position({
          x: Math.cos(angle) * radius,
          y: 0,
          z: Math.sin(angle) * radius,
        }),
        Velocity({ x: 0, y: 0, z: 0 }),
        TargetVelocity({ x: 0, y: 0, z: 0 }), // Smooth steering target
        Rotation({ x: 0, y: 0, z: 0 }),
        Scale({ x: 1, y: 1, z: 1 }),
        Health({ current: 100, max: 100 }),
        Speed({ value: 1 }),
        Color({ r: 1, g: 0.2, b: 0.2 }),
        MeshRef,
      )
      entities.push(entity)
    }
    return entities
  },

  /**
   * Destroy a specific enemy
   */
  destroyEnemy: (entity: ReturnType<typeof world.spawn>) => {
    if (entity.has(IsEnemy)) {
      entity.destroy()
    }
  },

  /**
   * Destroy all enemies
   */
  destroyAllEnemies: () => {
    world.query(IsEnemy).forEach((entity) => {
      entity.destroy()
    })
  },

  /**
   * Damage an enemy, destroy if health <= 0
   */
  damageEnemy: (entity: ReturnType<typeof world.spawn>, amount: number) => {
    if (!entity.has(Health)) return

    const health = entity.get(Health)!
    const newHealth = Math.max(0, health.current - amount)
    
    entity.set(Health, { current: newHealth, max: health.max })

    if (newHealth <= 0) {
      entity.destroy()
    }
  },
}))
