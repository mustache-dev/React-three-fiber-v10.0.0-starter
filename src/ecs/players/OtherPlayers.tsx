import { useEffect, useRef, useMemo } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import { useFrame, useGraph } from '@react-three/fiber'
import { useQuery, useWorld, useTrait, useActions } from 'koota/react'
import { onPlayerJoin, me } from 'playroomkit'
import type { Entity } from 'koota'
import * as THREE from 'three'
import { isOtherPlayer, Position, QuaternionTrait, Color, MeshRef, Animation } from './traits'
import { playerActions } from './actions'
import { syncPlayerStateSystem } from './systems'

interface OtherPlayerMeshProps {
  entity: Entity
}

export function OtherPlayerMesh({ entity }: OtherPlayerMeshProps) {
  const group = useRef<THREE.Group>(null!)

  const position = useTrait(entity, Position)
  const quaternion = useTrait(entity, QuaternionTrait)
  const animation = useTrait(entity, Animation)
  const color = useTrait(entity, Color)

  const { scene, animations } = useGLTF('/caps-42.glb')
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes } = useGraph(clone) as unknown as GLTFResult
  const { actions, mixer } = useAnimations(animations, group)

  // Sync mesh ref
  useEffect(() => {
    if (group.current) {
      entity.set(MeshRef, { current: group.current })
    }
    return () => {
      entity.set(MeshRef, { current: null })
    }
  }, [entity])

  // Sync animation
  const currentActionName = useRef<string | null>(null)

  useEffect(() => {
    if (!animation || !animation.name) return

    const newName = animation.name
    const action = actions[newName]
    if (!action) return

    // If same animation, just update parameters
    if (currentActionName.current === newName) {
      action.setEffectiveTimeScale(animation.speed)
      return
    }

    // Fade out old
    if (currentActionName.current) {
      actions[currentActionName.current]?.fadeOut(0.1)
    }

    // Play new
    action.reset().fadeIn(0.1).play()
    action.setEffectiveTimeScale(animation.speed)
    action.setLoop(animation.loop ? THREE.LoopRepeat : THREE.LoopOnce, 1)
    action.clampWhenFinished = animation.clamp

    currentActionName.current = newName
  }, [animation?.name, animation?.speed, animation?.loop, animation?.clamp, actions])

  // Update transform
  useFrame(() => {
    if (!group.current) return

    if (position) {
      group.current.position.set(position.x, position.y, position.z)
    }

    if (quaternion) {
      group.current.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
    }
  })

  if (!color) return null

  return (
    <group ref={group} dispose={null} scale={0.5} rotation={[0, 0, 0]}>
      <group name="Scene" rotation={[0, Math.PI, 0]}>
        <group name="Armature">
          <primitive object={nodes.body} />
          <skinnedMesh
            name="Cylinder"
            geometry={nodes.Cylinder.geometry}
            // material={capsMaterial}
            skeleton={nodes.Cylinder.skeleton}
            castShadow
            receiveShadow
          />
          <group name="Sphere">
            <skinnedMesh
              name="Sphere001"
              geometry={nodes.Sphere001.geometry}
              // material={capsMaterial}
              skeleton={nodes.Sphere001.skeleton}
              castShadow
              receiveShadow
            />
            <skinnedMesh
              // ref={swordRef}
              name="Sphere001_1"
              geometry={nodes.Sphere001_1.geometry}
              // material={swordMaterial}
              skeleton={nodes.Sphere001_1.skeleton}
              castShadow
              receiveShadow
            />
          </group>
        </group>
      </group>
    </group>
  )
}

export function OtherPlayersManager() {
  const world = useWorld()
  const otherPlayers = useQuery(isOtherPlayer)

  // Run sync system
  useFrame(() => {
    syncPlayerStateSystem(world)
  })

  return (
    <>
      {otherPlayers.map((entity) => (
        <OtherPlayerMesh key={entity.id()} entity={entity} />
      ))}
    </>
  )
}

export function MultiplayerSystem() {
  const { spawnOtherPlayer, despawnOtherPlayer } = useActions(playerActions)

  useEffect(() => {
    // Handle player join
    onPlayerJoin((state) => {
      if (state.id === me().id) return

      const entity = spawnOtherPlayer(state)

      state.onQuit(() => {
        entity.destroy()
      })
    })
  }, [spawnOtherPlayer, despawnOtherPlayer])

  return <OtherPlayersManager />
}
