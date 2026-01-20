import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useQuery, useWorld, useActions, useTrait } from 'koota/react'
import * as THREE from 'three'
import type { Entity } from 'koota'

import { IsEnemy, Position, Color, Scale, MeshRef, Health } from './traits'
import { enemyActions } from './actions'
import { updateEnemySystems } from './systems'
import { Html } from '@react-three/drei'
import { Healthbar } from '../../components/hud/healthbar'

/**
 * ENEMY COMPONENTS - React components for rendering and managing enemies
 */

// ============================================
// Individual Enemy Renderer
// ============================================

interface EnemyMeshProps {
  entity: Entity
}

/**
 * Renders a single enemy entity as a mesh
 * Syncs with ECS traits reactively
 */
export function EnemyMesh({ entity }: EnemyMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { damageEnemy } = useActions(enemyActions) // Bind actions to world

  // Reactively subscribe to trait changes
  const position = useTrait(entity, Position)
  const color = useTrait(entity, Color)
  const scale = useTrait(entity, Scale)
  const health = useTrait(entity, Health)

  // Store mesh ref in ECS for system access
  useEffect(() => {
    if (meshRef.current && entity.has(MeshRef)) {
      entity.set(MeshRef, { current: meshRef.current })
    }
    return () => {
      if (entity.has(MeshRef)) {
        entity.set(MeshRef, { current: null })
      }
    }
  }, [entity])

  // Don't render if traits are missing (entity destroyed)
  if (!position || !color || !scale) return null

  return (
    <group ref={meshRef}
      position={[position.x, position.y, position.z]}
      scale={[scale.x, scale.y, scale.z]}>

      {/* Health bar above enemy */}
      {health && <Healthbar position={[0, 1.5, 0]} health={health.current} healthMax={health.max} />}

      <mesh castShadow receiveShadow onClick={() => damageEnemy(entity, 10)}>
        <capsuleGeometry args={[0.5, 1]} />
        <meshStandardMaterial color={new THREE.Color(color.r, color.g, color.b)} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.4, 0.5]} rotation={[0, 0, Math.PI / 2]} scale={0.3}>
        <capsuleGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial color={new THREE.Color(color.r, color.g, color.b)} />
      </mesh>
    </group>
  )
}

// ============================================
// Enemy Manager (queries and renders all enemies)
// ============================================

/**
 * Queries all enemies and renders them
 * Also runs enemy systems in the frame loop
 */
export function EnemyManager() {
  const world = useWorld()
  const enemies = useQuery(IsEnemy)

  // Run enemy systems every frame
  useFrame((_, delta) => {
    updateEnemySystems(world, delta)
  })

  return (
    <>
      {enemies.map((entity) => (
        <EnemyMesh key={entity.id()} entity={entity} />
      ))}
    </>
  )
}

// ============================================
// Enemy Spawner (example usage)
// ============================================

interface EnemySpawnerProps {
  count?: number
  radius?: number
}

/**
 * Spawns enemies on mount, cleans up on unmount
 */
export function EnemySpawner({ count = 5, radius = 5 }: EnemySpawnerProps) {
  const { spawnEnemyWave, destroyAllEnemies } = useActions(enemyActions)

  useEffect(() => {
    spawnEnemyWave(count, radius)
    return () => destroyAllEnemies()
  }, [count, radius, spawnEnemyWave, destroyAllEnemies])

  return null
}

// ============================================
// Complete Enemy System Component
// ============================================

interface EnemySystemProps {
  initialCount?: number
  spawnRadius?: number
}

/**
 * All-in-one component: spawns enemies and manages their lifecycle
 * Just drop this into your scene!
 */
export function EnemySystem({ initialCount = 5, spawnRadius = 5 }: EnemySystemProps) {
  return (
    <>
      <EnemySpawner count={initialCount} radius={spawnRadius} />
      <EnemyManager />
    </>
  )
}
