import type { World } from 'koota'
import {
  IsEnemy,
  Position,
  Velocity,
  Speed,
  MeshRef,
  Rotation,
  TargetVelocity,
  isSpawned,
} from './traits'
import { damp } from 'three/src/math/MathUtils.js'

/** Damping factor for velocity smoothing (higher = snappier, lower = smoother) */
const VELOCITY_SMOOTHING = 3

/**
 * SYSTEMS - Update logic that runs each frame
 *
 * Systems query for entities with specific traits and update them.
 * Call these in useFrame() or a game loop.
 */

/**
 * Updates enemy positions based on velocity
 */
export function movementSystem(world: World, delta: number) {
  world.query(IsEnemy, Position, Velocity, Speed).updateEach(([pos, vel, speed]) => {
    pos.x += vel.x * speed.value * delta
    pos.y += vel.y * speed.value * delta
    pos.z += vel.z * speed.value * delta
  })
}

/**
 * Syncs ECS Position/Rotation/Scale to THREE.js mesh refs
 * Call this after movement systems to update visuals
 */
export function syncMeshSystem(world: World) {
  world.query(IsEnemy, Position, Rotation, MeshRef).forEach((entity) => {
    const pos = entity.get(Position)!
    const rot = entity.get(Rotation)!
    const meshRef = entity.get(MeshRef)!

    if (meshRef.current) {
      meshRef.current.position.set(pos.x, pos.y, pos.z)
      meshRef.current.rotation.set(rot.x, rot.y, rot.z)
    }
  })
}

/**
 * Simple wandering behavior - picks random target velocities
 */
export function wanderSystem(world: World) {
  world.query(IsEnemy, TargetVelocity).updateEach(([targetVel]) => {
    if (Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.5 + Math.random() * 0.5

      targetVel.x = Math.cos(angle) * speed
      targetVel.y = 0
      targetVel.z = Math.sin(angle) * speed
    }
  })
}

/**
 * Smoothly interpolates velocity toward target velocity using damp
 */
export function velocityDampingSystem(world: World, delta: number) {
  world.query(IsEnemy, Velocity, TargetVelocity).updateEach(([vel, targetVel]) => {
    vel.x = damp(vel.x, targetVel.x, VELOCITY_SMOOTHING, delta)
    vel.y = damp(vel.y, targetVel.y, VELOCITY_SMOOTHING, delta)
    vel.z = damp(vel.z, targetVel.z, VELOCITY_SMOOTHING, delta)
  })
}

/**
 * Bounds checking - keep enemies within a certain area
 */
export function boundsSystem(world: World, bounds: number = 10) {
  world.query(IsEnemy, Position, Velocity).updateEach(([pos, vel]) => {
    // Bounce off bounds
    if (Math.abs(pos.x) > bounds) {
      vel.x *= -1
      pos.x = Math.sign(pos.x) * bounds
    }
    if (Math.abs(pos.z) > bounds) {
      vel.z *= -1
      pos.z = Math.sign(pos.z) * bounds
    }
  })
}

/**
 * Rotation system - rotate enemies to face their movement direction
 */
export function faceMovementSystem(world: World) {
  world.query(IsEnemy, Velocity, Rotation).updateEach(([vel, rot]) => {
    if (vel.x !== 0 || vel.z !== 0) {
      const rotationTarget = Math.atan2(vel.x, vel.z)
      rot.y = rotationTarget
    }
  })
}

/**
 * Combined enemy update system - run all enemy systems in order
 */
export function updateEnemySystems(world: World, delta: number) {
  wanderSystem(world)
  velocityDampingSystem(world, delta) // Smooth velocity toward target
  movementSystem(world, delta)
  boundsSystem(world, 10)
  faceMovementSystem(world)
  syncMeshSystem(world)
}
