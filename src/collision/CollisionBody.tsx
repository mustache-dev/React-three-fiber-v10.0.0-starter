import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useCollisionStore, Layer } from './collision-store'
import type { LayerType } from './collision-store'
import type { Group } from 'three'

type CollisionBodyProps = {
  id: string
  radius?: number
  solid?: boolean
  layer?: LayerType
  position?: [number, number, number]
  debug?: boolean
  debugColor?: string
  onHit?: (attackerId: string, damage: number) => void
  children?: React.ReactNode
}

/**
 * Wraps children with collision detection.
 * Registers itself in the collision store and updates position each frame.
 */
export const CollisionBody = ({
  id,
  radius = 0.5,
  solid = true,
  layer = Layer.OBSTACLE,
  position,
  debug = false,
  debugColor = '#ff0000',
  onHit,
  children
}: CollisionBodyProps) => {
  const groupRef = useRef<Group>(null)
  const registerCollider = useCollisionStore((s) => s.registerCollider)
  const unregisterCollider = useCollisionStore((s) => s.unregisterCollider)
  const updateCollider = useCollisionStore((s) => s.updateCollider)

  // Register on mount, unregister on unmount
  useEffect(() => {
    const x = position?.[0] ?? 0
    const z = position?.[2] ?? 0
    
    registerCollider({ id, x, z, radius, solid, layer, onHit })
    
    return () => unregisterCollider(id)
  }, [id, radius, solid, layer])

  // Update position each frame (for moving entities)
  useFrame(() => {
    if (groupRef.current) {
      updateCollider(id, groupRef.current.position.x, groupRef.current.position.z)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {children}
      {debug && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.02, radius, 32]} />
          <meshBasicMaterial color={debugColor} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}

/**
 * Simple static obstacle with visual
 */
export const Obstacle = ({
  id,
  position,
  radius = 0.5,
  color = '#4488ff',
  debug = true
}: {
  id: string
  position: [number, number, number]
  radius?: number
  color?: string
  debug?: boolean
}) => {
  return (
    <CollisionBody id={id} position={position} radius={radius} solid={true} layer={Layer.OBSTACLE} debug={debug} debugColor={color}>
      <mesh>
        <cylinderGeometry args={[radius * 0.8, radius * 0.8, 1, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </CollisionBody>
  )
}

/**
 * Enemy with collision and hit detection
 */
export const Enemy = ({
  id,
  position,
  radius = 0.5,
  debug = true,
  onHit
}: {
  id: string
  position: [number, number, number]
  radius?: number
  debug?: boolean
  onHit?: (attackerId: string, damage: number) => void
}) => {
  return (
    <CollisionBody 
      id={id} 
      position={position} 
      radius={radius} 
      solid={true} 
      layer={Layer.ENEMY} 
      debug={debug} 
      debugColor="#ff4444"
      onHit={onHit}
    >
      <mesh>
        <sphereGeometry args={[radius * 0.8, 16, 16]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
    </CollisionBody>
  )
}
