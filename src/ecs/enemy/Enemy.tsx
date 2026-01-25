import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useFrame, useGraph } from '@react-three/fiber'
import { useQuery, useWorld, useActions, useTrait } from 'koota/react'
import * as THREE from 'three'
import gsap from 'gsap'
import type { Entity } from 'koota'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

import {
  IsEnemy,
  IsMeleeEnemy,
  IsRangeEnemy,
  Position,
  Color,
  Scale,
  MeshRef,
  Health,
  isSpawned,
} from './traits'
import { enemyActions } from './actions'
import { updateEnemySystems } from './systems'
import { Healthbar } from '@/components/hud/healthbar'
import { useCollisionStore, Layer } from '@/collision'
import type { HitPosition } from '@/collision'
import { useVFXEmitter } from '@/components/VFXParticles/VFXEmitter'
import { useGameStore } from '@/store'
import { createEnemyCapsMaterial } from './material'
import { damp } from 'three/src/math/MathUtils.js'
import { eventBus, EVENTS } from '@/constants'
import { useWaveManager } from '@/wave'

// GLTF types for enemy model
type GLTFResult = {
  nodes: {
    Sphere001: THREE.SkinnedMesh
    Sphere001_1: THREE.SkinnedMesh
    body_1: THREE.SkinnedMesh
    Sphere002: THREE.SkinnedMesh
    Sphere002_1: THREE.SkinnedMesh
    body: THREE.Bone
  }
  materials: {
    ['Material.002']: THREE.MeshStandardMaterial
    ['Material.001']: THREE.MeshStandardMaterial
    ['Material.003']: THREE.MeshStandardMaterial
  }
}

