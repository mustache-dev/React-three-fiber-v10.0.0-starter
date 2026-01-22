import { useRef, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useQuery, useWorld, useActions, useTrait } from 'koota/react'
import * as THREE from 'three'
import type { Entity } from 'koota'

import { IsEnemy, Position, Color, Scale, MeshRef, Health } from './traits'
import { enemyActions } from './actions'
import { updateEnemySystems } from './systems'
import { Healthbar } from '@/components/hud/healthbar'
import { useCollisionStore, Layer } from '@/collision'
import type { HitPosition } from '@/collision'
import { useVFXEmitter } from '@/components/VFXParticles/VFXEmitter'

/**
 * ENEMY COMPONENTS - React components for rendering and managing enemies
 */

// ============================================
// Individual Enemy Renderer
// ============================================

interface EnemyMeshProps {
  entity: Entity
}

const ENEMY_COLLISION_RADIUS = 0.5

/**
 * Renders a single enemy entity as a mesh
 * Syncs with ECS traits reactively
 * Registers with collision system for sword hit detection
 */
export function EnemyMesh({ entity }: EnemyMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { damageEnemy } = useActions(enemyActions) // Bind actions to world

  // Collision store
  const registerCollider = useCollisionStore((s) => s.registerCollider)
  const unregisterCollider = useCollisionStore((s) => s.unregisterCollider)
  const updateCollider = useCollisionStore((s) => s.updateCollider)

  const { emit } = useVFXEmitter('impact')
  const { emit: emitFlare } = useVFXEmitter('impact-flare')

  // Reactively subscribe to trait changes
  const position = useTrait(entity, Position)
  const color = useTrait(entity, Color)
  const scale = useTrait(entity, Scale)
  const health = useTrait(entity, Health)

  // Unique collider ID based on entity
  const colliderId = `enemy-${entity.id()}`

  // Handle hit from player sword
  const onHit = useCallback((_attackerId: string, damage: number, hitPosition: HitPosition) => {
    console.log(`🗡️ Enemy ${entity.id()} hit for ${damage} damage at`, hitPosition)
    const { x, y, z } = hitPosition
    damageEnemy(entity, damage)
    console.log(emit, hitPosition)
    emit([x, y, z], 30)
    emitFlare([x, y, z], 10)
  }, [entity, damageEnemy, emit, emitFlare])

  // Register collider with collision system
  useEffect(() => {
    if (!position) return

    registerCollider({
      id: colliderId,
      x: position.x,
      z: position.z,
      radius: ENEMY_COLLISION_RADIUS,
      solid: true,
      layer: Layer.ENEMY,
      onHit
    })

    return () => unregisterCollider(colliderId)
  }, [colliderId, position, registerCollider, unregisterCollider, onHit])

  // Update collider position each frame
  useFrame(() => {
    if (position) {
      updateCollider(colliderId, position.x, position.z)
    }
  })

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

      <mesh castShadow receiveShadow>
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
