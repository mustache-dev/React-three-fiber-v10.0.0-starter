import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useCollision, CollisionLayer, collisionGrid } from './index'
import type { CollisionResult, CollisionEntity } from './types'

type CollisionObstacleProps = {
  id: string
  position: [number, number, number]
  radius?: number
  color?: string
  layer?: number
  visible?: boolean
  onHit?: (other: CollisionEntity, result: CollisionResult) => void
}

export const CollisionObstacle = ({
  id,
  position,
  radius = 0.5,
  color = '#ff4444',
  layer = CollisionLayer.SOLID,
  visible = true,
  onHit
}: CollisionObstacleProps) => {
  const { updatePosition, register } = useCollision({
    id,
    radius,
    layer,
    mask: CollisionLayer.PLAYER | CollisionLayer.PLAYER_ATTACK,
    solid: true,
    onHit
  })

  // Register this obstacle every frame
  useFrame(() => {
    updatePosition(position[0], position[2])
    register()
  })

  if (!visible) return null

  return (
    <mesh position={position}>
      <cylinderGeometry args={[radius, radius, 0.1, 16]} />
      <meshStandardMaterial color={color} transparent opacity={0.5} />
    </mesh>
  )
}

// Enemy variant with different layer
export const CollisionEnemy = ({
  id,
  position,
  radius = 0.5,
  color = '#ff0000',
  visible = true,
  onHit
}: Omit<CollisionObstacleProps, 'layer'>) => {
  return (
    <CollisionObstacle
      id={id}
      position={position}
      radius={radius}
      color={color}
      layer={CollisionLayer.ENEMY}
      visible={visible}
      onHit={onHit}
    />
  )
}