// Knockback configuration
type KnockbackConfig = {
  direction: THREE.Vector3
  distance: number
  duration: number
  ease?: string
}

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
  const groupRef = useRef<THREE.Group>(null!)
  const { damageEnemy } = useActions(enemyActions) // Bind actions to world

  // Load enemy model
  const { scene, animations } = useGLTF('/enemy.glb')
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult
  const { actions } = useAnimations(animations, groupRef)

  // Collision store
  const registerCollider = useCollisionStore((s) => s.registerCollider)
  const unregisterCollider = useCollisionStore((s) => s.unregisterCollider)
  const updateCollider = useCollisionStore((s) => s.updateCollider)

  const { emit } = useVFXEmitter('impact')
  const { emit: emitFlare } = useVFXEmitter('impact-flare')
  const { emit: emitSpawn } = useVFXEmitter('spawn')

  // Reactively subscribe to trait changes
  const position = useTrait(entity, Position)
  const color = useTrait(entity, Color)
  const scale = useTrait(entity, Scale)
  const health = useTrait(entity, Health)

  // Check enemy type
  const isMelee = entity.has(IsMeleeEnemy)
  const isRange = entity.has(IsRangeEnemy)

  // Create material with its own hit uniform (per-instance)
  const hitUniformRef = useRef<{ value: number } | null>(null)
  const opacityUniformRef = useRef<{ value: number } | null>(null)
  const materialData = useMemo(() => {
    if (!color) return null
    return createEnemyCapsMaterial(color)
  }, [color])

  // Sync hitUniform ref after material creation
  useEffect(() => {
    if (materialData) {
      hitUniformRef.current = materialData.hitUniform
      opacityUniformRef.current = materialData.opacityUniform
      // gsap.to(opacityUniformRef.current, {
      //   value: 1,
      //   duration: 1,
      //   ease: 'power2.in',
      //   delay: 1,
      // })
      // gsap.to(groupRef.current.position, {
      //   y: 0,
      //   duration: 0.5,
      //   ease: 'power2.in',
      //   delay: 2.2,
      //   onComplete: () => {
      //     emitSpawn(groupRef.current.position, 10)
      //     entity.set(isSpawned, { value: true })
      //   },
      // })
      emitSpawn(groupRef.current.position, 10)
    }
  }, [materialData])

  // Play stance animation on mount
  useEffect(() => {
    if (isMelee) {
      actions['stance']?.reset().fadeIn(0.1).play()
    }
  }, [actions])

  // Knockback state
  const isKnockedBack = useRef(false)
  const knockbackTween = useRef<gsap.core.Tween | null>(null)

  // Unique collider ID based on entity
  const colliderId = `enemy-${entity.id()}`

  // Knockback function - pushes enemy in a direction
  const knockback = useCallback(
    (config: KnockbackConfig) => {
      const { direction, distance, duration, ease = 'power2.out' } = config

      if (!entity.has(Position)) return

      // Kill any existing knockback tween
      if (knockbackTween.current) {
        knockbackTween.current.kill()
      }

      isKnockedBack.current = true

      const currentPos = entity.get(Position)!
      const normalizedDir = direction.clone().normalize()

      const targetX = currentPos.x + normalizedDir.x * distance
      const targetZ = currentPos.z + normalizedDir.z * distance

      // Animate position using gsap
      const animTarget = { x: currentPos.x, z: currentPos.z }

      knockbackTween.current = gsap.to(animTarget, {
        x: targetX,
        z: targetZ,
        duration,
        ease,
        onUpdate: () => {
          if (entity.has(Position)) {
            entity.set(Position, {
              x: animTarget.x,
              y: currentPos.y,
              z: animTarget.z,
            })
          }
        },
        onComplete: () => {
          isKnockedBack.current = false
          knockbackTween.current = null
        },
      })
    },
    [entity]
  )

  // Get player position for knockback direction

  // Handle hit from player sword
  const onHit = useCallback(
    (_attackerId: string, damage: number, hitPosition: HitPosition) => {
      console.log(`🗡️ Enemy ${entity.id()} hit for ${damage} damage at`, hitPosition)
      const { x, y, z } = hitPosition
      damageEnemy(entity, damage + Math.floor(Math.random() * 20))
      console.log(emit, hitPosition)
      emit([x, y, z], 30)
      emitFlare([x, y, z], 10)

      // Trigger hit effect on this enemy's material only
      if (hitUniformRef.current) {
        hitUniformRef.current.value = 1
      }

      // Trigger camera shake (once per slash, handled in PlayerController)
      eventBus.emit(EVENTS.CAMERA_SHAKE)
      const playerPosition = useGameStore.getState().playerPosition
      // Calculate knockback direction: from attacker (player) toward enemy
      if (entity.has(Position)) {
        const enemyPos = entity.get(Position)!
        const knockbackDir = new THREE.Vector3(
          enemyPos.x - playerPosition.x,
          0,
          enemyPos.z - playerPosition.z
        )

        // If positions are the same, use a random direction
        if (knockbackDir.length() < 0.001) {
          knockbackDir.set(Math.random() - 0.5, 0, Math.random() - 0.5)
        }
        const ko = actions['knockback']?.reset().fadeIn(0.1).play()
        ko?.setEffectiveTimeScale(1.3)
        ko?.setLoop(THREE.LoopOnce, 1)
        // Apply knockback - push enemy away from the attacker
        knockback({
          direction: knockbackDir,
          distance: 1.5,
          duration: 0.2,
          ease: 'power2.out',
        })
      }
    },
    [entity, damageEnemy, emit, emitFlare, knockback, actions]
  )

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
      onHit,
    })

    return () => unregisterCollider(colliderId)
  }, [colliderId, position, registerCollider, unregisterCollider, onHit])

  // Update collider position each frame and decay hit effect
  useFrame((_, delta) => {
    if (position) {
      updateCollider(colliderId, position.x, position.z)
    }
    // Decay hit effect on this enemy's material
    if (hitUniformRef.current) {
      hitUniformRef.current.value = damp(hitUniformRef.current.value, 0, 7, delta)
    }
  })

  // Store mesh ref in ECS for system access
  useEffect(() => {
    if (groupRef.current && entity.has(MeshRef)) {
      entity.set(MeshRef, { current: groupRef.current as unknown as THREE.Mesh })
    }
    return () => {
      if (entity.has(MeshRef)) {
        entity.set(MeshRef, { current: null })
      }
    }
  }, [entity])

  // Don't render if traits are missing (entity destroyed)
  if (!position || !color || !scale || !materialData) return null

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      scale={[scale.x * 0.5, scale.y * 0.5, scale.z * 0.5]}
    >
      {/* Health bar above enemy */}
      {health && <Healthbar position={[0, 3, 0]} health={health.current} healthMax={health.max} />}

      <group dispose={null} rotation={[0, Math.PI, 0]}>
        <group name="Scene" rotation={[0, 0, 0]}>
          <group name="Armature">
            <primitive object={nodes.body} />
            {/* Arm with sword - visible for melee enemies */}
            <group name="arm-sword" visible={isMelee}>
              <skinnedMesh
                name="Sphere001"
                geometry={nodes.Sphere001.geometry}
                material={materialData.material}
                skeleton={nodes.Sphere001.skeleton}
                castShadow
                receiveShadow
              />
              <skinnedMesh
                name="Sphere001_1"
                geometry={nodes.Sphere001_1.geometry}
                material={materials['Material.001']}
                skeleton={nodes.Sphere001_1.skeleton}
                castShadow
                receiveShadow
              />
            </group>
            {/* Body */}
            <skinnedMesh
              name="body_1"
              geometry={nodes.body_1.geometry}
              material={materialData.material}
              skeleton={nodes.body_1.skeleton}
              castShadow
              receiveShadow
            />
            {/* Canon - visible for range enemies */}
            <group name="canon" visible={isRange}>
              <skinnedMesh
                name="Sphere002"
                geometry={nodes.Sphere002.geometry}
                material={materialData.material}
                skeleton={nodes.Sphere002.skeleton}
                castShadow
                receiveShadow
              />
              <skinnedMesh
                name="Sphere002_1"
                geometry={nodes.Sphere002_1.geometry}
                material={materials['Material.003']}
                skeleton={nodes.Sphere002_1.skeleton}
                castShadow
                receiveShadow
              />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

// Preload enemy model
useGLTF.preload('/enemy.glb')

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
// Wave Manager Component
// ============================================

/**
 * Manages wave spawning - listens for enemy deaths
 * and spawns next wave when all enemies are killed
 */
export function WaveSpawner() {
  useWaveManager()
  return null
}

// ============================================
// Complete Enemy System Component
// ============================================

/**
 * All-in-one component: manages enemy lifecycle with waves
 * Just drop this into your scene!
 */
export function EnemySystem() {
  return (
    <>
      <WaveSpawner />
      <EnemyManager />
    </>
  )
}
